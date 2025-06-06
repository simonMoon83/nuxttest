import { promises as fs } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    // multipart/form-data 파싱
    const form = await readMultipartFormData(event)
    
    if (!form || form.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: '파일이 업로드되지 않았습니다'
      })
    }

    const file = form[0]
    
    if (!file || !file.data || !file.filename) {
      throw createError({
        statusCode: 400,
        statusMessage: '올바른 파일이 아닙니다'
      })
    }

    // 파일 확장자 검증
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp']
    const fileExtension = file.filename.toLowerCase().substring(file.filename.lastIndexOf('.'))
    
    if (!allowedExtensions.includes(fileExtension)) {
      throw createError({
        statusCode: 400,
        statusMessage: '지원되지 않는 파일 형식입니다. PNG, JPG, SVG, WebP 파일만 업로드 가능합니다.'
      })
    }

    // 파일 크기 검증 (2MB 제한)
    if (file.data.length > 2 * 1024 * 1024) {
      throw createError({
        statusCode: 400,
        statusMessage: '파일 크기는 2MB를 초과할 수 없습니다.'
      })
    }

    // 고유한 파일명 생성
    const uniqueFilename = `logo-${randomUUID()}${fileExtension}`
    
    // public 디렉토리의 uploads 폴더에 저장
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    
    // uploads 디렉토리가 없으면 생성
    try {
      await fs.access(uploadDir)
    } catch {
      await fs.mkdir(uploadDir, { recursive: true })
    }
    
    const filePath = join(uploadDir, uniqueFilename)
    
    // 파일 저장
    await fs.writeFile(filePath, file.data)
    
    // 웹 경로 반환
    const webPath = `/uploads/${uniqueFilename}`
    
    return {
      success: true,
      path: webPath,
      filename: uniqueFilename,
      originalName: file.filename,
      size: file.data.length
    }
    
  } catch (error: unknown) {
    console.error('파일 업로드 실패:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '파일 업로드 중 서버 오류가 발생했습니다'
    })
  }
}) 