/**
 * Remove security-sensitive headers
 * Removes headers that leak server/framework information
 */
export default defineEventHandler((event) => {
  // Remove X-Powered-By header to prevent framework detection
  event.node.res.removeHeader('X-Powered-By')
  
  // Override setHeader to prevent re-adding X-Powered-By
  const originalSetHeader = event.node.res.setHeader.bind(event.node.res)
  event.node.res.setHeader = function (name: string, value: any) {
    if (name.toLowerCase() === 'x-powered-by') {
      return this // Ignore attempts to set X-Powered-By
    }
    return originalSetHeader(name, value)
  }
})

