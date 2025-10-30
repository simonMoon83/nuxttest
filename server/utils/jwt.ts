import jwt from 'jsonwebtoken'
import { validateJwtSecret } from './env-validator'

// Validate JWT_SECRET on module load
validateJwtSecret()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export function generateToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET)
  }
  catch (error) {
    return null
  }
} 