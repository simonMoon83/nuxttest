/**
 * Rate limiter tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rateLimiter, checkLoginRateLimit, checkApiRateLimit, checkUploadRateLimit } from '../../../server/utils/rate-limiter'

describe('Rate Limiter', () => {
  beforeEach(() => {
    rateLimiter.clear()
  })

  afterEach(() => {
    rateLimiter.clear()
  })

  describe('checkLoginRateLimit', () => {
    it('should allow requests within limit', () => {
      const ip = '192.168.1.1'
      
      // First 5 attempts should be allowed
      for (let i = 0; i < 5; i++) {
        const result = checkLoginRateLimit(ip)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(5 - i - 1)
      }
    })

    it('should block requests exceeding limit', () => {
      const ip = '192.168.1.2'
      
      // Use up all 5 attempts
      for (let i = 0; i < 5; i++) {
        checkLoginRateLimit(ip)
      }
      
      // 6th attempt should be blocked
      const result = checkLoginRateLimit(ip)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should reset counter after successful login', () => {
      const ip = '192.168.1.3'
      
      // Make some attempts
      checkLoginRateLimit(ip)
      checkLoginRateLimit(ip)
      
      // Reset after success
      rateLimiter.reset(ip)
      
      // Should allow again
      const result = checkLoginRateLimit(ip)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })
  })

  describe('checkApiRateLimit', () => {
    it('should allow 60 requests per minute', () => {
      const ip = '192.168.1.4'
      
      // First 60 should be allowed
      for (let i = 0; i < 60; i++) {
        const result = checkApiRateLimit(ip)
        expect(result.allowed).toBe(true)
      }
      
      // 61st should be blocked
      const result = checkApiRateLimit(ip)
      expect(result.allowed).toBe(false)
    })
  })

  describe('checkUploadRateLimit', () => {
    it('should allow 10 uploads per 10 minutes', () => {
      const ip = '192.168.1.5'
      
      // First 10 should be allowed
      for (let i = 0; i < 10; i++) {
        const result = checkUploadRateLimit(ip)
        expect(result.allowed).toBe(true)
      }
      
      // 11th should be blocked
      const result = checkUploadRateLimit(ip)
      expect(result.allowed).toBe(false)
    })
  })

  describe('rateLimiter', () => {
    it('should handle different IPs independently', () => {
      const ip1 = '192.168.1.10'
      const ip2 = '192.168.1.11'
      
      // Use up limit for ip1
      for (let i = 0; i < 5; i++) {
        checkLoginRateLimit(ip1)
      }
      
      // ip1 should be blocked
      expect(checkLoginRateLimit(ip1).allowed).toBe(false)
      
      // ip2 should still be allowed
      expect(checkLoginRateLimit(ip2).allowed).toBe(true)
    })

    it('should return store size', () => {
      checkLoginRateLimit('192.168.1.20')
      checkLoginRateLimit('192.168.1.21')
      
      expect(rateLimiter.getStoreSize()).toBe(2)
    })

    it('should clear all entries', () => {
      checkLoginRateLimit('192.168.1.30')
      checkLoginRateLimit('192.168.1.31')
      
      rateLimiter.clear()
      
      expect(rateLimiter.getStoreSize()).toBe(0)
    })
  })
})

