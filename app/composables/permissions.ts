export function usePermission() {
  const auth = useAuthStore()
  const route = useRoute()

  const buildResourceFromPath = (path?: string) => `menu:${path || route.path}`

  const can = (action: 'read' | 'write' = 'read', resource?: string) => {
    const res = resource ?? buildResourceFromPath(route.path)
    return auth.hasPermission(res, action)
  }

  const canReadPage = () => can('read')
  const canWritePage = () => can('write')

  return { can, canReadPage, canWritePage }
}


