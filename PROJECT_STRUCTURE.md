# ProjectPulse - Project Structure

## 📁 Complete File System Layout

```
project-pulse/
│
├── .git/                           # Git repository
├── .github/                        # GitHub workflows (optional)
│   └── workflows/
│       └── ci.yml
│
├── client/                         # Frontend React Application
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── logo.png
│   │   └── manifest.json          # PWA manifest
│   │
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── common/           # Reusable UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── Avatar.tsx
│   │   │   │
│   │   │   ├── layout/           # Layout components
│   │   │   │   ├── AuthLayout.tsx
│   │   │   │   ├── DashboardLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Footer.tsx
│   │   │   │
│   │   │   └── features/         # Feature-specific components
│   │   │       ├── auth/
│   │   │       │   ├── LoginForm.tsx
│   │   │       │   └── PasswordResetForm.tsx
│   │   │       │
│   │   │       ├── projects/
│   │   │       │   ├── ProjectCard.tsx
│   │   │       │   ├── ProjectList.tsx
│   │   │       │   ├── ProjectForm.tsx
│   │   │       │   ├── ProjectDetails.tsx
│   │   │       │   └── ProjectFilters.tsx
│   │   │       │
│   │   │       ├── tasks/
│   │   │       │   ├── TaskCard.tsx
│   │   │       │   ├── TaskList.tsx
│   │   │       │   ├── TaskForm.tsx
│   │   │       │   ├── TaskDetails.tsx
│   │   │       │   ├── KanbanBoard.tsx
│   │   │       │   ├── KanbanColumn.tsx
│   │   │       │   └── TaskFilters.tsx
│   │   │       │
│   │   │       ├── time-tracking/
│   │   │       │   ├── Timer.tsx
│   │   │       │   ├── TimeEntryList.tsx
│   │   │       │   └── TimeReport.tsx
│   │   │       │
│   │   │       ├── comments/
│   │   │       │   ├── CommentThread.tsx
│   │   │       │   ├── CommentForm.tsx
│   │   │       │   └── Comment.tsx
│   │   │       │
│   │   │       ├── risks/
│   │   │       │   ├── RiskMatrix.tsx
│   │   │       │   ├── RiskList.tsx
│   │   │       │   ├── RiskForm.tsx
│   │   │       │   └── RiskCard.tsx
│   │   │       │
│   │   │       ├── documents/
│   │   │       │   ├── DocumentList.tsx
│   │   │       │   ├── DocumentUpload.tsx
│   │   │       │   ├── DocumentViewer.tsx
│   │   │       │   └── DocumentApproval.tsx
│   │   │       │
│   │   │       ├── notifications/
│   │   │       │   ├── NotificationBell.tsx
│   │   │       │   ├── NotificationDropdown.tsx
│   │   │       │   ├── NotificationList.tsx
│   │   │       │   └── NotificationItem.tsx
│   │   │       │
│   │   │       ├── analytics/
│   │   │       │   ├── DashboardWidgets.tsx
│   │   │       │   ├── BurndownChart.tsx
│   │   │       │   ├── VelocityChart.tsx
│   │   │       │   └── HoursDistribution.tsx
│   │   │       │
│   │   │       ├── user-inputs/
│   │   │       │   ├── UserInputCard.tsx
│   │   │       │   ├── UserInputList.tsx
│   │   │       │   ├── UserInputForm.tsx
│   │   │       │   ├── UserInputDetails.tsx
│   │   │       │   ├── ConvertToTaskModal.tsx
│   │   │       │   ├── ConvertToProjectModal.tsx
│   │   │       │   └── PendingInputsBadge.tsx
│   │   │       │
│   │   │       └── admin/
│   │   │           ├── UserManagement.tsx
│   │   │           ├── TemplateEditor.tsx
│   │   │           └── AuditLogViewer.tsx
│   │   │
│   │   ├── pages/                 # Page components
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── ResetPasswordPage.tsx
│   │   │   │
│   │   │   ├── dipendente/
│   │   │   │   ├── DashboardPage.tsx
│   │   │   │   ├── MyTasksPage.tsx
│   │   │   │   └── ReportsPage.tsx
│   │   │   │
│   │   │   ├── direzione/
│   │   │   │   ├── DashboardPage.tsx
│   │   │   │   ├── ProjectsPage.tsx
│   │   │   │   ├── TasksOverviewPage.tsx
│   │   │   │   ├── AnalyticsPage.tsx
│   │   │   │   └── RisksPage.tsx
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── DashboardPage.tsx
│   │   │   │   ├── UsersPage.tsx
│   │   │   │   ├── TemplatesPage.tsx
│   │   │   │   └── AuditLogsPage.tsx
│   │   │   │
│   │   │   ├── projects/
│   │   │   │   ├── ProjectListPage.tsx
│   │   │   │   └── ProjectDetailPage.tsx
│   │   │   │
│   │   │   ├── user-inputs/
│   │   │   │   ├── UserInputListPage.tsx
│   │   │   │   ├── UserInputDetailPage.tsx
│   │   │   │   └── MyInputsPage.tsx
│   │   │   │
│   │   │   ├── NotificationsPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   │
│   │   ├── stores/                # Zustand stores (state management)
│   │   │   ├── authStore.ts      # User auth & session
│   │   │   ├── projectStore.ts   # Projects data
│   │   │   ├── taskStore.ts      # Tasks data
│   │   │   ├── timerStore.ts     # Timer state
│   │   │   ├── notificationStore.ts
│   │   │   ├── userInputStore.ts # User inputs/suggestions
│   │   │   └── themeStore.ts     # Dark/light mode
│   │   │
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useProjects.ts
│   │   │   ├── useTasks.ts
│   │   │   ├── useTimer.ts
│   │   │   ├── useNotifications.ts
│   │   │   ├── useUserInputs.ts
│   │   │   ├── useDarkMode.ts
│   │   │   ├── useDebounce.ts
│   │   │   └── useLocalStorage.ts
│   │   │
│   │   ├── services/              # API service layer
│   │   │   ├── api.ts            # Axios instance & interceptors
│   │   │   ├── authService.ts
│   │   │   ├── projectService.ts
│   │   │   ├── taskService.ts
│   │   │   ├── timeService.ts
│   │   │   ├── commentService.ts
│   │   │   ├── riskService.ts
│   │   │   ├── documentService.ts
│   │   │   ├── notificationService.ts
│   │   │   ├── analyticsService.ts
│   │   │   ├── userInputService.ts
│   │   │   └── userService.ts
│   │   │
│   │   ├── utils/                 # Utility functions
│   │   │   ├── dateUtils.ts
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   │
│   │   ├── types/                 # TypeScript type definitions
│   │   │   ├── api.types.ts
│   │   │   ├── user.types.ts
│   │   │   ├── project.types.ts
│   │   │   ├── task.types.ts
│   │   │   ├── userInput.types.ts
│   │   │   └── common.types.ts
│   │   │
│   │   ├── styles/                # Global styles
│   │   │   └── index.css         # Tailwind + custom CSS
│   │   │
│   │   ├── App.tsx                # Main App component
│   │   ├── main.tsx               # Entry point
│   │   └── vite-env.d.ts          # Vite types
│   │
│   ├── .env.example               # Environment variables template
│   ├── .env.local                 # Local environment (gitignored)
│   ├── .eslintrc.cjs              # ESLint configuration
│   ├── .prettierrc                # Prettier configuration
│   ├── index.html                 # HTML template
│   ├── package.json               # Dependencies
│   ├── postcss.config.js          # PostCSS config
│   ├── tailwind.config.js         # Tailwind config
│   ├── tsconfig.json              # TypeScript config
│   ├── tsconfig.node.json         # TypeScript config for Vite
│   └── vite.config.ts             # Vite configuration
│
├── server/                        # Backend Node.js Application
│   ├── prisma/
│   │   ├── schema.prisma          # Prisma schema
│   │   ├── migrations/            # Database migrations
│   │   └── seed.ts                # Seed data script
│   │
│   ├── uploads/                   # File uploads directory
│   │   ├── documents/
│   │   └── avatars/
│   │
│   ├── logs/                      # Application logs
│   │   ├── error.log
│   │   └── combined.log
│   │
│   ├── src/
│   │   ├── controllers/           # Route controllers (thin layer)
│   │   │   ├── authController.ts
│   │   │   ├── projectController.ts
│   │   │   ├── taskController.ts
│   │   │   ├── timeController.ts
│   │   │   ├── commentController.ts
│   │   │   ├── riskController.ts
│   │   │   ├── documentController.ts
│   │   │   ├── notificationController.ts
│   │   │   ├── analyticsController.ts
│   │   │   ├── userInputController.ts
│   │   │   └── userController.ts
│   │   │
│   │   ├── services/              # Business logic layer
│   │   │   ├── authService.ts
│   │   │   ├── projectService.ts
│   │   │   ├── taskService.ts
│   │   │   ├── timeService.ts
│   │   │   ├── commentService.ts
│   │   │   ├── riskService.ts
│   │   │   ├── documentService.ts
│   │   │   ├── notificationService.ts
│   │   │   ├── analyticsService.ts
│   │   │   ├── auditService.ts
│   │   │   ├── userInputService.ts
│   │   │   ├── emailService.ts (optional)
│   │   │   └── userService.ts
│   │   │
│   │   ├── models/                # Database models (Prisma wrapper)
│   │   │   └── prismaClient.ts
│   │   │
│   │   ├── middleware/            # Express middleware
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorMiddleware.ts
│   │   │   ├── validationMiddleware.ts
│   │   │   ├── auditMiddleware.ts
│   │   │   ├── rateLimitMiddleware.ts
│   │   │   └── uploadMiddleware.ts
│   │   │
│   │   ├── routes/                # Express routes
│   │   │   ├── index.ts          # Routes aggregator
│   │   │   ├── authRoutes.ts
│   │   │   ├── projectRoutes.ts
│   │   │   ├── taskRoutes.ts
│   │   │   ├── timeRoutes.ts
│   │   │   ├── commentRoutes.ts
│   │   │   ├── riskRoutes.ts
│   │   │   ├── documentRoutes.ts
│   │   │   ├── notificationRoutes.ts
│   │   │   ├── analyticsRoutes.ts
│   │   │   ├── userInputRoutes.ts
│   │   │   └── userRoutes.ts
│   │   │
│   │   ├── utils/                 # Utility functions
│   │   │   ├── jwtUtils.ts
│   │   │   ├── passwordUtils.ts
│   │   │   ├── codeGenerators.ts  # PRJ-YYYY-NNN etc.
│   │   │   ├── pdfGenerator.ts
│   │   │   ├── dateUtils.ts
│   │   │   ├── validators.ts
│   │   │   └── logger.ts          # Winston logger
│   │   │
│   │   ├── types/                 # TypeScript types
│   │   │   ├── express.d.ts      # Extended Express types
│   │   │   └── api.types.ts
│   │   │
│   │   ├── config/                # Configuration
│   │   │   ├── database.ts
│   │   │   ├── jwt.ts
│   │   │   ├── cors.ts
│   │   │   └── constants.ts
│   │   │
│   │   ├── socket/                # Socket.io handlers
│   │   │   ├── index.ts          # Socket.io setup
│   │   │   └── notificationHandler.ts
│   │   │
│   │   ├── app.ts                 # Express app setup
│   │   └── index.ts               # Server entry point
│   │
│   ├── tests/                     # Tests
│   │   ├── unit/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── integration/
│   │       └── api/
│   │
│   ├── .env.example               # Environment variables template
│   ├── .env.local                 # Local environment (gitignored)
│   ├── .eslintrc.cjs              # ESLint configuration
│   ├── .prettierrc                # Prettier configuration
│   ├── jest.config.js             # Jest configuration
│   ├── package.json               # Dependencies
│   ├── tsconfig.json              # TypeScript config
│   └── nodemon.json               # Nodemon config for dev
│
├── shared/                        # Shared code between client & server
│   └── types/
│       ├── user.types.ts
│       ├── project.types.ts
│       ├── task.types.ts
│       ├── userInput.types.ts
│       └── common.types.ts
│
├── docs/                          # Documentation
│   ├── PRD.md                     # This file!
│   ├── IMPLEMENTATION_GUIDE.md    # Development guide
│   ├── TECH_STACK.md              # Technical specifications
│   ├── DATABASE_SCHEMA.sql        # Database schema
│   ├── PROJECT_STRUCTURE.md       # This file!
│   ├── SETUP_LOCALHOST.md         # Setup instructions
│   ├── PROMPTS_FOR_CLAUDE.md      # Claude Code prompts
│   ├── API.md                     # API documentation
│   └── USER_GUIDE.md              # End-user manual
│
├── .gitignore                     # Git ignore file
├── .prettierrc                    # Prettier config (root)
├── .eslintrc.cjs                  # ESLint config (root)
├── package.json                   # Root package.json (workspaces)
└── README.md                      # Project README

```

---

## 📝 Key Files Explained

### Root Level

#### `package.json` (Root)
```json
{
  "name": "project-pulse",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "install:all": "npm install && npm install --workspace=client && npm install --workspace=server",
    "dev": "concurrently \"npm run dev --workspace=client\" \"npm run dev --workspace=server\"",
    "build": "npm run build --workspace=client && npm run build --workspace=server",
    "start:prod": "concurrently \"npm run preview --workspace=client\" \"npm run start --workspace=server\"",
    "db:migrate": "npm run migrate --workspace=server",
    "db:seed": "npm run seed --workspace=server",
    "db:studio": "npm run studio --workspace=server",
    "test": "npm run test --workspace=server && npm run test --workspace=client",
    "lint": "npm run lint --workspace=client && npm run lint --workspace=server",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\""
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "prettier": "^3.1.1"
  }
}
```

---

### Client Files

#### `client/package.json`
```json
{
  "name": "project-pulse-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "zustand": "^4.4.7",
    "axios": "^1.6.2",
    "react-hook-form": "^7.49.2",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.3",
    "socket.io-client": "^4.6.0",
    "framer-motion": "^10.16.16",
    "recharts": "^2.10.3",
    "lucide-react": "^0.300.0",
    "date-fns": "^3.0.6",
    "react-dropzone": "^14.2.3",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "jspdf": "^2.5.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "eslint": "^8.56.0",
    "vitest": "^1.1.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5"
  }
}
```

#### `client/vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
})
```

---

### Server Files

#### `server/package.json`
```json
{
  "name": "project-pulse-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "prisma migrate dev",
    "seed": "tsx prisma/seed.ts",
    "studio": "prisma studio",
    "generate": "prisma generate",
    "lint": "eslint . --ext ts",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "express": "^4.18.2",
    "prisma": "^5.8.0",
    "@prisma/client": "^5.8.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "socket.io": "^4.6.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "multer": "^1.4.5-lts.1",
    "pdfkit": "^0.14.0",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/cors": "^2.8.17",
    "@types/multer": "^1.4.11",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "nodemon": "^3.0.2",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2"
  }
}
```

#### `server/prisma/schema.prisma`
```prisma
// See DATABASE_SCHEMA.sql for complete PostgreSQL schema
// This is the Prisma equivalent

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  admin
  direzione
  dipendente
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  role          UserRole  @default(dipendente)
  firstName     String    @map("first_name")
  lastName      String    @map("last_name")
  avatarUrl     String?   @map("avatar_url")
  isActive      Boolean   @default(true) @map("is_active")
  lastLoginAt   DateTime? @map("last_login_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  ownedProjects      Project[]        @relation("ProjectOwner")
  createdProjects    Project[]        @relation("ProjectCreator")
  assignedTasks      Task[]           @relation("TaskAssignee")
  createdTasks       Task[]           @relation("TaskCreator")
  timeEntries        TimeEntry[]
  comments           Comment[]
  ownedRisks         Risk[]           @relation("RiskOwner")
  createdRisks       Risk[]           @relation("RiskCreator")
  approvedDocuments  Document[]       @relation("DocumentApprover")
  createdDocuments   Document[]       @relation("DocumentCreator")
  notifications      Notification[]
  auditLogs          AuditLog[]
  refreshTokens      RefreshToken[]

  @@map("users")
}

// Add other models similar to DATABASE_SCHEMA.sql
// ... (Project, Task, TimeEntry, Comment, Risk, Document, etc.)
```

---

## 🔄 Data Flow

### Authentication Flow
```
User Login (client) 
  → POST /api/auth/login (server) 
  → authService.login()
  → JWT token generated
  → Token sent to client
  → Stored in authStore (Zustand)
  → Attached to all API requests via Axios interceptor
```

### Task Creation Flow
```
User fills TaskForm (client)
  → POST /api/tasks (server)
  → taskController.createTask()
  → taskService.createTask()
  → Prisma creates task in DB
  → auditService logs creation
  → Task returned to client
  → taskStore updated (Zustand)
  → UI re-renders with new task
```

### Real-time Notification Flow
```
User comments on task (client)
  → POST /api/tasks/:id/comments (server)
  → commentService.createComment()
  → Comment saved to DB
  → notificationService.sendPushNotification()
  → Socket.io emits to user room
  → Client receives via Socket.io
  → notificationStore updated
  → Toast displayed
  → Bell icon badge incremented
```

---

## 🚀 Getting Started

1. **Clone repo and install**
   ```bash
   git clone <repo-url>
   cd project-pulse
   npm run install:all
   ```

2. **Setup environment**
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env.local
   # Edit .env files with your values
   ```

3. **Setup database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

5. **Access**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000
   - Prisma Studio: `npm run db:studio`

---

## 📚 Additional Resources

- See **SETUP_LOCALHOST.md** for detailed setup instructions
- See **IMPLEMENTATION_GUIDE.md** for phase-by-phase development
- See **PROMPTS_FOR_CLAUDE.md** for Claude Code prompts

---

**Document Version**: 1.0  
**Last Updated**: January 2026
