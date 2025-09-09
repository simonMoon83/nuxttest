import { promises as fs } from 'fs'
import { join } from 'path'
import { ensureUploadsDir } from '../../utils/uploads'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)
    if (!form || form.length === 0) {
      throw createError({ statusCode: 400, message: '파일이 업로드되지 않았습니다' })
    }
    const file = form[0]
    if (!file || !file.data || !file.filename) {
      throw createError({ statusCode: 400, message: '올바른 파일이 아닙니다' })
    }

    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp']
    const fileExtension = file.filename.toLowerCase().substring(file.filename.lastIndexOf('.'))
    if (!allowedExtensions.includes(fileExtension)) {
      throw createError({ statusCode: 400, message: 'PNG, JPG, JPEG, SVG, WebP만 업로드 가능합니다.' })
    }
    if (file.data.length > 5 * 1024 * 1024) {
      throw createError({ statusCode: 400, message: '파일 크기는 5MB를 초과할 수 없습니다.' })
    }

    const uniqueFilename = `asset-${randomUUID()}${fileExtension}`
    const uploadDir = await ensureUploadsDir()
    const filePath = join(uploadDir, uniqueFilename)
    await fs.writeFile(filePath, file.data)
    const webPath = `/uploads/${uniqueFilename}`

    return { success: true, path: webPath, filename: uniqueFilename, originalName: file.filename, size: file.data.length }
  }
  catch (error: any) {
    throw createError({ statusCode: 500, message: error?.message || '업로드 실패' })
  }
})


