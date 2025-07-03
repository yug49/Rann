import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('NEAR AI Moves API: Received request');
  
  try {
    const body = await request.json();
    console.log('NEAR AI Moves API: Request body keys:', Object.keys(body));
    const { auth, prompt, assistantId } = body;

    console.log('NEAR AI Moves API: assistantId =', assistantId);
    console.log('NEAR AI Moves API: auth keys =', auth ? Object.keys(auth) : 'no auth');
    console.log('NEAR AI Moves API: prompt length =', prompt ? prompt.length : 'no prompt');

    if (!auth || !prompt || !assistantId) {
      console.error('NEAR AI Moves API: Missing required fields');
      return NextResponse.json(
        { error: 'Missing auth, prompt, or assistantId' },
        { status: 400 }
      );
    }

    // Validate auth structure
    if (!auth.signature || !auth.account_id || !auth.public_key) {
      console.error('NEAR AI Moves API: Invalid auth structure');
      return NextResponse.json(
        { error: 'Invalid auth structure - missing signature, account_id, or public_key' },
        { status: 400 }
      );
    }

    // Initialize the OpenAI client on the server side
    const { default: OpenAI } = await import('openai');
    
    // For NEAR AI, we need to format the auth object to match their expected format
    const authForNearAI = {
      signature: auth.signature,
      account_id: auth.account_id,
      public_key: auth.public_key,
      message: auth.message,
      nonce: auth.nonce,
      recipient: auth.recipient,
      callback_url: auth.callback_url
    };
    
    const authString = `Bearer ${JSON.stringify(authForNearAI)}`;
    
    console.log('NEAR AI Moves API: Formatted auth string length =', authString.length);
    
    const openai = new OpenAI({
      baseURL: "https://api.near.ai/v1",
      apiKey: "dummy", // NEAR AI doesn't use API keys
      defaultHeaders: {
        'Authorization': authString
      }
    });

    // Try calling the assistant directly instead of using threads
    try {
      console.log('NEAR AI Moves API: Attempting direct chat completion with assistantId:', assistantId);
      
      // Method 1: Try chat completions format with the assistant
      const chatResponse = await fetch("https://api.near.ai/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Authorization': authString,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: assistantId,
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
        console.log('NEAR AI Moves API: Chat completion successful');
        const result = await chatResponse.json();
        console.log('NEAR AI Moves API: Chat result:', result);
        
        // Extract the response content
        const responseContent = result.choices?.[0]?.message?.content || result.response || JSON.stringify(result);
        
        return NextResponse.json({
          success: true,
          response: responseContent
        });
      } else {
        console.log('NEAR AI Moves API: Chat completion failed with status:', chatResponse.status);
        const errorText = await chatResponse.text();
        console.log('NEAR AI Moves API: Chat error:', errorText);
      }
    } catch (error) {
      console.log('NEAR AI Moves API: Direct chat completion failed:', error);
      console.log('NEAR AI Moves API: Trying threads approach');
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
    const run = await openai.beta.threads.runs.createAndPoll(
      thread.id,
      { 
        assistant_id: assistantId,
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
    console.error("Server: Error calling NEAR AI move selector:", error);
    return NextResponse.json(
      { error: `Failed to call NEAR AI: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
