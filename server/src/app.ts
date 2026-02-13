import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import routes from './routes/index.js'
import { errorMiddleware } from './middleware/errorMiddleware.js'
import { logger } from './utils/logger.js'

const app = express()

// JSON replacer to handle Prisma Decimal types
app.set('json replacer', (_key: string, value: unknown) => {
  // Prisma Decimal has toNumber method and constructor name 'Decimal'
  if (value !== null && typeof value === 'object' && 'toNumber' in value && typeof (value as { toNumber: unknown }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber()
  }
  return value
})

// Security middleware
app.use(helmet())
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()),
  credentials: true,
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
  message: 'Too many requests from this IP, please try again later.',
})
app.use('/api', limiter)

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api', routes)

// Error handling
app.use(errorMiddleware)

export default app
