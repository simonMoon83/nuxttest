import { ref } from 'vue'

export function useAsyncAction() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const run = async <T>(task: () => Promise<T>): Promise<T> => {
    loading.value = true
    error.value = null

    try {
      return await task()
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      throw err
    }
    finally {
      loading.value = false
    }
  }

  const withAction = <Args extends any[], Result>(task: (...args: Args) => Promise<Result>) => {
    return async (...args: Args) => run(() => task(...args))
  }

  return {
    loading,
    error,
    run,
    withAction,
  }
}

