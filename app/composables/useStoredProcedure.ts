import type { StoredProcedureParams, StoredProcedureResult } from '~/server/utils/storedProcedure'

export interface StoredProcedureRequest {
  procedureName: string
  parameters?: StoredProcedureParams
}

export interface MultipleStoredProcedureRequest {
  procedures: Array<{
    name: string
    parameters?: StoredProcedureParams
  }>
}

export function useStoredProcedure() {
  const nuxtApp = useNuxtApp()
  const appFetch = nuxtApp?.$fetch || $fetch

  /**
   * 단일 Stored Procedure 실행
   */
  const executeProcedure = async (
    procedureName: string,
    parameters: StoredProcedureParams = {},
  ): Promise<StoredProcedureResult> => {
    try {
      const result = await appFetch('/api/stored-procedure/execute', {
        method: 'POST',
        body: {
          procedureName,
          parameters,
        },
      })
      return result
    }
    catch (error) {
      console.error('Stored procedure 실행 오류:', error)
      throw error
    }
  }

  /**
   * 여러 Stored Procedure 순차 실행
   */
  const executeMultipleProcedures = async (
    procedures: Array<{ name: string, parameters?: StoredProcedureParams }>,
  ) => {
    try {
      const result = await appFetch('/api/stored-procedure/execute', {
        method: 'POST',
        body: {
          action: 'multiple',
          parameters: procedures,
        },
      })
      return result
    }
    catch (error) {
      console.error('Multiple stored procedures 실행 오류:', error)
      throw error
    }
  }

  /**
   * Stored Procedure 파라미터 정보 조회
   */
  const getProcedureParameters = async (procedureName: string) => {
    try {
      const result = await appFetch('/api/stored-procedure/execute', {
        method: 'POST',
        body: {
          action: 'parameters',
          procedureName,
        },
      })
      return result
    }
    catch (error) {
      console.error('Stored procedure 파라미터 조회 오류:', error)
      throw error
    }
  }

  /**
   * 모든 Stored Procedure 목록 조회
   */
  const getProcedureList = async () => {
    try {
      const result = await appFetch('/api/stored-procedure/list')
      return result
    }
    catch (error) {
      console.error('Stored procedure 목록 조회 오류:', error)
      throw error
    }
  }

  /**
   * Stored Procedure 실행 (반응형 데이터와 함께)
   */
  const useExecuteProcedure = (procedureName: string, parameters: StoredProcedureParams = {}) => {
    const result = ref<StoredProcedureResult | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    const execute = async () => {
      loading.value = true
      error.value = null

      try {
        result.value = await executeProcedure(procedureName, parameters)
      }
      catch (err) {
        error.value = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      }
      finally {
        loading.value = false
      }
    }

    return {
      result: readonly(result),
      loading: readonly(loading),
      error: readonly(error),
      execute,
    }
  }

  return {
    executeProcedure,
    executeMultipleProcedures,
    getProcedureParameters,
    getProcedureList,
    useExecuteProcedure,
  }
}
