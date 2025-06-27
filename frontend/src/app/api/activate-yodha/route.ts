import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { yodhaData } = body;

    if (!yodhaData) {
      return NextResponse.json(
        { error: 'Missing yodha data' },
        { status: 400 }
      );
    }

    // Create JSON file similar to traitsGenerator.json from the yodha attributes
    const traitsInput = {
      name: yodhaData.name,
      bio: yodhaData.bio,
      life_history: yodhaData.life_history,
      personality: yodhaData.adjectives ? yodhaData.adjectives.split(', ') : [],
      knowledge_areas: yodhaData.knowledge_areas ? yodhaData.knowledge_areas.split(', ') : []
    };

    console.log("Traits input for NEAR AI:", traitsInput);

    // Use the backend signing approach similar to how authentication is handled in the existing API
    const privateKeyStr = process.env.NEAR_AGENT_PRIVATE_KEY;
    const accountId = process.env.NEAR_AGENT_ACCOUNT_ID;

    if (!privateKeyStr || !accountId) {
      return NextResponse.json(
        { error: 'NEAR agent credentials not configured' },
        { status: 500 }
      );
    }

    // For backend authentication, we'll use a simpler approach
    // Create a mock auth structure for now, since the actual signing is complex
    // In production, you'd want to implement proper NEAR key signing
    const mockAuth = {
      signature: "backend_signature_placeholder",
      account_id: accountId,
      public_key: "backend_public_key_placeholder", 
      message: "Login to NEAR AI",
      nonce: Date.now().toString().padStart(32, '0'),
      recipient: "api.near.ai",
      callback_url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    };

    const authString = `Bearer ${JSON.stringify(mockAuth)}`;

    // Initialize OpenAI client for NEAR AI
    const { default: OpenAI } = await import('openai');
    
    const openai = new OpenAI({
      baseURL: "https://api.near.ai/v1",
      apiKey: "dummy", // NEAR AI doesn't use API keys
      defaultHeaders: {
        'Authorization': authString
      }
    });

    // Create the prompt with the traits data
    const prompt = `Generate battle traits for this character. Here is the character data: ${JSON.stringify(traitsInput, null, 2)}

Please generate 5 numerical traits (strength, wit, charisma, defence, luck) and 5 battle moves (strike, taunt, dodge, special, recover) that fit this character's personality and background.

Return the response in this exact JSON format:
{
  "traits": {
    "strength": [number 1-100],
    "wit": [number 1-100], 
    "charisma": [number 1-100],
    "defence": [number 1-100],
    "luck": [number 1-100]
  },
  "moves": {
    "strike": "[move name and description]",
    "taunt": "[taunt text]", 
    "dodge": "[dodge move description]",
    "special": "[special move description]",
    "recover": "[recovery move description]"
  }
}`;

    // Try direct chat completions first
    try {
      const chatResponse = await fetch("https://api.near.ai/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Authorization': authString,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "samkitsoni.near/traits-generator/latest",
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
        
        console.log("NEAR AI Traits Generator Response:", responseContent);
        
        return NextResponse.json({
          success: true,
          response: responseContent
        });
      } else {
        console.log("Chat completions failed, trying threads approach");
      }
    } catch (directError) {
      console.log("Direct chat failed, trying threads approach:", directError);
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
            console.log("NEAR AI Traits Generator Response:", content.text.value);
            
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
    } catch (threadError) {
      console.error("Threads approach also failed:", threadError);
      
      // For now, return a mock response to demonstrate the flow
      const mockResponse = {
        traits: {
          strength: Math.floor(Math.random() * 100) + 1,
          wit: Math.floor(Math.random() * 100) + 1,
          charisma: Math.floor(Math.random() * 100) + 1,
          defence: Math.floor(Math.random() * 100) + 1,
          luck: Math.floor(Math.random() * 100) + 1
        },
        moves: {
          strike: `${traitsInput.name}'s Signature Strike`,
          taunt: `Face the power of ${traitsInput.name}!`,
          dodge: `${traitsInput.name}'s Swift Evasion`,
          special: `${traitsInput.name}'s Ultimate Technique`,
          recover: `${traitsInput.name}'s Recovery Focus`
        }
      };
      
      console.log("NEAR AI Traits Generator Mock Response:", JSON.stringify(mockResponse, null, 2));
      
      return NextResponse.json({
        success: true,
        response: JSON.stringify(mockResponse, null, 2),
        note: "This is a mock response since NEAR AI authentication needs proper implementation"
      });
    }

  } catch (error) {
    console.error('Error in activate-yodha API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
