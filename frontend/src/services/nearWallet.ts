import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";

export interface NearAuthData {
  signature: string;
  accountId: string;
  publicKey: string;
  message: string;
  nonce: Buffer;
  recipient: string;
  callbackUrl: string;
}

class NearWalletService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private selector: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private wallet: any = null;

  async initialize() {
    // Only initialize in the browser, not on the server
    if (typeof window === 'undefined') {
      throw new Error('NEAR wallet can only be initialized in the browser');
    }
    
    try {
      console.log("Setting up NEAR wallet selector...");
      this.selector = await setupWalletSelector({
        network: "mainnet",
        modules: [
          setupMyNearWallet(),
          setupHereWallet(),
          setupMeteorWallet(),
        ],
      });
      console.log("NEAR wallet selector initialized successfully");
    } catch (error) {
      console.error("Failed to initialize NEAR wallet selector:", error);
      throw new Error(`Failed to initialize wallet selector: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async connectWallet() {
    // Only run in the browser
    if (typeof window === 'undefined') {
      throw new Error('NEAR wallet can only be used in the browser');
    }
    
    try {
      if (!this.selector) {
        console.log("Initializing NEAR wallet selector...");
        await this.initialize();
      }

      console.log("Selector initialized:", this.selector);
      
      // Get available wallet modules
      const wallets = await this.selector.store.getState().modules;
      console.log("Available wallet modules:", wallets);
      
      if (!wallets || wallets.length === 0) {
        throw new Error("No wallet modules available. Please install a NEAR wallet extension.");
      }

      // Try to find an available wallet by checking if the wallet is installed
      let selectedWallet = null;
      
      // First, try Meteor Wallet since you mentioned you have it installed
      const meteorWallet = wallets.find((w: any) => w.id === 'meteor-wallet');
      if (meteorWallet) {
        console.log("Found Meteor Wallet, attempting to connect...");
        selectedWallet = meteorWallet;
      } else {
        // Fallback to first available wallet
        selectedWallet = wallets[0];
        console.log(`Using fallback wallet: ${selectedWallet.metadata.name}`);
      }

      if (!selectedWallet) {
        throw new Error("No NEAR wallets found. Please install Meteor Wallet, My NEAR Wallet, or Here Wallet.");
      }

      console.log("Connecting to wallet:", selectedWallet.metadata.name);
      
      // Get the wallet instance
      this.wallet = await this.selector.wallet(selectedWallet.id);
      console.log("Wallet instance created:", this.wallet);
      
      // For NEAR AI, we only need the wallet for signing messages
      // No contract sign-in needed - this avoids gas allowance
      console.log("Wallet connected successfully - ready for message signing");
      return { success: true, wallet: selectedWallet.metadata.name };
      
    } catch (error) {
      console.error("Detailed wallet connection error:", error);
      throw error;
    }
  }

  async signMessage(message: string): Promise<NearAuthData> {
    if (!this.wallet) {
      throw new Error("Wallet not connected");
    }

    // Generate nonce based on current time in milliseconds and
    // pad it with zeros to ensure its exactly 32 bytes in length
    const nonce = Buffer.from(Date.now().toString().padStart(32, '0'));
    const recipient = "api.near.ai"; // NEAR AI recipient
    const callbackUrl = window.location.origin; // Current domain as callback

    console.log("Signing message with params:", {
      message,
      nonce: nonce.toString(),
      recipient,
      callbackUrl
    });

    try {
      const signedMessage = await this.wallet.signMessage({
        message,
        nonce,
        recipient,
        callbackUrl
      });

      console.log("Signed message result:", signedMessage);

      const authData = {
        signature: signedMessage.signature,
        accountId: signedMessage.accountId,
        publicKey: signedMessage.publicKey,
        message,
        nonce, // Keep original Buffer format
        recipient,
        callbackUrl
      };

      console.log("Final auth data:", authData);

      return authData;
    } catch (error) {
      console.error("Error signing message:", error);
      throw error;
    }
  }

  async login(): Promise<NearAuthData> {
    await this.connectWallet();
    return await this.signMessage("Login to NEAR AI");
  }

  isConnected(): boolean {
    if (typeof window === 'undefined') return false;
    return this.wallet !== null && this.selector !== null;
  }

  getAccountId(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      if (this.wallet && this.wallet.getAccountId) {
        return this.wallet.getAccountId();
      }
      // Fallback: check if there's an active account in the selector
      if (this.selector && this.selector.store) {
        const state = this.selector.store.getState();
        return state.accounts?.[0]?.accountId || null;
      }
      return null;
    } catch (error) {
      console.error("Error getting account ID:", error);
      return null;
    }
  }
}

export const nearWalletService = new NearWalletService();
