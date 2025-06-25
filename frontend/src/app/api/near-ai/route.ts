import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auth, prompt } = body;

    if (!auth || !prompt) {
      return NextResponse.json(
        { error: 'Missing auth or prompt' },
        { status: 400 }
      );
    }

    // Validate auth structure
    if (!auth.signature || !auth.accountId || !auth.publicKey) {
      return NextResponse.json(
        { error: 'Invalid auth structure - missing signature, accountId, or publicKey' },
        { status: 400 }
      );
    }

    // Initialize the OpenAI client on the server side
    const { default: OpenAI } = await import('openai');
    
    // For NEAR AI, we need to format the auth object to match their expected format
    // The nonce should be sent as the original string from the Buffer
    const nonceBuffer = Buffer.from(auth.nonce, 'base64');
    const nonceString = nonceBuffer.toString('utf8'); // Convert back to original string
    const authForNearAI = {
      signature: auth.signature,
      account_id: auth.accountId, // NEAR AI expects snake_case
      public_key: auth.publicKey, // NEAR AI expects snake_case
      message: auth.message,
      nonce: nonceString, // Use original string format (32 digit string)
      recipient: auth.recipient,
      callback_url: auth.callbackUrl // NEAR AI expects snake_case
    };
    
    const authString = `Bearer ${JSON.stringify(authForNearAI)}`;
    
    const openai = new OpenAI({
      baseURL: "https://api.near.ai/v1",
      apiKey: "dummy", // NEAR AI doesn't use API keys
      defaultHeaders: {
        'Authorization': authString
      }
    });

    // Try calling the assistant directly instead of using threads
    try {
      // Method 1: Try chat completions format with the assistant
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
        
        return NextResponse.json({
          success: true,
          response: responseContent
        });
      }
    } catch (directError) {
      // Continue to threads approach
    }
    
    // Method 2: Use threads approach
    // Create a new thread
    const thread = await openai.beta.threads.create();

    // Add the user's prompt as a message to the thread
    await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: prompt
      }
    );

    // Run the assistant on the thread
    const assistant_id = "samkitsoni.near/attributes-generator/latest";
    const run = await openai.beta.threads.runs.createAndPoll(
      thread.id,
      { 
        assistant_id: assistant_id,
      }
    );

    // Process the response
    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(
        run.thread_id
      );
      
      // Get the latest assistant message
      const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
      
      if (assistantMessages.length > 0) {
        // Look for the main content message (not system logs or output files)
        let mainResponse = null;
        
        // First, try to find a message without system metadata (the actual response)
        const contentMessages = assistantMessages.filter(msg => 
          !msg.metadata || 
          (msg.metadata.message_type !== 'system:log' && msg.metadata.message_type !== 'system:output_file')
        );
        
        if (contentMessages.length > 0) {
          mainResponse = contentMessages[0];
        } else {
          // Fallback to the first assistant message
          mainResponse = assistantMessages[0];
        }
        
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
  } catch (error) {
    console.error("Server: Error calling NEAR AI:", error);
    return NextResponse.json(
      { error: `Failed to call NEAR AI: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
