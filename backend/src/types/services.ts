/**
 * Service Interface Definitions for Rann Backend
 * 
 * Simplified types that match actual implementations
 * 
 * @author Rann Team
 */

import type { PrismaClient } from '@prisma/client';

// Basic types for services
export interface ServiceRegistry {
  database: DatabaseServiceInterface;
  filecoin: FilecoinServiceInterface;
  crypto: CryptoServiceInterface;
  nearai: NearAIServiceInterface;
  flow: FlowServiceInterface;
}

// Simplified Database Service Interface
export interface DatabaseServiceInterface {
  prisma?: PrismaClient;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isHealthy(): Promise<boolean>;
  
  // Session management
  storeUserSession(address: string, sessionData: Record<string, any>): Promise<void>;
  getUserSession(address: string): Promise<{ sessionData: Record<string, any> } | null>;
  
  // Yodha data
  storeYodhaTraits(tokenId: string, traits: any): Promise<void>;
  getYodhaTraits(tokenId: string): Promise<any>;
  
  // Battle data
  storeBattleResult(battleResult: any): Promise<void>;
  getBattleStats(tokenId: string): Promise<any>;
  
  // Metadata
  storeMetadata(type: string, key: string, metadata: any): Promise<void>;
  getMetadata(type: string, key: string): Promise<any>;
}

// Simplified Filecoin Service Interface
export interface FilecoinServiceInterface {
  initialize(): Promise<void>;
  isHealthy(): Promise<boolean>;
  
  storeFile(buffer: Buffer, filename: string, mimeType: string): Promise<{ hash: string; url: string; size: number }>;
  storeJSON(data: any, options?: { filename?: string; contentType?: string }): Promise<{ hash: string; url: string; size: number }>;
  retrieveData(hash: string): Promise<Buffer>;
  getGatewayUrls(hash: string): string[];
  unpinData(hash: string): Promise<void>;
}

// Simplified Crypto Service Interface
export interface CryptoServiceInterface {
  initialize(): Promise<void>;
  isHealthy(): Promise<boolean>;
  
  generateWallet(): { address: string; privateKey: string; publicKey: string };
  signMessage(message: string, privateKey: string): string;
  verifySignature(message: string, signature: string, address: string): boolean;
  encryptData(data: any, password: string): any;
  decryptData(encryptedData: any, password: string): any;
}

// Simplified NEAR AI Service Interface
export interface NearAIServiceInterface {
  initialize(): Promise<void>;
  isHealthy(): Promise<boolean>;
  
  generateTraits(request: any): Promise<any>;
  simulateBattle(attacker: any, defender: any, battleType: string): Promise<any>;
  getTrainingRecommendations(traits: any): Promise<any>;
  analyzePerformance(traits: any, battleHistory?: any[]): Promise<any>;
}

// Simplified Flow Service Interface
export interface FlowServiceInterface {
  initialize(): Promise<void>;
  isHealthy(): Promise<boolean>;
  
  mintYodhaNFT(to: string, metadata: any): Promise<{ id: string; status: string; events: unknown[]; errorMessage?: string }>;
  registerBattle(battleId: string, player1: string, player2: string, battleType: string): Promise<{ id: string; status: string; events: unknown[]; errorMessage?: string }>;
  completeBattle(battleId: string, winner: string, rewards: any): Promise<{ id: string; status: string; events: unknown[]; errorMessage?: string }>;
  startTraining(tokenId: string, trainingType: string, duration: number): Promise<{ id: string; status: string; events: unknown[]; errorMessage?: string }>;
  completeTraining(tokenId: string, rewards: any): Promise<{ id: string; status: string; events: unknown[]; errorMessage?: string }>;
}
