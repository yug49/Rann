import { NextRequest, NextResponse } from 'next/server';
import { utils } from 'near-api-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { yodhaData } = body;

    if (!yodhaData) {
      return NextResponse.json(
        { error: 'Missing yodhaData' },
        { status: 400 }
      );
    }

    // Use environment variables for backend authentication
    const nearAccountId = process.env.NEAR_AGENT_ACCOUNT_ID;
    const nearPrivateKey = process.env.NEAR_AGENT_PRIVATE_KEY;

    if (!nearAccountId || !nearPrivateKey) {
      return NextResponse.json(
        { error: 'NEAR account credentials not configured' },
        { status: 500 }
      );
    }

    try {
      // Create auth object exactly like the frontend wallet does
      const message = "Login to NEAR AI";
      const timestamp = Date.now().toString();
      const nonceString = timestamp.padStart(32, '0');
      const nonce = Buffer.from(nonceString).toString('base64'); // Encode as base64 like wallet
      const recipient = "api.near.ai";
      const callbackUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

      // Create the keyPair from the private key
      const keyPair = utils.KeyPair.fromString(nearPrivateKey as any);
      
      // Follow NEP-413 standard for NEAR message signing
      // The wallet signs the entire message structure as a JSON object
      const messageStructure = {
        message,
        nonce,
        recipient,
        callbackUrl
      };
      
      // Serialize the message structure to JSON string (NEP-413 standard)
      const messageToSign = JSON.stringify(messageStructure);
      
      // Encode as UTF-8 bytes for signing
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(messageToSign);
      
      // Sign the serialized message structure with Ed25519
      const signatureResult = keyPair.sign(messageBytes);

      // Convert signature to base64 string (it comes as Uint8Array)
      const signatureBase64 = Buffer.from(signatureResult.signature).toString('base64');

      // Create the auth object exactly like the frontend sends it (camelCase)
      const auth = {
        signature: signatureBase64,
        accountId: nearAccountId,
        publicKey: keyPair.getPublicKey().toString(),
        message,
        nonce, // Keep as base64 like frontend
        recipient,
        callbackUrl
      };

      // Now convert to NEAR AI format exactly like the working route
      const nonceBuffer = Buffer.from(auth.nonce, 'base64');
      const nonceStringDecoded = nonceBuffer.toString('utf8'); // Convert back to original string
      const authForNearAI = {
        signature: auth.signature,
        account_id: auth.accountId, // NEAR AI expects snake_case
        public_key: auth.publicKey, // NEAR AI expects snake_case
        message: auth.message,
        nonce: nonceStringDecoded, // Use original string format (32 digit string)
        recipient: auth.recipient,
        callback_url: auth.callbackUrl // NEAR AI expects snake_case
      };
      
      const authString = `Bearer ${JSON.stringify(authForNearAI)}`;
      
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        baseURL: "https://api.near.ai/v1",
        apiKey: "dummy", // NEAR AI doesn't use API keys
        defaultHeaders: {
          'Authorization': authString
        }
      });

      // Create the prompt for the traits generator AI
      const prompt = `Generate battle traits and moves for this Yodha character based on their attributes:

Name: ${yodhaData.name}
Bio: ${yodhaData.bio}
Life History: ${yodhaData.life_history}
Personality: ${Array.isArray(yodhaData.personality) ? yodhaData.personality.join(', ') : yodhaData.personality || 'Brave, Skilled'}
Knowledge Areas: ${yodhaData.knowledge_areas || 'Combat, Strategy'}

Please generate traits and moves for this character that would make them suitable for battle. The response should include numeric values for strength, wit, charisma, defence, and luck (values between 1-100), as well as creative move names for strike, taunt, dodge, special, and recover abilities.

Format the response as a JSON object with the traits and moves.`;

      // Try chat completions format with the attributes generator assistant (same as working route)
      try {
        const chatResponse = await fetch("https://api.near.ai/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Authorization': authString,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "samkitsoni.near/attributes-generator/latest",
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 1000
          })
        });
        
        if (chatResponse.ok) {
          const result = await chatResponse.json();
          
          // Extract the response content
          const responseContent = result.choices?.[0]?.message?.content || result.response || JSON.stringify(result);
          
          console.log('NEAR AI Response:', responseContent);
          
          return NextResponse.json({
            success: true,
            response: responseContent
          });
        } else {
          const errorText = await chatResponse.text();
          throw new Error(`${chatResponse.status} ${chatResponse.statusText}: ${errorText}`);
        }
      } catch (directError) {
        console.error('Chat completions failed:', directError);
        // Continue to threads approach like the working route
      }
      
      // Fallback to threads approach (same as working route)
      try {
        const thread = await openai.beta.threads.create();

        await openai.beta.threads.messages.create(
          thread.id,
          {
            role: "user",
            content: prompt
          }
        );

        const assistant_id = "samkitsoni.near/attributes-generator/latest";
        const run = await openai.beta.threads.runs.createAndPoll(
          thread.id,
          { 
            assistant_id: assistant_id,
          }
        );

        if (run.status === 'completed') {
          const messages = await openai.beta.threads.messages.list(
            run.thread_id
          );
          
          const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
          
          if (assistantMessages.length > 0) {
            let mainResponse = null;
            
            const contentMessages = assistantMessages.filter(msg => 
              !msg.metadata || 
              (msg.metadata.message_type !== 'system:log' && msg.metadata.message_type !== 'system:output_file')
            );
            
            if (contentMessages.length > 0) {
              mainResponse = contentMessages[0];
            } else {
              mainResponse = assistantMessages[0];
            }
            
            const content = mainResponse.content[0];
            
            if (content.type === 'text') {
              console.log('NEAR AI Response:', content.text.value);
              
              return NextResponse.json({
                success: true,
                response: content.text.value
              });
            }
          }
          
          return NextResponse.json(
            { error: "No response received from assistant" },
            { status: 500 }
          );
        } else {
          return NextResponse.json(
            { error: `Assistant run failed with status: ${run.status}` },
            { status: 500 }
          );
        }
      } catch (threadsError) {
        console.error('Threads approach failed:', threadsError);
        throw threadsError;
      }
    } catch (error) {
      console.error("NEAR connection/signing error:", error);
      return NextResponse.json(
        { error: `NEAR authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Server: Error in activate-yodha:", error);
    return NextResponse.json(
      { error: `Failed to activate Yodha: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
