# TaskFlow — Team Task Manager

A full-stack team task management application with role-based access control, built with Node.js, Express, PostgreSQL, and React.

**Live Demo:** `https://taskflow-api-production.up.railway.app`

---

## Features

- **Authentication** — JWT-based signup/login with refresh token rotation
- **Projects** — Create, manage, and archive projects with custom colors
- **Role-Based Access** — Admin (full control) and Member (limited) roles per project
- **Task Management** — Create tasks with priority, status, assignee, due date, and tags
- **Kanban Board** — Drag-free board view across Todo / In Progress / Review / Done
- **Dashboard** — Stats, overdue alerts, recent tasks, and completion tracking
- **Team Management** — Invite members by email, change roles, remove members
- **Comments** — Thread discussions on any task
- **Notifications** — In-app alerts for task assignments and project invites
- **Activity Log** — Full audit trail per project

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js 18+, Express 4 |
| Database | PostgreSQL 15 |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |
| Frontend | React 18, React Query v5, Axios |
| Deployment | Railway |

---

## Project Structure

```
taskflow/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js      # pg Pool setup
│   │   │   ├── migrate.js       # Schema migrations
│   │   │   └── seed.js          # Demo data
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── projectController.js
│   │   │   └── taskController.js
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT + role checking
│   │   │   └── errorHandler.js  # Validation + error
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── projects.js
│   │   │   ├── tasks.js
│   │   │   └── users.js
│   │   └── index.js             # Express app entry
│   ├── .env.example
│   ├── package.json
│   └── railway.toml
└── frontend/
    ├── src/
    │   ├── utils/api.js          # Axios client + interceptors
    │   ├── context/AuthContext.js
    │   └── ...components
    ├── .env.example
    └── package.json
```

---

## REST API Reference

### Auth
```
POST   /api/auth/signup          Register new user
POST   /api/auth/login           Login, returns tokens
POST   /api/auth/refresh         Refresh access token
POST   /api/auth/logout          Revoke refresh token
GET    /api/auth/me              Get current user
PATCH  /api/auth/profile         Update name/avatar
```

### Projects
```
GET    /api/projects             List my projects
POST   /api/projects             Create project
GET    /api/projects/:id         Get project + members
PATCH  /api/projects/:id         Update project (admin)
DELETE /api/projects/:id         Delete project (admin)
POST   /api/projects/:id/members Invite member (admin)
DELETE /api/projects/:id/members/:uid Remove member (admin)
PATCH  /api/projects/:id/members/:uid/role Change role (admin)
GET    /api/projects/:id/activity Activity log
```

### Tasks
```
GET    /api/projects/:id/tasks   Tasks by project (filterable)
POST   /api/projects/:id/tasks   Create task
GET    /api/tasks/my             My assigned tasks
GET    /api/tasks/dashboard      Dashboard stats
GET    /api/tasks/:id            Task detail + comments
PATCH  /api/tasks/:id            Update task
PATCH  /api/tasks/:id/status     Update status only
DELETE /api/tasks/:id            Delete task
POST   /api/tasks/:id/comments   Add comment
GET    /api/tasks/notifications  My notifications
POST   /api/tasks/notifications/read Mark all read
```

### Users
```
GET    /api/users/search?q=      Search users (for invite)
```

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 15+

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

# Run migrations
npm run migrate

# (Optional) Seed demo data
npm run seed

# Start dev server
npm run dev
```

The API will be available at `http://localhost:3001`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env: set REACT_APP_API_URL=http://localhost:3001/api

# Start dev server
npm start
```

The app will be available at `http://localhost:3000`

---

## Railway Deployment (Step-by-Step)

### 1. Create Railway Account
Go to [railway.app](https://railway.app) and sign up with GitHub.

### 2. Create a New Project
Click **New Project** → **Deploy from GitHub** → Select your repo.

### 3. Add PostgreSQL
In your project dashboard: **Add Service** → **Database** → **PostgreSQL**.
Railway will auto-set `DATABASE_URL` in your environment.

### 4. Configure Backend Service
In your backend service settings:
- **Root Directory**: `backend`
- **Start Command**: `npm run migrate && npm start`

Set these environment variables:
```
JWT_SECRET=<generate a 64-char random string>
JWT_REFRESH_SECRET=<generate another 64-char random string>
JWT_EXPIRES_IN=15m
NODE_ENV=production
FRONTEND_URL=<your frontend railway URL>
```

Generate secure secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. Deploy Frontend (optional — can use Vercel/Netlify)
Add a second service, set:
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Start Command**: `npx serve -s build -l 3000`

Set:
```
REACT_APP_API_URL=https://your-backend.railway.app/api
```

### 6. Seed Demo Data (optional)
After deployment, run via Railway CLI:
```bash
railway run npm run seed
```

Demo credentials:
- **Admin**: `admin@taskflow.dev` / `Admin@123`
- **Member**: `sam@taskflow.dev` / `Member@123`

### 7. Verify Deployment
```
GET https://your-app.railway.app/health
```
Should return `{"status":"healthy","db":"connected"}`

---

## Role-Based Access Control

| Action | Admin | Member |
|--------|-------|--------|
| View project/tasks | ✅ | ✅ |
| Create tasks | ✅ | ✅ |
| Update any task | ✅ | ✅ |
| Delete any task | ✅ | ❌ |
| Update project settings | ✅ | ❌ |
| Delete project | ✅ (owner) | ❌ |
| Invite members | ✅ | ❌ |
| Remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |

---

## Security Features

- Password hashing with bcrypt (12 rounds)
- Short-lived JWT access tokens (15 min) + refresh token rotation
- Rate limiting on auth routes (20 req/15 min)
- Helmet.js security headers
- Input validation on all routes
- SQL injection prevention via parameterized queries
- CORS configured for specific frontend origin

---

## Environment Variables

### Backend
| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | Secret for access tokens | ✅ |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | ✅ |
| `JWT_EXPIRES_IN` | Access token TTL (e.g. `15m`) | Optional |
| `PORT` | Server port (default 3001) | Optional |
| `NODE_ENV` | `development` or `production` | Optional |
| `FRONTEND_URL` | Allowed CORS origin | Optional |

### Frontend
| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_API_URL` | Backend API base URL | ✅ |

---

## License
MIT
