/**
 * Environment variable validation utilities
 * Validates critical environment variables at startup
 */

/**
 * Validates JWT_SECRET environment variable
 * - Development: Allows default value with warning
 * - Production: Requires secure secret (32+ characters)
 *
 * @throws {Error} If JWT_SECRET is missing or too short in production
 */
export function validateJwtSecret() {
  const secret = process.env.JWT_SECRET
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

  if (!secret || secret === 'your-secret-key-change-in-production') {
    if (!isDev) {
      throw new Error(
        'JWT_SECRET must be set in production environment. '
        + 'Generate one with: openssl rand -base64 32',
      )
    }
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '\n⚠️  WARNING: Using default JWT_SECRET in development mode\n'
        + '   This is insecure for production. Set JWT_SECRET environment variable.\n'
        + '   Generate: openssl rand -base64 32\n',
      )
    }
    return
  }

  if (!isDev && secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters in production. '
      + 'Current length: ' + secret.length,
    )
  }

  // Success - log only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('✓ JWT_SECRET validated')
  }
}

/**
 * Validates all critical environment variables
 * Call this function at application startup
 */
export function validateEnvironment() {
  try {
    validateJwtSecret()
  }
  catch (error) {
    console.error('Environment validation failed:', error)
    throw error
  }
}
