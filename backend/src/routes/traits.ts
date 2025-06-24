/**
 * Trait Generation Routes
 * 
 * AI-powered Yodha trait generation and management endpoints
 * 
 * @author Rann Team
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { 
  AuthenticatedRequest, 
  AITraitGenerationRequest,
  YodhaTraits 
} from '../types';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Create trait generation routes
 */
export function createTraitRoutes(): Router {
  const router = Router();

  /**
   * POST /api/traits/generate
   * Generate new Yodha traits using AI
   */
  router.post('/generate', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        rarity = 'common',
        preferences = {},
        constraints = {},
        seed 
      } = req.body as {
        rarity?: string;
        preferences?: Record<string, any>;
        constraints?: Record<string, any>;
        seed?: string;
      };

      // Validate rarity
      const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      if (!validRarities.includes(rarity)) {
        res.status(400).json({
          success: false,
          message: 'Invalid rarity. Must be one of: ' + validRarities.join(', '),
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate unique seed if not provided
      const generationSeed = seed || req.services.crypto.generateRandomHex(16);

      // Create AI generation request
      const generationRequest: AITraitGenerationRequest = {
        seed: generationSeed,
        rarity: rarity as any,
        preferences,
        constraints,
        userAddress: req.user!.address
      };

      // Generate traits using AI service
      const aiResponse = await req.services.nearai.generateTraits(generationRequest);

      if (!aiResponse.success) {
        res.status(500).json({
          success: false,
          message: 'AI trait generation failed',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Store generated traits
      await req.services.database.storeYodhaTraits(generationSeed, aiResponse.traits);

      // Store metadata to IPFS
      const metadataResult = await req.services.filecoin.storeJSON({
        traits: aiResponse.traits,
        generation: aiResponse.metadata,
        timestamp: new Date().toISOString()
      }, {
        filename: `yodha-${generationSeed}-metadata.json`,
        contentType: 'application/json'
      });

      // Update traits with metadata URI
      aiResponse.traits.metadataUri = metadataResult.url;
      await req.services.database.storeYodhaTraits(generationSeed, aiResponse.traits);

      res.json({
        success: true,
        data: {
          traits: aiResponse.traits,
          metadata: aiResponse.metadata,
          ipfsHash: metadataResult.hash,
          metadataUri: metadataResult.url
        },
        message: 'Yodha traits generated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Trait generation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Trait generation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/traits/:tokenId
   * Get traits for a specific Yodha
   */
  router.get('/:tokenId', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

      const traits = await req.services.database.getYodhaTraits(tokenId);

      if (!traits) {
        res.status(404).json({
          success: false,
          message: 'Yodha not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user owns this Yodha (for private data)
      const isOwner = req.user && req.user.address === traits.owner;
      
      // Return public or full data based on ownership
      const responseData = isOwner ? traits : {
        tokenId: traits.tokenId,
        name: traits.name,
        description: traits.description,
        rarity: traits.rarity,
        level: traits.level,
        imageUri: traits.imageUri,
        metadataUri: traits.metadataUri,
        // Only show base stats for non-owners
        baseStats: traits.baseStats
      };

      res.json({
        success: true,
        data: responseData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Trait fetch failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch traits',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/traits/user/:address
   * Get all Yodhas owned by a user
   */
  router.get('/user/:address', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { address } = req.params;

      if (!address) {
        res.status(400).json({
          success: false,
          message: 'Address is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate address format
      if (!req.services.crypto.isValidAddress(address)) {
        res.status(400).json({
          success: false,
          message: 'Invalid address format',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const yodhas = await req.services.database.getUserYodhas(address);
      
      // Check if requester is the owner
      const isOwner = req.user && req.user.address.toLowerCase() === address.toLowerCase();

      // Filter data based on ownership
      const responseData = yodhas.map(yodha => {
        if (isOwner) {
          return yodha;
        }
        
        // Return limited data for non-owners
        return {
          tokenId: yodha.tokenId,
          name: yodha.name,
          description: yodha.description,
          rarity: yodha.rarity,
          level: yodha.level,
          imageUri: yodha.imageUri,
          baseStats: yodha.baseStats
        };
      });

      res.json({
        success: true,
        data: {
          address,
          yodhas: responseData,
          count: responseData.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ User traits fetch failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user traits',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * PUT /api/traits/:tokenId
   * Update Yodha traits (owner only)
   */
  router.put('/:tokenId', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tokenId } = req.params;
      const updates = req.body as Partial<YodhaTraits>;

      if (!tokenId) {
        res.status(400).json({
          success: false,
          message: 'Token ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const existingTraits = await req.services.database.getYodhaTraits(tokenId);

      if (!existingTraits) {
        res.status(404).json({
          success: false,
          message: 'Yodha not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check ownership
      if (existingTraits.owner !== req.user!.address) {
        res.status(403).json({
          success: false,
          message: 'You do not own this Yodha',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Only allow certain fields to be updated
      const allowedUpdates = ['name', 'description', 'equipment', 'achievements'];
      const filteredUpdates: Partial<YodhaTraits> = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key as keyof YodhaTraits] = updates[key as keyof YodhaTraits];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid updates provided',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Merge updates with existing traits
      const updatedTraits: YodhaTraits = {
        ...existingTraits,
        ...filteredUpdates
      };

      // Store updated traits
      await req.services.database.storeYodhaTraits(tokenId, updatedTraits);

      res.json({
        success: true,
        data: updatedTraits,
        message: 'Yodha traits updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Trait update failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update traits',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/traits/:tokenId/analysis
   * Get AI analysis of Yodha performance
   */
  router.get('/:tokenId/analysis', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

      const traits = await req.services.database.getYodhaTraits(tokenId);

      if (!traits) {
        res.status(404).json({
          success: false,
          message: 'Yodha not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check ownership
      if (traits.owner !== req.user!.address) {
        res.status(403).json({
          success: false,
          message: 'You do not own this Yodha',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get battle history
      const battleHistory = await req.services.database.getBattleHistory(tokenId, 20);

      // Get AI analysis
      const analysis = await req.services.nearai.analyzePerformance(traits, battleHistory);

      res.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Trait analysis failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze traits',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * POST /api/traits/:tokenId/mint
   * Mint Yodha NFT on Flow blockchain
   */
  router.post('/:tokenId/mint', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

      const traits = await req.services.database.getYodhaTraits(tokenId);

      if (!traits) {
        res.status(404).json({
          success: false,
          message: 'Yodha not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check ownership
      if (traits.owner !== req.user!.address) {
        res.status(403).json({
          success: false,
          message: 'You do not own this Yodha',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Prepare NFT metadata
      const nftMetadata = {
        name: traits.name,
        description: traits.description,
        image: traits.imageUri || '',
        rarity: traits.rarity,
        attributes: Object.entries(traits.baseStats).map(([key, value]) => ({
          trait_type: key,
          value: value
        }))
      };

      // Mint NFT on Flow blockchain
      const mintTransaction = await req.services.flow.mintYodhaNFT(
        req.user!.address,
        nftMetadata
      );

      if (mintTransaction.status !== 'SEALED') {
        res.status(500).json({
          success: false,
          message: 'NFT minting failed',
          error: mintTransaction.errorMessage,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: {
          transactionId: mintTransaction.id,
          status: mintTransaction.status,
          events: mintTransaction.events
        },
        message: 'Yodha NFT minted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ NFT minting failed:', error);
      res.status(500).json({
        success: false,
        message: 'NFT minting failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  return router;
}

export default createTraitRoutes;
