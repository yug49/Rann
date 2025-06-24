/**
 * Training Routes
 * 
 * Yodha training system management endpoints
 * 
 * @author Rann Team
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { 
  AuthenticatedRequest, 
  TrainingSession 
} from '../types';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Create training routes
 */
export function createTrainingRoutes(): Router {
  const router = Router();

  /**
   * POST /api/training/start
   * Start a training session for a Yodha
   */
  router.post('/start', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        tokenId, 
        type, 
        duration = 3600000 // Default 1 hour
      } = req.body as {
        tokenId: string;
        type: string;
        duration?: number;
      };

      if (!tokenId || !type) {
        res.status(400).json({
          success: false,
          message: 'Token ID and training type are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate training type
      const validTypes = ['stat_training', 'skill_training', 'experience_training', 'combat_training'];
      if (!validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid training type. Must be one of: ' + validTypes.join(', '),
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

      // Check if Yodha is already training
      const activeTraining = await req.services.database.getActiveTrainingSessions(tokenId);
      
      if (activeTraining.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Yodha is already in training',
          data: activeTraining[0],
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get training recommendations from AI
      const recommendations = await req.services.nearai.getTrainingRecommendations(traits, [type]);
      const recommendation = recommendations.find(r => r.type === type);

      // Create training session
      const sessionId = req.services.crypto.generateRandomHex(16);
      const session: TrainingSession = {
        id: sessionId,
        tokenId,
        type: type as any,
        status: 'active',
        progress: 0,
        startedAt: new Date(),
        estimatedDuration: recommendation?.estimatedDuration || duration,
        rewards: recommendation?.expectedOutcome || {},
        metadata: {
          aiRecommendation: recommendation,
          userInitiated: true,
          startedBy: req.user!.address
        }
      };

      // Store training session
      await req.services.database.storeTrainingSession(session);

      // Start training on Flow blockchain if applicable
      try {
        const flowTx = await req.services.flow.startTraining(
          tokenId,
          type,
          session.estimatedDuration
        );
        
        session.metadata.flowTransactionId = flowTx.id;
        await req.services.database.storeTrainingSession(session);
      } catch (flowError) {
        console.warn('⚠️ Flow training registration failed:', flowError);
        // Continue without blockchain registration
      }

      res.json({
        success: true,
        data: session,
        message: 'Training session started successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Training start failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start training',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/training/:sessionId
   * Get training session details
   */
  router.get('/:sessionId', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'Session ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const session = await req.services.database.getTrainingSession(sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Training session not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user owns the Yodha
      const traits = await req.services.database.getYodhaTraits(session.tokenId);
      
      if (!traits || traits.owner !== req.user!.address) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Calculate current progress if still active
      if (session.status === 'active') {
        const elapsed = Date.now() - session.startedAt.getTime();
        const progress = Math.min(100, (elapsed / session.estimatedDuration) * 100);
        
        // Update progress in database
        await req.services.database.updateTrainingProgress(sessionId, progress);
        session.progress = progress;

        // Check if training should be completed
        if (progress >= 100) {
          await completeTraining(req, sessionId, session);
          session.status = 'completed';
          session.completedAt = new Date();
        }
      }

      res.json({
        success: true,
        data: session,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Training session fetch failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch training session',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * POST /api/training/:sessionId/complete
   * Complete a training session
   */
  router.post('/:sessionId/complete', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'Session ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const session = await req.services.database.getTrainingSession(sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Training session not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user owns the Yodha
      const traits = await req.services.database.getYodhaTraits(session.tokenId);
      
      if (!traits || traits.owner !== req.user!.address) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (session.status !== 'active') {
        res.status(400).json({
          success: false,
          message: 'Training session is not active',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Complete the training
      const result = await completeTraining(req, sessionId, session);

      res.json({
        success: true,
        data: result,
        message: 'Training completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Training completion failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete training',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * POST /api/training/:sessionId/cancel
   * Cancel an active training session
   */
  router.post('/:sessionId/cancel', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'Session ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const session = await req.services.database.getTrainingSession(sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Training session not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user owns the Yodha
      const traits = await req.services.database.getYodhaTraits(session.tokenId);
      
      if (!traits || traits.owner !== req.user!.address) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (session.status !== 'active') {
        res.status(400).json({
          success: false,
          message: 'Training session is not active',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Cancel the training
      await req.services.database.updateTrainingProgress(sessionId, session.progress, 'cancelled');

      res.json({
        success: true,
        message: 'Training session cancelled',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Training cancellation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel training',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/training/active
   * Get all active training sessions for user
   */
  router.get('/active', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get user's Yodhas
      const yodhas = await req.services.database.getUserYodhas(req.user!.address);
      const tokenIds = yodhas.map(y => y.tokenId);

      // Get active training sessions for user's Yodhas
      const activeSessions = await req.services.database.getActiveTrainingSessions();
      const userSessions = activeSessions.filter(session => 
        tokenIds.includes(session.tokenId)
      );

      // Update progress for active sessions
      for (const session of userSessions) {
        if (session.status === 'active') {
          const elapsed = Date.now() - session.startedAt.getTime();
          const progress = Math.min(100, (elapsed / session.estimatedDuration) * 100);
          
          if (progress !== session.progress) {
            await req.services.database.updateTrainingProgress(session.id, progress);
            session.progress = progress;
          }
        }
      }

      res.json({
        success: true,
        data: {
          sessions: userSessions,
          count: userSessions.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Active training fetch failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active training sessions',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/training/recommendations/:tokenId
   * Get AI training recommendations for a Yodha
   */
  router.get('/recommendations/:tokenId', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tokenId } = req.params;
      const { goals } = req.query as { goals?: string };

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

      // Parse goals from query parameter
      const trainingGoals = goals ? goals.split(',').map(g => g.trim()) : undefined;

      // Get AI recommendations
      const recommendations = await req.services.nearai.getTrainingRecommendations(traits, trainingGoals);

      res.json({
        success: true,
        data: {
          recommendations,
          yodha: {
            tokenId: traits.tokenId,
            name: traits.name,
            level: traits.level,
            currentStats: traits.currentStats
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Training recommendations failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get training recommendations',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  return router;
}

/**
 * Complete training session and apply rewards
 */
async function completeTraining(
  req: AuthenticatedRequest, 
  sessionId: string, 
  session: TrainingSession
): Promise<any> {
  // Update session status
  await req.services.database.updateTrainingProgress(sessionId, 100, 'completed');

  // Get current traits
  const traits = await req.services.database.getYodhaTraits(session.tokenId);
  if (!traits) {
    throw new Error('Yodha not found');
  }

  // Apply training rewards
  const updatedTraits = { ...traits };
  const rewards = session.rewards || {};

  // Apply stat improvements
  if (rewards.statImprovements) {
    Object.entries(rewards.statImprovements).forEach(([stat, improvement]) => {
      if (stat in updatedTraits.currentStats) {
        updatedTraits.currentStats[stat as keyof typeof updatedTraits.currentStats] += improvement as number;
      }
    });
  }

  // Apply experience gain
  if (rewards.experienceGain) {
    updatedTraits.experience += rewards.experienceGain as number;
    
    // Check for level up
    const expForNextLevel = updatedTraits.level * 100; // Simple formula
    if (updatedTraits.experience >= expForNextLevel) {
      updatedTraits.level += 1;
      updatedTraits.experience -= expForNextLevel;
    }
  }

  // Add new skills
  if (rewards.newSkills) {
    const newSkills = rewards.newSkills as string[];
    newSkills.forEach(skill => {
      if (!updatedTraits.skills.includes(skill)) {
        updatedTraits.skills.push(skill);
      }
    });
  }

  // Store updated traits
  await req.services.database.storeYodhaTraits(session.tokenId, updatedTraits);

  // Complete training on Flow blockchain if applicable
  try {
    if (session.metadata.flowTransactionId) {
      await req.services.flow.completeTraining(session.tokenId, rewards);
    }
  } catch (flowError) {
    console.warn('⚠️ Flow training completion failed:', flowError);
  }

  return {
    session: {
      ...session,
      status: 'completed',
      progress: 100,
      completedAt: new Date()
    },
    updatedTraits,
    rewards
  };
}

export default createTrainingRoutes;
