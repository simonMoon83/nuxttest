import { getDbConnection } from '../../utils/db'

interface DeptRow {
  id: number
  name: string
  parent_id: number | null
  sort_order: number | null
  is_active: boolean
}

interface UserRow {
  id: number
  username: string
  full_name: string | null
  department_id: number | null
  is_active: boolean
}

interface TreeNode {
  key: string
  label: string
  type: 'dept' | 'user'
  data?: any
  children?: TreeNode[]
  selectable?: boolean
  leaf?: boolean
}

export default defineEventHandler(async () => {
  const connection = await getDbConnection()

  // 부서 및 사용자 조회(활성만)
  const deptsRes = await connection.request().query<DeptRow>(`
    SELECT id, name, parent_id, sort_order, is_active
    FROM departments
    WHERE is_active = 1
    ORDER BY ISNULL(sort_order, 0) ASC, name ASC
  `)
  const usersRes = await connection.request().query<UserRow>(`
    SELECT id, username, full_name, department_id, is_active
    FROM app_users
    WHERE is_active = 1
    ORDER BY COALESCE(NULLIF(LTRIM(RTRIM(full_name)), ''), username) ASC
  `)

  const depts = (deptsRes as any).recordset as DeptRow[]
  const users = (usersRes as any).recordset as UserRow[]

  // 부서 노드 맵 생성
  const deptMap = new Map<number, TreeNode>()
  const childrenByParent = new Map<number | null, number[]>()

  for (const d of depts) {
    deptMap.set(d.id, {
      key: `d-${d.id}`,
      label: d.name,
      type: 'dept',
      data: { id: d.id, type: 'dept' },
      children: [],
      selectable: true,
    })
    const arr = childrenByParent.get(d.parent_id ?? null) ?? []
    arr.push(d.id)
    childrenByParent.set(d.parent_id ?? null, arr)
  }

  // 계층 트리 조립(부서 간)
  for (const [parentId, childIds] of childrenByParent.entries()) {
    if (parentId == null) continue
    const parentNode = deptMap.get(parentId)
    if (!parentNode) continue
    for (const cid of childIds) {
      const childNode = deptMap.get(cid)
      if (childNode) {
        parentNode.children = parentNode.children || []
        parentNode.children.push(childNode)
      }
    }
  }

  // 사용자 노드를 해당 부서에 부착
  const unassignedUsers: UserRow[] = []
  for (const u of users) {
    const label = (u.full_name && u.full_name.trim() !== '') ? u.full_name : u.username
    const node: TreeNode = {
      key: `u-${u.id}`,
      label,
      type: 'user',
      data: { id: u.id, type: 'user' },
      leaf: true,
      selectable: true,
    }
    if (u.department_id && deptMap.has(u.department_id)) {
      const deptNode = deptMap.get(u.department_id)!
      deptNode.children = deptNode.children || []
      deptNode.children.push(node)
    } else {
      unassignedUsers.push(u)
    }
  }

  // 루트 후보(부모 없는 부서)
  const rootDeptIds = childrenByParent.get(null) ?? []
  const roots: TreeNode[] = rootDeptIds.map(id => deptMap.get(id)!).filter(Boolean)

  // 부서 없는 사용자 묶음
  if (unassignedUsers.length > 0) {
    const unassignedNode: TreeNode = {
      key: 'd-__unassigned',
      label: '부서 없음',
      type: 'dept',
      data: { id: null, type: 'dept' },
      children: unassignedUsers.map((u) => ({
        key: `u-${u.id}`,
        label: (u.full_name && u.full_name.trim() !== '') ? u.full_name : u.username,
        type: 'user',
        data: { id: u.id, type: 'user' },
        leaf: true,
        selectable: true,
      })),
      selectable: true,
    }
    roots.push(unassignedNode)
  }

  return { success: true, data: roots }
})
