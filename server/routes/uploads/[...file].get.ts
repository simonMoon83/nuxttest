import { createReadStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'
import { ensureUploadsDir } from '../../utils/uploads'

function getContentTypeByExt(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.ico')) return 'image/x-icon'
  return 'application/octet-stream'
}

export default defineEventHandler(async (event) => {
  const param = getRouterParam(event, 'file') || ''
  const relPath = Array.isArray(param) ? param.join('/') : String(param)

  const uploadsDir = await ensureUploadsDir()
  const absBase = resolve(uploadsDir)
  const absPath = resolve(join(uploadsDir, relPath))

  // 경로 이탈 방지
  if (!absPath.startsWith(absBase)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  try {
    const stat = await fs.stat(absPath)
    if (!stat.isFile()) {
      throw createError({ statusCode: 404, statusMessage: `Not a file: /uploads/${relPath}` })
    }
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: `Page not found: /uploads/${relPath}` })
  }

  setHeader(event, 'Content-Type', getContentTypeByExt(absPath))
  return sendStream(event, createReadStream(absPath))
})




