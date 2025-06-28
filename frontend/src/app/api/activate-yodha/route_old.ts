import { NextRequest, NextResponse } from 'next/server';
import { connect, keyStores, utils } from 'near-api-js';

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

    // Validate yodhaData structure
    if (!yodhaData.name || !yodhaData.bio || !yodhaData.life_history) {
      return NextResponse.json(
        { error: 'Invalid yodhaData structure - missing required fields' },
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
      // Create message and nonce exactly like the wallet does
      const message = "Login to NEAR AI";
      const timestamp = Date.now().toString();
      // Use 32-character padded format like the working example
      const nonceString = timestamp.padStart(32, '0'); // e.g., "00000000000000000001751053825083"
      const nonce = Buffer.from(nonceString).toString('base64'); // Encode as base64 like wallet
      const recipient = "api.near.ai";
      const callbackUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

      console.log('Generated timestamp:', timestamp);
      console.log('Generated nonce string:', nonceString);
      console.log('Generated nonce base64:', nonce);
      console.log('Message components:', { message, recipient, callbackUrl });

      // Create the keyPair from the private key
      console.log('Private key format check:', {
        keyLength: nearPrivateKey.length,
        keyPrefix: nearPrivateKey.substring(0, 20) + '...',
        accountId: nearAccountId
      });
      
      const keyPair = utils.KeyPair.fromString(nearPrivateKey as any);
      console.log('KeyPair created successfully:', {
        publicKey: keyPair.getPublicKey().toString(),
        keyType: keyPair.getPublicKey().keyType
      });
      
      // The NEAR wallet signs a specific message structure
      // The wallet actually signs a structured object with message, nonce, recipient, callbackUrl
      // This matches what the frontend wallet.signMessage() expects
      // Follow NEP-413 standard for NEAR message signing
      // The wallet signs the entire message structure as a JSON object
      // Use the decoded nonce (32-digit string) in the signing structure
      const messageStructure = {
        message,
        nonce: nonceString, // Use the 32-digit string for signing (same format sent to NEAR AI)
        recipient,
        callbackUrl
      };
      
      // Serialize the message structure to JSON string (NEP-413 standard)
      const messageToSign = JSON.stringify(messageStructure);
      console.log('Message to sign (JSON):', messageToSign);
      
      // Encode as UTF-8 bytes for signing
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(messageToSign);
      console.log('Message bytes length:', messageBytes.length);
      
      // Sign the serialized message structure with Ed25519
      const signatureResult = keyPair.sign(messageBytes);
      console.log('Raw signature type:', typeof signatureResult.signature);
      console.log('Raw signature length:', signatureResult.signature.length);

      // Convert signature to base64 string (it comes as Uint8Array)
      const signatureBase64 = Buffer.from(signatureResult.signature).toString('base64');
      console.log('Generated signature (base64):', signatureBase64);

      // Create the auth data structure exactly like the wallet returns
      const authData = {
        signature: signatureBase64,
        accountId: nearAccountId,
        publicKey: keyPair.getPublicKey().toString(),
        message,
        nonce: nonceString, // Use decoded nonce consistently
        recipient,
        callbackUrl
      };

      // Format for NEAR AI exactly like the working route does
      // Use the nonce directly as it's already in the correct format
      const authForNearAI = {
        signature: authData.signature,
        account_id: authData.accountId, // NEAR AI expects snake_case
        public_key: authData.publicKey, // NEAR AI expects snake_case
        message: authData.message,
        nonce: authData.nonce, // Use the nonce directly (it's already the numeric string)
        recipient: authData.recipient,
        callback_url: authData.callbackUrl // NEAR AI expects snake_case
      };

      console.log('Auth data structure:', authData);
      console.log('Auth object being sent to NEAR AI:', authForNearAI);

      const authString = `Bearer ${JSON.stringify(authForNearAI)}`;

      // Initialize the OpenAI client
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

      console.log('Sending prompt to NEAR AI (backend authenticated):', prompt);

      try {
        // Try chat completions format with the attributes generator assistant
        const assistant_id = "samkitsoni.near/attributes-generator/latest";
        
        const chatResponse = await fetch("https://api.near.ai/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Authorization': authString,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: assistant_id,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 1500
          })
        });
        
        if (chatResponse.ok) {
          const result = await chatResponse.json();
          const responseContent = result.choices?.[0]?.message?.content || result.response || JSON.stringify(result);
          
          console.log('NEAR AI Agent Response (backend):', responseContent);
          
          return NextResponse.json({
            success: true,
            response: responseContent
          });
        } else {
          const errorText = await chatResponse.text();
          console.error('Chat completions failed:', chatResponse.status, chatResponse.statusText, errorText);
          console.error('Request headers:', chatResponse.headers);
          console.error('Auth string used:', authString);
          
          return NextResponse.json(
            { error: `NEAR authentication failed: ${chatResponse.status} status code${errorText ? `: ${errorText}` : ' (no body)'}` },
            { status: 500 }
          );
        }
      } catch (directError) {
        console.log('Direct chat completion failed, trying threads approach:', directError);
      }
      
      // Fallback to threads approach
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
            const contentMessages = assistantMessages.filter(msg => 
              !msg.metadata || 
              (msg.metadata.message_type !== 'system:log' && msg.metadata.message_type !== 'system:output_file')
            );
            
            const mainResponse = contentMessages.length > 0 ? contentMessages[0] : assistantMessages[0];
            const content = mainResponse.content[0];
            
            if (content.type === 'text') {
              console.log('NEAR AI Agent Response (backend):', content.text.value);
              
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
        console.error('Threads approach also failed:', threadsError);
        throw threadsError;
      }

    } catch (nearError) {
      console.error('NEAR connection/signing error:', nearError);
      return NextResponse.json(
        { error: `NEAR authentication failed: ${nearError instanceof Error ? nearError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Server: Error calling NEAR AI for activation:", error);
    return NextResponse.json(
      { error: `Failed to call NEAR AI for activation: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}