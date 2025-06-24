/**
 * Database Service
 * 
 * Handles all database operations with Prisma ORM and TypeScript
 * 
 * @author Rann Team
 */

import { PrismaClient } from '@prisma/client';
import type { 
  YodhaTraits, 
  BattleResult, 
  TrainingSession,
  UserSession,
  DatabaseService as IDatabaseService
} from '../types';

export class DatabaseService implements IDatabaseService {
  private prisma: PrismaClient;
  private isConnected = false;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
    });
  }

  /**
   * Initialize database connection
   */
  public async initialize(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('✅ Database disconnected');
    } catch (error) {
      console.error('❌ Database disconnection error:', error);
    }
  }

  /**
   * Check if database is healthy
   */
  public async isHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.isConnected;
    } catch {
      return false;
    }
  }

  /**
   * User Session Management
   */
  public async storeUserSession(address: string, sessionData: Record<string, unknown>): Promise<void> {
    await this.prisma.userSession.upsert({
      where: { address },
      update: { 
        sessionData: JSON.stringify(sessionData),
        lastActive: new Date()
      },
      create: {
        address,
        sessionData: JSON.stringify(sessionData),
        lastActive: new Date()
      }
    });
  }

  public async getUserSession(address: string): Promise<UserSession | null> {
    const session = await this.prisma.userSession.findUnique({
      where: { address }
    });

    if (!session) return null;

    return {
      address: session.address,
      sessionData: JSON.parse(session.sessionData),
      lastActive: session.lastActive,
      createdAt: session.createdAt
    };
  }

  public async deleteUserSession(address: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { address }
    });
  }

  /**
   * Yodha NFT Management
   */
  public async storeYodhaTraits(tokenId: string, traits: YodhaTraits): Promise<void> {
    await this.prisma.yodhaNFT.upsert({
      where: { tokenId },
      update: {
        traits: JSON.stringify(traits),
        updatedAt: new Date()
      },
      create: {
        tokenId,
        traits: JSON.stringify(traits),
        owner: traits.owner || '',
        metadataUri: traits.metadataUri || '',
        isTraining: false
      }
    });
  }

  public async getYodhaTraits(tokenId: string): Promise<YodhaTraits | null> {
    const yodha = await this.prisma.yodhaNFT.findUnique({
      where: { tokenId }
    });

    if (!yodha) return null;

    return JSON.parse(yodha.traits) as YodhaTraits;
  }

  public async getUserYodhas(address: string): Promise<YodhaTraits[]> {
    const yodhas = await this.prisma.yodhaNFT.findMany({
      where: { owner: address }
    });

    return yodhas.map(yodha => JSON.parse(yodha.traits) as YodhaTraits);
  }

  public async updateYodhaOwner(tokenId: string, newOwner: string): Promise<void> {
    await this.prisma.yodhaNFT.update({
      where: { tokenId },
      data: { 
        owner: newOwner,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Training System
   */
  public async storeTrainingSession(session: TrainingSession): Promise<void> {
    await this.prisma.trainingSession.create({
      data: {
        id: session.id,
        tokenId: session.tokenId,
        type: session.type,
        status: session.status,
        progress: session.progress,
        startedAt: session.startedAt,
        estimatedDuration: session.estimatedDuration,
        rewards: JSON.stringify(session.rewards || {}),
        metadata: JSON.stringify(session.metadata || {})
      }
    });
  }

  public async getTrainingSession(sessionId: string): Promise<TrainingSession | null> {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) return null;

    return {
      id: session.id,
      tokenId: session.tokenId,
      type: session.type as any,
      status: session.status as any,
      progress: session.progress,
      startedAt: session.startedAt,
      completedAt: session.completedAt || undefined,
      estimatedDuration: session.estimatedDuration,
      rewards: JSON.parse(session.rewards || '{}'),
      metadata: JSON.parse(session.metadata || '{}')
    };
  }

  public async updateTrainingProgress(sessionId: string, progress: number, status?: string): Promise<void> {
    const updateData: any = { 
      progress, 
      updatedAt: new Date() 
    };
    
    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    await this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: updateData
    });
  }

  public async getActiveTrainingSessions(tokenId?: string): Promise<TrainingSession[]> {
    const where: any = {
      status: {
        in: ['pending', 'active', 'paused']
      }
    };

    if (tokenId) {
      where.tokenId = tokenId;
    }

    const sessions = await this.prisma.trainingSession.findMany({
      where,
      orderBy: { startedAt: 'desc' }
    });

    return sessions.map(session => ({
      id: session.id,
      tokenId: session.tokenId,
      type: session.type as any,
      status: session.status as any,
      progress: session.progress,
      startedAt: session.startedAt,
      completedAt: session.completedAt || undefined,
      estimatedDuration: session.estimatedDuration,
      rewards: JSON.parse(session.rewards || '{}'),
      metadata: JSON.parse(session.metadata || '{}')
    }));
  }

  /**
   * Battle System
   */
  public async storeBattleResult(result: BattleResult): Promise<void> {
    await this.prisma.battleResult.create({
      data: {
        id: result.battleId,
        attackerTokenId: result.attacker.tokenId,
        defenderTokenId: result.defender.tokenId,
        winner: result.winner,
        damageDealt: JSON.stringify(result.damageDealt),
        experienceGained: JSON.stringify(result.experienceGained),
        rewardsEarned: JSON.stringify(result.rewardsEarned || {}),
        battleType: result.battleType,
        duration: result.duration,
        metadata: JSON.stringify(result.metadata || {}),
        createdAt: result.timestamp
      }
    });
  }

  public async getBattleHistory(tokenId: string, limit = 10): Promise<BattleResult[]> {
    const battles = await this.prisma.battleResult.findMany({
      where: {
        OR: [
          { attackerTokenId: tokenId },
          { defenderTokenId: tokenId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return battles.map(battle => ({
      battleId: battle.id,
      attacker: { tokenId: battle.attackerTokenId },
      defender: { tokenId: battle.defenderTokenId },
      winner: battle.winner,
      damageDealt: JSON.parse(battle.damageDealt),
      experienceGained: JSON.parse(battle.experienceGained),
      rewardsEarned: JSON.parse(battle.rewardsEarned || '{}'),
      battleType: battle.battleType as any,
      duration: battle.duration,
      timestamp: battle.createdAt,
      metadata: JSON.parse(battle.metadata || '{}')
    }));
  }

  public async getBattleStats(tokenId: string): Promise<{
    totalBattles: number;
    wins: number;
    losses: number;
    winRate: number;
  }> {
    const [totalBattles, wins] = await Promise.all([
      this.prisma.battleResult.count({
        where: {
          OR: [
            { attackerTokenId: tokenId },
            { defenderTokenId: tokenId }
          ]
        }
      }),
      this.prisma.battleResult.count({
        where: { winner: tokenId }
      })
    ]);

    const losses = totalBattles - wins;
    const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0;

    return {
      totalBattles,
      wins,
      losses,
      winRate: Math.round(winRate * 100) / 100
    };
  }

  /**
   * Metadata Management
   */
  public async storeMetadata(
    type: 'yodha' | 'battle' | 'training',
    id: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.prisma.metadata.upsert({
      where: {
        type_entityId: {
          type,
          entityId: id
        }
      },
      update: {
        data: JSON.stringify(metadata),
        updatedAt: new Date()
      },
      create: {
        type,
        entityId: id,
        data: JSON.stringify(metadata)
      }
    });
  }

  public async getMetadata(
    type: 'yodha' | 'battle' | 'training',
    id: string
  ): Promise<Record<string, unknown> | null> {
    const metadata = await this.prisma.metadata.findUnique({
      where: {
        type_entityId: {
          type,
          entityId: id
        }
      }
    });

    return metadata ? JSON.parse(metadata.data) : null;
  }

  public async deleteMetadata(type: 'yodha' | 'battle' | 'training', id: string): Promise<void> {
    await this.prisma.metadata.deleteMany({
      where: {
        type,
        entityId: id
      }
    });
  }

  /**
   * System Analytics
   */
  public async getSystemStats(): Promise<{
    totalYodhas: number;
    totalUsers: number;
    totalBattles: number;
    totalTrainingSessions: number;
    activeTrainingSessions: number;
  }> {
    const [
      totalYodhas,
      totalUsers,
      totalBattles,
      totalTrainingSessions,
      activeTrainingSessions
    ] = await Promise.all([
      this.prisma.yodhaNFT.count(),
      this.prisma.userSession.count(),
      this.prisma.battleResult.count(),
      this.prisma.trainingSession.count(),
      this.prisma.trainingSession.count({
        where: {
          status: {
            in: ['pending', 'active', 'paused']
          }
        }
      })
    ]);

    return {
      totalYodhas,
      totalUsers,
      totalBattles,
      totalTrainingSessions,
      activeTrainingSessions
    };
  }
}
