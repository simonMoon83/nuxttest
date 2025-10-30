/**
 * In-memory rate limiter
 * Protects APIs from brute force and DoS attacks
 *
 * Features:
 * - IP-based rate limiting
 * - Configurable time windows
 * - Automatic cleanup of expired entries
 * - Thread-safe for single-node deployments
 *
 * Note: For multi-node deployments, consider Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number
  resetAt: number
  blocked?: boolean
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Check if a request is allowed
   *
   * @param identifier - Unique identifier (usually IP address)
   * @param maxAttempts - Maximum number of attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns Rate limit result
   */
  check(
    identifier: string,
    maxAttempts: number,
    windowMs: number,
  ): RateLimitResult {
    const now = Date.now()
    const entry = this.store.get(identifier)

    // No existing entry or window expired - start new window
    if (!entry || now > entry.resetAt) {
      this.store.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      })

      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetAt: now + windowMs,
      }
    }

    // Already blocked
    if (entry.blocked) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter,
      }
    }

    // Increment counter
    entry.count++

    // Exceeded limit
    if (entry.count > maxAttempts) {
      entry.blocked = true
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)

      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter,
      }
    }

    // Still allowed
    return {
      allowed: true,
      remaining: maxAttempts - entry.count,
      resetAt: entry.resetAt,
    }
  }

  /**
   * Reset rate limit for an identifier
   * Use this after successful authentication to reset login attempts
   *
   * @param identifier - Unique identifier to reset
   */
  reset(identifier: string) {
    this.store.delete(identifier)
  }

  /**
   * Cleanup expired entries
   * Called automatically every 5 minutes
   */
  private cleanup() {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`[RateLimiter] Cleaned up ${cleaned} expired entries`)
    }
  }

  /**
   * Get current store size (for debugging)
   */
  getStoreSize(): number {
    return this.store.size
  }

  /**
   * Clear all entries (for testing)
   */
  clear() {
    this.store.clear()
  }

  /**
   * Cleanup interval (call on server shutdown)
   */
  destroy() {
    clearInterval(this.cleanupInterval)
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

/**
 * Check login rate limit
 * - 5 attempts per 5 minutes per IP
 * - Use this to prevent brute force attacks
 *
 * @param identifier - IP address
 * @returns Rate limit result
 */
export function checkLoginRateLimit(identifier: string): RateLimitResult {
  return rateLimiter.check(identifier, 5, 5 * 60 * 1000)
}

/**
 * Check general API rate limit
 * - 60 requests per minute per IP
 * - Use this to prevent DoS attacks
 *
 * @param identifier - IP address
 * @returns Rate limit result
 */
export function checkApiRateLimit(identifier: string): RateLimitResult {
  return rateLimiter.check(identifier, 60, 60 * 1000)
}

/**
 * Check file upload rate limit
 * - 10 uploads per 10 minutes per IP
 * - Use this to prevent upload spam
 *
 * @param identifier - IP address
 * @returns Rate limit result
 */
export function checkUploadRateLimit(identifier: string): RateLimitResult {
  return rateLimiter.check(identifier, 10, 10 * 60 * 1000)
}
