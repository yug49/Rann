/**
 * Crypto Service
 * 
 * Handles cryptographic operations including ECDSA signing,
 * wallet operations, and secure random generation
 * 
 * @author Rann Team
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import type { 
  CryptoService as ICryptoService,
  SignatureResult,
  WalletInfo,
  EncryptionResult 
} from '../types';

export class CryptoService implements ICryptoService {
  private wallet?: ethers.Wallet;
  private isInitialized = false;

  constructor() {
    // Will be initialized in initialize method
  }

  /**
   * Initialize crypto service
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize wallet from private key if provided
      const privateKey = process.env.SIGNING_PRIVATE_KEY;
      
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey);
        console.log(`✅ Crypto service initialized with wallet: ${this.wallet.address}`);
      } else {
        // Generate a new wallet for development
        this.wallet = ethers.Wallet.createRandom();
        console.log(`⚠️ No signing key provided, generated temporary wallet: ${this.wallet.address}`);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Crypto service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check service health
   */
  public async isHealthy(): Promise<boolean> {
    return this.isInitialized && this.wallet !== undefined;
  }

  /**
   * Sign message with service wallet
   */
  public async signMessage(message: string): Promise<SignatureResult> {
    if (!this.wallet) {
      throw new Error('Crypto service not initialized');
    }

    try {
      const signature = await this.wallet.signMessage(message);
      const messageHash = ethers.hashMessage(message);

      return {
        signature,
        messageHash,
        address: this.wallet.address,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Message signing failed:', error);
      throw error;
    }
  }

  /**
   * Sign typed data (EIP-712)
   */
  public async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ): Promise<SignatureResult> {
    if (!this.wallet) {
      throw new Error('Crypto service not initialized');
    }

    try {
      const signature = await this.wallet.signTypedData(domain, types, value);
      const messageHash = ethers.TypedDataEncoder.hash(domain, types, value);

      return {
        signature,
        messageHash,
        address: this.wallet.address,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Typed data signing failed:', error);
      throw error;
    }
  }

  /**
   * Verify message signature
   */
  public async verifySignature(
    message: string,
    signature: string,
    expectedAddress: string
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      console.error('❌ Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify typed data signature
   */
  public async verifyTypedDataSignature(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>,
    signature: string,
    expectedAddress: string
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      console.error('❌ Typed data signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate secure random bytes
   */
  public generateRandomBytes(length: number = 32): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Generate secure random hex string
   */
  public generateRandomHex(length: number = 32): string {
    return this.generateRandomBytes(length).toString('hex');
  }

  /**
   * Generate secure random alphanumeric string
   */
  public generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Generate nonce for authentication
   */
  public generateNonce(): string {
    return this.generateRandomHex(16);
  }

  /**
   * Hash data using SHA-256
   */
  public hashData(data: string | Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * Hash data using Keccak-256 (Ethereum standard)
   */
  public keccakHash(data: string | Buffer): string {
    return ethers.keccak256(
      typeof data === 'string' ? ethers.toUtf8Bytes(data) : data
    );
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  public encryptData(
    data: string | Buffer,
    password: string
  ): EncryptionResult {
    try {
      const salt = this.generateRandomBytes(16);
      const iv = this.generateRandomBytes(12);
      
      // Derive key using PBKDF2
      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
      
      const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: 'aes-256-gcm'
      };
    } catch (error) {
      console.error('❌ Data encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  public decryptData(
    encryptionResult: EncryptionResult,
    password: string
  ): string {
    try {
      const salt = Buffer.from(encryptionResult.salt, 'hex');
      const iv = Buffer.from(encryptionResult.iv, 'hex');
      const authTag = Buffer.from(encryptionResult.authTag, 'hex');
      
      // Derive key using PBKDF2
      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
      
      const decipher = crypto.createDecipherGCM('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptionResult.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Data decryption failed:', error);
      throw error;
    }
  }

  /**
   * Generate wallet from mnemonic
   */
  public generateWalletFromMnemonic(mnemonic: string, index: number = 0): WalletInfo {
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${index}`);
      
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
        mnemonic: wallet.mnemonic?.phrase,
        index
      };
    } catch (error) {
      console.error('❌ Wallet generation from mnemonic failed:', error);
      throw error;
    }
  }

  /**
   * Generate random wallet
   */
  public generateRandomWallet(): WalletInfo {
    try {
      const wallet = ethers.Wallet.createRandom();
      
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
        mnemonic: wallet.mnemonic?.phrase
      };
    } catch (error) {
      console.error('❌ Random wallet generation failed:', error);
      throw error;
    }
  }

  /**
   * Get service wallet info
   */
  public getServiceWallet(): WalletInfo | null {
    if (!this.wallet) return null;

    return {
      address: this.wallet.address,
      publicKey: this.wallet.publicKey,
      // Don't return private key for security
      privateKey: '***REDACTED***'
    };
  }

  /**
   * Validate Ethereum address
   */
  public isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Validate private key
   */
  public isValidPrivateKey(privateKey: string): boolean {
    try {
      new ethers.Wallet(privateKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get address from private key
   */
  public getAddressFromPrivateKey(privateKey: string): string {
    try {
      const wallet = new ethers.Wallet(privateKey);
      return wallet.address;
    } catch (error) {
      console.error('❌ Failed to get address from private key:', error);
      throw error;
    }
  }

  /**
   * Generate message hash for signature verification
   */
  public getMessageHash(message: string): string {
    return ethers.hashMessage(message);
  }

  /**
   * Generate typed data hash for EIP-712 verification
   */
  public getTypedDataHash(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ): string {
    return ethers.TypedDataEncoder.hash(domain, types, value);
  }

  /**
   * Create deterministic signature for reproducible results
   */
  public async createDeterministicSignature(
    data: Record<string, any>,
    nonce?: string
  ): Promise<SignatureResult> {
    if (!this.wallet) {
      throw new Error('Crypto service not initialized');
    }

    try {
      // Create deterministic message
      const sortedData = JSON.stringify(data, Object.keys(data).sort());
      const message = `${sortedData}:${nonce || this.generateNonce()}`;
      
      return this.signMessage(message);
    } catch (error) {
      console.error('❌ Deterministic signature creation failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  public async disconnect(): Promise<void> {
    try {
      this.wallet = undefined;
      this.isInitialized = false;
      console.log('✅ Crypto service disconnected');
    } catch (error) {
      console.error('❌ Crypto service disconnect error:', error);
    }
  }
}
