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

    // app_users 테이블에 department_id 컬럼 존재 보장
    const userColumns = await connection.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_users'
    `)
    const userColSet = new Set(userColumns.recordset.map((r: any) => r.COLUMN_NAME.toLowerCase()))
    if (!userColSet.has('department_id')) {
      await connection.request().query(`ALTER TABLE app_users ADD department_id INT NULL`)
      console.warn('app_users.department_id 컬럼을 추가했습니다.')
    }

    // departments 테이블 생성/보강
    await ensureDepartmentsTable(connection)

    // notifications 테이블 생성/보강
    await ensureNotificationsTable(connection)

    console.warn('데이터베이스 및 테이블 초기화 완료')
  }
  catch (error) {
    console.error('데이터베이스 초기화 오류:', error)
    throw error
  }
}

// departments 테이블 초기화를 위한 함수 호출을 기존 initializeDatabase 내에 통합
async function ensureDepartmentsTable(connection: sql.ConnectionPool) {
  // departments 테이블 존재 여부 확인
  const checkDepartments = await connection.request().query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'departments'
    `)

  if (checkDepartments.recordset[0].count === 0) {
    await connection.request().query(`
        CREATE TABLE departments (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL,
          code NVARCHAR(50) UNIQUE NOT NULL,
          description NVARCHAR(400) NULL,
          parent_id INT NULL,
          sort_order INT DEFAULT 0,
          is_active BIT DEFAULT 1,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        )
      `)

    // 기본 데이터 예시 삽입
    await connection.request().query(`
        INSERT INTO departments (name, code, description, parent_id, sort_order, is_active)
        VALUES 
          (N'경영기획팀', 'HQ-PLN', N'본사 기획 조직', NULL, 1, 1),
          (N'인사총무팀', 'HR-ADM', N'인사 및 총무', NULL, 2, 1),
          (N'개발1팀', 'DEV-01', N'웹/백엔드 개발', NULL, 3, 1),
          (N'개발2팀', 'DEV-02', N'프론트엔드/모바일', NULL, 4, 1)
      `)
    console.warn('departments 테이블이 생성되었습니다.')
  } else {
    console.warn('departments 테이블이 이미 존재합니다.')
  }

  // 필요한 컬럼 존재 여부 확인 후 보강 (idempotent)
  const columns = await connection.request().query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'departments'
  `)
  const colSet = new Set(columns.recordset.map((r: any) => r.COLUMN_NAME.toLowerCase()))

  async function addColumnIfMissing(name: string, ddl: string) {
    if (!colSet.has(name.toLowerCase())) {
      await connection.request().query(`ALTER TABLE departments ADD ${ddl}`)
      console.warn(`departments.${name} 컬럼을 추가했습니다.`)
    }
  }

  await addColumnIfMissing('name', 'name NVARCHAR(100) NOT NULL DEFAULT N""')
  await addColumnIfMissing('code', 'code NVARCHAR(50) NULL')
  await addColumnIfMissing('description', 'description NVARCHAR(400) NULL')
  await addColumnIfMissing('parent_id', 'parent_id INT NULL')
  await addColumnIfMissing('sort_order', 'sort_order INT NOT NULL DEFAULT 0')
  await addColumnIfMissing('is_active', 'is_active BIT NOT NULL DEFAULT 1')
  await addColumnIfMissing('created_at', 'created_at DATETIME2 NULL DEFAULT GETDATE()')
  await addColumnIfMissing('updated_at', 'updated_at DATETIME2 NULL DEFAULT GETDATE()')
}

// notifications 테이블 초기화 (수신자별 알림 저장)
async function ensureNotificationsTable(connection: sql.ConnectionPool) {
  // 테이블 존재 여부 확인
  const check = await connection.request().query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'notifications'
    `)

  if (check.recordset[0].count === 0) {
    await connection.request().query(`
        CREATE TABLE notifications (
          id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT NOT NULL,
          title NVARCHAR(200) NOT NULL,
          message NVARCHAR(1000) NULL,
          is_read BIT NOT NULL DEFAULT 0,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          read_at DATETIME2 NULL,
          CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) REFERENCES app_users(id)
        )
      `)
    await connection.request().query(`
        CREATE INDEX IX_notifications_user_created 
        ON notifications(user_id, created_at DESC)
      `)
    console.warn('notifications 테이블이 생성되었습니다.')
  } else {
    console.warn('notifications 테이블이 이미 존재합니다.')
  }

  // 필요한 컬럼 존재 여부 확인 후 보강 (idempotent)
  const columns = await connection.request().query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'notifications'
  `)
  const colSet = new Set(columns.recordset.map((r: any) => r.COLUMN_NAME.toLowerCase()))

  async function addColumnIfMissing(name: string, ddl: string) {
    if (!colSet.has(name.toLowerCase())) {
      await connection.request().query(`ALTER TABLE notifications ADD ${ddl}`)
      console.warn(`notifications.${name} 컬럼을 추가했습니다.`)
    }
  }

  await addColumnIfMissing('title', 'title NVARCHAR(200) NOT NULL DEFAULT N""')
  await addColumnIfMissing('message', 'message NVARCHAR(1000) NULL')
  await addColumnIfMissing('is_read', 'is_read BIT NOT NULL DEFAULT 0')
  await addColumnIfMissing('created_at', 'created_at DATETIME2 NOT NULL DEFAULT GETDATE()')
  await addColumnIfMissing('read_at', 'read_at DATETIME2 NULL')
}
