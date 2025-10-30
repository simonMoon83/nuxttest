/**
 * Centralized error handling utilities
 * Converts various error types into standardized API responses
 */

import type { H3Event, H3Error } from 'h3'
import { ErrorCode, createErrorResponse } from '../types/api-response'
import type { ApiResponse } from '../types/api-response'

/**
 * Custom application error class
 * Use this for throwing domain-specific errors
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: any,
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Map error codes to HTTP status codes
 */
function getStatusCode(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.INVALID_REQUEST]: 400,
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.RATE_LIMIT]: 429,
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.DATABASE_ERROR]: 500,
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
    [ErrorCode.TIMEOUT]: 504,
  }

  return statusMap[code] || 500
}

/**
 * Handle AppError instances
 */
function handleAppError(error: AppError, event: H3Event): ApiResponse {
  setResponseStatus(event, error.statusCode)

  return createErrorResponse(
    error.code,
    error.message,
    error.details,
  )
}

/**
 * Handle H3Error (createError) instances
 */
function handleH3Error(error: H3Error, event: H3Event): ApiResponse {
  const statusCode = error.statusCode || 500

  let code: ErrorCode
  let message: string

  switch (statusCode) {
    case 400:
      code = ErrorCode.VALIDATION_ERROR
      message = error.message || 'Bad request'
      break
    case 401:
      code = ErrorCode.UNAUTHORIZED
      message = error.message || 'Unauthorized'
      break
    case 403:
      code = ErrorCode.FORBIDDEN
      message = error.message || 'Forbidden'
      break
    case 404:
      code = ErrorCode.NOT_FOUND
      message = error.message || 'Resource not found'
      break
    case 409:
      code = ErrorCode.CONFLICT
      message = error.message || 'Resource conflict'
      break
    case 429:
      code = ErrorCode.RATE_LIMIT
      message = error.message || 'Too many requests'
      break
    default:
      code = ErrorCode.INTERNAL_ERROR
      message = error.message || 'Internal server error'
  }

  setResponseStatus(event, statusCode)

  return createErrorResponse(code, message, (error as any).data)
}

/**
 * Handle database errors (mssql)
 */
function handleDatabaseError(error: any, event: H3Event): ApiResponse {
  console.error('[Database Error]', {
    number: error.number,
    state: error.state,
    class: error.class,
    message: error.message,
  })

  setResponseStatus(event, 500)

  // Don't expose internal database errors in production
  const isDev = process.env.NODE_ENV === 'development'

  return createErrorResponse(
    ErrorCode.DATABASE_ERROR,
    'Database operation failed',
    isDev
      ? {
          code: error.number,
          state: error.state,
          message: error.message,
        }
      : undefined,
  )
}

/**
 * Handle unknown/generic errors
 */
function handleGenericError(error: any, event: H3Event): ApiResponse {
  console.error('[Unhandled Error]', error)

  setResponseStatus(event, 500)

  const isDev = process.env.NODE_ENV === 'development'

  return createErrorResponse(
    ErrorCode.INTERNAL_ERROR,
    'An unexpected error occurred',
    isDev
      ? {
          message: error?.message,
          stack: error?.stack,
        }
      : undefined,
  )
}

/**
 * Main error handler
 * Converts any error into standardized API response
 *
 * @param error - Error to handle
 * @param event - H3 event
 * @returns Standardized API error response
 */
export function handleError(error: any, event: H3Event): ApiResponse {
  // AppError (custom application errors)
  if (error instanceof AppError) {
    return handleAppError(error, event)
  }

  // H3Error (createError from h3)
  if (error?.statusCode) {
    return handleH3Error(error, event)
  }

  // Database errors (mssql)
  if (error?.number && error?.state) {
    return handleDatabaseError(error, event)
  }

  // Generic errors
  return handleGenericError(error, event)
}

/**
 * Validation error helper
 * Use for input validation failures
 */
export function validationError(
  message: string,
  details?: any,
): AppError {
  return new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details)
}

/**
 * Not found error helper
 */
export function notFoundError(
  resource: string = 'Resource',
): AppError {
  return new AppError(
    ErrorCode.NOT_FOUND,
    `${resource} not found`,
    404,
  )
}

/**
 * Unauthorized error helper
 */
export function unauthorizedError(
  message: string = 'Unauthorized',
): AppError {
  return new AppError(ErrorCode.UNAUTHORIZED, message, 401)
}

/**
 * Forbidden error helper
 */
export function forbiddenError(
  message: string = 'Forbidden',
): AppError {
  return new AppError(ErrorCode.FORBIDDEN, message, 403)
}
