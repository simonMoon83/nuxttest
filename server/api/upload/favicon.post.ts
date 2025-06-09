import { promises as fs } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)
    
    if (!form || form.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file uploaded'
      })
    }

    const fileData = form[0]
    if (!fileData || !fileData.filename || !fileData.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid file'
      })
    }

    // 파일 확장자 검증
    const allowedExtensions = ['.ico', '.png', '.svg']
    const fileExtension = fileData.filename.toLowerCase().substring(fileData.filename.lastIndexOf('.'))
    
    if (!allowedExtensions.includes(fileExtension)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Only ICO, PNG, SVG files are allowed for favicon'
      })
    }

    // 파일 크기 검증 (1MB)
    if (fileData.data.length > 1 * 1024 * 1024) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File size must be less than 1MB'
      })
    }

    // uploads 폴더 확인/생성
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    try {
      await fs.access(uploadsDir)
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true })
    }

    // 파일명 생성 (타임스탬프 포함)
    const timestamp = Date.now()
    const filename = `favicon-${timestamp}${fileExtension}`
    const filepath = join(uploadsDir, filename)

    // 파일 저장
    await fs.writeFile(filepath, fileData.data)

    const publicPath = `/uploads/${filename}`

    return {
      success: true,
      path: publicPath,
      message: 'Favicon uploaded successfully'
    }

  } catch (error) {
    console.error('Favicon upload error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: (error as Error).message || 'Favicon upload failed'
    })
  }
}) 