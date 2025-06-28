import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auth, yodhaData } = body;

    // Check if we have both auth and yodhaData
    if (!auth && !yodhaData) {
      return NextResponse.json(
        { error: 'Missing auth and yodhaData' },
        { status: 400 }
      );
    }

    let authForNearAI;

    if (auth) {
      // Frontend provided signed auth - use it directly (like the working /api/near-ai route)
      console.log('Using frontend-provided auth:', auth);
      
      // Validate auth structure
      if (!auth.signature || !auth.accountId || !auth.publicKey) {
        return NextResponse.json(
          { error: 'Invalid auth structure - missing signature, accountId, or publicKey' },
          { status: 400 }
        );
      }

      // Format for NEAR AI (convert to snake_case like the working route)
      const nonceBuffer = Buffer.from(auth.nonce, 'base64');
      const nonceString = nonceBuffer.toString('utf8');
      authForNearAI = {
        signature: auth.signature,
        account_id: auth.accountId,
        public_key: auth.publicKey,
        message: auth.message,
        nonce: nonceString,
        recipient: auth.recipient,
        callback_url: auth.callbackUrl
      };
    } else {
      // Fallback to backend signing (existing logic)
      console.log('No auth provided, using backend signing...');
      
      return NextResponse.json(
        { error: 'Backend signing not yet working - please provide signed auth from frontend' },
        { status: 500 }
      );
    }
    
    // Create the JSON payload for the traits generator AI (not a text prompt)
    const traitsGeneratorPayload = {
      name: yodhaData.name,
      bio: yodhaData.bio,
      life_history: yodhaData.life_history,
      personality: Array.isArray(yodhaData.personality) 
        ? yodhaData.personality 
        : (yodhaData.personality ? yodhaData.personality.split(', ') : ['Brave', 'Skilled']),
      knowledge_areas: Array.isArray(yodhaData.knowledge_areas)
        ? yodhaData.knowledge_areas
        : (yodhaData.knowledge_areas ? yodhaData.knowledge_areas.split(', ') : ['Combat', 'Strategy'])
    };

    console.log('Sending JSON payload to NEAR AI traits generator:', traitsGeneratorPayload);

    // Use the same approach as the working /api/near-ai route
    const authString = `Bearer ${JSON.stringify(authForNearAI)}`;
    
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      baseURL: "https://api.near.ai/v1",
      apiKey: "dummy", // NEAR AI doesn't use API keys
      defaultHeaders: {
        'Authorization': authString
      }
    });

    // Try chat completions format with the traits generator assistant
    try {
      const assistant_id = "samkitsoni.near/traits-generator/latest";
      
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
              content: JSON.stringify(traitsGeneratorPayload)
            }
          ],
          max_tokens: 1000
        })
      });
      
      if (chatResponse.ok) {
        const result = await chatResponse.json();
        const responseContent = result.choices?.[0]?.message?.content || result.response || JSON.stringify(result);
        
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
    }

    // Fallback to threads approach (same as working route)
    try {
      const thread = await openai.beta.threads.create();

      await openai.beta.threads.messages.create(
        thread.id, {
          role: "user",
          content: JSON.stringify(traitsGeneratorPayload)
        }
      );

      const assistant_id = "samkitsoni.near/traits-generator/latest";
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
    console.error("Server: Error in activate-yodha:", error);
    return NextResponse.json(
      { error: `Failed to activate Yodha: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
