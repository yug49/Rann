# NEAR AI Integration for Chaavani

This implementation integrates NEAR AI agent with the Chaavani page to generate character attributes based on user prompts.

## Implementation Overview

### Files Created/Modified

1. **`/src/services/nearWallet.ts`** - NEAR wallet connection service
2. **`/src/services/nearAI.ts`** - NEAR AI API integration service
3. **`/src/app/chaavani/page.tsx`** - Updated to use NEAR AI services

### Features Added

-   ✅ NEAR wallet connection using NEAR wallet selector
-   ✅ Authentication with NEAR AI API using signed messages
-   ✅ Integration with your existing AI agent: `samkitsoni.near/attributes-generator/latest`
-   ✅ Character prompt input field integration
-   ✅ Console logging of AI responses as requested
-   ✅ Error handling and user feedback
-   ✅ Wallet connection status display

## How to Use

1. **Navigate to Chaavani page** (`/chaavani`)
2. **Enable AI Mode** by toggling the AI switch in the top right
3. **Connect NEAR Wallet** using the "CONNECT NEAR WALLET" button
4. **Enter your character prompt** in the "CHARACTER PROMPT" text area
5. **Click "GENERATE WITH NEAR AI"** to call your NEAR AI agent
6. **Check the browser console** to see the AI response output

## Technical Details

### Authentication Flow

```
1. User connects NEAR wallet → nearWalletService.connectWallet()
2. Generate signed message → wallet.signMessage("Login to NEAR AI")
3. Create OpenAI client → new OpenAI({ apiKey: Bearer ${JSON.stringify(auth)} })
4. Make API calls to https://api.near.ai/v1
```

### API Integration

```
1. Create thread → openai.beta.threads.create()
2. Add user message → openai.beta.threads.messages.create()
3. Run assistant → openai.beta.threads.runs.createAndPoll()
4. Get response → openai.beta.threads.messages.list()
```

### Console Output

The NEAR AI agent response will be logged to the browser console with:

```
console.log("NEAR AI Agent Response:", response);
```

## Configuration

The assistant ID is defined in `/src/constants.ts`:

```typescript
export const chaavani_attributes_generator_assistant_id =
    "samkitsoni.near/attributes-generator/latest";
```

## Dependencies Used

-   `@near-wallet-selector/core` - Core wallet selector functionality
-   `@near-wallet-selector/my-near-wallet` - My NEAR Wallet support
-   `@near-wallet-selector/here-wallet` - Here Wallet support
-   `@near-wallet-selector/meteor-wallet` - Meteor Wallet support
-   `openai` - OpenAI client library (compatible with NEAR AI API)

## Error Handling

The implementation includes comprehensive error handling:

-   Wallet connection failures
-   API authentication errors
-   AI agent response errors
-   Network connectivity issues

All errors are logged to console and displayed to the user through the UI.

## Testing

1. Start the development server: `npm run dev`
2. Navigate to http://localhost:3000/chaavani
3. Toggle AI mode ON
4. Connect your NEAR wallet
5. Enter a character prompt like: "Create a fierce warrior skilled in archery and strategy"
6. Click "GENERATE WITH NEAR AI"
7. Check browser console for the AI response

## Response Format

The AI agent response will be printed to console exactly as received. The UI will attempt to parse it as JSON, and if that fails, will use the raw response text for character generation.

Expected format (adjust based on your agent's output):

```json
{
    "name": "Generated character name",
    "bio": "Character biography",
    "life_history": "Character background",
    "adjectives": "Character traits",
    "knowledge_areas": "Areas of expertise"
}
```

## Troubleshooting

**Wallet won't connect**: Ensure you have a NEAR wallet extension installed (My NEAR Wallet, Here Wallet, etc.)

**API errors**: Check browser console for detailed error messages. Ensure your NEAR AI agent is accessible and working.

**No response**: Verify the assistant ID in constants.ts matches your deployed agent.
