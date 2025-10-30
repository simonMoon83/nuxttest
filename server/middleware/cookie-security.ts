/**
 * Cookie Security Middleware
 * Ensures all cookies have proper security flags (HttpOnly, Secure, SameSite)
 */
export default defineEventHandler((event) => {
  // Intercept setHeader to modify Set-Cookie headers
  const originalSetHeader = event.node.res.setHeader.bind(event.node.res)

  event.node.res.setHeader = function (name: string, value: any) {
    if (name.toLowerCase() === 'set-cookie') {
      if (Array.isArray(value)) {
        value = value.map(cookie => ensureSecureCookie(cookie))
      }
      else if (typeof value === 'string') {
        value = ensureSecureCookie(value)
      }
    }
    return originalSetHeader(name, value)
  }
})

/**
 * Ensure a cookie has security flags
 * @param cookieString - Cookie string from Set-Cookie header
 * @returns Modified cookie string with security flags
 */
function ensureSecureCookie(cookieString: string): string {
  let cookie = cookieString

  // Add HttpOnly if not present
  if (!/httponly/i.test(cookie)) {
    cookie += '; HttpOnly'
  }

  // Add Secure flag in production
  if (process.env.NODE_ENV === 'production' && !/;\s*secure/i.test(cookie)) {
    cookie += '; Secure'
  }

  // Add SameSite if not present
  if (!/samesite=/i.test(cookie)) {
    cookie += '; SameSite=Lax'
  }

  return cookie
}

