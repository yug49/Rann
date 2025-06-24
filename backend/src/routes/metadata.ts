/**
 * Metadata Routes
 * 
 * NFT metadata management and IPFS operations
 * 
 * @author Rann Team
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Allow images and JSON files
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/json', 'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and JSON files are allowed.'));
    }
  }
});

/**
 * Create metadata routes
 */
export function createMetadataRoutes(): Router {
  const router = Router();

  /**
   * POST /api/metadata/upload
   * Upload file to IPFS
   */
  router.post('/upload', requireAuth, upload.single('file'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file provided',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { description, tags } = req.body as {
        description?: string;
        tags?: string;
      };

      // Upload file to IPFS
      const uploadResult = await req.services.filecoin.storeFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Store metadata about the upload
      await req.services.database.storeMetadata('ipfs_upload', uploadResult.hash, {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploader: req.user!.address,
        description: description || '',
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        uploadedAt: new Date(),
        ipfsHash: uploadResult.hash,
        ipfsUrl: uploadResult.url
      });

      res.json({
        success: true,
        data: {
          hash: uploadResult.hash,
          url: uploadResult.url,
          size: uploadResult.size,
          mimeType: req.file.mimetype,
          filename: req.file.originalname,
          gateways: req.services.filecoin.getGatewayUrls(uploadResult.hash)
        },
        message: 'File uploaded to IPFS successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ File upload failed:', error);
      res.status(500).json({
        success: false,
        message: 'File upload failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * POST /api/metadata/json
   * Store JSON metadata on IPFS
   */
  router.post('/json', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { data, filename } = req.body as {
        data: Record<string, unknown>;
        filename?: string;
      };

      if (!data || typeof data !== 'object') {
        res.status(400).json({
          success: false,
          message: 'Valid JSON data is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Add metadata
      const enrichedData = {
        ...data,
        creator: req.user!.address,
        createdAt: new Date().toISOString(),
        version: '1.0'
      };

      // Store JSON on IPFS
      const storeResult = await req.services.filecoin.storeJSON(enrichedData, {
        filename: filename || 'metadata.json',
        contentType: 'application/json'
      });

      // Store metadata about the JSON
      await req.services.database.storeMetadata('json_metadata', storeResult.hash, {
        creator: req.user!.address,
        filename: filename || 'metadata.json',
        dataKeys: Object.keys(data),
        size: storeResult.size,
        createdAt: new Date(),
        ipfsHash: storeResult.hash,
        ipfsUrl: storeResult.url
      });

      res.json({
        success: true,
        data: {
          hash: storeResult.hash,
          url: storeResult.url,
          size: storeResult.size,
          gateways: req.services.filecoin.getGatewayUrls(storeResult.hash)
        },
        message: 'JSON metadata stored on IPFS successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ JSON metadata storage failed:', error);
      res.status(500).json({
        success: false,
        message: 'JSON metadata storage failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/metadata/ipfs/:hash
   * Retrieve data from IPFS
   */
  router.get('/ipfs/:hash', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { hash } = req.params;
      const { download } = req.query as { download?: string };

      if (!hash) {
        res.status(400).json({
          success: false,
          message: 'IPFS hash is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get metadata about the file
      const metadata = await req.services.database.getMetadata('ipfs_upload', hash) ||
                      await req.services.database.getMetadata('json_metadata', hash);

      // Retrieve data from IPFS
      const data = await req.services.filecoin.retrieveData(hash);

      // Set appropriate headers
      if (metadata) {
        res.set('Content-Type', metadata.mimeType as string || 'application/octet-stream');
        
        if (download === 'true') {
          res.set('Content-Disposition', `attachment; filename="${metadata.originalName || metadata.filename || 'file'}"`);
        }
      }

      // Send the data
      res.send(data);
    } catch (error) {
      console.error('❌ IPFS retrieval failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve data from IPFS',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/metadata/info/:hash
   * Get metadata information about an IPFS hash
   */
  router.get('/info/:hash', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { hash } = req.params;

      if (!hash) {
        res.status(400).json({
          success: false,
          message: 'IPFS hash is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Try to get metadata from both possible types
      const uploadMetadata = await req.services.database.getMetadata('ipfs_upload', hash);
      const jsonMetadata = await req.services.database.getMetadata('json_metadata', hash);
      
      const metadata = uploadMetadata || jsonMetadata;

      if (!metadata) {
        res.status(404).json({
          success: false,
          message: 'Metadata not found for this hash',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate gateway URLs
      const gateways = req.services.filecoin.getGatewayUrls(hash);

      res.json({
        success: true,
        data: {
          hash,
          metadata,
          gateways,
          type: uploadMetadata ? 'file' : 'json'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Metadata info fetch failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch metadata information',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/metadata/user/uploads
   * Get user's upload history
   */
  router.get('/user/uploads', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = '20', offset = '0' } = req.query as {
        limit?: string;
        offset?: string;
      };

      // This is a simplified implementation
      // In production, you'd have proper pagination and indexing
      
      res.json({
        success: true,
        data: {
          uploads: [],
          total: 0,
          limit: parseInt(limit),
          offset: parseInt(offset)
        },
        message: 'User uploads retrieved (feature in development)',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ User uploads fetch failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user uploads',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * POST /api/metadata/yodha/:tokenId
   * Generate and store comprehensive Yodha metadata
   */
  router.post('/yodha/:tokenId', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

      // Get Yodha traits
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

      // Get battle stats
      const battleStats = await req.services.database.getBattleStats(tokenId);

      // Generate comprehensive metadata
      const metadata = {
        name: traits.name,
        description: traits.description,
        image: traits.imageUri || '',
        external_url: `https://rann.game/yodha/${tokenId}`,
        attributes: [
          ...Object.entries(traits.baseStats).map(([key, value]) => ({
            trait_type: key.charAt(0).toUpperCase() + key.slice(1),
            value: value,
            max_value: 100
          })),
          {
            trait_type: "Level",
            value: traits.level
          },
          {
            trait_type: "Rarity",
            value: traits.rarity.charAt(0).toUpperCase() + traits.rarity.slice(1)
          },
          {
            trait_type: "Experience",
            value: traits.experience
          },
          {
            trait_type: "Win Rate",
            value: battleStats.winRate,
            display_type: "boost_percentage"
          },
          {
            trait_type: "Total Battles",
            value: battleStats.totalBattles,
            display_type: "number"
          },
          ...traits.skills.map(skill => ({
            trait_type: "Skill",
            value: skill
          }))
        ],
        properties: {
          tokenId,
          owner: traits.owner,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          version: "1.0"
        },
        animation_url: "",
        background_color: getRarityColor(traits.rarity),
        stats: {
          base_stats: traits.baseStats,
          current_stats: traits.currentStats,
          battle_stats: battleStats,
          level: traits.level,
          experience: traits.experience
        }
      };

      // Store metadata on IPFS
      const storeResult = await req.services.filecoin.storeJSON(metadata, {
        filename: `yodha-${tokenId}-metadata.json`,
        contentType: 'application/json'
      });

      // Update traits with new metadata URI
      traits.metadataUri = storeResult.url;
      await req.services.database.storeYodhaTraits(tokenId, traits);

      res.json({
        success: true,
        data: {
          metadata,
          ipfsHash: storeResult.hash,
          metadataUri: storeResult.url,
          gateways: req.services.filecoin.getGatewayUrls(storeResult.hash)
        },
        message: 'Yodha metadata generated and stored successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Yodha metadata generation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Yodha metadata generation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * DELETE /api/metadata/pin/:hash
   * Unpin data from IPFS (admin only)
   */
  router.delete('/pin/:hash', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { hash } = req.params;

      if (!hash) {
        res.status(400).json({
          success: false,
          message: 'IPFS hash is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user uploaded this file or is admin
      const metadata = await req.services.database.getMetadata('ipfs_upload', hash) ||
                      await req.services.database.getMetadata('json_metadata', hash);

      if (metadata && metadata.uploader !== req.user!.address) {
        // Only allow if user is admin (this would need proper admin check)
        res.status(403).json({
          success: false,
          message: 'You can only unpin your own uploads',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Unpin from IPFS
      await req.services.filecoin.unpinData(hash);

      res.json({
        success: true,
        message: 'Data unpinned from IPFS',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ IPFS unpin failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unpin data from IPFS',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  return router;
}

/**
 * Get background color based on rarity
 */
function getRarityColor(rarity: string): string {
  const colors = {
    common: '808080',
    uncommon: '00ff00',
    rare: '0080ff',
    epic: '8000ff',
    legendary: 'ffb000'
  };
  
  return colors[rarity as keyof typeof colors] || colors.common;
}

export default createMetadataRoutes;
