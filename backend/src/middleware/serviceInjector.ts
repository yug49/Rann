/**
 * Service Injector Middleware
 * 
 * Dependency injection middleware for services
 * 
 * @author Rann Team
 */

import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, ServiceRegistry } from '../types';

/**
 * Create service injector middleware
 */
export const serviceInjector = (services: ServiceRegistry) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    req.services = services;
    next();
  };
};

export default serviceInjector;
