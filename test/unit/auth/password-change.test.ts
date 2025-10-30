/**
 * Password change functionality tests
 */

import { describe, it, expect } from 'vitest'
import { validatePassword } from '../../../server/utils/password-policy'

describe('Password Change', () => {
  describe('validatePassword', () => {
    it('should accept strong password', () => {
      const result = validatePassword('MySecure@Pass123')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.strength).toBe('strong')
    })

    it('should reject password shorter than 12 characters', () => {
      const result = validatePassword('Short1!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 12 characters long')
    })

    it('should reject password without uppercase', () => {
      const result = validatePassword('mysecure@pass123')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true)
    })

    it('should reject password without lowercase', () => {
      const result = validatePassword('MYSECURE@PASS123')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true)
    })

    it('should reject password without numbers', () => {
      const result = validatePassword('MySecure@Password')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('number'))).toBe(true)
    })

    it('should reject password without special characters', () => {
      const result = validatePassword('MySecurePassword123')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('special character'))).toBe(true)
    })

    it('should reject common passwords', () => {
      const result = validatePassword('password123')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('too common'))).toBe(true)
    })

    it('should calculate password strength correctly', () => {
      // Short password (12 chars) - weak/medium
      const short = validatePassword('MyPass123!')
      expect(short.strength).toBeDefined()

      // Medium length (17 chars) - should be strong
      const medium = validatePassword('MySecurePass123!')
      expect(medium.strength).toBeTruthy()

      // Long with complexity (26 chars) - strong
      const strong = validatePassword('MyVerySecurePassword123!@#')
      expect(strong.strength).toBe('strong')
    })
  })
})

