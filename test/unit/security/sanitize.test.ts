/**
 * XSS sanitization tests
 */

import { describe, it, expect } from 'vitest'
import {
  sanitizeHtml,
  sanitizePlainText,
  sanitizeUrl,
  escapeHtml,
  sanitizeSearchQuery,
} from '../../../server/utils/sanitize'

describe('Sanitize Utilities', () => {
  describe('sanitizePlainText', () => {
    it('should remove all HTML tags', () => {
      const dirty = '<script>alert("XSS")</script>Hello'
      const clean = sanitizePlainText(dirty)
      
      expect(clean).not.toContain('<script>')
      expect(clean).toContain('Hello')
    })

    it('should remove dangerous event handlers', () => {
      const dirty = '<div onclick="alert(1)">Click me</div>'
      const clean = sanitizePlainText(dirty)
      
      expect(clean).not.toContain('onclick')
      expect(clean).toContain('Click me')
    })

    it('should handle empty input', () => {
      expect(sanitizePlainText('')).toBe('')
      expect(sanitizePlainText(null as any)).toBe('')
      expect(sanitizePlainText(undefined as any)).toBe('')
    })
  })

  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const dirty = '<b>Bold</b> <i>Italic</i> <a href="/link">Link</a>'
      const clean = sanitizeHtml(dirty)
      
      expect(clean).toContain('<b>Bold</b>')
      expect(clean).toContain('<i>Italic</i>')
      expect(clean).toContain('<a')
    })

    it('should remove script tags', () => {
      const dirty = '<p>Safe</p><script>alert("XSS")</script>'
      const clean = sanitizeHtml(dirty)
      
      expect(clean).not.toContain('<script>')
      expect(clean).toContain('<p>Safe</p>')
    })

    it('should remove dangerous event handlers', () => {
      const dirty = '<a href="/test" onclick="alert(1)">Link</a>'
      const clean = sanitizeHtml(dirty)
      
      expect(clean).not.toContain('onclick')
      expect(clean).toContain('href')
    })

    it('should remove data attributes', () => {
      const dirty = '<div data-secret="password">Content</div>'
      const clean = sanitizeHtml(dirty)
      
      expect(clean).not.toContain('data-secret')
    })
  })

  describe('sanitizeUrl', () => {
    it('should allow safe HTTP URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
    })

    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('')
    })

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('')
    })

    it('should block vbscript: URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('')
    })

    it('should block file: URLs', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBe('')
    })

    it('should allow relative URLs', () => {
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page')
      expect(sanitizeUrl('./relative')).toBe('./relative')
      expect(sanitizeUrl('../parent')).toBe('../parent')
    })

    it('should add https:// to URLs without protocol', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com')
    })

    it('should allow mailto: URLs', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com')
    })

    it('should handle empty input', () => {
      expect(sanitizeUrl('')).toBe('')
      expect(sanitizeUrl(null as any)).toBe('')
    })
  })

  describe('escapeHtml', () => {
    it('should escape special characters', () => {
      const text = '<script>alert("XSS")</script>'
      const escaped = escapeHtml(text)
      
      expect(escaped).toContain('&lt;')
      expect(escaped).toContain('&gt;')
      expect(escaped).toContain('&quot;')
      expect(escaped).not.toContain('<script>')
    })

    it('should escape ampersands', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B')
    })

    it('should escape quotes', () => {
      expect(escapeHtml('Say "hello"')).toContain('&quot;')
      expect(escapeHtml("It's ok")).toContain('&#x27;')
    })

    it('should handle empty input', () => {
      expect(escapeHtml('')).toBe('')
    })
  })

  describe('sanitizeSearchQuery', () => {
    it('should remove SQL wildcards', () => {
      const query = 'test%value_here'
      const clean = sanitizeSearchQuery(query)
      
      expect(clean).not.toContain('%')
      expect(clean).not.toContain('_')
    })

    it('should remove HTML tags', () => {
      const query = '<script>test</script>'
      const clean = sanitizeSearchQuery(query)
      
      expect(clean).not.toContain('<')
      expect(clean).not.toContain('>')
    })

    it('should trim whitespace', () => {
      const query = '  test query  '
      const clean = sanitizeSearchQuery(query)
      
      expect(clean).toBe('test query')
    })

    it('should limit length to 100 characters', () => {
      const query = 'a'.repeat(150)
      const clean = sanitizeSearchQuery(query)
      
      expect(clean.length).toBe(100)
    })

    it('should handle empty input', () => {
      expect(sanitizeSearchQuery('')).toBe('')
      expect(sanitizeSearchQuery(null as any)).toBe('')
    })
  })
})







