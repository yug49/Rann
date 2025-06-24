/**
 * Simplified Rann Backend Server
 * 
 * A minimal TypeScript server that starts successfully
 * while we fix the main server compilation issues.
 */

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Rann Backend Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: { status: 'healthy' },
        api: { status: 'healthy' }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: 'Database connection failed'
    });
  }
});

// Test database endpoint
app.get('/api/test/db', async (req, res) => {
  try {
    const sessions = await prisma.userSession.findMany({
      take: 5
    });
    
    res.json({
      success: true,
      message: 'Database connection successful',
      sessionCount: sessions.length,
      sessions: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database query failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Basic auth nonce endpoint
app.post('/api/auth/nonce', (req, res) => {
  const nonce = Math.random().toString(36).substring(2);
  const timestamp = Date.now();
  
  res.json({
    success: true,
    nonce,
    message: `Sign in to Rann Gaming Platform\nNonce: ${nonce}\nTimestamp: ${timestamp}`,
    timestamp
  });
});

// Simple traits generation endpoint  
app.post('/api/traits/generate', async (req, res) => {
  try {
    const { tokenId, userAddress } = req.body;
    
    if (!tokenId || !userAddress) {
      return res.status(400).json({
        success: false,
        message: 'tokenId and userAddress are required',
        timestamp: new Date().toISOString()
      });
    }

    // Generate mock traits
    const mockTraits = {
      tokenId,
      name: `Yodha #${tokenId}`,
      description: `A legendary warrior with unique abilities`,
      rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary'][Math.floor(Math.random() * 5)],
      level: 1,
      experience: 0,
      baseStats: {
        strength: Math.floor(Math.random() * 50) + 25,
        agility: Math.floor(Math.random() * 50) + 25,
        intelligence: Math.floor(Math.random() * 50) + 25,
        wisdom: Math.floor(Math.random() * 50) + 25,
        charisma: Math.floor(Math.random() * 50) + 25,
        constitution: Math.floor(Math.random() * 50) + 25
      },
      currentStats: {},
      skills: ['Combat', 'Magic', 'Strategy'].slice(0, Math.floor(Math.random() * 3) + 1),
      owner: userAddress,
      createdAt: new Date(),
      imageUri: `https://api.rann.game/images/yodha/${tokenId}.png`,
      metadataUri: `https://api.rann.game/metadata/yodha/${tokenId}.json`
    };

    // Set current stats equal to base stats initially
    mockTraits.currentStats = { ...mockTraits.baseStats };

    // Store traits in database
    await prisma.yodhaNFT.upsert({
      where: { tokenId },
      update: {
        traits: mockTraits,
        updatedAt: new Date()
      },
      create: {
        tokenId,
        owner: userAddress,
        traits: mockTraits,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        traits: mockTraits,
        signature: 'mock_signature_' + Date.now()
      },
      message: 'Yodha traits generated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Traits generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Traits generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get traits endpoint
app.get('/api/traits/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: 'tokenId is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get traits from database
    const yodha = await prisma.yodhaNFT.findUnique({
      where: { tokenId }
    });

    if (!yodha) {
      return res.status(404).json({
        success: false,
        message: 'Yodha not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        traits: yodha.traits,
        owner: yodha.owner,
        createdAt: yodha.createdAt,
        updatedAt: yodha.updatedAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Traits fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch traits',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Simple training endpoint
app.post('/api/training/start', async (req, res) => {
  try {
    const { tokenId, trainingType, userAddress } = req.body;
    
    if (!tokenId || !trainingType || !userAddress) {
      return res.status(400).json({
        success: false,
        message: 'tokenId, trainingType, and userAddress are required',
        timestamp: new Date().toISOString()
      });
    }

    // Verify Yodha ownership
    const yodha = await prisma.yodhaNFT.findUnique({
      where: { tokenId }
    });

    if (!yodha || yodha.owner !== userAddress) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this Yodha',
        timestamp: new Date().toISOString()
      });
    }

    // Create mock training session
    const trainingSession = {
      sessionId: `train_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tokenId,
      owner: userAddress,
      trainingType,
      startTime: new Date(),
      duration: Math.floor(Math.random() * 3600) + 1800, // 30 min to 2 hours
      status: 'active',
      rewards: {
        experience: Math.floor(Math.random() * 100) + 50,
        statBoosts: {
          [trainingType]: Math.floor(Math.random() * 5) + 1
        }
      }
    };

    // Store training session
    await prisma.trainingSession.create({
      data: {
        sessionId: trainingSession.sessionId,
        tokenId,
        sessionData: trainingSession,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        session: trainingSession,
        estimatedCompletion: new Date(Date.now() + trainingSession.duration * 1000)
      },
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
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    app.listen(port, () => {
      console.log(`🚀 Simplified Rann Backend Server running on port ${port}`);
      console.log(`🌐 Health check: http://localhost:${port}/api/health`);
      console.log(`🗃️ Database test: http://localhost:${port}/api/test/db`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📡 Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📡 Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch((error) => {
  console.error('💥 Startup failed:', error);
  process.exit(1);
});
