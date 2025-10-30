/**
 * Standardized API response types
 * Ensures consistent response format across all endpoints
 */

/**
 * Standard API response wrapper
 * All API endpoints should return this format
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ResponseMeta
}

/**
 * Error information in API responses
 */
export interface ApiError {
  code: ErrorCode
  message: string
  details?: any
  stack?: string // Only in development
}

/**
 * Additional metadata for responses
 */
export interface ResponseMeta {
  timestamp: string
  requestId?: string
  version?: string
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination: PaginationInfo
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Standard error codes
 */
export enum ErrorCode {
  // Client errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_REQUEST = 'INVALID_REQUEST',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Helper function to create success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<ResponseMeta>,
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }
}

/**
 * Helper function to create error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: any,
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Helper function to create paginated response
 */
export function createPaginatedResponse<T>(
  data: T,
  pagination: PaginationInfo,
  meta?: Partial<ResponseMeta>,
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }
}
