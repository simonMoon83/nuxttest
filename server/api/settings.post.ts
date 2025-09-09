import { promises as fs } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // 입력 검증
    if (!body) {
      throw createError({
        statusCode: 400,
        message: '설정 데이터가 필요합니다'
      })
    }
    
    const {
      logo, favicon, appName, appDescription,
      marketingTitle, marketingSubtitle, heroImage,
      contactHeadline, contactSubtext,
      marketingGallery
    } = body
    
    // 설정 데이터 구성
    const settings = {
      logo: logo || '/primevue-logo.webp',
      favicon: favicon || '/favicon.ico',
      appName: appName || 'PrimeVue-Nuxt Starter',
      appDescription: appDescription || 'Modern full-stack application built with Nuxt 3 and PrimeVue',
      // Marketing fields
      marketing: {
        title: marketingTitle || 'Build your Smart MES',
        subtitle: marketingSubtitle || '현장 데이터를 연결하고, 생산성을 높이세요.',
        heroImage: heroImage || '/starter_4.png',
        gallery: Array.isArray(marketingGallery)
          ? marketingGallery
              .map((g: any) => ({
                image: (g?.image || '').toString(),
                title: (g?.title || '').toString(),
                subtitle: (g?.subtitle || '').toString(),
                link: (g?.link || '').toString(),
              }))
          : []
      },
      contact: {
        headline: contactHeadline || 'Contact Us',
        subtext: contactSubtext || '제품 문의, 데모 요청, 파트너십 제안 등 무엇이든 남겨주세요.'
      },
      updatedAt: new Date().toISOString()
    }
    
    // storage 폴더 생성 (없는 경우)
    const storageDir = join(process.cwd(), 'storage')
    try {
      await fs.access(storageDir)
    } catch {
      await fs.mkdir(storageDir, { recursive: true })
    }
    
    // 설정 파일 저장
    const settingsPath = join(storageDir, 'app-settings.json')
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
    
    return {
      success: true,
      message: '설정이 성공적으로 저장되었습니다',
      data: settings
    }
    
  } catch (error) {
    console.error('설정 저장 오류:', error)
    
    throw createError({
      statusCode: 500,
      message: (error as Error).message || '설정 저장 중 오류가 발생했습니다'
    })
  }
}) 