import process from 'node:process'
import bcrypt from 'bcryptjs'
import sql from 'mssql'

const config: sql.config = {
  server: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : 1433,
  user: process.env.DB_USER || 'frame',
  password: process.env.DB_PASSWORD || 'frame',
  database: process.env.DB_NAME || 'theframework',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
  },
  pool: {
    max: process.env.DB_POOL_MAX ? Number.parseInt(process.env.DB_POOL_MAX, 10) : 10,
    min: process.env.DB_POOL_MIN ? Number.parseInt(process.env.DB_POOL_MIN, 10) : 0,
    idleTimeoutMillis: process.env.DB_POOL_IDLE_MS ? Number.parseInt(process.env.DB_POOL_IDLE_MS, 10) : 30000,
  },
}

let pool: sql.ConnectionPool | null = null

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function connectWithRetry(): Promise<sql.ConnectionPool> {
  const maxRetries = process.env.DB_MAX_RETRIES ? Number.parseInt(process.env.DB_MAX_RETRIES, 10) : 5
  const initialDelay = process.env.DB_RETRY_DELAY_MS ? Number.parseInt(process.env.DB_RETRY_DELAY_MS, 10) : 2000

  let attempt = 0
  while (true) {
    try {
      const newPool = new sql.ConnectionPool(config)
      await newPool.connect()
      return newPool
    }
    catch (error) {
      if (attempt >= maxRetries) {
        throw error
      }
      const waitMs = initialDelay * (2 ** attempt)
      console.warn(`DB 연결 실패 (시도 ${attempt + 1}/${maxRetries + 1}). ${waitMs}ms 후 재시도합니다...`)
      await sleep(waitMs)
      attempt += 1
    }
  }
}

export async function getDbConnection() {
  if (!pool) {
    pool = await connectWithRetry()
  }
  return pool
}

export async function closeDbConnection() {
  if (pool) {
    await pool.close()
    pool = null
  }
}

// 데이터베이스 및 테이블 초기화
export async function initializeDatabase() {
  const connection = await getDbConnection()

  try {
    console.warn('데이터베이스에 연결 중...')

    // app_users 테이블이 이미 존재하는지 확인
    const checkTable = await connection.request().query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'app_users'
    `)

    if (checkTable.recordset[0].count === 0) {
      // app_users 테이블 생성
      await connection.request().query(`
        CREATE TABLE app_users (
          id INT IDENTITY(1,1) PRIMARY KEY,
          username NVARCHAR(50) UNIQUE NOT NULL,
          email NVARCHAR(100) UNIQUE NOT NULL,
          password NVARCHAR(255) NOT NULL,
          full_name NVARCHAR(100),
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          is_active BIT DEFAULT 1
        )
      `)
      console.warn('app_users 테이블이 생성되었습니다.')
    }
    else {
      console.warn('app_users 테이블이 이미 존재합니다.')
    }

    // 기본 관리자 계정 확인 및 생성
    const checkUser = await connection.request().query(`
      SELECT COUNT(*) as count FROM app_users WHERE username = 'admin'
    `)

    if (checkUser.recordset[0].count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10)

      await connection.request()
        .input('username', sql.NVarChar, 'admin')
        .input('email', sql.NVarChar, 'admin@example.com')
        .input('password', sql.NVarChar, hashedPassword)
        .input('full_name', sql.NVarChar, 'Administrator')
        .query(`
          INSERT INTO app_users (username, email, password, full_name)
          VALUES (@username, @email, @password, @full_name)
        `)
      console.warn('기본 관리자 계정이 생성되었습니다. (admin / admin123)')
    }
    else {
      console.warn('기본 관리자 계정이 이미 존재합니다.')
    }

    console.warn('데이터베이스 및 테이블 초기화 완료')
  }
  catch (error) {
    console.error('데이터베이스 초기화 오류:', error)
    throw error
  }
}
