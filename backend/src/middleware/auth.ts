/**
 * Authentication Middleware
 * 
 * Handles wallet-based authentication with proper TypeScript typing
 * and enterprise-grade security practices.
 * 
 * @author Rann Team
 */

import * as jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import type { Response, NextFunction } from 'express';
import type { 
  AuthenticatedRequest, 
  AuthUser, 
  AuthToken, 
  MiddlewareFunction,
  AppError 
} from '../types';

/**
 * Environment variables with proper typing
 */
interface AuthConfig {
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ADMIN_ADDRESSES: string;
}

const getAuthConfig = (): AuthConfig => {
  const config = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
    ADMIN_ADDRESSES: process.env.ADMIN_ADDRESSES ?? ''
  };

  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return config as AuthConfig;
};

/**
 * Required authentication middleware
 */
export const requireAuth: MiddlewareFunction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication token required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const config = getAuthConfig();
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthToken;
    
    // Verify the session is still valid
    const session = await req.services.database.getUserSession(decoded.address);
    
    if (!session) {
      res.status(401).json({
        success: false,
        message: 'Session expired or invalid',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Update last active time
    await req.services.database.storeUserSession(decoded.address, {
      ...session.sessionData,
      lastActive: new Date()
    });

    req.user = {
      address: decoded.address,
      sessionId: decoded.sessionId,
      sessionData: session.sessionData
    };

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Authentication token expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Authentication service error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Optional authentication middleware
 */
export const optionalAuth: MiddlewareFunction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      req.user = undefined;
      next();
      return;
    }

    const config = getAuthConfig();
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthToken;
    const session = await req.services.database.getUserSession(decoded.address);
    
    if (session) {
      req.user = {
        address: decoded.address,
        sessionId: decoded.sessionId,
        sessionData: session.sessionData
      };
    } else {
      req.user = undefined;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on auth errors
    req.user = undefined;
    next();
  }
};

/**
 * Wallet signature verification middleware
 * Used for initial login
 */
export const verifySignature: MiddlewareFunction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { address, message, signature } = req.body as {
      address?: string;
      message?: string;
      signature?: string;
    };

    if (!address || !message || !signature) {
      res.status(400).json({
        success: false,
        message: 'Address, message, and signature are required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      res.status(401).json({
        success: false,
        message: 'Invalid signature',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check message format and timestamp
    const messageData = parseAuthMessage(message);
    
    if (!messageData) {
      res.status(400).json({
        success: false,
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if message is too old (5 minutes max)
    const messageAge = Date.now() - messageData.timestamp;
    if (messageAge > 5 * 60 * 1000) {
      res.status(401).json({
        success: false,
        message: 'Message expired. Please generate a new signature.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    req.verifiedAddress = address;
    req.messageData = messageData;
    
    next();
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Signature verification failed',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Admin authentication middleware
 */
export const requireAdmin: MiddlewareFunction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First check regular authentication
    await new Promise<void>((resolve, reject) => {
      requireAuth(req, res, (error?: any) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if user is admin
    const config = getAuthConfig();
    const adminAddresses = config.ADMIN_ADDRESSES
      .split(',')
      .map(addr => addr.trim().toLowerCase())
      .filter(addr => addr.length > 0);
    
    if (!adminAddresses.includes(req.user.address.toLowerCase())) {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  } catch (error) {
    console.error('❌ Admin authentication error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Admin authentication failed',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Extract JWT token from request
 */
function extractToken(req: AuthenticatedRequest): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  if (req.cookies?.auth_token) {
    return req.cookies.auth_token as string;
  }

  // Check query parameter (for WebSocket connections)
  if (req.query?.token) {
    return req.query.token as string;
  }

  return null;
}

/**
 * Parse authentication message
 */
function parseAuthMessage(message: string): { nonce: string; timestamp: number } | null {
  try {
    // Expected format: "Sign in to Rann Gaming Platform\nNonce: {nonce}\nTimestamp: {timestamp}"
    const lines = message.split('\n');
    
    if (lines.length < 3 || !lines[0]?.includes('Rann Gaming Platform')) {
      return null;
    }

    const nonceLine = lines.find(line => line.startsWith('Nonce:'));
    const timestampLine = lines.find(line => line.startsWith('Timestamp:'));

    if (!nonceLine || !timestampLine) {
      return null;
    }

    const nonce = nonceLine.split('Nonce:')[1]?.trim();
    const timestampStr = timestampLine.split('Timestamp:')[1]?.trim();
    const timestamp = parseInt(timestampStr ?? '', 10);

    if (!nonce || isNaN(timestamp)) {
      return null;
    }

    return { nonce, timestamp };
  } catch (error) {
    return null;
  }
}

/**
 * Generate authentication message for client
 */
export function generateAuthMessage(nonce?: string): {
  message: string;
  nonce: string;
  timestamp: number;
} {
  const messageNonce = nonce ?? Math.random().toString(36).substring(2);
  const timestamp = Date.now();
  
  return {
    message: `Sign in to Rann Gaming Platform\nNonce: ${messageNonce}\nTimestamp: ${timestamp}`,
    nonce: messageNonce,
    timestamp
  };
}

/**
 * Generate JWT token
 */
export function generateToken(address: string, sessionData: Record<string, unknown> = {}): string {
  const config = getAuthConfig();
  
  const payload: AuthToken = {
    address,
    sessionId: Math.random().toString(36).substring(2),
    ...sessionData,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
}

/**
 * Verify if an address is an admin
 */
export function isAdmin(address: string): boolean {
  try {
    const config = getAuthConfig();
    const adminAddresses = config.ADMIN_ADDRESSES
      .split(',')
      .map(addr => addr.trim().toLowerCase())
      .filter(addr => addr.length > 0);
    
    return adminAddresses.includes(address.toLowerCase());
  } catch {
    return false;
  }
}

export default {
  requireAuth,
  optionalAuth,
  verifySignature,
  requireAdmin,
  generateAuthMessage,
  generateToken,
  isAdmin
};
