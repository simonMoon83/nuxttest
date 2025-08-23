import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

export async function ensureUploadsDir(): Promise<string> {
  const configured = process.env.UPLOADS_DIR
  const baseDir = configured
    ? (configured.startsWith('/') ? configured : join(process.cwd(), configured))
    : join(process.cwd(), '.output', 'public', 'uploads')

  // 개발 모드 등 .output/public이 없으면 public/uploads로 폴백
  const fallbackDir = join(process.cwd(), 'public', 'uploads')

  const target = await dirExists(join(process.cwd(), '.output', 'public'))
    ? baseDir
    : (configured ? baseDir : fallbackDir)

  await fs.mkdir(target, { recursive: true })
  return target
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path)
    return stat.isDirectory()
  }
  catch {
    return false
  }
}
