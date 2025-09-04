import { getDbConnection } from '../../utils/db'

interface MenuData {
  id: number
  title: string
  href: string
  icon: string
  parent_id: number | null
  sort_order: number
  is_separator: boolean
  is_active: boolean
}

interface MenuWithChildren extends MenuData {
  child: MenuWithChildren[]
}

interface FormattedMenu {
  title?: string
  icon?: string
  href?: string
  child?: FormattedMenu[]
  component?: string
  permission_key?: string
}

export default defineEventHandler(async (event) => {
  try {
    const connection = await getDbConnection()
    
    // 메뉴 데이터를 계층 구조로 가져오기
    const result = await connection.request().query(`
      SELECT 
        id,
        title,
        href,
        icon,
        parent_id,
        sort_order,
        is_separator,
        is_active
      FROM nuxt_menu 
      WHERE is_active = 1
      ORDER BY parent_id ASC, sort_order ASC
    `)
    
    const menuData = result.recordset as MenuData[]

    // 계층 구조로 변환
    const menuMap = new Map<number, MenuWithChildren>()
    const rootMenus: MenuWithChildren[] = []

    // 1단계: 모든 메뉴를 맵에 저장하고 children 배열 초기화
    menuData.forEach((menu: MenuData) => {
      menuMap.set(menu.id, {
        ...menu,
        child: []
      })
    })

    // 2단계: 부모-자식 관계 설정
    menuData.forEach((menu: MenuData) => {
      if (menu.parent_id === null) {
        // 루트 메뉴
        const menuItem = menuMap.get(menu.id)
        if (menuItem) {
          rootMenus.push(menuItem)
        }
      } else {
        // 자식 메뉴
        const parent = menuMap.get(menu.parent_id)
        const child = menuMap.get(menu.id)
        if (parent && child) {
          parent.child.push(child)
        }
      }
    })

    // 3단계: vue-sidebar-menu 형식으로 변환
    const formatMenuForSidebar = (menu: MenuWithChildren): FormattedMenu => {
      // 구분선 처리
      if (menu.is_separator) {
        return {
          component: 'hr'
        }
      }

      const formattedMenu: FormattedMenu = {
        title: menu.title,
        icon: menu.icon || undefined,
        href: menu.href || undefined,
        permission_key: menu.href && menu.href.trim() !== ''
          ? `menu:${menu.href}`
          : `menu:id:${menu.id}`
      }

      // 자식 메뉴가 있는 경우
      if (menu.child && menu.child.length > 0) {
        formattedMenu.child = menu.child.map(formatMenuForSidebar)
      }

      return formattedMenu
    }

    const formattedMenu = rootMenus.map(formatMenuForSidebar)

    return {
      success: true,
      data: formattedMenu
    }

  } catch (error) {
    console.error('메뉴 데이터 조회 실패:', error)
    
    return createError({
      statusCode: 500,
      statusMessage: '메뉴 데이터를 불러오는데 실패했습니다.'
    })
  }
}) 