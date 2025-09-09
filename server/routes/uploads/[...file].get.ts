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
    throw createError({ statusCode: 400, message: 'Invalid path' })
  }

  try {
    const stat = await fs.stat(absPath)
    if (!stat.isFile()) {
      throw createError({ statusCode: 404, message: `Not a file: /uploads/${relPath}` })
    }
  }
  catch {
    throw createError({ statusCode: 404, message: `Page not found: /uploads/${relPath}` })
  }

  setHeader(event, 'Content-Type', getContentTypeByExt(absPath))
  // 원본 파일명으로 다운로드되도록 Content-Disposition 제어 (query: name=원본명)
  const q = getQuery(event) as Record<string, string | string[] | undefined>
  const nameParam = q?.name
  const filename = Array.isArray(nameParam) ? nameParam[0] : nameParam
  if (filename && typeof filename === 'string') {
    // RFC 5987 filename* 처리 (UTF-8 안전)
    const encoded = encodeURIComponent(filename)
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"; filename*=UTF-8''${encoded}`)
  }
  return sendStream(event, createReadStream(absPath))
})





