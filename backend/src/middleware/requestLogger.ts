/**
 * Request Logger Middleware
 * 
 * Enhanced request logging with TypeScript support
 * 
 * @author Rann Team
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';

/**
 * Request logger middleware
 */
export const requestLogger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log request start
  console.log(`📥 ${req.method} ${req.url} - ${req.ip} - ${timestamp}`);
  
  // Override res.end to capture response details
  const originalEnd = res.end;
  
  res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
    const responseTime = Date.now() - startTime;
    const statusColor = getStatusColor(res.statusCode);
    
    console.log(
      `📤 ${req.method} ${req.url} - ${statusColor}${res.statusCode}\x1b[0m - ${responseTime}ms - ${req.ip}`
    );
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

/**
 * Get ANSI color code based on HTTP status
 */
function getStatusColor(status: number): string {
  if (status >= 500) return '\x1b[31m'; // Red
  if (status >= 400) return '\x1b[33m'; // Yellow
  if (status >= 300) return '\x1b[36m'; // Cyan
  if (status >= 200) return '\x1b[32m'; // Green
  return '\x1b[0m'; // Reset
}

export default requestLogger;
