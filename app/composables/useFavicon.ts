export const useFavicon = () => {
  // Favicon 설정 함수 (개선된 버전)
  const setFavicon = (href: string) => {
    if (typeof window === 'undefined') return

    // 캐시 버스팅을 위한 타임스탬프 추가
    const timestamp = new Date().getTime()
    const cacheBustedHref = href.includes('?') 
      ? `${href}&t=${timestamp}` 
      : `${href}?t=${timestamp}`

    // 기존 favicon 태그들 모두 제거
    const existingIcons = document.querySelectorAll('link[rel*="icon"]')
    existingIcons.forEach(icon => icon.remove())

    // Apple touch icon 및 기타 아이콘들도 제거
    const appleTouchIcons = document.querySelectorAll('link[rel*="apple-touch-icon"]')
    appleTouchIcons.forEach(icon => icon.remove())

    // 새 favicon 태그들 생성 (여러 형식 지원)
    const iconTypes = [
      { rel: 'icon', type: getIconMimeType(href) },
      { rel: 'shortcut icon', type: getIconMimeType(href) },
      { rel: 'apple-touch-icon', type: getIconMimeType(href) }
    ]

    iconTypes.forEach(iconType => {
      const iconLink = document.createElement('link')
      iconLink.rel = iconType.rel
      iconLink.href = cacheBustedHref
      iconLink.type = iconType.type
      
      // 크기 속성 추가 (PNG/SVG의 경우)
      if (href.toLowerCase().includes('.png') || href.toLowerCase().includes('.svg')) {
        iconLink.setAttribute('sizes', '32x32')
      }

      document.head.appendChild(iconLink)
    })

    // 추가로 meta 태그를 통한 모바일 지원
    let msApplicationConfig = document.querySelector('meta[name="msapplication-config"]')
    if (!msApplicationConfig) {
      msApplicationConfig = document.createElement('meta')
      msApplicationConfig.setAttribute('name', 'msapplication-config')
      msApplicationConfig.setAttribute('content', 'none')
      document.head.appendChild(msApplicationConfig)
    }

    // 페이지 새로고침 없이 즉시 반영하기 위한 트릭
    setTimeout(() => {
      // 브라우저 탭 제목을 잠시 변경했다가 복원하여 favicon 업데이트 강제
      const originalTitle = document.title
      document.title = originalTitle + ' '
      setTimeout(() => {
        document.title = originalTitle
      }, 100)
    }, 100)

    console.log('Favicon updated to:', cacheBustedHref)
  }

  // 파일 확장자에 따른 rel 속성 결정
  const getIconType = (href: string): string => {
    const ext = href.toLowerCase().substring(href.lastIndexOf('.'))
    switch (ext) {
      case '.svg':
        return 'icon'
      case '.png':
        return 'icon'
      case '.ico':
      default:
        return 'shortcut icon'
    }
  }

  // 파일 확장자에 따른 MIME 타입 결정
  const getIconMimeType = (href: string): string => {
    const ext = href.toLowerCase().substring(href.lastIndexOf('.'))
    switch (ext) {
      case '.svg':
        return 'image/svg+xml'
      case '.png':
        return 'image/png'
      case '.ico':
      default:
        return 'image/x-icon'
    }
  }

  // 설정에서 favicon 로드
  const loadFaviconFromSettings = async () => {
    try {
      const response = await $fetch('/api/settings') as { success: boolean; data: any }
      if (response?.success && response?.data?.favicon) {
        setFavicon(response.data.favicon)
      }
    } catch (error) {
      console.warn('Failed to load favicon from settings:', error)
    }
  }

  return {
    setFavicon,
    loadFaviconFromSettings
  }
} 