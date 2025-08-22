import process from 'node:process'
import { initializeDatabase } from '../utils/db'

export default async () => {
  try {
    if (process.env.SKIP_DB_INIT === 'true') {
      console.warn('환경변수에 의해 DB 초기화를 건너뜁니다. (SKIP_DB_INIT=true)')
      return
    }
    console.warn('데이터베이스 초기화를 시작합니다...')
    await initializeDatabase()
    console.warn('데이터베이스 초기화가 완료되었습니다.')
  }
  catch (error) {
    console.error('데이터베이스 초기화 실패:', error)
  }
}
