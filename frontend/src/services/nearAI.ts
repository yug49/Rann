import OpenAI from "openai";
import { nearWalletService, type NearAuthData } from "./nearWallet";

export interface AIResponse {
  role: "assistant" | "user";
  content: string;
}

class NearAIService {
  private openai: OpenAI | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private thread: any = null;

  private async initializeClient(auth: NearAuthData) {
    this.openai = new OpenAI({
      baseURL: "https://api.near.ai/v1",
      apiKey: `Bearer ${JSON.stringify(auth)}`,
      dangerouslyAllowBrowser: true, // Safe for NEAR AI since we use wallet signatures, not secret keys
    });
  }

  async generateCharacterAttributes(prompt: string): Promise<string> {
    try {
      // Ensure wallet is connected and get authentication
      const auth = await nearWalletService.login();

      // Create a serializable version of auth for sending to backend
      const authForApi = {
        signature: auth.signature,
        accountId: auth.accountId,
        publicKey: auth.publicKey,
        message: auth.message,
        nonce: auth.nonce.toString('base64'), // Convert Buffer to base64 string
        recipient: auth.recipient,
        callbackUrl: auth.callbackUrl
      };

      // Call our backend API route instead of calling NEAR AI directly
      // This avoids CORS issues while following the exact NEAR AI docs on the backend
      const response = await fetch('/api/near-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth: authForApi,
          prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error from NEAR AI');
      }

      console.log("NEAR AI Agent Response:", data.response);
      return data.response;

    } catch (error) {
      console.error("Error calling NEAR AI:", error);
      throw error;
    }
  }

  async getConversationHistory(): Promise<AIResponse[]> {
    if (!this.openai || !this.thread) {
      return [];
    }

    try {
      const messages = await this.openai.beta.threads.messages.list(
        this.thread.id
      );

      return messages.data.reverse().map(message => ({
        role: message.role as "assistant" | "user",
        content: message.content[0].type === 'text' 
          ? message.content[0].text.value 
          : "Non-text content"
      }));
    } catch (error) {
      console.error("Error getting conversation history:", error);
      return [];
    }
  }
}

export const nearAIService = new NearAIService();
