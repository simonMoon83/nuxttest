/**
 * Error handler tests
 */

import { describe, it, expect } from 'vitest'
import {
  AppError,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
} from '../../../server/utils/error-handler'
import { ErrorCode } from '../../../server/types/api-response'

describe('Error Handler', () => {
  describe('AppError', () => {
    it('should create error with correct properties', () => {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        400,
        { field: 'email' },
      )

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(error.message).toBe('Validation failed')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'email' })
      expect(error.name).toBe('AppError')
    })

    it('should default to 500 status code', () => {
      const error = new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Something went wrong',
      )

      expect(error.statusCode).toBe(500)
    })

    it('should capture stack trace', () => {
      const error = new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Test error',
      )

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('AppError')
    })
  })

  describe('validationError', () => {
    it('should create validation error', () => {
      const error = validationError('Invalid input', { field: 'email' })

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(error.message).toBe('Invalid input')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'email' })
    })

    it('should work without details', () => {
      const error = validationError('Invalid input')

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(error.details).toBeUndefined()
    })
  })

  describe('notFoundError', () => {
    it('should create not found error with default message', () => {
      const error = notFoundError()

      expect(error.code).toBe(ErrorCode.NOT_FOUND)
      expect(error.message).toBe('Resource not found')
      expect(error.statusCode).toBe(404)
    })

    it('should create not found error with custom resource', () => {
      const error = notFoundError('User')

      expect(error.message).toBe('User not found')
    })
  })

  describe('unauthorizedError', () => {
    it('should create unauthorized error with default message', () => {
      const error = unauthorizedError()

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED)
      expect(error.message).toBe('Unauthorized')
      expect(error.statusCode).toBe(401)
    })

    it('should create unauthorized error with custom message', () => {
      const error = unauthorizedError('Invalid token')

      expect(error.message).toBe('Invalid token')
    })
  })

  describe('forbiddenError', () => {
    it('should create forbidden error with default message', () => {
      const error = forbiddenError()

      expect(error.code).toBe(ErrorCode.FORBIDDEN)
      expect(error.message).toBe('Forbidden')
      expect(error.statusCode).toBe(403)
    })

    it('should create forbidden error with custom message', () => {
      const error = forbiddenError('Insufficient permissions')

      expect(error.message).toBe('Insufficient permissions')
    })
  })
})







