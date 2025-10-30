/**
 * XSS protection utilities
 * Sanitizes user input to prevent Cross-Site Scripting attacks
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content
 * Allows safe HTML tags and removes dangerous ones
 *
 * Allowed tags: b, i, em, strong, a, p, br, ul, ol, li
 * Allowed attributes: href (on <a> only)
 *
 * @param dirty - Untrusted HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return ''
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'a',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Sanitize plain text (remove all HTML tags)
 * Use this for chat messages, comments, etc.
 *
 * @param text - Untrusted text string
 * @returns Plain text with all HTML removed
 */
export function sanitizePlainText(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  })
}

/**
 * Sanitize rich text (for editors like TipTap)
 * Allows more HTML tags but still removes dangerous ones
 *
 * @param dirty - Untrusted rich text HTML
 * @returns Sanitized HTML string
 */
export function sanitizeRichText(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return ''
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'b',
      'i',
      'em',
      'strong',
      'u',
      's',
      'a',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Sanitize URL (prevent javascript: and data: URLs)
 *
 * @param url - Untrusted URL string
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  const trimmed = url.trim().toLowerCase()

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:')
    || trimmed.startsWith('data:')
    || trimmed.startsWith('vbscript:')
    || trimmed.startsWith('file:')
  ) {
    return ''
  }

  // Allow http, https, mailto, and relative URLs
  if (
    trimmed.startsWith('http://')
    || trimmed.startsWith('https://')
    || trimmed.startsWith('mailto:')
    || trimmed.startsWith('/')
    || trimmed.startsWith('./')
    || trimmed.startsWith('../')
  ) {
    return url.trim()
  }

  // Default to https:// for URLs without protocol
  if (!trimmed.includes(':')) {
    return `https://${url.trim()}`
  }

  return ''
}

/**
 * Escape HTML special characters
 * Use this for text that will be inserted into HTML
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#x27;',
    '/': '&#x2F;',
  }

  return text.replace(/[&<>"'/]/g, char => map[char])
}

/**
 * Sanitize search query
 * Removes potentially dangerous characters from search strings
 *
 * @param query - Search query string
 * @returns Sanitized query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return ''
  }

  // Remove SQL wildcards and special characters
  return query
    .replace(/[%_]/g, '') // SQL wildcards
    .replace(/[<>]/g, '') // HTML tags
    .trim()
    .slice(0, 100) // Limit length
}
