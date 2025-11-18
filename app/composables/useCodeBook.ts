import { readonly, ref } from 'vue'
import type { CodeDictionary, CodeItem } from '@/types/schema'

const CODE_STATE_KEY = 'code-book-cache'

export function useCodeBook() {
  const nuxtApp = useNuxtApp()
  const appFetch = nuxtApp?.$fetch || $fetch
  const cache = useState<CodeDictionary>(CODE_STATE_KEY, () => ({}))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchGroup = async (group: string, force = false) => {
    const key = group.toUpperCase()
    if (!force && cache.value[key]?.length)
      return cache.value[key]

    loading.value = true
    error.value = null

    try {
      const response = await appFetch<{ success: boolean, data: CodeItem[] }>(`/api/code/${encodeURIComponent(key)}`)
      cache.value[key] = response?.data || []
      return cache.value[key]
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : '코드 데이터를 불러오지 못했습니다.'
      cache.value[key] = []
      throw err
    }
    finally {
      loading.value = false
    }
  }

  const fetchGroups = async (groups: string[], force = false) => {
    await Promise.all(groups.map(group => fetchGroup(group, force)))
    return groups.reduce<Record<string, CodeItem[]>>((acc, group) => {
      const key = group.toUpperCase()
      acc[key] = cache.value[key] || []
      return acc
    }, {})
  }

  const getOptions = (group: string) => {
    const key = group.toUpperCase()
    return cache.value[key] || []
  }

  return {
    codes: cache,
    loading: readonly(loading),
    error: readonly(error),
    fetchGroup,
    fetchGroups,
    getOptions,
  }
}

