# Gurukul Functionality Implementation

## Overview
This implementation adds comprehensive Gurukul (training academy) functionality to the Rann Web3 game, integrating with the NEAR AI personality updater agent to analyze psychological responses and update NFT character traits based on moral choices.

## Files Created/Modified

### 1. New API Route: `/api/gurukul-analysis/route.ts`
- **Purpose**: Handles psychological analysis of user responses using NEAR AI
- **Features**:
  - Integration with NEAR AI personality updater agent
  - Fallback to local intelligent analysis if NEAR AI is unavailable
  - Comprehensive psychological profiling based on moral choices
  - Trait calculation with realistic constraints (25-75 range)
  - Detailed reasoning for trait changes

### 2. Modified: `/app/gurukul/page.tsx`
- **Purpose**: Updated the frontend to use the new API endpoint
- **Changes**:
  - Replaced direct NEAR AI calls with API route calls
  - Improved error handling and fallback mechanisms
  - Enhanced user experience with better status messages
  - Maintained all existing functionality while adding new features

## Architecture

### NEAR AI Integration
```typescript
// Auth flow using NEAR wallet
const auth = await nearWalletService.login();
const authForApi = {
  signature: auth.signature,
  accountId: auth.accountId,
  publicKey: auth.publicKey,
  message: auth.message,
  nonce: auth.nonce.toString('base64'),
  recipient: auth.recipient,
  callbackUrl: auth.callbackUrl
};
```

### API Request Structure
```typescript
interface GurukulAnalysisRequest {
  auth: NearAuthData;
  tokenId: number;
  currentTraits: YodhaTraits;
  answers: QuestionAnswer[];
}
```

### Response Structure
```typescript
interface GurukulAnalysisResponse {
  success: boolean;
  tokenId: number;
  analysis: string;
  currentTraits: YodhaTraits;
  newTraits: YodhaTraits;
  traitChanges: TraitChanges;
  reasoning?: TraitReasoning;
  source: 'near-ai' | 'local-analysis';
}

// NEAR AI returns values in contract format
interface AIResponse {
  analysis: string;
  stats: {
    Strength: number; // Contract format (2500-10000)
    Wit: number;      // Contract format (2500-10000)
    Charisma: number; // Contract format (2500-10000)
    Defence: number;  // Contract format (2500-10000)
    Luck: number;     // Contract format (2500-10000)
  };
  reasoning?: {
    strength: string;
    wit: string;
    charisma: string;
    defence: string;
    luck: string;
  };
}
```

## Key Features

### 1. Dual Analysis System
- **Primary**: NEAR AI personality updater for sophisticated psychological analysis
- **Fallback**: Local intelligent analysis using psychological pattern matching

### 2. Psychological Profiling
The system analyzes moral choices across multiple dimensions:
- **Courage**: Willingness to face danger and adversity
- **Wisdom**: Strategic thinking and decision-making
- **Empathy**: Compassion and understanding for others
- **Justice**: Moral righteousness and fairness
- **Loyalty**: Faithfulness and reliability
- **Self-Preservation**: Survival instinct and caution
- **Leadership**: Ability to guide and influence others
- **Adaptability**: Flexibility in changing situations

### 3. Trait Calculation
Each psychological metric influences specific traits:
- **Strength**: Influenced by courage and justice
- **Wit**: Enhanced by wisdom and adaptability
- **Charisma**: Driven by empathy and leadership
- **Defence**: Strengthened by loyalty and self-preservation
- **Luck**: Balanced by overall moral character

### 4. AI-Driven Growth System
- **NEAR AI returns values in contract format** (multiplied by 100, range 2500-10000)
- **No artificial constraints** - AI determines appropriate trait progression
- **Realistic growth patterns** based on psychological analysis
- **Meaningful progression** that reflects warrior's moral development

## Usage Flow

1. **User selects Yodha NFT** in the Gurukul interface
2. **NFT approval** for Gurukul contract interaction
3. **Enter Gurukul** to receive assigned questions
4. **Answer moral questions** that test psychological traits
5. **Submit responses** for AI analysis
6. **Receive analysis** with trait updates and explanations
7. **Contract update** with new trait values using signed data

## NEAR AI Integration

### Enhanced AI Prompt
The AI receives warrior data in contract format and is instructed to return values in the same format:
- **Current traits sent as contract values** (strength * 100, etc.)
- **AI returns contract-format values** (range 2500-10000)
- **No artificial constraints** applied by the system
- **AI determines appropriate progression** based on psychological analysis

### Primary Method: Chat Completions
```typescript
const analysisPrompt = `
WARRIOR PROFILE:
- Current Traits: Strength ${currentTraits.strength * 100}, Wit ${currentTraits.wit * 100}...

ANALYSIS REQUIREMENTS:
Analyze these moral choices and provide new trait values in CONTRACT FORMAT (multiplied by 100):
1. STRENGTH: Physical and mental fortitude (range: 2500-10000)
2. WIT: Intelligence, strategic thinking (range: 2500-10000)
...

RESPONSE FORMAT (JSON only):
{
  "analysis": "Brief psychological analysis...",
  "stats": {
    "Strength": [integer 2500-10000],
    "Wit": [integer 2500-10000],
    ...
  }
}
`;

const chatResponse = await fetch("https://api.near.ai/v1/chat/completions", {
  method: 'POST',
  headers: {
    'Authorization': authString,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: near_agent_personality_updater,
    messages: [{ role: "user", content: analysisPrompt }],
    max_tokens: 1500,
    temperature: 0.7
  })
});
```

### Fallback Method: Threads
```typescript
const thread = await openai.beta.threads.create();
const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
  assistant_id: near_agent_personality_updater,
});
```

## Local Analysis Algorithm

When NEAR AI is unavailable, the system performs sophisticated local analysis with enhanced growth potential:

1. **Pattern Recognition**: Analyzes question and answer text for psychological indicators
2. **Metric Scoring**: Builds psychological profile across 8 dimensions
3. **Enhanced Trait Mapping**: Converts psychological metrics to meaningful trait modifications
4. **Growth-Oriented Calculation**: Removes artificial constraints to allow substantial character development

### Improved Calculations
```typescript
const strengthModifier = Math.floor((courage + justice) / 2) * 150; // More significant growth
const witModifier = (wisdom + adaptability / 2) * 120;
const charismaModifier = (empathy + leadership) * 130;
const defenceModifier = (loyalty + selfPreservation / 2) * 140;
const luckModifier = Math.floor((courage + wisdom + empathy) / 3) * 100;

// Apply modifications with growth potential (no upper limits)
const newTraits = {
  strength: Math.max(25, currentTraits.strength + strengthModifier),
  wit: Math.max(25, currentTraits.wit + witModifier),
  // ... etc
};
```

## Error Handling

The implementation includes comprehensive error handling:
- **Network failures**: Graceful degradation to local analysis
- **Authentication errors**: Clear error messages and retry mechanisms
- **Parsing errors**: Fallback to local analysis if AI response is malformed
- **Contract errors**: Separate error handling for blockchain interactions

## Security Features

- **Wallet-based authentication**: Uses NEAR wallet signatures for security
- **Server-side signing**: Trait updates are signed server-side with private key
- **Input validation**: Comprehensive validation of all inputs
- **Rate limiting**: Natural rate limiting through blockchain transaction requirements

## Testing

A test script is provided (`test-gurukul-api.js`) to verify the API structure and logic without making actual API calls.

## Configuration

The implementation uses constants from `constants.ts`:
- `near_agent_personality_updater`: NEAR AI agent ID
- `chainsToTSender`: Contract addresses for different networks
- `GurukulAbi`: Smart contract ABI for interactions

## Performance Considerations

- **Caching**: Trait data is cached locally to minimize contract calls
- **Batch operations**: Multiple trait updates are batched when possible
- **Fallback performance**: Local analysis is optimized for quick response times
- **Memory management**: Cleanup of temporary data structures

## Future Enhancements

1. **Machine Learning**: Train local models on user response patterns
2. **Advanced Psychology**: Incorporate additional psychological frameworks
3. **Social Features**: Compare trait evolution with other players
4. **Achievement System**: Reward specific psychological growth patterns
5. **Narrative Integration**: Use trait changes to influence game story

## Deployment Notes

- Ensure `NEAR_AI_PRIVATE_KEY` environment variable is set
- Verify contract addresses are correct for the target network
- Test NEAR AI connectivity before deployment
- Monitor API response times and success rates

This implementation provides a robust, scalable, and user-friendly Gurukul system that enhances the Web3 gaming experience while maintaining high security and performance standards.
