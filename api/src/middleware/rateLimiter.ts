import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { cacheManager } from '../services/cacheManager';

/**
 * Redis-backed rate limiter middleware factory
 * Uses atomic INCR operations with fixed-window algorithm
 * 
 * @param options - Rate limit configuration
 * @returns Express middleware
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req: Request) => req.ip || 'unknown',
  } = options;

  const windowSec = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = keyGenerator(req);
      const route = req.path;

      // Check rate limit using Redis — pass actual window
      const result = await cacheManager.checkRateLimit(key, route, max, windowSec);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());

        res.status(429).json({
          success: false,
          error: 'TooManyRequests',
          message,
          timestamp: new Date().toISOString(),
          retryAfter,
        });
        return;
      }

      next();
    } catch (error: any) {
      // On Redis error, log and allow request (graceful degradation)
      logger.error('rate_limiter_error', {
        error: error.message,
        ip: req.ip,
        path: req.path,
      });
      next();
    }
  };
}

// Chat rate limiting is handled by chatRateLimitRedis (middleware/chatRateLimit.ts)
// which correctly keys by userId and uses its own TTL. Do not add a second limiter here.

/**
 * Global rate limiter for all API endpoints.
 * Limits: 1000 requests per 15 minutes per IP.
 */
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
});

/**
 * Profile update rate limiter.
 * Limits: 20 profile updates per hour per user.
 */
export const profileRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many profile update requests. Please try again later.',
  keyGenerator: (req: Request) => {
    // Use userId if available, otherwise fall back to IP
    const userId = (req as any).userId;
    return userId ? `user:${userId}` : req.ip || 'unknown';
  },
});
