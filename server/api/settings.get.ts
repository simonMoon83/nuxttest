import { promises as fs } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const settingsPath = join(process.cwd(), 'storage', 'app-settings.json')
    
    // 설정 파일이 존재하는지 확인
    try {
      const settingsData = await fs.readFile(settingsPath, 'utf-8')
      const settings = JSON.parse(settingsData)
      
      return {
        success: true,
        data: settings
      }
    } catch (fileError) {
      // 파일이 없으면 기본 설정 반환
      const defaultSettings = {
        logo: '/primevue-logo.webp',
        favicon: '/favicon.ico',
        appName: 'PrimeVue-Nuxt Starter',
        appDescription: 'Modern full-stack application built with Nuxt 3 and PrimeVue',
        updatedAt: new Date().toISOString()
      }
      
      return {
        success: true,
        data: defaultSettings
      }
    }
  } catch (error) {
    console.error('설정 로드 오류:', error)
    
    return {
      success: false,
      error: '설정을 불러오는 중 오류가 발생했습니다',
      data: {
        logo: '/primevue-logo.webp',
        favicon: '/favicon.ico',
        appName: 'PrimeVue-Nuxt Starter',
        appDescription: 'Modern full-stack application built with Nuxt 3 and PrimeVue'
      }
    }
  }
}) 