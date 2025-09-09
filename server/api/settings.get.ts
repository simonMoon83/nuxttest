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
        marketing: {
          title: 'Build your Smart MES',
          subtitle: '현장 데이터를 연결하고, 생산성을 높이세요.',
          heroImage: '/starter_4.png',
          gallery: []
        },
        contact: {
          headline: 'Contact Us',
          subtext: '제품 문의, 데모 요청, 파트너십 제안 등 무엇이든 남겨주세요.'
        },
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
        appDescription: 'Modern full-stack application built with Nuxt 3 and PrimeVue',
        marketing: {
          title: 'Build your Smart MES',
          subtitle: '현장 데이터를 연결하고, 생산성을 높이세요.',
          heroImage: '/starter_4.png'
        },
        contact: {
          headline: 'Contact Us',
          subtext: '제품 문의, 데모 요청, 파트너십 제안 등 무엇이든 남겨주세요.'
        }
      }
    }
  }
}) 