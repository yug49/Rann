/**
 * Battle Routes
 * 
 * Yodha battle system endpoints for PvP and PvE battles
 * 
 * @author Rann Team
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { 
  AuthenticatedRequest, 
  AIBattleSimulationRequest,
  BattleResult 
} from '../types/index';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Create battle routes
 */
export function createBattleRoutes(): Router {
  const router = Router();

  /**
   * POST /api/battle/challenge
   * Create a battle challenge between two Yodhas
   */
  router.post('/challenge', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        attackerTokenId, 
        defenderTokenId, 
        battleType = 'pvp',
        environment = 'arena'
      } = req.body as {
        attackerTokenId: string;
        defenderTokenId: string;
        battleType?: string;
        environment?: string;
      };

      if (!attackerTokenId || !defenderTokenId) {
        res.status(400).json({
          success: false,
          message: 'Both attacker and defender token IDs are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (attackerTokenId === defenderTokenId) {
        res.status(400).json({
          success: false,
          message: 'A Yodha cannot battle itself',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate battle type
      const validBattleTypes = ['pvp', 'pve', 'tournament', 'training'];
      if (!validBattleTypes.includes(battleType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid battle type. Must be one of: ' + validBattleTypes.join(', '),
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get attacker traits
      const attackerTraits = await req.services.database.getYodhaTraits(attackerTokenId);
      if (!attackerTraits) {
        res.status(404).json({
          success: false,
          message: 'Attacker Yodha not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user owns the attacker
      if (attackerTraits.owner !== req.user!.address) {
        res.status(403).json({
          success: false,
          message: 'You do not own the attacking Yodha',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get defender traits
      const defenderTraits = await req.services.database.getYodhaTraits(defenderTokenId);
      if (!defenderTraits) {
        res.status(404).json({
          success: false,
          message: 'Defender Yodha not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if both Yodhas are available for battle (not in training)
      const [attackerTraining, defenderTraining] = await Promise.all([
        req.services.database.getActiveTrainingSessions(attackerTokenId),
        req.services.database.getActiveTrainingSessions(defenderTokenId)
      ]);

      if (attackerTraining.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Attacking Yodha is currently in training',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (defenderTraining.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Defending Yodha is currently in training',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate battle ID
      const battleId = req.services.crypto.generateRandomHex(16);

      // Create AI battle simulation request
      const simulationRequest: AIBattleSimulationRequest = {
        attacker: attackerTraits,
        defender: defenderTraits,
        battleType: battleType as any,
        environment,
        battleId
      };

      // Register battle on Flow blockchain
      try {
        const flowTx = await req.services.flow.registerBattle(
          battleId,
          attackerTraits.owner,
          defenderTraits.owner,
          battleType
        );

        if (flowTx.status !== 'SEALED') {
          res.status(500).json({
            success: false,
            message: 'Failed to register battle on blockchain',
            error: flowTx.errorMessage,
            timestamp: new Date().toISOString()
          });
          return;
        }
      } catch (flowError) {
        console.warn('⚠️ Flow battle registration failed:', flowError);
        // Continue without blockchain registration for now
      }

      // Simulate battle using AI
      const battleSimulation = await req.services.nearai.simulateBattle(simulationRequest);

      if (!battleSimulation.success) {
        res.status(500).json({
          success: false,
          message: 'Battle simulation failed',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Store battle result
      await req.services.database.storeBattleResult(battleSimulation.result);

      // Update experience for both Yodhas
      await updateYodhaAfterBattle(req, attackerTraits, battleSimulation.result);
      await updateYodhaAfterBattle(req, defenderTraits, battleSimulation.result);

      // Complete battle on Flow blockchain
      try {
        await req.services.flow.completeBattle(
          battleId,
          battleSimulation.result.winner,
          {
            damage_dealt: JSON.stringify(battleSimulation.result.damageDealt),
            experience_gained: JSON.stringify(battleSimulation.result.experienceGained)
          }
        );
      } catch (flowError) {
        console.warn('⚠️ Flow battle completion failed:', flowError);
      }

      res.json({
        success: true,
        data: {
          battleId,
          result: battleSimulation.result,
          rounds: battleSimulation.rounds,
          metadata: battleSimulation.metadata
        },
        message: 'Battle completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Battle challenge failed:', error);
      res.status(500).json({
        success: false,
        message: 'Battle challenge failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/battle/:battleId
   * Get battle details by ID
   */
  router.get('/:battleId', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { battleId } = req.params;

      if (!battleId) {
        res.status(400).json({
          success: false,
          message: 'Battle ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get battle history to find the battle
      // Note: This is a simplified approach - in production, you'd have a direct battle lookup
      const allBattles = await req.services.database.getBattleHistory('', 1000);
      const battle = allBattles.find(b => b.battleId === battleId);

      if (!battle) {
        res.status(404).json({
          success: false,
          message: 'Battle not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user has access to this battle
      const userYodhas = await req.services.database.getUserYodhas(req.user!.address);
      const userTokenIds = userYodhas.map(y => y.tokenId);
      
      const hasAccess = userTokenIds.includes(battle.attacker.tokenId) || 
                       userTokenIds.includes(battle.defender.tokenId);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this battle',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: battle,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Battle fetch failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch battle details',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/battle/history/:tokenId
   * Get battle history for a Yodha
   */
  router.get('/history/:tokenId', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tokenId } = req.params;
      const { limit = '10' } = req.query as { limit?: string };

      if (!tokenId) {
        res.status(400).json({
          success: false,
          message: 'Token ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user owns the Yodha
      const traits = await req.services.database.getYodhaTraits(tokenId);
      
      if (!traits) {
        res.status(404).json({
          success: false,
          message: 'Yodha not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (traits.owner !== req.user!.address) {
        res.status(403).json({
          success: false,
          message: 'You do not own this Yodha',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const battleLimit = Math.min(parseInt(limit), 50); // Cap at 50
      const battleHistory = await req.services.database.getBattleHistory(tokenId, battleLimit);

      res.json({
        success: true,
        data: {
          tokenId,
          battles: battleHistory,
          count: battleHistory.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Battle history fetch failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch battle history',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/battle/stats/:tokenId
   * Get battle statistics for a Yodha
   */
  router.get('/stats/:tokenId', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tokenId } = req.params;

      if (!tokenId) {
        res.status(400).json({
          success: false,
          message: 'Token ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user owns the Yodha
      const traits = await req.services.database.getYodhaTraits(tokenId);
      
      if (!traits) {
        res.status(404).json({
          success: false,
          message: 'Yodha not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (traits.owner !== req.user!.address) {
        res.status(403).json({
          success: false,
          message: 'You do not own this Yodha',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const stats = await req.services.database.getBattleStats(tokenId);

      res.json({
        success: true,
        data: {
          tokenId,
          yodhaName: traits.name,
          stats
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Battle stats fetch failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch battle statistics',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/battle/leaderboard
   * Get battle leaderboard
   */
  router.get('/leaderboard', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = '10', type = 'winRate' } = req.query as { 
        limit?: string; 
        type?: string;
      };

      const leaderboardLimit = Math.min(parseInt(limit), 100); // Cap at 100

      // This is a simplified implementation
      // In production, you'd have optimized queries for leaderboards
      const allYodhas = await req.services.database.getUserYodhas(''); // Get all Yodhas
      
      const leaderboardData = await Promise.all(
        allYodhas.slice(0, leaderboardLimit).map(async (yodha) => {
          const stats = await req.services.database.getBattleStats(yodha.tokenId);
          return {
            tokenId: yodha.tokenId,
            name: yodha.name,
            owner: yodha.owner,
            level: yodha.level,
            rarity: yodha.rarity,
            stats
          };
        })
      );

      // Sort based on type
      leaderboardData.sort((a, b) => {
        switch (type) {
          case 'winRate':
            return b.stats.winRate - a.stats.winRate;
          case 'totalBattles':
            return b.stats.totalBattles - a.stats.totalBattles;
          case 'wins':
            return b.stats.wins - a.stats.wins;
          case 'level':
            return b.level - a.level;
          default:
            return b.stats.winRate - a.stats.winRate;
        }
      });

      res.json({
        success: true,
        data: {
          leaderboard: leaderboardData.slice(0, leaderboardLimit),
          sortBy: type,
          total: leaderboardData.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Leaderboard fetch failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboard',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * POST /api/battle/simulate
   * Simulate a battle without executing it
   */
  router.post('/simulate', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        attackerTokenId, 
        defenderTokenId, 
        battleType = 'pvp',
        environment = 'arena'
      } = req.body as {
        attackerTokenId: string;
        defenderTokenId: string;
        battleType?: string;
        environment?: string;
      };

      if (!attackerTokenId || !defenderTokenId) {
        res.status(400).json({
          success: false,
          message: 'Both attacker and defender token IDs are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get both Yodha traits
      const [attackerTraits, defenderTraits] = await Promise.all([
        req.services.database.getYodhaTraits(attackerTokenId),
        req.services.database.getYodhaTraits(defenderTokenId)
      ]);

      if (!attackerTraits || !defenderTraits) {
        res.status(404).json({
          success: false,
          message: 'One or both Yodhas not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user owns at least one of the Yodhas
      const ownsAttacker = attackerTraits.owner === req.user!.address;
      const ownsDefender = defenderTraits.owner === req.user!.address;

      if (!ownsAttacker && !ownsDefender) {
        res.status(403).json({
          success: false,
          message: 'You must own at least one of the Yodhas to simulate',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create simulation request
      const simulationRequest: AIBattleSimulationRequest = {
        attacker: attackerTraits,
        defender: defenderTraits,
        battleType: battleType as any,
        environment,
        battleId: `simulation_${Date.now()}`
      };

      // Run simulation
      const simulation = await req.services.nearai.simulateBattle(simulationRequest);

      if (!simulation.success) {
        res.status(500).json({
          success: false,
          message: 'Battle simulation failed',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: {
          simulation: true,
          result: simulation.result,
          rounds: simulation.rounds,
          metadata: simulation.metadata
        },
        message: 'Battle simulation completed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Battle simulation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Battle simulation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  return router;
}

/**
 * Update Yodha after battle
 */
async function updateYodhaAfterBattle(
  req: AuthenticatedRequest,
  traits: any,
  battleResult: BattleResult
): Promise<void> {
  const tokenId = traits.tokenId;
  const experienceGained = battleResult.experienceGained[tokenId] || 0;
  
  if (experienceGained > 0) {
    const updatedTraits = { ...traits };
    updatedTraits.experience += experienceGained;
    
    // Check for level up
    const expForNextLevel = updatedTraits.level * 100; // Simple formula
    if (updatedTraits.experience >= expForNextLevel) {
      updatedTraits.level += 1;
      updatedTraits.experience -= expForNextLevel;
      
      // Level up stat increases
      Object.keys(updatedTraits.currentStats).forEach(stat => {
        updatedTraits.currentStats[stat] += Math.floor(Math.random() * 3) + 1;
      });
    }
    
    // Add battle to history
    updatedTraits.battleHistory = updatedTraits.battleHistory || [];
    updatedTraits.battleHistory.unshift({
      battleId: battleResult.battleId,
      opponent: tokenId === battleResult.attacker.tokenId ? 
        battleResult.defender.tokenId : battleResult.attacker.tokenId,
      result: battleResult.winner === tokenId ? 'win' : 'loss',
      experienceGained,
      timestamp: battleResult.timestamp
    });
    
    // Keep only last 50 battles
    if (updatedTraits.battleHistory.length > 50) {
      updatedTraits.battleHistory = updatedTraits.battleHistory.slice(0, 50);
    }
    
    await req.services.database.storeYodhaTraits(tokenId, updatedTraits);
  }
}

export default createBattleRoutes;
