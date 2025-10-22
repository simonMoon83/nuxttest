import { getDbConnection } from '../../utils/db'

// s_menu_info 스키마 기반 타입 정의
interface RawMenuRow {
  menu_id: number
  menu_name: string
  menu_icon: string | null
  menu_url?: string | null
  p_menu_id: number | null
  sort: number
  separate_yn: boolean | number | null
  use_yn: boolean | number | null
  search_yn?: boolean | number | null
  save_yn?: boolean | number | null
  procedure_name?: string | null
  search_name?: string | null
  sname?: string | null
  templete_id?: string | null
}

interface MenuWithChildren extends RawMenuRow {
  child: MenuWithChildren[]
}

interface FormattedMenu {
  title?: string
  icon?: string
  href?: string
  child?: FormattedMenu[]
  component?: string
  permission_key?: string
  // 추가 전달 필드
  menu_id?: number
  search_yn?: boolean
  save_yn?: boolean
  procedure_name?: string | null
  search_name?: string | null
  sname?: string | null
  searchCondition?: string | null
  templete_id?: string | null
}

export default defineEventHandler(async (event) => {
  try {
    const connection = await getDbConnection()
    
    // s_menu_info에서 활성 메뉴 조회
    const result = await connection.request().query(`
      SELECT 
        menu_id,
        menu_name,
        menu_icon,
        menu_url,
        p_menu_id,
        sort,
        separate_yn,
        use_yn,
        search_yn,
        save_yn,
        procedure_name,
        search_name,
        search_name AS sname,
        templete_id
      FROM s_menu_info WITH (NOLOCK)
      WHERE use_yn = 1
      ORDER BY p_menu_id ASC, sort ASC
    `)

    const rows = result.recordset as RawMenuRow[]

    // 계층 구조로 변환
    const menuMap = new Map<number, MenuWithChildren>()
    const rootMenus: MenuWithChildren[] = []

    // 1단계: 모든 메뉴를 맵에 저장하고 children 배열 초기화
    rows.forEach((menu) => {
      menuMap.set(menu.menu_id, {
        ...menu,
        child: []
      })
    })

    // 2단계: 부모-자식 관계 설정 (p_menu_id 가 NULL 또는 0이면 루트로 간주)
    rows.forEach((menu) => {
      const isRoot = menu.p_menu_id === null || menu.p_menu_id === 0 || menu.p_menu_id === undefined || menu.p_menu_id === menu.menu_id
      if (isRoot) {
        const menuItem = menuMap.get(menu.menu_id)
        if (menuItem) rootMenus.push(menuItem)
      } else {
        const parent = menuMap.get(menu.p_menu_id as number)
        const child = menuMap.get(menu.menu_id)
        if (parent && child) parent.child.push(child)
        else if (child) rootMenus.push(child) // 부모를 찾지 못하면 루트로 폴백
      }
    })

    // 템플릿 매핑 -> href 생성
    function buildHref(menu: MenuWithChildren): string | undefined {
      // 1) menu_url이 유효하면 우선 사용
      const url = (menu as any).menu_url as string | undefined
      if (url && url.trim() !== '') return url.trim()

      const t = (menu.templete_id || '').trim()
      if (!t) return undefined
      // 템플릿 매핑: 현재는 1-1만 정의. 그 외 값도 기본적으로 DynamicPage1로 연결.
      if (t === '1-1') return `/${encodeURIComponent(String(menu.menu_id))}`
      // 기본 동적 페이지로 폴백
      return `/${encodeURIComponent(String(menu.menu_id))}`
    }

    // 3단계: 사이드바 형식으로 변환
    const formatMenuForSidebar = (menu: MenuWithChildren): FormattedMenu => {
      // 구분선 처리
      if (Boolean(menu.separate_yn)) {
        return { component: 'hr' }
      }

      const href = buildHref(menu)
      const formattedMenu: FormattedMenu = {
        title: menu.menu_name,
        icon: menu.menu_icon || undefined,
        href,
        permission_key: href ? `menu:${href}` : undefined,
        menu_id: menu.menu_id,
        search_yn: Boolean(menu.search_yn ?? true),
        save_yn: Boolean(menu.save_yn ?? false),
        procedure_name: (menu as any).procedure_name || null,
        search_name: (menu as any).search_name || null,
        sname: (menu as any).sname || null,
        searchCondition: ((menu as any).search_name || (menu as any).sname) ?? null,
        templete_id: menu.templete_id,
      }

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
      message: '메뉴 데이터를 불러오는데 실패했습니다.'
    })
  }
}) 