import bcrypt from 'bcryptjs'
import { getDbConnection } from '../../utils/db'
import { generateToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { username, password } = body

    if (!username || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username and password are required'
      })
    }

    const connection = await getDbConnection()
    
    // 사용자 조회 (app_users 테이블 사용)
    const result = await connection.request()
      .input('username', username)
      .query(`
        SELECT id, username, email, password, full_name, is_active 
        FROM app_users 
        WHERE username = @username AND is_active = 1
      `)

    const user = result.recordset[0]
    
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
      })
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
      })
    }

    // JWT 토큰 생성
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name
    })

    // 쿠키에 토큰 설정
    setCookie(event, 'auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24시간
    })

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}) 