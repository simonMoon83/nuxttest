import { onUser } from '../../utils/chatBus'
import { getCurrentUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const userId = getCurrentUserId(event)

  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  const res = event.node.res
  const write = (obj: any) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
  }

  write({ type: 'connected' })

  const off = onUser(userId, (ev) => {
    write(ev)
  })

  const ping = setInterval(() => {
    write({ type: 'ping', t: Date.now() })
  }, 25000)

  event.node.req.on('close', () => {
    clearInterval(ping)
    off()
  })

  // keep the connection open
  return new Promise(() => {})
})
