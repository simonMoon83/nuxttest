/**
 * Simple in-memory cache utility
 * For production with multiple instances, consider Redis
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class SimpleCache {
  private store = new Map<string, CacheEntry<any>>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Get cached value
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key)

    if (!entry) {
      return undefined
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }

    return entry.value as T
  }

  /**
   * Set cache value with TTL
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  /**
   * Delete cached value
   *
   * @param key - Cache key
   */
  delete(key: string): void {
    this.store.delete(key)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.store.size
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Get or set (fetch if not cached)
   *
   * @param key - Cache key
   * @param fetcher - Function to fetch value if not cached
   * @param ttlMs - Time to live in milliseconds
   * @returns Cached or fetched value
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    const cached = this.get<T>(key)

    if (cached !== undefined) {
      return cached
    }

    const value = await fetcher()
    this.set(key, value, ttlMs)

    return value
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`)
    }
  }

  /**
   * Destroy cache (cleanup interval)
   */
  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.clear()
  }
}

// Singleton instance
export const cache = new SimpleCache()

/**
 * Cache keys helper
 */
export const CacheKeys = {
  user: (id: number) => `user:${id}`,
  role: (id: number) => `role:${id}`,
  permissions: (userId: number) => `permissions:${userId}`,
  menu: (userId: number) => `menu:${userId}`,
  department: (id: number) => `department:${id}`,
} as const

/**
 * Default TTL values (in milliseconds)
 */
export const CacheTTL = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  HOUR: 60 * 60 * 1000, // 1 hour
} as const
