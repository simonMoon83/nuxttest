export interface DepartmentBase {
  id: number
  name: string
  code?: string | null
  parent_id?: number | null
  sort_order: number
}

interface DepartmentWithLevel extends DepartmentBase { level: number }

export function buildDepartmentChildrenMap(departments: DepartmentBase[]): Map<number | null, DepartmentBase[]> {
  const byParent = new Map<number | null, DepartmentBase[]>()
  for (const dept of departments) {
    const key = dept.parent_id ?? null
    const arr = byParent.get(key) || []
    arr.push(dept)
    byParent.set(key, arr)
  }
  for (const [, arr] of byParent) {
    arr.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  }
  return byParent
}

export function buildHierarchicalOrder(departments: DepartmentBase[]): DepartmentWithLevel[] {
  const byParent = buildDepartmentChildrenMap(departments)
  const roots = [...(byParent.get(null) || [])]
  const ordered: DepartmentWithLevel[] = []

  const stack: Array<{ node: DepartmentBase, level: number }> = []
  // push in reverse to process in correct order
  for (let i = roots.length - 1; i >= 0; i--) {
    stack.push({ node: roots[i]!, level: 0 })
  }

  while (stack.length) {
    const { node, level } = stack.pop()!
    ordered.push({ ...node, level })
    const children = byParent.get(node.id) || []
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push({ node: children[i]!, level: level + 1 })
    }
  }

  return ordered
}

export function buildDepartmentTypeMap(departments: DepartmentBase[]): Map<number, 'standalone' | 'parent' | 'child'> {
  const byParent = buildDepartmentChildrenMap(departments)
  const typeMap = new Map<number, 'standalone' | 'parent' | 'child'>()
  const hasChildren = new Set<number>()
  for (const [parentId, children] of byParent) {
    if (parentId != null && children.length > 0) {
      hasChildren.add(parentId)
    }
  }
  for (const d of departments) {
    const isChild = d.parent_id != null
    const isParent = hasChildren.has(d.id)
    const type: 'standalone' | 'parent' | 'child' = isChild ? 'child' : isParent ? 'parent' : 'standalone'
    typeMap.set(d.id, type)
  }
  return typeMap
}

export function orderDepartmentsForView(all: DepartmentBase[], rootId?: number | null): DepartmentBase[] {
  const byParent = buildDepartmentChildrenMap(all)

  const ordered: DepartmentBase[] = []
  const pushSubtree = (node: DepartmentBase) => {
    ordered.push(node)
    const children = byParent.get(node.id) || []
    for (const child of children) pushSubtree(child)
  }

  if (rootId) {
    const root = all.find(d => d.id === rootId)
    if (root) {
      pushSubtree(root)
    }
    return ordered
  }

  const roots = byParent.get(null) || []
  for (const r of roots) pushSubtree(r)
  return ordered
}

export function makeHierarchicalSelectOptions<TLabelKey extends 'label' | 'name' = 'label'>(
  departments: DepartmentBase[],
  options?: { labelKey?: TLabelKey, includeCode?: boolean, indent?: string },
): Array<{ id: number } & Record<TLabelKey, string>> {
  const labelKey = (options?.labelKey ?? 'label') as TLabelKey
  const includeCode = options?.includeCode ?? false
  const indentUnit = options?.indent ?? '  ' // Figure space for alignment
  const ordered = buildHierarchicalOrder(departments)
  return ordered.map((d) => {
    const indent = indentUnit.repeat(d.level)
    const text = includeCode && d.code ? `${d.code} - ${d.name}` : d.name
    return { id: d.id, [labelKey]: `${indent}${text}` } as { id: number } & Record<TLabelKey, string>
  })
}
