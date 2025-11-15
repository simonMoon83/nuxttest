/**
 * Password policy tests
 */

import { describe, it, expect } from 'vitest'
import {
  validatePassword,
  calculatePasswordStrength,
  generateSecurePassword,
} from '../../../server/utils/password-policy'

describe('Password Policy', () => {
  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      const passwords = [
        'MySecure@Pass123',
        'Tr0ng!P@ssw0rd',
        'C0mpl3x#Passw0rd',
      ]

      passwords.forEach((password) => {
        const result = validatePassword(password)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should reject passwords shorter than 12 characters', () => {
      const result = validatePassword('Short1!')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('12 characters'))).toBe(true)
    })

    it('should reject passwords without uppercase letters', () => {
      const result = validatePassword('lowercase123!')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true)
    })

    it('should reject passwords without lowercase letters', () => {
      const result = validatePassword('UPPERCASE123!')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true)
    })

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbers!@#')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('number'))).toBe(true)
    })

    it('should reject passwords without special characters', () => {
      const result = validatePassword('NoSpecialChars123')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('special character'))).toBe(true)
    })

    it('should reject common passwords', () => {
      const commonPasswords = [
        'password',
        'password123',
        '123456',
        'qwerty',
        'admin123',
      ]

      commonPasswords.forEach((password) => {
        const result = validatePassword(password)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('too common'))).toBe(true)
      })
    })

    it('should reject passwords exceeding max length', () => {
      const longPassword = 'A'.repeat(130) + '1!'
      const result = validatePassword(longPassword)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('exceed'))).toBe(true)
    })

    it('should handle empty or null input', () => {
      expect(validatePassword('').valid).toBe(false)
      expect(validatePassword(null as any).valid).toBe(false)
      expect(validatePassword(undefined as any).valid).toBe(false)
    })
  })

  describe('calculatePasswordStrength', () => {
    it('should rate short passwords as weak', () => {
      const score = calculatePasswordStrength('Short1!')
      expect(score).toBeLessThan(60)
    })

    it('should rate medium passwords correctly', () => {
      const score = calculatePasswordStrength('MediumPass123!')
      expect(score).toBeGreaterThanOrEqual(60)
      expect(score).toBeLessThan(80)
    })

    it('should rate strong passwords highly', () => {
      const score = calculatePasswordStrength('VeryStr0ng!P@ssw0rd#2024')
      expect(score).toBeGreaterThanOrEqual(80)
    })

    it('should give bonus for multiple special characters', () => {
      const simple = calculatePasswordStrength('Password123!')
      const complex = calculatePasswordStrength('Password123!@#$')
      expect(complex).toBeGreaterThan(simple)
    })

    it('should give bonus for length', () => {
      const short = calculatePasswordStrength('Pass123!')
      const long = calculatePasswordStrength('LongerPassword123!@#')
      expect(long).toBeGreaterThan(short)
    })
  })

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = generateSecurePassword(16)
      expect(password.length).toBe(16)
    })

    it('should generate password with default length', () => {
      const password = generateSecurePassword()
      expect(password.length).toBe(16)
    })

    it('should generate passwords that pass validation', () => {
      const password = generateSecurePassword(16)
      const result = validatePassword(password)
      expect(result.valid).toBe(true)
    })

    it('should generate different passwords each time', () => {
      const password1 = generateSecurePassword()
      const password2 = generateSecurePassword()
      expect(password1).not.toBe(password2)
    })

    it('should include all required character types', () => {
      const password = generateSecurePassword(20)
      expect(/[a-z]/.test(password)).toBe(true) // lowercase
      expect(/[A-Z]/.test(password)).toBe(true) // uppercase
      expect(/[0-9]/.test(password)).toBe(true) // number
      expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)).toBe(true) // special
    })
  })
})







