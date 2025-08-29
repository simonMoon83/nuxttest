import { initializeDatabase } from '../utils/db'

export default async () => {
  try {
    const skip = (process.env.SKIP_DB_INIT ?? '').toString().toLowerCase() === 'true'
    if (skip) {
      console.log('[init-db] SKIP_DB_INIT=true → 데이터베이스 초기화를 건너뜁니다.')
      return
    }
    console.log('데이터베이스 초기화를 시작합니다...')
    await initializeDatabase()
    console.log('데이터베이스 초기화가 완료되었습니다.')
  } catch (error) {
    console.error('데이터베이스 초기화 실패:', error)
  }
}