import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/database.js'; // Initialize database and create tables
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import timeRoutes from './routes/time.js';
import commentRoutes from './routes/comments.js';
import milestoneRoutes from './routes/milestones.js';
import userRoutes from './routes/users.js';
import requestRoutes from './routes/requests.js';
import templateRoutes from './routes/templates.js';
import reportRoutes from './routes/reports.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOptions = {
  origin: (origin, callback) => {
    // Default origins (local dev + legacy Vercel). Extendable via ALLOWED_ORIGINS env (comma-separated).
    const defaultOrigins = [
      'https://project-pulse-amber.vercel.app',
      /https:\/\/project-pulse-.*\.vercel\.app$/,
      'http://localhost:3000',
      'http://localhost:5173'
    ];

    const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);

    const allowedOrigins = [...defaultOrigins, ...extraOrigins];

    if (!origin || allowedOrigins.some(allowed =>
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/time', timeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 API endpoints available at /api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
