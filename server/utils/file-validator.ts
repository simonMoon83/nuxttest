/**
 * File upload security validator
 * Protects against path traversal, MIME type spoofing, and malicious files
 */

import path from 'node:path'
import { fileTypeFromBuffer } from 'file-type'
import mime from 'mime-types'

/**
 * Allowed MIME types for file uploads
 * Add or remove types based on your security requirements
 */
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'text/plain',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  // Microsoft Office
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

/**
 * Maximum file size in bytes (150MB default)
 */
export const MAX_FILE_SIZE = 150 * 1024 * 1024

/**
 * Validation result
 */
export interface FileValidationResult {
  valid: boolean
  safeName: string
  mimeType: string
  error?: string
}

/**
 * Validate uploaded file for security threats
 *
 * Protections:
 * 1. Path traversal attacks (../, ..\)
 * 2. MIME type spoofing (checks actual file content)
 * 3. Extension/MIME type mismatch
 * 4. Disallowed file types
 *
 * @param buffer - File buffer
 * @param originalName - Original filename from user
 * @param allowedExts - Optional: Override allowed extensions
 * @returns Validation result
 */
export async function validateFile(
  buffer: Buffer,
  originalName: string,
  allowedExts?: string[],
): Promise<FileValidationResult> {
  // 1. Sanitize filename - prevent path traversal
  const safeName = path.basename(originalName)

  if (safeName !== originalName || originalName.includes('..')) {
    return {
      valid: false,
      safeName: '',
      mimeType: '',
      error: 'Invalid file name: path traversal detected',
    }
  }

  // Remove any path separators that might have slipped through
  const cleanName = safeName.replace(/[\/\\]/g, '_')

  // 2. Get file extension
  const ext = path.extname(cleanName).toLowerCase()

  if (!ext) {
    return {
      valid: false,
      safeName: cleanName,
      mimeType: '',
      error: 'File must have an extension',
    }
  }

  // 3. Check if extension is allowed
  if (allowedExts && allowedExts.length > 0) {
    if (!allowedExts.includes(ext)) {
      return {
        valid: false,
        safeName: cleanName,
        mimeType: '',
        error: `File extension not allowed: ${ext}. Allowed: ${allowedExts.join(', ')}`,
      }
    }
  }

  // 4. Detect actual MIME type from file content (not just extension)
  const fileType = await fileTypeFromBuffer(buffer)

  // 5. Verify MIME type is allowed
  if (fileType && !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    return {
      valid: false,
      safeName: cleanName,
      mimeType: fileType.mime,
      error: `File type not allowed: ${fileType.mime}`,
    }
  }

  // 6. Verify extension matches actual MIME type
  const expectedMime = mime.lookup(ext)

  if (fileType && expectedMime && fileType.mime !== expectedMime) {
    // MIME type mismatch - file extension might be spoofed
    console.warn(
      `[FileValidator] MIME type mismatch: `
      + `expected ${expectedMime} from extension ${ext}, `
      + `got ${fileType.mime} from content`,
    )

    return {
      valid: false,
      safeName: cleanName,
      mimeType: fileType.mime,
      error: 'File extension does not match content type',
    }
  }

  // 7. All checks passed
  const detectedMime = fileType?.mime || expectedMime || 'application/octet-stream'

  return {
    valid: true,
    safeName: cleanName,
    mimeType: detectedMime,
  }
}

/**
 * Validate file size
 *
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size (default: MAX_FILE_SIZE)
 * @returns True if valid, false otherwise
 */
export function validateFileSize(
  size: number,
  maxSize: number = MAX_FILE_SIZE,
): { valid: boolean, error?: string } {
  if (size <= 0) {
    return {
      valid: false,
      error: 'File is empty',
    }
  }

  if (size > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(0)
    const sizeMB = (size / (1024 * 1024)).toFixed(2)

    return {
      valid: false,
      error: `File too large: ${sizeMB}MB (max: ${maxMB}MB)`,
    }
  }

  return { valid: true }
}

/**
 * Generate a unique safe filename
 * Use this to prevent filename collisions and ensure safe storage
 *
 * @param originalName - Original filename
 * @param prefix - Optional prefix (e.g., 'chat-', 'avatar-')
 * @returns Unique safe filename
 */
export function generateSafeFilename(
  originalName: string,
  prefix: string = '',
): string {
  const safeName = path.basename(originalName)
  const ext = path.extname(safeName)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)

  return `${prefix}${timestamp}-${random}${ext}`
}
