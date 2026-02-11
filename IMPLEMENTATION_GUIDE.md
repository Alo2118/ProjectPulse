# ProjectPulse - Implementation Guide for Claude Code

## 🎯 Purpose

Questa guida fornisce istruzioni **step-by-step** per implementare ProjectPulse usando Claude Code. Ogni fase include prompt ottimizzati e checklist.

---

## 📋 Pre-requisites Checklist

Prima di iniziare, verifica di avere:

- [ ] Node.js 18+ installato (`node --version`)
- [ ] PostgreSQL 15+ installato e running
- [ ] Git installato
- [ ] Visual Studio Code installato
- [ ] Connessione database funzionante

### Verifica PostgreSQL

```bash
# Check se PostgreSQL è running
pg_isready

# Accedi a PostgreSQL
psql -U postgres

# Crea database
CREATE DATABASE projectpulse;

# Esci
\q
```

---

## 🏗️ Phase 1: Project Setup & Infrastructure

### Step 1.1: Initialize Monorepo Structure

**Prompt per Claude Code:**
```
Create a monorepo structure for ProjectPulse with:
- Root package.json with workspaces for client and server
- client/ folder with Vite + React + TypeScript setup
- server/ folder with Express + TypeScript setup
- shared/ folder for shared TypeScript types
- Root-level scripts for running both concurrently

Use these exact dependencies:
Frontend: react ^18.2.0, vite ^5.0.0, typescript ^5.3.0, tailwind ^3.4.0
Backend: express ^4.18.2, typescript ^5.3.0, prisma ^5.8.0

Include .gitignore, .env.example, prettier and eslint configs.
```

**Checklist:**
- [ ] Folder structure created
- [ ] package.json files configured
- [ ] TypeScript configs (tsconfig.json) in place
- [ ] .env.example files created
- [ ] npm install completed successfully
- [ ] npm run dev starts both client and server

**Files to verify:**
```
project-pulse/
├── package.json (root)
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
└── shared/
    └── types/
```

---

### Step 1.2: Tailwind CSS Setup

**Prompt per Claude Code:**
```
Setup Tailwind CSS in the client/ folder with:
- Dark mode class strategy
- Custom colors from PRD.md (primary, success, warning, danger, status colors)
- Inter font family from Google Fonts
- Consistent spacing and shadows
- Custom theme extensions for ProjectPulse brand

Create a base index.css with Tailwind directives and custom CSS variables for dark mode.
```

**Checklist:**
- [ ] tailwind.config.js configured
- [ ] postcss.config.js created
- [ ] src/index.css with @tailwind directives
- [ ] Dark mode toggle works
- [ ] Custom colors available

---

### Step 1.3: Database Setup with Prisma

**Prompt per Claude Code:**
```
Setup Prisma in server/ folder:
1. Initialize Prisma with PostgreSQL
2. Create schema.prisma based on DATABASE_SCHEMA.sql
3. Include all tables: users, projects, tasks, time_entries, comments, risks, documents, audit_logs, notifications, project_templates
4. Add proper relations and indexes
5. Create initial migration
6. Create seed script with:
   - Admin user (admin@projectpulse.local / Admin123!)
   - Sample direzione user
   - Sample dipendente user
   - 2 sample projects
   - 5 sample tasks

Database URL: postgresql://postgres:postgres@localhost:5432/projectpulse
```

**Checklist:**
- [ ] schema.prisma created with all tables
- [ ] .env configured with DATABASE_URL
- [ ] `npx prisma migrate dev --name init` runs successfully
- [ ] `npx prisma db seed` creates sample data
- [ ] Can view data in Prisma Studio (`npx prisma studio`)

---

### Step 1.4: Backend Folder Structure

**Prompt per Claude Code:**
```
Create a clean, maintainable backend structure in server/src/:

server/src/
├── controllers/      # Route handlers (thin layer)
├── services/         # Business logic
├── models/           # Prisma client wrapper
├── middleware/       # Auth, validation, error handling, audit logging
├── routes/           # Express routes
├── utils/            # Helpers, constants
├── types/            # TypeScript types/interfaces
├── config/           # Configuration (database, jwt, etc)
├── index.ts          # Main server entry
└── app.ts            # Express app setup

Create empty files with TODO comments for each module.
Include proper error handling middleware and request logging with Winston.
```

**Checklist:**
- [ ] Folder structure created
- [ ] index.ts and app.ts set up
- [ ] Winston logger configured
- [ ] Error handling middleware
- [ ] CORS configured for localhost:5173

---

### Step 1.5: Authentication System

**Prompt per Claude Code:**
```
Implement complete authentication system:

1. JWT utilities (generate, verify tokens)
2. Password hashing with bcrypt (12 rounds)
3. Auth middleware for route protection
4. Auth routes:
   - POST /api/auth/register
   - POST /api/auth/login
   - POST /api/auth/logout
   - GET /api/auth/me (get current user)
   - POST /api/auth/refresh-token

5. Password validation:
   - Min 8 characters
   - 1 uppercase, 1 number, 1 special char

6. JWT payload: { userId, role, iat, exp }
7. Access token: 8h expiry
8. Refresh token: 7 days, httpOnly cookie

Include proper error messages and validation with Zod.
Store JWT_SECRET and REFRESH_TOKEN_SECRET in .env
```

**Checklist:**
- [ ] JWT utilities implemented
- [ ] Password hashing works
- [ ] Auth routes created and tested
- [ ] Auth middleware protects routes
- [ ] Refresh token flow works
- [ ] Tested with Thunder Client/Postman

---

## 🎨 Phase 2: Frontend Foundation

### Step 2.1: Routing & Layout

**Prompt per Claude Code:**
```
Setup React Router v6 with protected routes:

Routes:
- /login (public)
- /dashboard (protected, redirects based on role)
- /dashboard/dipendente/* (dipendente only)
- /dashboard/direzione/* (direzione only)
- /dashboard/admin/* (admin only)

Create Layout components:
1. AuthLayout (for login page)
2. DashboardLayout (sidebar + header + main content area)
   - Responsive sidebar with navigation based on user role
   - Header with: user menu, notifications bell, dark mode toggle
   - Main content area

Use Zustand for auth state management (user, token, login, logout methods).
Persist auth state in localStorage.
```

**Checklist:**
- [ ] React Router configured
- [ ] Protected routes work
- [ ] Role-based route access
- [ ] Layout components render correctly
- [ ] Zustand auth store works
- [ ] Auth persistence works (refresh page keeps login)

---

### Step 2.2: Design System Components

**Prompt per Claude Code:**
```
Create reusable Tailwind components in client/src/components/common/:

1. Button.tsx - variants: primary, secondary, danger, ghost; sizes: sm, md, lg; loading state
2. Input.tsx - with label, error message, different types
3. Select.tsx - dropdown with search
4. Modal.tsx - with backdrop, close button, customizable content
5. Card.tsx - container with optional header, footer
6. Badge.tsx - for status display (todo, in-progress, completed, blocked)
7. Table.tsx - responsive table with sorting
8. Spinner.tsx - loading indicator
9. Toast.tsx - notification toast (success, error, warning, info)
10. Avatar.tsx - user avatar with initials fallback

All components should:
- Support dark mode
- Be fully typed with TypeScript
- Use Tailwind classes only
- Include proper accessibility (ARIA labels)
- Have consistent styling matching PRD color palette
```

**Checklist:**
- [ ] All 10 components created
- [ ] Components work in both light/dark mode
- [ ] TypeScript types are correct
- [ ] Accessible (keyboard navigation, ARIA)
- [ ] Storybook or simple demo page to test components

---

### Step 2.3: API Client Setup

**Prompt per Claude Code:**
```
Create Axios-based API client in client/src/services/api.ts:

Features:
- Base URL from env (VITE_API_URL)
- Interceptors for:
  - Attaching JWT token to requests (from Zustand auth store)
  - Handling 401 (auto logout)
  - Handling 403 (show error)
  - Refresh token logic (retry failed request after refresh)
- Error handling and transformation
- TypeScript interfaces for all API responses

Create service modules:
- authService.ts (login, register, logout, getMe)
- projectService.ts (CRUD projects)
- taskService.ts (CRUD tasks)
- userService.ts (CRUD users - admin only)

Use consistent response format:
{ success: boolean, data?: any, error?: string }
```

**Checklist:**
- [ ] Axios client configured
- [ ] Interceptors work (token attachment, error handling)
- [ ] Service modules created
- [ ] API calls work from frontend
- [ ] Error handling displays properly

---

## 📊 Phase 3: Core Features Implementation

### Step 3.1: Projects Module (Backend)

**Prompt per Claude Code:**
```
Implement complete Projects module in backend:

Routes (server/src/routes/projectRoutes.ts):
- GET /api/projects - List all (with filters, pagination)
- GET /api/projects/:id - Get single project with tasks
- POST /api/projects - Create new project
- PUT /api/projects/:id - Update project
- DELETE /api/projects/:id - Soft delete
- PATCH /api/projects/:id/status - Change status

Controller (thin - delegates to service):
- Validation with Zod schemas
- Error handling

Service (business logic):
- CRUD operations
- Generate unique project code (PRJ-YYYY-NNN)
- Audit logging for all changes
- Check permissions based on user role

Include:
- Filters: status, priority, owner
- Pagination: page, limit (default 20)
- Sorting: by date, name, status
- Search: by name, code, description

Audit every create/update/delete with old_data and new_data in audit_logs table.
```

**Checklist:**
- [ ] All routes implemented
- [ ] Validation schemas created
- [ ] Business logic in service
- [ ] Audit logging works
- [ ] Tested with API client
- [ ] Permissions enforced (direzione and admin only can create)

---

### Step 3.2: Projects UI (Frontend)

**Prompt per Claude Code:**
```
Create Projects UI in client/src/pages/Projects/:

1. ProjectListPage.tsx
   - Table view with columns: Code, Name, Status, Priority, Owner, Dates
   - Filters: status, priority, search
   - Pagination
   - Actions: View, Edit, Delete
   - "New Project" button

2. ProjectDetailPage.tsx
   - Project info card
   - Tabs: Overview, Tasks, Risks, Documents
   - Edit/Delete buttons (permission-based)

3. ProjectFormModal.tsx
   - Form for create/edit
   - Fields: name, description, status, priority, start_date, target_date, owner
   - Validation (React Hook Form + Zod)
   - Template selection (optional)

Use components from design system.
Add loading states and error handling.
Implement optimistic updates for better UX.
```

**Checklist:**
- [ ] List page renders projects
- [ ] Filters and search work
- [ ] Pagination works
- [ ] Detail page shows project info
- [ ] Create/Edit modal works
- [ ] Validation displays errors
- [ ] Delete confirmation works
- [ ] Responsive design

---

### Step 3.3: Tasks Module (Backend + Frontend)

**Prompt per Claude Code:**
```
Implement Tasks module similar to Projects:

Backend:
- CRUD routes: GET, POST, PUT, DELETE /api/tasks
- Additional routes:
  - GET /api/tasks/my-tasks (current user's tasks)
  - PATCH /api/tasks/:id/status (change status)
  - PATCH /api/tasks/:id/assign (assign to user)
- Task code generation (TASK-PRJ-NNN)
- Validation for status transitions (todo → in_progress → completed/blocked)
- Audit logging

Frontend:
- TaskListPage (Kanban board + list view toggle)
- TaskDetailPage (with comments thread)
- TaskFormModal (create/edit)
- TaskCard component (for Kanban)
- Status badges with colors

Kanban Board:
- Columns: Todo, In Progress, Blocked, Completed
- Drag & drop (use @dnd-kit/core)
- Task count per column
- Filter by project, priority, assigned user
```

**Checklist:**
- [ ] Backend routes work
- [ ] Status transitions validated
- [ ] Kanban board renders
- [ ] Drag & drop works
- [ ] Task detail shows all info
- [ ] Create/Edit form works
- [ ] Filters work
- [ ] Status badges colored correctly

---

### Step 3.4: Time Tracking (Backend + Frontend)

**Prompt per Claude Code:**
```
Implement Time Tracking:

Backend:
- POST /api/tasks/:id/time/start - Start timer
- POST /api/tasks/:id/time/stop - Stop timer
- POST /api/tasks/:id/time/pause - Pause timer
- GET /api/tasks/:id/time/entries - Get time entries
- POST /api/time-entries - Manual entry
- Auto-save timer every 5 minutes

Service logic:
- Create time_entry with start_time
- On stop: set end_time, calculate duration
- On pause: save current entry, create new on resume
- Update task.actual_hours on stop

Frontend:
- Timer component on TaskCard
- Display: HH:MM:SS
- Buttons: Start, Pause, Stop
- Visual indicator when timer running (pulsing)
- Timer persists in localStorage (survives refresh)
- Auto-sync every 5 min

Use Zustand for timer state management.
```

**Checklist:**
- [ ] Timer starts/stops correctly
- [ ] Duration calculated accurately
- [ ] Auto-save works
- [ ] Timer persists on refresh
- [ ] UI shows running state clearly
- [ ] Time entries saved to database
- [ ] Actual hours updated on task

---

### Step 3.5: Comments & Communication

**Prompt per Claude Code:**
```
Implement Comments system:

Backend:
- POST /api/tasks/:id/comments - Add comment
- GET /api/tasks/:id/comments - Get comments thread
- PUT /api/comments/:id - Edit comment
- DELETE /api/comments/:id - Delete comment
- Support @mentions parsing (extract usernames)
- Mark comments as internal (direzione only)

Frontend:
- CommentThread component
- CommentForm (textarea with submit)
- Comment component (user avatar, timestamp, content)
- @mention autocomplete (use @tiptap/react or react-mentions)
- Edit/Delete for own comments
- Real-time updates (polling or Socket.io placeholder)

Styling:
- Alternating background for visual separation
- Highlight mentions
- Show "edited" indicator
- Relative timestamps ("2 hours ago")
```

**Checklist:**
- [ ] Add comment works
- [ ] Comments list displays
- [ ] Edit/Delete own comments
- [ ] @mentions parsed
- [ ] Internal comments marked (direzione)
- [ ] Real-time updates (basic polling)
- [ ] UI is clean and readable

---

## 🔐 Phase 4: ISO 13485 Features

### Step 4.1: Risk Management

**Prompt per Claude Code:**
```
Implement Risk Management module:

Backend:
- CRUD routes: /api/projects/:id/risks
- Risk level calculation: probability × impact (Low=1, Med=2, High=3)
  - 1-2: Low (green)
  - 3-4: Medium (yellow)
  - 6-9: High (red)
- Filter by status, risk_level
- Audit logging

Frontend:
- RiskMatrix component (3x3 grid)
  - X-axis: Probability
  - Y-axis: Impact
  - Risks plotted as colored dots
  - Click to view details
- RiskList table view
- RiskFormModal (create/edit)
- Risk status badges

Dashboard widget:
- Active risks count
- High-risk alert (red badge)
```

**Checklist:**
- [ ] CRUD operations work
- [ ] Risk level calculated correctly
- [ ] Risk Matrix visualization works
- [ ] Risks clickable on matrix
- [ ] Form validation works
- [ ] Dashboard widget shows active risks

---

### Step 4.2: Document Control

**Prompt per Claude Code:**
```
Implement Document Control:

Backend:
- POST /api/projects/:id/documents/upload - Upload file
- GET /api/projects/:id/documents - List documents
- GET /api/documents/:id/download - Download file
- PUT /api/documents/:id - Update metadata
- POST /api/documents/:id/approve - Approve document
- Document numbering: DOC-YYYY-NNN
- File storage: server/uploads/ folder
- Supported formats: PDF, DOCX, XLSX
- Max size: 10MB

Frontend:
- DocumentList table (title, version, type, status, approved_by)
- UploadModal (drag & drop or file picker)
- DocumentViewer (preview PDF inline)
- Approval workflow UI (for direzione/admin)
- Version history view

Use multer for file uploads.
Store file path in database.
```

**Checklist:**
- [ ] File upload works
- [ ] Files stored correctly
- [ ] Download works
- [ ] Document metadata saved
- [ ] Approval workflow works
- [ ] List displays documents
- [ ] Version increments correctly

---

### Step 4.3: Project Templates

**Prompt per Claude Code:**
```
Implement Project Templates (Admin only):

Backend:
- CRUD routes: /api/templates
- Template structure (JSONB config):
  {
    phases: [
      {
        name: "Planning",
        deliverables: ["Project Charter", "Resource Plan"],
        tasks: [
          { title: "Define scope", estimated_hours: 8 },
          { title: "Identify stakeholders", estimated_hours: 4 }
        ]
      },
      ...
    ],
    custom_fields: [
      { name: "Regulatory Class", type: "select", options: ["I", "IIa", "IIb", "III"] }
    ]
  }

- POST /api/projects/from-template/:templateId - Create project from template
  - Clone all phases, tasks, deliverables
  - Set default values

Frontend:
- TemplateEditor (Admin dashboard)
- JSON editor with validation
- Preview template structure
- List of templates with activate/deactivate
- Template selector in ProjectFormModal

Pre-seed templates:
1. "Software Development"
2. "Medical Device Validation"
3. "Clinical Evaluation"
```

**Checklist:**
- [ ] Template CRUD works
- [ ] Template editor functional
- [ ] Create from template works
- [ ] Tasks auto-created from template
- [ ] Custom fields applied
- [ ] Sample templates seeded

---

### Step 4.4: Audit Trail Viewer

**Prompt per Claude Code:**
```
Implement Audit Trail Viewer (Admin/Direzione):

Backend:
- GET /api/audit-logs - List with filters
- Filters: entity_type, user_id, date_range, action
- Pagination (100 per page)
- Export to CSV

Frontend:
- AuditLogPage (Admin dashboard)
- Filters panel
- Table: Timestamp, User, Entity, Action, Changes
- Expandable rows to show old_data vs new_data diff
- Visual diff (highlight changes in JSON)
- Export button

Use react-json-view for JSON diff visualization.
```

**Checklist:**
- [ ] Audit logs query works
- [ ] Filters work correctly
- [ ] Pagination works
- [ ] Diff visualization clear
- [ ] Export CSV works
- [ ] Performance acceptable (<1s)

---

### Step 4.5: User Inputs (Segnalazioni/Suggerimenti)

**Prompt per Claude Code:**
```
Implement User Inputs system for collecting feedback from all users:

Backend:
Routes (server/src/routes/userInputRoutes.ts):
- GET /api/inputs - List all inputs (with filters, pagination)
- GET /api/inputs/my - List current user's inputs
- GET /api/inputs/:id - Get single input
- POST /api/inputs - Create new input
- PUT /api/inputs/:id - Update input (owner only, if status=pending)
- DELETE /api/inputs/:id - Soft delete (owner only, if status=pending OR admin)
- POST /api/inputs/:id/process - Start processing (dipendente/admin)
- POST /api/inputs/:id/convert-to-task - Convert to task
- POST /api/inputs/:id/convert-to-project - Convert to project
- POST /api/inputs/:id/acknowledge - Mark as acknowledged (presa visione)
- POST /api/inputs/:id/reject - Reject with reason

Service (business logic):
- Input code generation (INPUT-YYYY-NNN)
- Permission checks:
  - All users can CREATE
  - Users can UPDATE/DELETE only their own inputs (if status=pending)
  - Admin can do everything
  - Dipendente/Admin can PROCESS inputs
- Audit logging for all operations
- Notification on input processed

Convert to Task logic:
- Create new task with input data
- Link task to input (converted_task_id)
- Task can be standalone (no project) or linked to project
- Copy title, description from input
- Set resolution_type = 'converted_to_task'

Convert to Project logic:
- Create new project with input data
- Link project to input (converted_project_id)
- Optional: use template
- Set resolution_type = 'converted_to_project'

Frontend:
1. UserInputListPage.tsx
   - Table view with columns: Code, Title, Category, Priority, Status, Creator, Date
   - Filters: status, category, priority, creator
   - "New Input" button (visible to all)
   - Actions based on permissions

2. UserInputDetailPage.tsx
   - Input info card
   - Status badge
   - Processing actions (if dipendente/admin):
     - "Convert to Task" button
     - "Convert to Project" button
     - "Acknowledge" button
     - "Reject" button
   - Resolution info (if resolved)
   - Link to created task/project (if converted)

3. UserInputFormModal.tsx
   - Form for create/edit
   - Fields: title, description, category, priority
   - File attachment (optional)
   - Validation

4. ConvertToTaskModal.tsx
   - Select existing project (optional)
   - Create as standalone task checkbox
   - Assign to user
   - Set priority, due date

5. ConvertToProjectModal.tsx
   - Project name, description
   - Select template (optional)
   - Set owner

Dashboard Widget:
- "Pending Inputs" count badge for admin/direzione
- Link to inputs list
```

**Checklist:**
- [ ] All users can create inputs
- [ ] Users can only edit/delete their own pending inputs
- [ ] Admin has full control
- [ ] Input list with filters works
- [ ] Convert to task works (with and without project)
- [ ] Convert to project works
- [ ] Acknowledge/Reject works
- [ ] Notifications sent on status change
- [ ] Audit trail complete
- [ ] Dashboard widget shows pending count

---

### Step 4.6: Standalone Tasks & Task Hierarchy

**Prompt per Claude Code:**
```
Update Task Management to support standalone tasks and task hierarchy:

Backend Changes:
1. Update task validation to allow null project_id
2. Add parent_task_id support
3. Update task queries to include/exclude standalone tasks
4. Add endpoint GET /api/tasks/standalone - List tasks without project
5. Add endpoint GET /api/tasks/:id/subtasks - Get subtasks

Task Code Generation:
- With project: TASK-{PROJECT_CODE}-{NNN}
- Standalone: TASK-STANDALONE-{YYYY}-{NNN}

Service logic:
- Validate parent_task_id exists and is not circular
- When parent task is deleted, subtasks become orphans (or cascade delete)
- Calculate total estimated/actual hours including subtasks

Frontend Changes:
1. Update TaskForm to:
   - Allow creating task without project
   - Allow selecting parent task
   - Show "Standalone" checkbox

2. Update TaskList to:
   - Add filter for standalone tasks
   - Show hierarchy indicator (indent subtasks)
   - Tree view option

3. Update TaskCard to:
   - Show parent task info
   - Show subtask count
   - Expand/collapse subtasks

4. Add "My Tasks" page:
   - Show all tasks assigned to current user
   - Include standalone tasks
   - Group by project + standalone section

Kanban Board:
- Option to include/exclude standalone tasks
- Visual indicator for standalone tasks
```

**Checklist:**
- [ ] Create task without project works
- [ ] Create subtask works
- [ ] Standalone task code generated correctly
- [ ] Task hierarchy displayed
- [ ] Filters for standalone tasks work
- [ ] Parent-child relationship maintained
- [ ] Hours roll up to parent

---

## 📊 Phase 5: Reporting & Analytics

### Step 5.1: Daily Report PDF

**Prompt per Claude Code:**
```
Implement Daily Report generation:

Backend:
- GET /api/reports/daily/:userId/:date - Generate PDF
- Use PDFKit to create PDF
- Report sections:
  1. Header: User name, date, company logo
  2. Summary: Total hours, tasks completed, tasks in progress, blocked
  3. Completed tasks table (title, project, hours)
  4. In Progress tasks table
  5. Blocked tasks with reasons
  6. Comments/Notes section

Frontend:
- "Export Report" button on dipendente dashboard
- Date picker for report date (default: today)
- Download PDF on click
- Preview modal before download (optional)

PDF styling:
- Professional layout
- Company branding
- Page numbers
- Generated timestamp
```

**Checklist:**
- [ ] PDF generation works
- [ ] All sections included
- [ ] Data accurate
- [ ] Styling professional
- [ ] Download works from frontend
- [ ] Report saved locally (optional)

---

### Step 5.2: Analytics Dashboard (Direzione)

**Prompt per Claude Code:**
```
Create Analytics Dashboard for Direzione:

Widgets:
1. Task Completion Rate (donut chart)
   - Completed vs Total tasks
   - Current month

2. Burndown Chart (line chart)
   - Ideal line vs Actual
   - Current sprint/project

3. Team Velocity (bar chart)
   - Tasks completed per week
   - Last 8 weeks

4. Hours Distribution (pie chart)
   - Hours per project
   - Current month

5. Active Blockers (alert card)
   - Count of blocked tasks
   - List with projects

6. Risk Exposure (gauge chart)
   - High/Medium/Low risk count
   - Color coded

Backend:
- GET /api/analytics/dashboard - All metrics in one call
- Query optimization with aggregations
- Cache results (5 min)

Frontend:
- Use Recharts for visualizations
- Responsive grid layout (2-3 columns)
- Date range selector (week, month, quarter)
- Export all charts as PNG (nice-to-have)
```

**Checklist:**
- [ ] All 6 widgets render
- [ ] Data accurate
- [ ] Charts interactive (tooltips, hover)
- [ ] Date range filter works
- [ ] Responsive layout
- [ ] Performance <2s load

---

## 🔔 Phase 6: Real-time Notifications

### Step 6.1: Socket.io Setup

**Prompt per Claude Code:**
```
Setup Socket.io for real-time notifications:

Backend (server/src/socket.ts):
- Initialize Socket.io server
- Namespace: /notifications
- Rooms per user: user_${userId}
- Events:
  - 'notification' - Send notification to user
  - 'mark_read' - Mark notification as read
- Authentication: validate JWT on connection

Notification Service (server/src/services/notificationService.ts):
- createNotification(userId, type, title, message, relatedEntity)
- Save to database
- Emit via Socket.io
- Types: comment, block, assignment, approval_request, risk_alert

Frontend (client/src/hooks/useNotifications.ts):
- Connect to Socket.io on mount
- Listen for 'notification' event
- Update Zustand notifications store
- Show toast on new notification
- Badge counter in header

Integrate with:
- Comments (new comment → notify mentioned users)
- Tasks (status change to blocked → notify direzione)
- Documents (approval request → notify approver)
```

**Checklist:**
- [ ] Socket.io server running
- [ ] Client connects successfully
- [ ] Notifications received in real-time
- [ ] Toast displays correctly
- [ ] Badge counter updates
- [ ] Mark as read works
- [ ] Reconnection works after disconnect

---

### Step 6.2: Notifications Center UI

**Prompt per Claude Code:**
```
Create Notifications Center:

Components:
1. NotificationBell (Header)
   - Bell icon with badge counter
   - Click to open dropdown
   - Unread count

2. NotificationDropdown
   - List last 10 notifications
   - Mark as read on view
   - Mark all as read button
   - "See all" link to full page

3. NotificationsPage
   - Full list with pagination
   - Filters: unread, type
   - Mark as read/unread toggle
   - Clear all button

Notification Item:
- Icon based on type
- Title + message
- Timestamp (relative)
- Related entity link (click to navigate)
- Unread indicator (blue dot)

Styling:
- Smooth animations (Framer Motion)
- Clean, readable layout
- Group by date (Today, Yesterday, Older)
```

**Checklist:**
- [ ] Bell icon with badge
- [ ] Dropdown shows notifications
- [ ] Click navigates to related entity
- [ ] Mark as read works
- [ ] Full page lists all notifications
- [ ] Filters work
- [ ] Real-time updates in dropdown

---

## 🎨 Phase 7: UI Polish & Animations

### Step 7.1: Dark Mode Implementation

**Prompt per Claude Code:**
```
Implement complete dark mode:

1. Create useDarkMode hook (client/src/hooks/useDarkMode.ts)
   - Toggle function
   - Persist in localStorage
   - Apply 'dark' class to <html>

2. Update Tailwind config with dark mode colors:
   - Background: slate-900
   - Text: slate-100
   - Cards: slate-800
   - Borders: slate-700
   - Hover states

3. Update all components to support dark mode classes:
   - Use dark: prefix in Tailwind classes
   - Ensure proper contrast

4. Dark mode toggle in header:
   - Sun/Moon icon
   - Smooth transition
   - Tooltip

Test all pages in both modes.
```

**Checklist:**
- [ ] Dark mode toggle works
- [ ] Preference persists
- [ ] All pages look good in dark mode
- [ ] Proper contrast ratios
- [ ] Smooth transitions

---

### Step 7.2: Framer Motion Animations

**Prompt per Claude Code:**
```
Add subtle animations with Framer Motion:

1. Page Transitions
   - Fade in on mount
   - Slide up effect

2. List Items (tasks, projects)
   - Stagger animation on load
   - Hover lift effect

3. Modals
   - Scale + fade in
   - Backdrop fade

4. Notifications
   - Slide in from top-right
   - Auto-dismiss after 5s

5. Status Changes
   - Badge morph animation
   - Color transition

6. Loading States
   - Skeleton screens
   - Shimmer effect

Keep animations subtle: 200-300ms duration, ease-out easing.
```

**Checklist:**
- [ ] Page transitions smooth
- [ ] List stagger works
- [ ] Modal animations pleasant
- [ ] Notifications slide in
- [ ] Status changes animated
- [ ] No performance issues

---

## 🧪 Phase 8: Testing & Quality

### Step 8.1: Backend Testing

**Prompt per Claude Code:**
```
Setup Jest for backend testing:

Test files structure:
- server/src/__tests__/
  - unit/ (services, utils)
  - integration/ (API endpoints)

Write tests for:
1. Auth service (login, register, JWT)
2. Projects service (CRUD, validation)
3. Tasks service (CRUD, status transitions)
4. Time tracking service
5. Audit logging

Integration tests:
- Use Supertest for API testing
- Test database (separate test DB)
- Mock external dependencies

Coverage target: 70%+

Include setup/teardown for database.
```

**Checklist:**
- [ ] Jest configured
- [ ] Test DB setup
- [ ] Unit tests written (20+ tests)
- [ ] Integration tests written (10+ tests)
- [ ] All tests pass
- [ ] Coverage >70%

---

### Step 8.2: Frontend Testing

**Prompt per Claude Code:**
```
Setup Vitest + React Testing Library:

Test components:
1. Button, Input, Modal (common components)
2. LoginForm
3. TaskCard
4. ProjectList
5. NotificationDropdown

Test user interactions:
- Click handlers
- Form submissions
- Validation errors
- Loading states

Mock API calls with MSW (Mock Service Worker).

Coverage target: 60%+
```

**Checklist:**
- [ ] Vitest configured
- [ ] MSW setup for API mocking
- [ ] Component tests written (15+ tests)
- [ ] User interaction tests
- [ ] All tests pass
- [ ] Coverage >60%

---

### Step 8.3: E2E Testing (Optional)

**Prompt per Claude Code:**
```
Setup Playwright for E2E tests:

Critical user flows:
1. Login → Dashboard
2. Create Project → Add Task → Start Timer
3. Comment on Task → Receive Notification
4. Block Task → Direzione sees alert
5. Generate Daily Report

Run on CI (GitHub Actions).
```

**Checklist:**
- [ ] Playwright configured
- [ ] 5 E2E tests written
- [ ] Tests pass locally
- [ ] CI/CD setup (optional)

---

## 📚 Phase 9: Documentation

### Step 9.1: API Documentation

**Prompt per Claude Code:**
```
Generate API documentation with Swagger/OpenAPI:

1. Install swagger-jsdoc and swagger-ui-express
2. Annotate routes with JSDoc comments
3. Generate OpenAPI spec
4. Serve at /api-docs

Include:
- All endpoints
- Request/response schemas
- Authentication requirements
- Examples
```

**Checklist:**
- [ ] Swagger UI accessible at /api-docs
- [ ] All endpoints documented
- [ ] Try-it-out works

---

### Step 9.2: User Guide

**Prompt per Claude Code:**
```
Create USER_GUIDE.md:

Sections:
1. Getting Started
2. Dashboard Overview (per role)
3. Managing Projects
4. Working with Tasks
5. Time Tracking
6. Risk Management
7. Document Control
8. Notifications
9. Reports

Include screenshots (placeholders OK).
```

**Checklist:**
- [ ] User guide complete
- [ ] Clear instructions
- [ ] Screenshots included

---

## 🚀 Phase 10: Deployment (Localhost)

### Step 10.1: Production Build

**Prompt per Claude Code:**
```
Setup production build:

1. Frontend:
   - npm run build in client/
   - Optimize bundle size
   - Enable gzip compression

2. Backend:
   - TypeScript compilation
   - Environment variables
   - PM2 for process management (optional)

3. Database:
   - Production migrations
   - Backup script

4. Scripts:
   - start:prod (both client + server)
   - backup:db
```

**Checklist:**
- [ ] Frontend builds successfully
- [ ] Backend compiles
- [ ] Production env configured
- [ ] Scripts work

---

### Step 10.2: Final Checks

**Checklist:**
- [ ] All features working end-to-end
- [ ] No console errors
- [ ] Performance acceptable (<2s page load)
- [ ] Security audit (npm audit)
- [ ] Database backup tested
- [ ] Documentation complete
- [ ] User acceptance testing
- [ ] Ready for production use!

---

## 🎯 Tips for Working with Claude Code

### Best Practices

1. **Be Specific**: Include file paths, exact dependencies, and expected behavior
2. **Incremental**: Build feature by feature, test before moving on
3. **Reference PRD**: Always mention "as specified in PRD.md"
4. **Code Review**: Ask Claude Code to review its own code for improvements
5. **Error Handling**: Always request proper error handling and validation

### Example Prompt Template

```
Task: [What you want to build]

Context: As specified in PRD.md and IMPLEMENTATION_GUIDE.md

Requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Technical Details:
- File path: [exact path]
- Dependencies: [list npm packages]
- Integration: [with what other modules]

Include:
- TypeScript types
- Error handling
- Validation
- Comments for complex logic

Test: [How to verify it works]
```

---

## 📞 Support

If you encounter issues:
1. Check console for errors
2. Verify database connection
3. Check .env variables
4. Review SETUP_LOCALHOST.md
5. Ask Claude Code to debug specific errors

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Author**: Nicola (with Claude)
