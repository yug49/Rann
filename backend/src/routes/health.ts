/**
 * Health Routes
 * 
 * System health monitoring and diagnostics endpoints
 * 
 * @author Rann Team
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ServiceRegistry, SystemHealth } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Create health routes
 */
export function createHealthRoutes(services: ServiceRegistry): Router {
  const router = Router();

  /**
   * GET /api/health
   * Basic health check endpoint
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const health: SystemHealth = {
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        services: {},
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      // Quick service health checks
      const serviceChecks = await Promise.allSettled([
        checkServiceHealth('database', services.database),
        checkServiceHealth('filecoin', services.filecoin),
        checkServiceHealth('crypto', services.crypto),
        checkServiceHealth('nearai', services.nearai),
        checkServiceHealth('flow', services.flow)
      ]);

      let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

      serviceChecks.forEach((result, index) => {
        const serviceName = ['database', 'filecoin', 'crypto', 'nearai', 'flow'][index]!;
        
        if (result.status === 'fulfilled') {
          health.services[serviceName] = result.value;
          if (result.value.status === 'unhealthy') {
            overallStatus = 'unhealthy';
          } else if (result.value.status === 'degraded' && overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        } else {
          health.services[serviceName] = {
            status: 'unhealthy',
            error: result.reason?.message || 'Unknown error',
            lastCheck: new Date(),
            responseTime: Date.now() - startTime
          };
          overallStatus = 'unhealthy';
        }
      });

      health.status = overallStatus;

      const statusCode = overallStatus === 'healthy' ? 200 : 
                        overallStatus === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Health check failed:', error);
      res.status(503).json({
        success: false,
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/health/detailed
   * Detailed health check with full diagnostics
   */
  router.get('/detailed', asyncHandler(async (req: Request, res: Response) => {
    try {
      const health = await getDetailedHealth(services);
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Detailed health check failed:', error);
      res.status(503).json({
        success: false,
        message: 'Detailed health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/health/services/:serviceName
   * Individual service health check
   */
  router.get('/services/:serviceName', asyncHandler(async (req: Request, res: Response) => {
    const { serviceName } = req.params;
    
    if (!serviceName || !services[serviceName as keyof ServiceRegistry]) {
      res.status(404).json({
        success: false,
        message: 'Service not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const service = services[serviceName as keyof ServiceRegistry];
      const health = await checkServiceHealth(serviceName, service);

      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: true,
        data: {
          service: serviceName,
          ...health
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ ${serviceName} health check failed:`, error);
      res.status(503).json({
        success: false,
        message: `${serviceName} health check failed`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * GET /api/health/stats
   * System statistics and metrics
   */
  router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
    try {
      const stats = await getSystemStats(services);
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ System stats failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system stats',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }));

  return router;
}

/**
 * Check individual service health
 */
async function checkServiceHealth(serviceName: string, service: any): Promise<any> {
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
 * Get detailed system health
 */
async function getDetailedHealth(services: ServiceRegistry): Promise<SystemHealth> {
  const startTime = Date.now();
  
  const health: SystemHealth = {
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    services: {},
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  // Check all services with detailed information
  const servicePromises = Object.entries(services).map(async ([name, service]) => {
    const serviceHealth = await checkServiceHealth(name, service);
    
    // Add service-specific metrics
    if (name === 'database' && 'getSystemStats' in service) {
      try {
        const dbStats = await service.getSystemStats();
        serviceHealth.metrics = dbStats;
      } catch (error) {
        serviceHealth.metricsError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    if (name === 'filecoin' && 'getStorageStats' in service) {
      try {
        const storageStats = await service.getStorageStats();
        serviceHealth.metrics = storageStats;
      } catch (error) {
        serviceHealth.metricsError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return { name, health: serviceHealth };
  });

  const results = await Promise.allSettled(servicePromises);
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { name, health: serviceHealth } = result.value;
      health.services[name] = serviceHealth;
      
      if (serviceHealth.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (serviceHealth.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    } else {
      overallStatus = 'unhealthy';
    }
  });

  health.status = overallStatus;
  
  return health;
}

/**
 * Get system statistics
 */
async function getSystemStats(services: ServiceRegistry): Promise<Record<string, any>> {
  const stats: Record<string, any> = {
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    },
    timestamp: new Date()
  };

  // Database stats
  try {
    if ('getSystemStats' in services.database) {
      stats.database = await services.database.getSystemStats();
    }
  } catch (error) {
    stats.database = { error: error instanceof Error ? error.message : 'Unknown error' };
  }

  // Storage stats
  try {
    if ('getStorageStats' in services.filecoin) {
      stats.storage = await services.filecoin.getStorageStats();
    }
  } catch (error) {
    stats.storage = { error: error instanceof Error ? error.message : 'Unknown error' };
  }

  return stats;
}

export default createHealthRoutes;
