/**
 * authService unit tests
 *
 * Tests the crypto primitives used by the auth service:
 * - bcrypt password hashing and comparison
 * - JWT generation (sign) and verification
 * - Token expiration rejection
 * - Wrong secret rejection
 */

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!
const BCRYPT_ROUNDS = 12

describe('authService — password hashing (bcrypt)', () => {
  it('should hash a password and produce a different string', async () => {
    const plain = 'MySecureP@ss1'
    const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS)

    expect(hash).not.toBe(plain)
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/) // bcrypt header
  })

  it('should compare correctly with the right password', async () => {
    const plain = 'MySecureP@ss1'
    const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS)

    const match = await bcrypt.compare(plain, hash)
    expect(match).toBe(true)
  })

  it('should reject a wrong password', async () => {
    const hash = await bcrypt.hash('correct-password', BCRYPT_ROUNDS)

    const match = await bcrypt.compare('wrong-password', hash)
    expect(match).toBe(false)
  })
})

describe('authService — JWT generation and verification', () => {
  it('should sign a token and verify it back', () => {
    const payload = { userId: 'u1', email: 'test@test.com', role: 'admin' }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })

    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
    expect(decoded.userId).toBe('u1')
    expect(decoded.email).toBe('test@test.com')
    expect(decoded.role).toBe('admin')
  })

  it('should include exp and iat claims', () => {
    const token = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '8h' })
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload

    expect(decoded.iat).toBeDefined()
    expect(decoded.exp).toBeDefined()
    // exp should be roughly 8 hours after iat
    expect(decoded.exp! - decoded.iat!).toBe(8 * 60 * 60)
  })

  it('should reject a token signed with a different secret', () => {
    const token = jwt.sign({ userId: 'u1' }, 'wrong-secret', { expiresIn: '1h' })

    expect(() => jwt.verify(token, JWT_SECRET)).toThrow(jwt.JsonWebTokenError)
  })

  it('should reject an expired token', () => {
    // Sign a token that already expired 10 seconds ago
    const token = jwt.sign(
      { userId: 'u1', iat: Math.floor(Date.now() / 1000) - 20 },
      JWT_SECRET,
      { expiresIn: '10s' } // 10s from iat which is 20s ago → already expired
    )

    expect(() => jwt.verify(token, JWT_SECRET)).toThrow(jwt.TokenExpiredError)
  })

  it('should reject a malformed token', () => {
    expect(() => jwt.verify('not.a.valid.token', JWT_SECRET)).toThrow(jwt.JsonWebTokenError)
  })
})
