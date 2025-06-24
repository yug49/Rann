/**
 * Global Type Definitions for Rann Backend Service
 * 
 * @author Rann Team
 */

import type { Request } from 'express';
import type { 
  ServiceRegistry,
  DatabaseServiceInterface,
  FilecoinServiceInterface,
  CryptoServiceInterface,
  NearAIServiceInterface,
  FlowServiceInterface
} from './services';

// Re-export service interfaces
export * from './services';
import type { JwtPayload } from 'jsonwebtoken';

// ================================
// Gaming Domain Types
// ================================

export interface YodhaTraits {
  tokenId: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  level: number;
  experience: number;
  owner: string;
  
  // Base stats (initial values)
  baseStats: {
    strength: number;
    defense: number;
    agility: number;
    intelligence: number;
    wisdom: number;
    luck: number;
  };
  
  // Current stats (can be modified by training/equipment)
  currentStats: {
    strength: number;
    defense: number;
    agility: number;
    intelligence: number;
    wisdom: number;
    luck: number;
  };
  
  // Skills and abilities
  skills: string[];
  equipment: string[];
  achievements: string[];
  
  // Visual representation
  imageUri?: string;
  metadataUri?: string;
  
  // Battle history
  battleHistory?: BattleHistoryEntry[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface BattleHistoryEntry {
  battleId: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  experienceGained: number;
  timestamp: Date;
}

export interface TrainingSession {
  id: string;
  tokenId: string;
  type: 'stat_training' | 'skill_training' | 'experience_training' | 'combat_training';
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  progress: number; // 0-100
  startedAt: Date;
  completedAt?: Date;
  estimatedDuration: number; // in milliseconds
  rewards: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface BattleResult {
  battleId: string;
  attacker: {
    tokenId: string;
    name: string;
    owner: string;
  };
  defender: {
    tokenId: string;
    name: string;
    owner: string;
  };
  winner: string; // tokenId of winner
  damageDealt: Record<string, number>;
  experienceGained: Record<string, number>;
  rewardsEarned: Record<string, unknown>;
  battleType: 'pvp' | 'pve' | 'tournament' | 'training';
  duration: number; // in milliseconds
  rounds?: BattleRound[];
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface BattleRound {
  roundNumber: number;
  attackerMove: string;
  defenderMove: string;
  damage: Record<string, number>;
  status: Record<string, unknown>;
}

// ================================
// AI Integration Types
// ================================

export interface AITraitGenerationRequest {
  seed: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  preferences?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  userAddress: string;
}

export interface AITraitGenerationResponse {
  success: boolean;
  traits: YodhaTraits;
  metadata: {
    processingTime: number;
    model: string;
    confidence: number;
    reasoning: string;
  };
}

export interface AIBattleSimulationRequest {
  attacker: YodhaTraits;
  defender: YodhaTraits;
  battleType: 'pvp' | 'pve' | 'tournament' | 'training';
  environment: string;
  battleId: string;
}

export interface AIBattleSimulationResponse {
  success: boolean;
  result: BattleResult;
  rounds: BattleRound[];
  metadata: {
    processingTime: number;
    model: string;
    confidence: number;
  };
}

export interface AITrainingRecommendation {
  type: string;
  priority: number;
  estimatedDuration: number;
  expectedOutcome: Record<string, unknown>;
  description: string;
  requirements?: string[];
}

// ================================
// Authentication Types
// ================================

export interface AuthUser {
  address: string;
  sessionId: string;
  sessionData: Record<string, unknown>;
}

export interface AuthToken extends JwtPayload {
  address: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface AuthMessage {
  message: string;
  nonce: string;
  timestamp: number;
}

export interface UserSession {
  address: string;
  sessionData: Record<string, unknown>;
  lastActive: Date;
  createdAt: Date;
}

// ================================
// API Request/Response Types
// ================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ================================
// Express Request Extensions
// ================================

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  verifiedAddress?: string;
  messageData?: {
    nonce: string;
    timestamp: number;
  };
  services: ServiceRegistry;
  requestId?: string;
}

// ================================
// Flow Blockchain Types
// ================================

export interface FlowTransaction {
  id: string;
  status: number;
  statusCode: number;
  errorMessage?: string;
  events: FlowEvent[];
}

export interface FlowEvent {
  type: string;
  transactionId: string;
  transactionIndex: number;
  eventIndex: number;
  data: Record<string, any>;
}

export interface FlowAccount {
  address: string;
  balance: number;
  storageUsed: number;
  storageCapacity: number;
  keys: number;
}

export interface FlowServiceConfig {
  accessNodeUrl: string;
  walletDiscoveryUrl: string;
  serviceAccount: string;
  contracts: {
    RannToken: string;
    YodhaNFT: string;
    Kurukshetra: string;
    Gurukul: string;
    Bazaar: string;
    NonFungibleToken: string;
    FungibleToken: string;
    MetadataViews: string;
  };
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  rarity?: string;
  attributes?: Record<string, string>;
}

// ================================
// AI Service Types
// ================================

export interface AIAnalysisResult {
  processingTime: number;
  model: string;
  confidence: number;
  reasoning?: string;
}

export interface AIServiceConfig {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  timeout?: number;
}

// ================================
// Error Types
// ================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export interface ErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  error?: string;
  stack?: string;
  timestamp: string;
  requestId: string;
}

// ================================
// Utility Types
// ================================

export type AsyncHandler = (
  req: AuthenticatedRequest,
  res: any,
  next: any
) => Promise<void>;

export type MiddlewareFunction = (
  req: AuthenticatedRequest,
  res: any,
  next: any
) => void | Promise<void>;

// ================================
// Environment Configuration
// ================================

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  
  // Database
  DATABASE_URL: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  
  // NEAR AI
  NEAR_ACCOUNT_ID: string;
  NEAR_PRIVATE_KEY: string;
  NEAR_NETWORK_ID: string;
  
  // Flow Blockchain
  FLOW_ACCESS_NODE_API: string;
  FLOW_PRIVATE_KEY: string;
  FLOW_ACCOUNT_ADDRESS: string;
  
  // IPFS/Filecoin
  PINATA_API_KEY: string;
  PINATA_SECRET_API_KEY: string;
  LIGHTHOUSE_API_KEY: string;
  WEB3_STORAGE_TOKEN?: string;
  
  // AI Service
  AI_SERVICE_URL: string;
  AI_SERVICE_KEY: string;
  AI_MODEL: string;
}
