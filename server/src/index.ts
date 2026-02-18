import 'dotenv/config'
import { createServer } from 'http'
import { Server } from 'socket.io'
import app from './app.js'
import { logger } from './utils/logger.js'
import { initializeSocket } from './socket/index.js'
import { setSocketIO } from './services/notificationService.js'
import { initWeeklyReportScheduler } from './scheduler/weeklyReportScheduler.js'
import { initEmailService } from './services/emailService.js'
import { initEmailNotificationScheduler } from './scheduler/emailNotificationScheduler.js'

const PORT = process.env.PORT || 3000

const httpServer = createServer(app)

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s: string) => s.trim()),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
  upgradeTimeout: 10000,
})

initializeSocket(io)
setSocketIO(io)

httpServer.listen(Number(PORT), '0.0.0.0', async () => {
  logger.info(`Server running on http://0.0.0.0:${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)

  // Initialize weekly report scheduler
  initWeeklyReportScheduler()

  // Initialize email service + notification scheduler
  await initEmailService()
  initEmailNotificationScheduler()
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

export { io }
