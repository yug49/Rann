/**
 * Error Handler Middleware
 * 
 * Centralized error handling with proper logging and client responses
 * 
 * @author Rann Team
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError, type ErrorResponse } from '../types';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response already sent, delegate to Express default error handler
  if (res.headersSent) {
    next(error);
    return;
  }

  const requestId = (req as any).requestId ?? 'unknown';
  const timestamp = new Date().toISOString();

  // Log error with context
  console.error('💥 Error Handler:', {
    requestId,
    timestamp,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });

  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Handle known error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    isOperational = true;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
    isOperational = true;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    isOperational = true;
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    isOperational = true;
  } else if ((error as any).code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
    isOperational = true;
  }

  const errorResponse: ErrorResponse = {
    success: false,
    message,
    statusCode,
    timestamp,
    requestId
  };

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = error.message;
    errorResponse.stack = error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);

  // For non-operational errors, consider shutting down
  if (!isOperational) {
    console.error('🚨 Non-operational error detected. Consider graceful shutdown.');
  }
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = (req as any).requestId ?? 'unknown';
  
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    requestId
  });
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = <T extends any[]>(
  fn: (...args: T) => Promise<any>
) => {
  return (...args: T): void => {
    const next = args[args.length - 1] as NextFunction;
    Promise.resolve(fn(...args)).catch(next);
  };
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
