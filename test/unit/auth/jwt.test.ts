/**
 * JWT utilities test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { generateToken, verifyToken } from '../../../server/utils/jwt'

describe('JWT Utilities', () => {
  const testPayload = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    full_name: 'Test User',
  }

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testPayload)
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should include payload data', () => {
      const token = generateToken(testPayload)
      const decoded = verifyToken(token)
      expect(decoded?.id).toBe(testPayload.id)
      expect(decoded?.username).toBe(testPayload.username)
      expect(decoded?.email).toBe(testPayload.email)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(testPayload)
      const decoded = verifyToken(token)
      expect(decoded).toBeTruthy()
      expect(decoded?.id).toBe(testPayload.id)
    })

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid.token.here')
      expect(decoded).toBeNull()
    })

    it('should return null for malformed token', () => {
      const decoded = verifyToken('not-a-jwt-token')
      expect(decoded).toBeNull()
    })

    it('should return null for empty token', () => {
      const decoded = verifyToken('')
      expect(decoded).toBeNull()
    })
  })
})

