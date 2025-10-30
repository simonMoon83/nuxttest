/**
 * Pagination utilities
 * Provides standardized pagination for APIs
 */

import type { PaginationInfo, PaginatedResponse } from '../types/api-response'

/**
 * Pagination parameters from request query
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

/**
 * Parse pagination parameters from request query
 *
 * @param query - Request query object
 * @returns Parsed pagination parameters
 */
export function parsePaginationParams(query: any): {
  page: number
  pageSize: number
  offset: number
} {
  let page = Number.parseInt(query.page || DEFAULT_PAGE, 10)
  let pageSize = Number.parseInt(query.pageSize || DEFAULT_PAGE_SIZE, 10)

  // Validate page
  if (Number.isNaN(page) || page < 1) {
    page = DEFAULT_PAGE
  }

  // Validate pageSize
  if (Number.isNaN(pageSize) || pageSize < 1) {
    pageSize = DEFAULT_PAGE_SIZE
  }

  // Limit pageSize
  if (pageSize > MAX_PAGE_SIZE) {
    pageSize = MAX_PAGE_SIZE
  }

  // Calculate offset for SQL
  const offset = (page - 1) * pageSize

  return {
    page,
    pageSize,
    offset,
  }
}

/**
 * Create pagination info from total count
 *
 * @param page - Current page number
 * @param pageSize - Page size
 * @param total - Total number of items
 * @returns Pagination info
 */
export function createPaginationInfo(
  page: number,
  pageSize: number,
  total: number,
): PaginationInfo {
  const totalPages = Math.ceil(total / pageSize)

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

/**
 * Create paginated response
 *
 * @param data - Data array
 * @param page - Current page number
 * @param pageSize - Page size
 * @param total - Total number of items
 * @param meta - Optional metadata
 * @returns Paginated response
 */
export function createPaginatedResponse<T>(
  data: T,
  page: number,
  pageSize: number,
  total: number,
  meta?: any,
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: createPaginationInfo(page, pageSize, total),
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }
}

/**
 * SQL OFFSET FETCH clause generator
 *
 * @param offset - Offset value
 * @param pageSize - Page size
 * @returns SQL clause string
 */
export function getSqlPagination(offset: number, pageSize: number): string {
  return `OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`
}
