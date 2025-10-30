/**
 * Password policy utilities
 * Enforces strong password requirements
 */

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  strength?: 'weak' | 'medium' | 'strong'
}

/**
 * Password policy configuration
 */
export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxLength?: number
}

/**
 * Default password policy
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
}

/**
 * Common weak passwords (top 100 most common)
 * In production, consider using a comprehensive list or API like haveibeenpwned
 */
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  '111111',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'passw0rd',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
  'welcome',
  'jesus',
  'admin',
  'admin123',
  'root',
  'toor',
])

/**
 * Validate password against policy
 *
 * @param password - Password to validate
 * @param policy - Password policy (uses DEFAULT_PASSWORD_POLICY if not provided)
 * @returns Validation result
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): PasswordValidationResult {
  const errors: string[] = []

  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password is required'],
    }
  }

  // Length check
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`)
  }

  if (policy.maxLength && password.length > policy.maxLength) {
    errors.push(`Password must not exceed ${policy.maxLength} characters`)
  }

  // Lowercase check
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  // Uppercase check
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  // Number check
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  // Special character check
  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)')
  }

  // Common password check
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a more unique password')
  }

  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (errors.length === 0) {
    const score = calculatePasswordStrength(password)
    if (score >= 80)
      strength = 'strong'
    else if (score >= 60)
      strength = 'medium'
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  }
}

/**
 * Calculate password strength score (0-100)
 *
 * @param password - Password to evaluate
 * @returns Strength score
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0

  // Length score (up to 30 points)
  if (password.length >= 12)
    score += 15
  if (password.length >= 16)
    score += 10
  if (password.length >= 20)
    score += 5

  // Character variety (up to 40 points)
  if (/[a-z]/.test(password))
    score += 10
  if (/[A-Z]/.test(password))
    score += 10
  if (/[0-9]/.test(password))
    score += 10
  if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(password))
    score += 10

  // Complexity bonus (up to 30 points)
  const hasMultipleNumbers = (password.match(/[0-9]/g) || []).length >= 2
  const hasMultipleSpecial = (password.match(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/g) || []).length >= 2
  const hasUpperAndLower = /[a-z]/.test(password) && /[A-Z]/.test(password)

  if (hasMultipleNumbers)
    score += 10
  if (hasMultipleSpecial)
    score += 10
  if (hasUpperAndLower)
    score += 10

  return Math.min(score, 100)
}

/**
 * Generate a secure random password
 *
 * @param length - Password length (default: 16)
 * @returns Randomly generated password
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'

  const all = lowercase + uppercase + numbers + special

  // Ensure at least one of each type
  let password = ''
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  // Shuffle to avoid predictable pattern
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

/**
 * Check if password has been compromised
 * This is a placeholder for integration with haveibeenpwned API
 *
 * @param password - Password to check
 * @returns True if password appears compromised
 */
export async function isPasswordCompromised(_password: string): Promise<boolean> {
  // TODO: Integrate with haveibeenpwned API
  // For now, just check against common passwords
  return COMMON_PASSWORDS.has(_password.toLowerCase())
}
