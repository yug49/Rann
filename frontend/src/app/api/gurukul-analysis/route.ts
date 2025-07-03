import { NextRequest, NextResponse } from 'next/server';
import { near_agent_personality_updater } from '../../../constants';

interface YodhaTraits {
  strength: number;
  wit: number;
  charisma: number;
  defence: number;
  luck: number;
}

interface QuestionAnswer {
  questionId: number;
  selectedOptionId: number;
  question: string;
  selectedAnswer: string;
}

interface GurukulAnalysisRequest {
  auth: {
    signature: string;
    accountId: string;
    publicKey: string;
    message: string;
    nonce: string;
    recipient: string;
    callbackUrl: string;
  };
  tokenId: number;
  currentTraits: YodhaTraits;
  answers: QuestionAnswer[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GurukulAnalysisRequest = await request.json();
    const { auth, tokenId, currentTraits, answers } = body;

    // Validate required fields
    if (!auth || !tokenId || !currentTraits || !answers || answers.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: auth, tokenId, currentTraits, or answers' },
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

    console.log(`🧠 Starting Gurukul analysis for Yodha ${tokenId}`);
    console.log(`📊 Current traits:`, currentTraits);
    console.log(`📝 User answers:`, answers);

    // Prepare the detailed prompt for the personality updater
    const analysisPrompt = `
You are an ancient Gurukul master analyzing a warrior's psychological profile based on their moral choices. 

WARRIOR PROFILE:
- Token ID: ${tokenId}
- Current Traits: Strength ${currentTraits.strength * 100}, Wit ${currentTraits.wit * 100}, Charisma ${currentTraits.charisma * 100}, Defence ${currentTraits.defence * 100}, Luck ${currentTraits.luck * 100}

MORAL CHOICES MADE:
${answers.map((answer, index) => `
${index + 1}. Question: "${answer.question}"
   Choice: "${answer.selectedAnswer}"
`).join('')}

ANALYSIS REQUIREMENTS:
Analyze these moral choices and provide new trait values based on psychological principles. Return values in CONTRACT FORMAT (multiplied by 100):

1. STRENGTH: Physical and mental fortitude, courage in face of adversity (range: 2500-10000)
2. WIT: Intelligence, strategic thinking, problem-solving ability (range: 2500-10000)
3. CHARISMA: Social influence, leadership qualities, persuasion (range: 2500-10000)
4. DEFENCE: Resilience, protective instincts, emotional stability (range: 2500-10000)
5. LUCK: Intuition, fortune, serendipity, positive outcomes (range: 2500-10000)

RESPONSE FORMAT (JSON only):
{
  "analysis": "Brief psychological analysis of the warrior's choices and character development",
  "stats": {
    "Strength": [integer 2500-10000],
    "Wit": [integer 2500-10000], 
    "Charisma": [integer 2500-10000],
    "Defence": [integer 2500-10000],
    "Luck": [integer 2500-10000]
  },
  "reasoning": {
    "strength": "Why this strength value was assigned",
    "wit": "Why this wit value was assigned",
    "charisma": "Why this charisma value was assigned", 
    "defence": "Why this defence value was assigned",
    "luck": "Why this luck value was assigned"
  }
}

Provide only the JSON response without any additional text or formatting. The trait values should be realistic improvements based on the moral choices made.
`;

    // Initialize the OpenAI client for NEAR AI
    const { default: OpenAI } = await import('openai');
    
    // Format auth object for NEAR AI
    const nonceBuffer = Buffer.from(auth.nonce, 'base64');
    const nonceString = nonceBuffer.toString('utf8');
    const authForNearAI = {
      signature: auth.signature,
      account_id: auth.accountId,
      public_key: auth.publicKey,
      message: auth.message,
      nonce: nonceString,
      recipient: auth.recipient,
      callback_url: auth.callbackUrl
    };
    
    const authString = `Bearer ${JSON.stringify(authForNearAI)}`;
    
    const openai = new OpenAI({
      baseURL: "https://api.near.ai/v1",
      apiKey: "dummy",
      defaultHeaders: {
        'Authorization': authString
      }
    });

    let aiResponse = null;
    let analysisResult = null;

    // Try Method 1: Direct chat completions
    try {
      console.log('🤖 Attempting direct chat completion with NEAR AI...');
      const chatResponse = await fetch("https://api.near.ai/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Authorization': authString,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: near_agent_personality_updater,
          messages: [
            {
              role: "user",
              content: analysisPrompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });
      
      if (chatResponse.ok) {
        const result = await chatResponse.json();
        const responseContent = result.choices?.[0]?.message?.content || result.response;
        
        if (responseContent) {
          aiResponse = responseContent;
          console.log('✅ Direct chat completion successful');
        }
      }
    } catch (chatError) {
      console.log('⚠️ Direct chat completion failed, trying threads approach...', chatError);
    }

    // Try Method 2: Threads approach if direct method failed
    if (!aiResponse) {
      try {
        console.log('🧵 Attempting threads approach with NEAR AI...');
        const thread = await openai.beta.threads.create();

        await openai.beta.threads.messages.create(
          thread.id,
          {
            role: "user",
            content: analysisPrompt
          }
        );

        const run = await openai.beta.threads.runs.createAndPoll(
          thread.id,
          { 
            assistant_id: near_agent_personality_updater,
          }
        );

        if (run.status === 'completed') {
          const messages = await openai.beta.threads.messages.list(run.thread_id);
          const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
          
          if (assistantMessages.length > 0) {
            const contentMessages = assistantMessages.filter(msg => 
              !msg.metadata || 
              (msg.metadata.message_type !== 'system:log' && msg.metadata.message_type !== 'system:output_file')
            );
            
            const mainResponse = contentMessages.length > 0 ? contentMessages[0] : assistantMessages[0];
            const content = mainResponse.content[0];
            
            if (content.type === 'text') {
              aiResponse = content.text.value;
              console.log('✅ Threads approach successful');
            }
          }
        }
      } catch (threadsError) {
        console.log('⚠️ Threads approach failed, falling back to local analysis...', threadsError);
      }
    }

    // Parse AI response or fall back to local analysis
    if (aiResponse) {
      try {
        // Clean and parse the JSON response
        const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
        analysisResult = JSON.parse(cleanedResponse);
        
        // Validate the response structure
        if (!analysisResult.stats || !analysisResult.analysis) {
          throw new Error('Invalid AI response structure - missing stats or analysis');
        }
        
        // Convert AI stats to our trait format (AI returns contract format values)
        const aiTraits = {
          strength: analysisResult.stats.Strength / 100,
          wit: analysisResult.stats.Wit / 100,
          charisma: analysisResult.stats.Charisma / 100,
          defence: analysisResult.stats.Defence / 100,
          luck: analysisResult.stats.Luck / 100
        };
        
        // Validate that AI returned reasonable values (contract format 2500-10000)
        const isValidRange = (value: number) => value >= 2500 && value <= 10000;
        if (!isValidRange(analysisResult.stats.Strength) || 
            !isValidRange(analysisResult.stats.Wit) || 
            !isValidRange(analysisResult.stats.Charisma) || 
            !isValidRange(analysisResult.stats.Defence) || 
            !isValidRange(analysisResult.stats.Luck)) {
          throw new Error('AI returned trait values outside valid contract range (2500-10000)');
        }
        
        // Update analysisResult to use our trait format
        analysisResult.traits = aiTraits;
        console.log('✅ AI analysis parsed successfully with contract-format values');
        console.log('📊 AI returned traits:', aiTraits);
        
      } catch (parseError) {
        console.log('⚠️ Failed to parse AI response, falling back to local analysis...', parseError);
        aiResponse = null;
      }
    }

    // Fallback to local intelligent analysis
    if (!aiResponse || !analysisResult) {
      console.log('🧠 Performing local psychological analysis...');
      analysisResult = generateLocalPsychologicalAnalysis(answers, currentTraits);
    }

    // Prepare the final response
    const finalTraits = analysisResult.traits;
    const traitChanges = {
      strength: finalTraits.strength - currentTraits.strength,
      wit: finalTraits.wit - currentTraits.wit,
      charisma: finalTraits.charisma - currentTraits.charisma,
      defence: finalTraits.defence - currentTraits.defence,
      luck: finalTraits.luck - currentTraits.luck
    };

    console.log('📊 Final trait analysis completed');
    console.log('🎯 New traits:', finalTraits);
    console.log('🔄 Trait changes:', traitChanges);

    return NextResponse.json({
      success: true,
      tokenId,
      analysis: analysisResult.analysis,
      currentTraits,
      newTraits: finalTraits,
      traitChanges,
      reasoning: analysisResult.reasoning || null,
      source: aiResponse ? 'near-ai' : 'local-analysis'
    });

  } catch (error) {
    console.error("❌ Error in Gurukul analysis:", error);
    return NextResponse.json(
      { error: `Failed to analyze Gurukul responses: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Local psychological analysis function as fallback
function generateLocalPsychologicalAnalysis(answers: QuestionAnswer[], currentTraits: YodhaTraits) {
  console.log('🧠 Performing advanced local psychological analysis...');
  
  // Initialize psychological metrics
  const psychologyMetrics = {
    courage: 0,
    wisdom: 0,
    empathy: 0,
    justice: 0,
    loyalty: 0,
    selfPreservation: 0,
    leadership: 0,
    adaptability: 0
  };
  
  // Analyze each moral choice with sophisticated scoring
  answers.forEach((answer) => {
    const answerText = answer.selectedAnswer.toLowerCase();
    
    // Courage assessment
    if (answerText.includes('fight') || answerText.includes('stand') || answerText.includes('protect')) {
      psychologyMetrics.courage += 2;
    }
    if (answerText.includes('retreat') || answerText.includes('avoid') || answerText.includes('hide')) {
      psychologyMetrics.courage -= 1;
      psychologyMetrics.selfPreservation += 1;
    }
    
    // Wisdom assessment
    if (answerText.includes('think') || answerText.includes('plan') || answerText.includes('consider')) {
      psychologyMetrics.wisdom += 2;
    }
    if (answerText.includes('negotiate') || answerText.includes('diplomacy') || answerText.includes('peaceful')) {
      psychologyMetrics.wisdom += 1;
      psychologyMetrics.empathy += 1;
    }
    
    // Empathy and compassion
    if (answerText.includes('help') || answerText.includes('save') || answerText.includes('assist')) {
      psychologyMetrics.empathy += 2;
    }
    if (answerText.includes('ignore') || answerText.includes('leave') || answerText.includes('abandon')) {
      psychologyMetrics.empathy -= 1;
      psychologyMetrics.selfPreservation += 1;
    }
    
    // Justice and moral standing
    if (answerText.includes('justice') || answerText.includes('right') || answerText.includes('fair')) {
      psychologyMetrics.justice += 2;
    }
    if (answerText.includes('corrupt') || answerText.includes('cheat') || answerText.includes('steal')) {
      psychologyMetrics.justice -= 2;
    }
    
    // Loyalty assessment
    if (answerText.includes('loyal') || answerText.includes('faithful') || answerText.includes('honor')) {
      psychologyMetrics.loyalty += 2;
    }
    if (answerText.includes('betray') || answerText.includes('abandon') || answerText.includes('switch')) {
      psychologyMetrics.loyalty -= 1;
    }
    
    // Leadership qualities
    if (answerText.includes('lead') || answerText.includes('command') || answerText.includes('organize')) {
      psychologyMetrics.leadership += 2;
    }
    if (answerText.includes('follow') || answerText.includes('submit') || answerText.includes('obey')) {
      psychologyMetrics.leadership -= 1;
    }
    
    // Adaptability
    if (answerText.includes('adapt') || answerText.includes('change') || answerText.includes('flexible')) {
      psychologyMetrics.adaptability += 1;
    }
  });
  
  // Calculate trait modifications based on psychological profile
  const strengthModifier = Math.floor((psychologyMetrics.courage + psychologyMetrics.justice) / 2) * 150; // More significant growth
  const witModifier = (psychologyMetrics.wisdom + Math.floor(psychologyMetrics.adaptability / 2)) * 120;
  const charismaModifier = (psychologyMetrics.empathy + psychologyMetrics.leadership) * 130;
  const defenceModifier = (psychologyMetrics.loyalty + Math.floor(psychologyMetrics.selfPreservation / 2)) * 140;
  const luckModifier = Math.floor((psychologyMetrics.courage + psychologyMetrics.wisdom + psychologyMetrics.empathy) / 3) * 100;
  
  // Apply modifications with growth potential (remove artificial constraints)
  const newTraits = {
    strength: Math.max(25, currentTraits.strength + strengthModifier),
    wit: Math.max(25, currentTraits.wit + witModifier),
    charisma: Math.max(25, currentTraits.charisma + charismaModifier),
    defence: Math.max(25, currentTraits.defence + defenceModifier),
    luck: Math.max(25, currentTraits.luck + luckModifier)
  };
  
  // Generate personality analysis
  const dominantTrait = Object.entries(psychologyMetrics).reduce((a, b) => 
    psychologyMetrics[a[0] as keyof typeof psychologyMetrics] > psychologyMetrics[b[0] as keyof typeof psychologyMetrics] ? a : b
  )[0];
  
  const analysis = `Through the trials of the Gurukul, your warrior has shown a dominant inclination toward ${dominantTrait}. ` +
    `The moral choices made reveal a complex character with courage level ${psychologyMetrics.courage}, ` +
    `wisdom ${psychologyMetrics.wisdom}, and empathy ${psychologyMetrics.empathy}. ` +
    `These experiences have shaped the warrior's inner essence, manifesting in evolved traits that reflect their spiritual growth.`;
  
  console.log('📊 Psychology metrics:', psychologyMetrics);
  console.log('🎯 Trait modifications applied');
  
  return {
    analysis,
    traits: newTraits,
    reasoning: {
      strength: `Modified by courage (${psychologyMetrics.courage}) and justice (${psychologyMetrics.justice}) scores`,
      wit: `Enhanced by wisdom (${psychologyMetrics.wisdom}) and adaptability (${psychologyMetrics.adaptability}) traits`,
      charisma: `Influenced by empathy (${psychologyMetrics.empathy}) and leadership (${psychologyMetrics.leadership}) qualities`,
      defence: `Strengthened by loyalty (${psychologyMetrics.loyalty}) and self-preservation (${psychologyMetrics.selfPreservation}) instincts`,
      luck: `Balanced by overall moral character and decision-making patterns`
    }
  };
}
