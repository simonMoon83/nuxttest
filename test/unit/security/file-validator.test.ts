/**
 * File validator tests
 */

import { describe, it, expect } from 'vitest'
import { validateFile, validateFileSize, generateSafeFilename } from '../../../server/utils/file-validator'

describe('File Validator', () => {
  describe('validateFile', () => {
    it('should reject path traversal attempts', async () => {
      const buffer = Buffer.from('test')
      const result = await validateFile(buffer, '../../../etc/passwd')
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('path traversal')
    })

    it('should reject files without extension', async () => {
      const buffer = Buffer.from('test')
      const result = await validateFile(buffer, 'noextension')
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('extension')
    })

    it('should reject filename with path separators', async () => {
      const buffer = Buffer.from('test')
      const result = await validateFile(buffer, 'file/with\\slashes.txt')
      
      // Path separators indicate path traversal attempt
      expect(result.valid).toBe(false)
      expect(result.error).toContain('path traversal')
    })

    it('should accept valid image files', async () => {
      // Create a simple PNG buffer (PNG signature)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      ])
      
      const result = await validateFile(pngBuffer, 'image.png')
      
      expect(result.valid).toBe(true)
      expect(result.mimeType).toBe('image/png')
    })

    it('should reject disallowed file types', async () => {
      // Executable file signature (MZ header)
      const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00])
      
      const result = await validateFile(exeBuffer, 'malware.exe')
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })
  })

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const result = validateFileSize(1024 * 1024) // 1MB
      expect(result.valid).toBe(true)
    })

    it('should reject empty files', () => {
      const result = validateFileSize(0)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should reject files exceeding limit', () => {
      const result = validateFileSize(200 * 1024 * 1024) // 200MB (max is 150MB)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too large')
    })

    it('should respect custom size limit', () => {
      const customLimit = 1024 * 1024 // 1MB
      const result = validateFileSize(2 * 1024 * 1024, customLimit)
      
      expect(result.valid).toBe(false)
    })
  })

  describe('generateSafeFilename', () => {
    it('should generate unique filename', () => {
      const filename1 = generateSafeFilename('test.txt')
      const filename2 = generateSafeFilename('test.txt')
      
      expect(filename1).not.toBe(filename2)
    })

    it('should preserve file extension', () => {
      const filename = generateSafeFilename('document.pdf')
      expect(filename).toMatch(/\.pdf$/)
    })

    it('should add prefix if provided', () => {
      const filename = generateSafeFilename('avatar.jpg', 'user-')
      expect(filename).toMatch(/^user-/)
      expect(filename).toMatch(/\.jpg$/)
    })

    it('should handle files with multiple dots', () => {
      const filename = generateSafeFilename('my.file.name.txt')
      expect(filename).toMatch(/\.txt$/)
    })
  })
})

