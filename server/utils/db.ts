import sql from 'mssql'
import bcrypt from 'bcryptjs'

const config: sql.config = {
  server: 'localhost',
  port: 1433,
  user: 'frame',
  password: 'frame',
  database: 'theframework', // 사용자 데이터베이스 이름으로 변경
  options: {
    encrypt: false, // localhost의 경우 false
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
}

let pool: sql.ConnectionPool | null = null

export async function getDbConnection() {
  if (!pool) {
    pool = new sql.ConnectionPool(config)
    await pool.connect()
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
    console.log('bbbb 데이터베이스에 연결 중...')
    
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
      console.log('app_users 테이블이 생성되었습니다.')
    } else {
      console.log('app_users 테이블이 이미 존재합니다.')
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
      console.log('기본 관리자 계정이 생성되었습니다. (admin / admin123)')
    } else {
      console.log('기본 관리자 계정이 이미 존재합니다.')
    }
    
    console.log('데이터베이스 및 테이블 초기화 완료')
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error)
    throw error
  }
} 