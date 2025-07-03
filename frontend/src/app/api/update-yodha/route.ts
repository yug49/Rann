import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { keccak256, encodePacked } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

interface MoralChoice {
  questionId: number;
  question: string;
  selectedAnswer: string;
  optionId: number;
}

interface CurrentTraits {
  strength: number;
  wit: number;
  charisma: number;
  defence: number;
  luck: number;
}

interface NearAuth {
  signature: string;
  accountId: string;
  publicKey: string;
  message: string;
  nonce: number[];
  recipient: string;
  callbackUrl: string;
}

interface UpdateYodhaRequest {
  tokenId: string;
  currentTraits: CurrentTraits;
  moralChoices: MoralChoice[];
  nearAuth?: NearAuth;
}

interface UpdateYodhaResponse {
  success: boolean;
  traits: CurrentTraits;
  signature: string;
  analysis?: string;
  strategy: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UpdateYodhaResponse | { error: string }>> {
  try {
    console.log('🎯 Starting NEAR AI Yodha trait update process...');
    
    const body: UpdateYodhaRequest = await request.json();
    const { tokenId, currentTraits, moralChoices, nearAuth } = body;
    
    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 });
    }

    console.log(`📝 Received update request for: Yodha #${tokenId}`);
    console.log(`🤔 Processing ${moralChoices.length} moral choices`);
    
    if (nearAuth) {
      console.log(`🔐 NEAR wallet authentication: ${nearAuth.accountId}`);
      console.log(`📝 Signed message: ${nearAuth.message}`);
    }

    // Use NEAR AI with the specific agent and wallet authentication
    let traits = await tryNearAI(moralChoices, currentTraits, nearAuth);
    let strategy = 'NEAR_AI';
    
    if (!traits) {
      console.log('🚀 NEAR AI failed, using intelligent local analysis...');
      traits = generateIntelligentLocalAnalysis(moralChoices, currentTraits);
      strategy = 'LOCAL_INTELLIGENT';
    }

    console.log(`📊 Final trait analysis completed: ${JSON.stringify(traits)}`);

    // Generate cryptographic signature
    const signature = await generateTraitSignature(tokenId, traits);

    return NextResponse.json({
      success: true,
      traits,
      signature,
      strategy
    });

  } catch (error) {
    console.error('❌ Error in trait update:', error);
    return NextResponse.json({ 
      error: 'Failed to update traits', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function tryNearAI(moralChoices: MoralChoice[], currentTraits: CurrentTraits, nearAuth?: NearAuth): Promise<CurrentTraits | null> {
  try {
    console.log('🔄 Attempting NEAR AI psychological analysis...');
    
    const nearAccountId = process.env.NEAR_AGENT_ACCOUNT_ID;
    const nearPrivateKey = process.env.NEAR_AGENT_PRIVATE_KEY;
    
    if (!nearAccountId || !nearPrivateKey) {
      console.log('❌ NEAR credentials not configured - missing NEAR_AGENT_ACCOUNT_ID or NEAR_AGENT_PRIVATE_KEY');
      return null;
    }

    console.log(`🔐 Using NEAR account: ${nearAccountId}`);

    // Initialize OpenAI client for NEAR AI
    const openai = new OpenAI({
      baseURL: 'https://api.near.ai/v1',
      apiKey: nearPrivateKey
    });

    // Fix the model path - use only the agent name without duplication
    const model = `${nearAccountId}/personality-analyzer/latest`;
    console.log(`🤖 Using NEAR AI personality analyzer: ${model}`);

    // Format the payload for NEAR AI agent with wallet authentication
    const nearAIPayload = {
      agent_request: {
        moral_choices: moralChoices.map(choice => ({
          question_id: choice.questionId,
          question_text: choice.question,
          selected_answer: choice.selectedAnswer,
          option_id: choice.optionId
        })),
        current_traits: {
          strength: currentTraits.strength,
          wit: currentTraits.wit,
          charisma: currentTraits.charisma,
          defence: currentTraits.defence,
          luck: currentTraits.luck
        },
        instructions: "Analyze the moral choices and update the warrior traits based on psychological patterns. Return only JSON format with updated trait values between 25-75."
      },
      wallet_authentication: nearAuth ? {
        account_id: nearAuth.accountId,
        signature: nearAuth.signature,
        public_key: nearAuth.publicKey,
        message: nearAuth.message,
        nonce: nearAuth.nonce,
        recipient: nearAuth.recipient
      } : null
    };

    console.log(`📤 NEAR AI Payload:`, JSON.stringify(nearAIPayload, null, 2));

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [{ 
        role: 'user', 
        content: JSON.stringify(nearAIPayload)
      }],
      temperature: 0.7,
      max_tokens: 1000
    });

    if (completion.choices?.[0]?.message?.content) {
      const response = completion.choices[0].message.content;
      console.log(`🧠 NEAR AI Response: ${response}`);
      return parseAIResponse(response, currentTraits);
    }

    return null;
  } catch (error) {
    console.error(`❌ NEAR AI failed:`, error);
    return null;
  }
}

function generateIntelligentLocalAnalysis(moralChoices: MoralChoice[], currentTraits: CurrentTraits): CurrentTraits {
  console.log('🧠 Performing intelligent psychological analysis...');
  console.log(`📊 Raw moral choices data: ${JSON.stringify(moralChoices, null, 2)}`);
  
  // Validate choices
  const validChoices = moralChoices.filter(choice => 
    choice.questionId !== undefined && choice.question && choice.selectedAnswer
  );
  
  console.log(`✅ Valid choices: ${validChoices.length}/${moralChoices.length}`);

  // Initialize analysis metrics
  const metrics = {
    justice: 0,
    compassion: 0,
    courage: 0,
    wisdom: 0,
    pragmatism: 0,
    loyalty: 0,
    selfPreservation: 0,
    altruism: 0
  };

  // Analyze each choice
  validChoices.forEach(choice => {
    console.log(`🔍 Analyzing choice: "${choice.question}" -> "${choice.selectedAnswer}"`);
    
    const question = choice.question.toLowerCase();
    const answer = choice.selectedAnswer.toLowerCase();

    // Justice-based analysis
    if (question.includes('wallet') || question.includes('money')) {
      if (answer.includes('return') || answer.includes('owner')) {
        metrics.justice += 3;
        metrics.altruism += 2;
      } else if (answer.includes('keep')) {
        metrics.pragmatism += 2;
        metrics.selfPreservation += 1;
      }
    }

    // Life/death moral dilemmas
    if (question.includes('train') || question.includes('trolley')) {
      if (answer.includes('pull') || answer.includes('divert')) {
        metrics.courage += 2;
        metrics.pragmatism += 2;
      } else if (answer.includes('nothing') || answer.includes("don't")) {
        metrics.justice += 1;
        metrics.wisdom += 1;
      } else if (answer.includes('stop')) {
        metrics.courage += 3;
        metrics.compassion += 2;
      }
    }

    // Risk/sacrifice scenarios
    if (question.includes('bomb') || question.includes('danger')) {
      if (answer.includes('stay') || answer.includes('sacrifice')) {
        metrics.courage += 3;
        metrics.altruism += 3;
      } else if (answer.includes('escape')) {
        metrics.selfPreservation += 2;
      } else if (answer.includes('help') || answer.includes('delegate')) {
        metrics.wisdom += 1;
        metrics.pragmatism += 1;
      }
    }

    // AI/technology ethics
    if (question.includes('ai') || question.includes('artificial')) {
      if (answer.includes('oversight') || answer.includes('strict')) {
        metrics.wisdom += 2;
        metrics.justice += 1;
      } else if (answer.includes('allow') || answer.includes('yes')) {
        metrics.pragmatism += 2;
      } else if (answer.includes('no') || answer.includes('dangerous')) {
        metrics.wisdom += 3;
      }
    }

    // Family/loyalty dilemmas
    if (question.includes('mother') || question.includes('child') || question.includes('family')) {
      if (answer.includes('mother') || answer.includes('parent')) {
        metrics.loyalty += 2;
        metrics.wisdom += 1;
      } else if (answer.includes('child')) {
        metrics.compassion += 2;
        metrics.altruism += 1;
      }
    }

    // Crime/justice scenarios
    if (question.includes('crime') || question.includes('loved one')) {
      if (answer.includes('turn') || answer.includes('justice')) {
        metrics.justice += 3;
        metrics.courage += 1;
      } else if (answer.includes('silent') || answer.includes('protect')) {
        metrics.loyalty += 2;
        metrics.compassion += 1;
      }
    }
  });

  console.log(`📈 Analysis metrics: ${JSON.stringify(metrics)}`);

  // Calculate trait modifications based on analysis
  const strengthModifier = metrics.courage + metrics.justice - metrics.selfPreservation;
  const witModifier = metrics.wisdom + metrics.pragmatism;
  const charismaModifier = metrics.altruism + metrics.compassion;
  const defenceModifier = metrics.loyalty + metrics.selfPreservation;
  const luckModifier = Math.floor((metrics.courage + metrics.wisdom) / 2);

  // Apply modifications to current traits (with realistic ranges)
  const traitChanges = {
    strength: Math.min(75, Math.max(25, currentTraits.strength + strengthModifier)),
    wit: Math.min(75, Math.max(25, currentTraits.wit + witModifier)),
    charisma: Math.min(75, Math.max(25, currentTraits.charisma + charismaModifier)),
    defence: Math.min(75, Math.max(25, currentTraits.defence + defenceModifier)),
    luck: Math.min(75, Math.max(25, currentTraits.luck + luckModifier))
  };

  console.log(`🎯 Current traits: ${JSON.stringify(currentTraits)}`);
  console.log(`🔄 Trait modifiers: STR:${strengthModifier}, WIT:${witModifier}, CHA:${charismaModifier}, DEF:${defenceModifier}, LUK:${luckModifier}`);
  console.log(`🎯 Final traits: ${JSON.stringify(traitChanges)}`);
  console.log('✅ Local analysis successful!');
  
  return traitChanges;
}

function parseAIResponse(response: string, fallbackTraits: CurrentTraits): CurrentTraits {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the traits
      const traits: CurrentTraits = {
        strength: Math.min(75, Math.max(25, parsed.strength || fallbackTraits.strength)),
        wit: Math.min(75, Math.max(25, parsed.wit || fallbackTraits.wit)),
        charisma: Math.min(75, Math.max(25, parsed.charisma || fallbackTraits.charisma)),
        defence: Math.min(75, Math.max(25, parsed.defence || fallbackTraits.defence)),
        luck: Math.min(75, Math.max(25, parsed.luck || fallbackTraits.luck))
      };
      
      console.log(`✅ Parsed AI response: ${JSON.stringify(traits)}`);
      return traits;
    }
  } catch (error) {
    console.error('❌ Failed to parse AI response:', error);
  }
  
  // Return fallback traits if parsing fails
  console.log('⚠️ Using fallback traits due to parsing failure');
  return fallbackTraits;
}

async function generateTraitSignature(tokenId: string, traits: CurrentTraits): Promise<string> {
  try {
    // Get NEAR AI private key from environment
    const nearPrivateKey = process.env.NEAR_AI_PRIVATE_KEY;
    if (!nearPrivateKey) {
      throw new Error('NEAR_AI_PRIVATE_KEY not configured');
    }

    // Create account from private key
    const formattedKey = nearPrivateKey.startsWith('0x') ? nearPrivateKey : `0x${nearPrivateKey}`;
    const account = privateKeyToAccount(formattedKey as `0x${string}`);

    // Generate the packed data hash (matching Gurukul.sol format)
    const packedData = encodePacked(
      ['uint256', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
      [
        BigInt(tokenId),
        traits.strength,
        traits.wit,
        traits.charisma,
        traits.defence,
        traits.luck
      ]
    );

    // Create message hash
    const messageHash = keccak256(packedData);

    // Sign the message hash
    const signature = await account.signMessage({ 
      message: { raw: messageHash }
    });

    console.log(`✍️ Generated signature for token ${tokenId}: ${signature}`);
    return signature;

  } catch (error) {
    console.error('❌ Signature generation failed:', error);
    throw error;
  }
} 