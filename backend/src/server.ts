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
} from './types/index';

// Services
import { DatabaseService } from './services/DatabaseService';
import { FilecoinService } from './services/FilecoinService';
import { CryptoService } from './services/CryptoService';
import { NearAIService } from './services/NearAIService';
import { FlowService } from './services/FlowService';

// Routes
import { createHealthRoutes } from './routes/health';
import { createAuthRoutes } from './routes/auth';
import { createTraitRoutes } from './routes/traits';
import { createTrainingRoutes } from './routes/training';
import { createBattleRoutes } from './routes/battle';
import { createMetadataRoutes } from './routes/metadata';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { serviceInjector } from './middleware/serviceInjector';

// Load environment variables
dotenv.config();

/**
 * Main Rann Backend Server Class
 * 
 * Implements enterprise-grade patterns:
 * - Dependency Injection
 * - Service Registry
 * - Graceful Shutdown
 * - Health Monitoring
 * - Structured Logging
 */
export class RannBackendServer {
  private readonly app: Express;
  private readonly port: number;
  private readonly environment: string;
  private readonly services: ServiceRegistry;
  private server?: import('http').Server;
  private isShuttingDown = false;

  constructor() {
    this.app = express();
    this.port = this.getPort();
    this.environment = process.env.NODE_ENV ?? 'development';
    
    // Initialize service registry
    this.services = this.createServiceRegistry();
    
    console.log(`🚀 Initializing Rann Backend Server in ${this.environment} mode`);
  }

  /**
   * Initialize and start the server
   */
  public async start(): Promise<void> {
    try {
      // Initialize services first
      await this.initializeServices();
      
      // Setup middleware and routes
      this.setupMiddleware();
      this.setupRoutes();
      this.setupErrorHandling();
      
      // Start HTTP server
      await this.startServer();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      console.log(`✅ Rann Backend Server successfully started on port ${this.port}`);
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Create service registry with dependency injection
   */
  private createServiceRegistry(): ServiceRegistry {
    return {
      database: new DatabaseService(),
      filecoin: new FilecoinService(),
      crypto: new CryptoService(),
      nearai: new NearAIService(),
      flow: new FlowService()
    };
  }

  /**
   * Initialize all services in correct order
   */
  private async initializeServices(): Promise<void> {
    console.log('🔧 Initializing services...');
    
    const initOrder = [
      { name: 'Database', service: this.services.database },
      { name: 'Crypto', service: this.services.crypto },
      { name: 'Filecoin', service: this.services.filecoin },
      { name: 'NEAR AI', service: this.services.nearai },
      { name: 'Flow Blockchain', service: this.services.flow }
    ];

    for (const { name, service } of initOrder) {
      try {
        console.log(`  🔄 Initializing ${name} service...`);
        
        if ('initialize' in service && typeof service.initialize === 'function') {
          await service.initialize();
        } else if ('connect' in service && typeof service.connect === 'function') {
          await service.connect();
        }
        
        console.log(`  ✅ ${name} service initialized`);
      } catch (error) {
        console.error(`  ❌ Failed to initialize ${name} service:`, error);
        throw error;
      }
    }
  }

  /**
   * Setup Express middleware stack
   */
  private setupMiddleware(): void {
    console.log('🔧 Setting up middleware...');

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
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: this.getAllowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    this.app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: this.environment === 'production' ? 100 : 1000,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    }));

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    if (this.environment !== 'test') {
      this.app.use(morgan('combined'));
    }

    // Custom middleware
    this.app.use(requestLogger);
    this.app.use(serviceInjector(this.services));

    // Request ID assignment
    this.app.use((req: AuthenticatedRequest, _res, next) => {
      req.requestId = uuidv4();
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    console.log('🔧 Setting up routes...');

    // API base path
    const apiRouter = express.Router();

    // Mount route modules
    apiRouter.use('/health', createHealthRoutes(this.services));
    apiRouter.use('/auth', createAuthRoutes());
    apiRouter.use('/traits', createTraitRoutes());
    apiRouter.use('/training', createTrainingRoutes());
    apiRouter.use('/battle', createBattleRoutes());
    apiRouter.use('/metadata', createMetadataRoutes());

    // Mount API router
    this.app.use('/api', apiRouter);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        service: 'Rann Backend Service',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: this.environment
      });
    });

    // 404 handler
    this.app.use('*', (_req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Start HTTP server
   */
  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string): Promise<void> => {
      if (this.isShuttingDown) return;
      
      console.log(`📡 Received ${signal}, starting graceful shutdown...`);
      this.isShuttingDown = true;

      try {
        // Close HTTP server
        if (this.server) {
          await new Promise<void>((resolve) => {
            this.server!.close(() => resolve());
          });
        }

        // Cleanup services
        await this.cleanupServices();

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      shutdownHandler('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason) => {
      console.error('💥 Unhandled Rejection:', reason);
      shutdownHandler('unhandledRejection');
    });
  }

  /**
   * Cleanup services during shutdown
   */
  private async cleanupServices(): Promise<void> {
    console.log('🧹 Cleaning up services...');

    const cleanupOrder = [
      { name: 'Flow Blockchain', service: this.services.flow },
      { name: 'NEAR AI', service: this.services.nearai },
      { name: 'Filecoin', service: this.services.filecoin },
      { name: 'Database', service: this.services.database }
    ];

    for (const { name, service } of cleanupOrder) {
      try {
        if ('disconnect' in service && typeof service.disconnect === 'function') {
          await service.disconnect();
          console.log(`  ✅ ${name} service disconnected`);
        }
      } catch (error) {
        console.error(`  ❌ Error disconnecting ${name} service:`, error);
      }
    }
  }

  /**
   * Get system health status
   */
  public async getHealth(): Promise<any> {
    const startTime = Date.now();
    
    const serviceHealthChecks = await Promise.allSettled([
      this.checkServiceHealth('database', this.services.database),
      this.checkServiceHealth('filecoin', this.services.filecoin),
      this.checkServiceHealth('crypto', this.services.crypto),
      this.checkServiceHealth('nearai', this.services.nearai),
      this.checkServiceHealth('flow', this.services.flow)
    ]);

    const services: Record<string, any> = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    serviceHealthChecks.forEach((result, index) => {
      const serviceName = ['database', 'filecoin', 'crypto', 'nearai', 'flow'][index]!;
      
      if (result.status === 'fulfilled') {
        services[serviceName] = result.value;
        if (result.value.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (result.value.status === 'degraded' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } else {
        services[serviceName] = {
          status: 'unhealthy',
          error: result.reason?.message ?? 'Unknown error',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime
        };
        overallStatus = 'unhealthy';
      }
    });

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: process.uptime(),
      services,
      version: '1.0.0',
      environment: this.environment
    };
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(serviceName: string, service: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      let isHealthy = true;
      
      if ('isHealthy' in service && typeof service.isHealthy === 'function') {
        isHealthy = await service.isHealthy();
      }
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get server port from environment
   */
  private getPort(): number {
    const port = parseInt(process.env.PORT ?? '3001', 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port: ${process.env.PORT}`);
    }
    return port;
  }

  /**
   * Get allowed CORS origins
   */
  private getAllowedOrigins(): string[] {
    const origins = process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000'
    ];
    
    return origins.map(origin => origin.trim());
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new RannBackendServer();
  server.start().catch((error) => {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  });
}

export default RannBackendServer;
