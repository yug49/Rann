/**
 * Rann Backend Service - Main Server Entry Point
 * 
 * Industry-standard TypeScript implementation with proper error handling,
 * service orchestration, and dependency injection.
 * 
 * @author Rann Team
 */

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

import type { 
  ServiceRegistry, 
  EnvironmentConfig, 
  AuthenticatedRequest
} from './types';

// Services
import { DatabaseService } from './services/DatabaseService';
import { FilecoinService } from './services/FilecoinService';
import { CryptoService } from './services/CryptoService';
import { NearAIService } from './services/NearAIService';
import { FlowService } from './services/FlowService';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { serviceInjector } from './middleware/serviceInjector';

// Routes
import { createAuthRoutes } from './routes/auth';
import { createTraitsRoutes } from './routes/traits';
import { createTrainingRoutes } from './routes/training';
import { createBattleRoutes } from './routes/battle';
import { createMetadataRoutes } from './routes/metadata';
import { createHealthRoutes } from './routes/health';

// Load environment variables
dotenv.config();

/**
 * Environment configuration with validation
 */
const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  
  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  
  // NEAR Protocol
  nearAccountId: process.env.NEAR_ACCOUNT_ID || '',
  nearPrivateKey: process.env.NEAR_PRIVATE_KEY || '',
  nearNetworkId: process.env.NEAR_NETWORK_ID || 'testnet',
  
  // Flow Blockchain
  flowNetwork: process.env.FLOW_NETWORK || 'testnet',
  flowPrivateKey: process.env.FLOW_PRIVATE_KEY || '',
  flowAccountAddress: process.env.FLOW_ACCOUNT_ADDRESS || '',
  
  // AI Services
  nearAiApiKey: process.env.NEAR_AI_API_KEY || '',
  traitsGeneratorUrl: process.env.TRAITS_GENERATOR_URL || '',
  
  // Storage
  pinataApiKey: process.env.PINATA_API_KEY || '',
  lighthouseApiKey: process.env.LIGHTHOUSE_API_KEY || ''
};

/**
 * Main Server Class
 */
class RannServer {
  private app: Express;
  private services: ServiceRegistry;

  constructor() {
    this.app = express();
    this.services = {} as ServiceRegistry;
  }

  /**
   * Initialize all services
   */
  private async initializeServices(): Promise<void> {
    console.log('🔧 Initializing services...');

    try {
      // Initialize services in dependency order
      this.services.database = new DatabaseService();
      this.services.crypto = new CryptoService();
      this.services.filecoin = new FilecoinService();
      this.services.nearai = new NearAIService();
      this.services.flow = new FlowService();

      // Initialize each service
      await this.services.database.connect();
      console.log('✅ Database service initialized');

      await this.services.filecoin.initialize();
      console.log('✅ Filecoin service initialized');

      await this.services.nearai.initialize();
      console.log('✅ NEAR AI service initialized');

      await this.services.flow.initialize();
      console.log('✅ Flow service initialized');

      console.log('🎉 All services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
      }
    });
    this.app.use('/api/', limiter);

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    }
    this.app.use(requestLogger);

    // Request ID middleware
    this.app.use((req: AuthenticatedRequest, _res, next) => {
      req.requestId = uuidv4();
      next();
    });

    // Service injection
    this.app.use(serviceInjector(this.services));
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.get('/', (_req, res) => {
      res.json({
        service: 'Rann Backend Service',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv
      });
    });

    // API routes
    this.app.use('/api/health', createHealthRoutes());
    this.app.use('/api/auth', createAuthRoutes());
    this.app.use('/api/traits', createTraitsRoutes());
    this.app.use('/api/training', createTrainingRoutes());
    this.app.use('/api/battle', createBattleRoutes());
    this.app.use('/api/metadata', createMetadataRoutes());

    // 404 handler
    this.app.use(notFoundHandler);

    // Error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      console.log('🚀 Starting Rann Backend Service...');
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`🌐 Port: ${config.port}`);

      // Initialize services
      await this.initializeServices();

      // Setup middleware and routes
      this.setupMiddleware();
      this.setupRoutes();

      // Start HTTP server
      const server = this.app.listen(config.port, () => {
        console.log(`✅ Server running on port ${config.port}`);
        console.log(`🔗 API available at: http://localhost:${config.port}/api`);
        console.log('🎮 Rann Gaming Backend is ready!');
      });

      // Graceful shutdown
      const gracefulShutdown = async (signal: string) => {
        console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
        
        server.close(async () => {
          console.log('🔌 HTTP server closed');
          
          try {
            // Cleanup services
            await this.services.database.disconnect();
            console.log('🗄️ Database connections closed');
            
            console.log('✅ Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
          }
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
          console.error('⚠️ Forceful shutdown after timeout');
          process.exit(1);
        }, 30000);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
      console.error('💥 Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Health check for services
   */
  public async checkHealth(): Promise<{
    status: string;
    services: Record<string, { status: string; error?: string }>;
  }> {
    const healthStatus = {
      status: 'healthy',
      services: {} as Record<string, { status: string; error?: string }>
    };

    try {
      // Check database
      const dbHealthy = await this.services.database.isHealthy();
      healthStatus.services.database = { 
        status: dbHealthy ? 'healthy' : 'unhealthy' 
      };

      // Check other services
      const filecoinHealthy = await this.services.filecoin.isHealthy();
      healthStatus.services.filecoin = { 
        status: filecoinHealthy ? 'healthy' : 'unhealthy' 
      };

      const nearaiHealthy = await this.services.nearai.isHealthy();
      healthStatus.services.nearai = { 
        status: nearaiHealthy ? 'healthy' : 'unhealthy' 
      };

      const flowHealthy = await this.services.flow.isHealthy();
      healthStatus.services.flow = { 
        status: flowHealthy ? 'healthy' : 'unhealthy' 
      };

      // Overall status
      const allHealthy = Object.values(healthStatus.services)
        .every(service => service.status === 'healthy');
      
      healthStatus.status = allHealthy ? 'healthy' : 'degraded';

    } catch (error) {
      healthStatus.status = 'unhealthy';
      console.error('Health check failed:', error);
    }

    return healthStatus;
  }
}

/**
 * Start the server if this file is run directly
 */
if (require.main === module) {
  const server = new RannServer();
  server.start().catch(console.error);
}

export default RannServer;
export { config };
