import { EventEmitter } from 'node:events'

export type ChatEvent = {
  type: 'message' | 'conversation' | 'read' | 'ping' | 'connected'
  data?: any
}

const bus = new EventEmitter()
// No limit for listeners; this is a simple in-memory bus for single-node deployments
bus.setMaxListeners(0)

function key(userId: number) { return `user:${userId}` }

export function onUser(userId: number, handler: (ev: ChatEvent) => void) {
  const k = key(userId)
  bus.on(k, handler)
  return () => bus.off(k, handler)
}

export function emitToUsers(userIds: number[], event: ChatEvent) {
  const uniq = Array.from(new Set((userIds || []).map(Number).filter(n => Number.isFinite(n) && n > 0)))
  for (const uid of uniq) {
    bus.emit(key(uid), event)
  }
}
