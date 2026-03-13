/**
 * Jest global setup — runs before every test file.
 *
 * - Sets environment variables required by the app (JWT secrets, NODE_ENV)
 * - Mocks the winston logger so tests don't write to files/console
 * - Mocks the Prisma client so no real DB connection is needed
 */

// ---- Environment variables ----
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-unit-tests'
process.env.DATABASE_URL = 'sqlserver://localhost:1433;database=test;user=sa;password=test;encrypt=true;trustServerCertificate=true'

// ---- Mock logger (prevent file I/O during tests) ----
jest.mock('../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// ---- Mock Prisma client ----
jest.mock('../src/models/prismaClient.js', () => ({
  prisma: {
    project: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    task: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    risk: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    document: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    user: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    userInput: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    refreshToken: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
    notification: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    $transaction: jest.fn((fn: unknown) => typeof fn === 'function' ? fn({}) : Promise.resolve(fn)),
  },
}))

export {}
