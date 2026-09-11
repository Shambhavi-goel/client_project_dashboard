# Real-Time Client Project Dashboard

A high-performance, full-stack project management dashboard featuring role-based access control (RBAC), live activity feeds, real-time presence tracking, background overdue task scanning, and instant WebSocket notifications.

Built as a clean, production-grade monorepo containing a TypeScript Express backend and a Vite + React + TailwindCSS frontend.

---

## 🌐 Live Deployment

- **Frontend**: [https://client-project-dashboard-frontend-six.vercel.app](https://client-project-dashboard-frontend-six.vercel.app)
- **Backend API**: Hosted on Railway with containerized PostgreSQL and persistent WebSocket connections.

---

## ✨ Key Features

- **Multi-Tenant Role-Based Access Control (RBAC)**:
  - **Admin**: Global workspace dashboard, full visibility across all clients/projects/tasks, live user presence counter, and user administration.
  - **Project Manager**: Complete CRUD over owned projects, task assignments to developers, upcoming deadline tracking, dedicated **Projects Summary** portfolio grid (completion percentage progress bar, status counts, overdue alerts), and instant notifications when tasks move to *In Review*.
  - **Developer**: Focused personal workspace displaying only assigned tasks, one-click status transitions, and instant assignment notifications.
- **Real-Time WebSocket Architecture & Live Synchronization**:
  - Authenticated Socket.io connections with role-scoped room isolation (`global:admin`, `project:<id>`, `project:<id>:managers`, `user:<id>`).
  - Instant live reflection of all task status transitions, task creations, and project updates across all connected clients without manual browser refreshes.
  - Live presence tracking displaying the exact count of active users online.
  - **Offline Catch-Up**: On reconnecting, automatically fetches the last 20 activity records directly from PostgreSQL (`TaskActivityLog`) without relying on in-memory caches.
- **Robust Authentication & Multi-Tab Isolation**:
  - Short-lived JWT access tokens stored securely in memory (Zustand) to eliminate XSS exposure.
  - Long-lived refresh tokens stored in HttpOnly, Secure cookies with token rotation and breach replay detection.
  - **Tab-Isolated Session Storage**: Enables evaluators to open Admin, PM, and Developer dashboards concurrently in separate browser tabs side-by-side without session collision or role flipping on page reload.
  - Public user sign-up with role selection (`Developer`, `Project Manager`, `Admin`) and interactive password veil/unveil toggling.
  - Pre-seeded one-click role switcher on the login page for instant demo evaluation.
- **Immediate Overdue Task Detection**:
  - Dynamic on-the-fly overdue evaluation in API endpoints and task cards (`dueDate < now && status != DONE`) ensuring overdue items appear immediately on page load.
  - Automated background scanner running on server startup and every minute via `node-cron` with batch status updates, activity log creation, and instant push alerts.
- **Query-Level Data Scoping**:
  - Ownership enforced at the database query level via Prisma `where` criteria — zero in-memory filtering.
  - Resources accessed by unauthorized users return `404 Not Found` (rather than `403 Forbidden`) to prevent resource enumeration attacks.

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18+ (v20 or v22 recommended)
- **PostgreSQL**: v14+ (or Docker)
- **npm** or **pnpm**

---

### 1. Database Setup (Docker or Local)

#### Option A: Using Docker (Recommended)
```bash
docker compose up -d
```
Starts PostgreSQL 16 on port `5432` with database `client_project_dashboard`.

#### Option B: Using Local PostgreSQL
Ensure PostgreSQL is running on port `5432`. Create a database:
```sql
CREATE DATABASE client_project_dashboard;
```

---

### 2. Environment Configuration

Copy `.env.example` to `.env` in the project root and in `backend/`:
```bash
cp .env.example .env
cp .env.example backend/.env
```

Ensure `DATABASE_URL` matches your PostgreSQL credentials:
```env
# Database
DATABASE_URL="postgresql://cpd_user:cpd_password@localhost:5432/client_project_dashboard"

# JWT Secrets (at least 32 characters)
JWT_ACCESS_SECRET="dev-access-secret-super-long-key-for-jwt-signing-2024"
JWT_REFRESH_SECRET="dev-refresh-secret-super-long-key-for-jwt-signing-2024"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

---

### 3. Install Dependencies & Seed Database

```bash
# Install root, backend, and frontend dependencies
npm install

# Run database migrations
npm run db:migrate --workspace=backend

# Seed database with sample data
npm run db:seed --workspace=backend
```

---

### 4. Running Locally

Start both backend and frontend development servers:

```bash
# Terminal 1 — Backend (Express + Socket.io + cron on port 3001)
npm run dev:backend

# Terminal 2 — Frontend (Vite + React on port 5173)
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Authentication & Demo Accounts

### 1. Create a Custom Account
You can register a brand new account directly from the **Create an Account** tab on the login screen, selecting your desired role (**Developer**, **Project Manager**, or **Admin**).

### 2. Pre-Seeded Demo Accounts
For rapid evaluation, 7 pre-configured accounts are seeded across all roles. All pre-seeded accounts share the password: **`Password123!`**

| Role | Name | Email | Permissions & Scope |
|---|---|---|---|
| **ADMIN** | Anika Sharma | `admin@cpd.dev` | Global visibility: all clients, projects, tasks, live user presence count, and user administration |
| **PM** | Ravi Mehta | `ravi.pm@cpd.dev` | Owns 2 projects (Zenith Cloud, NovaPulse Mobile); full CRUD over own projects & tasks |
| **PM** | Priya Nair | `priya.pm@cpd.dev` | Owns 1 project (Crescendo E-Commerce); full CRUD over own project & tasks |
| **DEVELOPER** | Kiran Patel | `kiran@cpd.dev` | Assigned to tasks in Zenith Cloud Migration; view & update only assigned tasks |
| **DEVELOPER** | Sara Malik | `sara@cpd.dev` | Assigned to tasks in Zenith Cloud & NovaPulse; view & update only assigned tasks |
| **DEVELOPER** | Arjun Das | `arjun@cpd.dev` | Assigned to tasks in NovaPulse & Crescendo; view & update only assigned tasks |
| **DEVELOPER** | Meera Iyer | `meera@cpd.dev` | Assigned to tasks in Crescendo E-Commerce; view & update only assigned tasks |

> 💡 **Tip**: Click any role card in the **One-Click Role Switcher** on the login page to immediately authenticate without typing credentials.

---

## 🏛️ Architectural & Security Decisions

### 1. Socket.io over Native WebSockets
- **Hierarchical Room Routing**: Socket.io provides native room primitives (`socket.join()` / `io.to()`) that map directly to our multi-tenant authorization model:
  - `global:admin` for Admins
  - `project:<projectId>:managers` for owning PMs
  - `user:<userId>` for private developer notifications
- **Selective Network Broadcasting**: Status changes (`activity:new`) are emitted strictly to authorized rooms. Unassigned developers never receive packets over the wire.
- **Connection Resilience**: Built-in heartbeat detection, automatic reconnection with exponential backoff, and transparent fallback to HTTP long-polling if WebSockets are restricted by proxies.

### 2. Express with Query-Level Scoping & Privacy 404s
- **Explicit Middleware Pipeline**:
  `authenticate` ➔ `authorize(roles)` ➔ `validate(zod)` ➔ `controller` ➔ `errorHandler`
- **Database Query-Level Scoping**: We deliberately avoid "fetch all then filter in JavaScript" anti-patterns. Every list endpoint applies Prisma `where` filters:
  - PM list: `where: { createdById: user.id }`
  - Developer task list: `where: { assignedDeveloperId: user.id }`
- **404 over 403 for Ownership Mismatches**: When a user attempts to access a resource they do not own (e.g. Developer requesting another developer's task, or PM requesting another PM's project), the server responds with **`404 NOT_FOUND`** rather than `403 FORBIDDEN`. This prevents resource enumeration attacks where attackers probe IDs to confirm existence.

### 3. In-Process node-cron & Dynamic On-the-Fly Overdue Evaluation
- **Zero Extra Infrastructure Overhead**: The system scans for overdue tasks within the Node.js event loop every minute (with an immediate run upon server startup), directly querying PostgreSQL for tasks where `dueDate < now AND status != DONE AND isOverdue = false`. It performs batch status updates, creates activity logs, and dispatches live WebSocket push notifications.
- **Dynamic On-the-Fly Evaluation**: In addition to the recurring background worker, past-due tasks are dynamically checked and flagged whenever task list endpoints are requested, and evaluated on the frontend in real time, ensuring overdue badges appear instantaneously on page load without waiting for the next cron cycle.

### 4. HttpOnly Refresh Token Rotation, In-Memory Access Tokens & Multi-Tab Session Isolation
- **In-Memory Access Tokens (Zustand)**: Storing the short-lived (~15 min) JWT access token in JavaScript memory prevents token theft via Cross-Site Scripting (XSS).
- **HttpOnly, Secure, SameSite Refresh Cookies**: The long-lived (~7 days) refresh token is stored in an HttpOnly cookie (`sameSite: 'none'` in production for cross-origin hosting, `secure: true`). JavaScript cannot inspect or exfiltrate the cookie.
- **Token Rotation & Replay Attack Invalidation**: Every `/api/auth/refresh` request revokes the presented refresh token and issues a fresh one. If an already-revoked refresh token is ever presented (indicating token theft or replay), the server **immediately revokes all active sessions** for that user.
- **Tab-Isolated Session Architecture**: To support comprehensive side-by-side evaluator testing across multiple browser tabs on a single device, session state and refresh tokens are stored in tab-isolated `sessionStorage` (with secondary `localStorage` persistence). This ensures that an evaluator can log into Admin in Tab 1, Project Manager in Tab 2, and Developer in Tab 3 without cross-tab session contamination or role flipping on page reload.

---

## 📊 Database Schema (Prisma Models & Indexes)

```mermaid
erDiagram
    USER ||--o{ PROJECT : creates
    USER ||--o{ TASK : assigned_to
    USER ||--o{ TASK_ACTIVITY_LOG : performs
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ REFRESH_TOKEN : owns
    CLIENT ||--o{ PROJECT : has
    PROJECT ||--o{ TASK : contains
    PROJECT ||--o{ TASK_ACTIVITY_LOG : logs
    TASK ||--o{ TASK_ACTIVITY_LOG : generates
    TASK ||--o{ NOTIFICATION : references

    USER {
        string id PK
        string name
        string email UK
        string passwordHash
        string role
        datetime createdAt
    }
    CLIENT {
        string id PK
        string name
        string contactEmail
        datetime createdAt
    }
    PROJECT {
        string id PK
        string name
        string clientId FK
        string createdById FK
        datetime createdAt
    }
    TASK {
        string id PK
        string projectId FK
        string title
        string description
        string assignedDeveloperId FK
        string status
        string priority
        datetime dueDate
        boolean isOverdue
        datetime createdAt
        datetime updatedAt
    }
    TASK_ACTIVITY_LOG {
        string id PK
        string taskId FK
        string projectId FK
        string userId FK
        string fromStatus
        string toStatus
        string message
        datetime createdAt
    }
    NOTIFICATION {
        string id PK
        string userId FK
        string type
        string message
        string relatedTaskId FK
        boolean isRead
        datetime createdAt
    }
    REFRESH_TOKEN {
        string id PK
        string userId FK
        string tokenHash
        datetime expiresAt
        boolean revoked
        datetime createdAt
    }
```

### Models & Relational Architecture

| Model | Primary Key | Foreign Keys / Relations | Key Indexes & Enums | Purpose |
|---|---|---|---|---|
| **`User`** | `id` (cuid) | `projects`, `tasks`, `logs`, `notifications`, `refreshTokens` | `email` (Unique), `Role` (`ADMIN`, `PM`, `DEVELOPER`) | Identity, credentials, and RBAC authorization |
| **`Client`** | `id` (cuid) | `projects` | `createdAt` | Client corporate entities associated with projects |
| **`Project`** | `id` (cuid) | `clientId` ➔ `Client`, `createdById` ➔ `User` (PM) | `clientId`, `createdById` | Top-level project entities with PM ownership |
| **`Task`** | `id` (cuid) | `projectId` ➔ `Project`, `assignedDeveloperId` ➔ `User` | `status`, `priority`, `dueDate`, `isOverdue`, `assignedDeveloperId` | Core work items with lifecycle state machine |
| **`TaskActivityLog`** | `id` (cuid) | `taskId` ➔ `Task`, `projectId` ➔ `Project`, `userId` ➔ `User` (nullable) | `@@index([projectId, createdAt(sort: Desc)])`, `taskId` | Immutable audit trail powering real-time activity feeds |
| **`Notification`** | `id` (cuid) | `userId` ➔ `User`, `relatedTaskId` ➔ `Task` (nullable) | `@@index([userId, isRead])`, `type` enum | Push alerts with unread counter badges |
| **`RefreshToken`** | `id` (cuid) | `userId` ➔ `User` | `tokenHash` (SHA-256), `userId` | Secure session rotation & breach replay defense |

### Key Schema Optimizations
1. **`TaskActivityLog` Composite Index `@@index([projectId, createdAt(sort: Desc)])`**: Optimizes project activity feed queries and initial catch-up ordering.
2. **`Notification` Composite Index `@@index([userId, isRead])`**: Powers real-time unread badge counter queries (`SELECT COUNT(*) WHERE userId = ? AND isRead = false`).
3. **`Task` Composite Query Indexes**: Separate indexes on `status`, `priority`, `dueDate`, `isOverdue`, `projectId`, and `assignedDeveloperId` enable instantaneous multi-field filtering via URL parameters (`?status=&priority=&dueFrom=&dueTo=`).
4. **`RefreshToken.tokenHash` Index**: Uses SHA-256 token hashing so raw credentials are never persisted in plaintext, with fast indexed lookups during token rotation.

---

## 🧪 Automated Test Suites

The project includes 4 automated test suites covering authentication, query scoping, WebSockets, and notifications:

```bash
# 1. Auth & Middleware (validation, JWT, cookies, rotation, replay defense, 403, 404)
npm run test:auth --workspace=backend

# 2. Role Scoping (Prisma where clauses, 404 on ownership mismatch, developer isolation)
npm run test:scoping --workspace=backend

# 3. Real-Time & Cron (Socket.io handshake auth, room routing, presence, overdue scanner)
npm run test:realtime --workspace=backend

# 4. Notifications (unread count, mark as read, cross-user 404, live push)
npm run test:notifications --workspace=backend
```

---

## 📁 Repository Structure

```
client_project_dashboard/
├── docker-compose.yml              # PostgreSQL 16 container definition
├── package.json                    # Monorepo workspaces (backend, frontend)
├── .env.example                    # Environment variable template
├── README.md                       # Comprehensive documentation & architecture guide
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma           # All 7 models, enums, indexes, relations
│   │   ├── migrations/             # Versioned SQL migrations
│   │   └── seed.ts                 # 7 users, 3 clients, 16 tasks, logs, notifications
│   ├── tests/
│   │   ├── auth.test.ts            # Auth & middleware test suite
│   │   ├── scoping.test.ts         # Role scoping & ownership 404 test suite
│   │   ├── realtime.test.ts        # Socket.io & cron test suite
│   │   └── notifications.test.ts   # Notification CRUD & push test suite
│   └── src/
│       ├── index.ts                # Express server + Socket.io entrypoint
│       ├── config.ts               # Environment configuration
│       ├── middleware/
│       │   ├── authenticate.ts     # JWT Bearer token verification
│       │   ├── authorize.ts        # Role-based access control
│       │   ├── validate.ts         # Zod schema validation
│       │   └── errorHandler.ts     # Centralized structured error handler
│       ├── modules/
│       │   ├── auth/               # Login, signup, refresh, logout, token rotation
│       │   ├── users/              # User listing & profile lookups
│       │   ├── clients/            # Client CRUD
│       │   ├── projects/           # Projects with query-level scoping
│       │   ├── tasks/              # Tasks CRUD, status updates, activity logs
│       │   ├── activity/           # DB-backed catch-up feed
│       │   └── notifications/      # Notification CRUD & unread badge
│       ├── sockets/
│       │   ├── socket.ts           # Socket.io setup with handshake JWT auth
│       │   ├── rooms.ts            # Role-scoped room management
│       │   ├── presence.ts         # In-memory user presence tracker
│       │   └── emitters.ts         # Scoped real-time event broadcasting
│       └── jobs/
│           └── overdueScanner.ts   # 5-min node-cron overdue scanner
└── frontend/
    ├── package.json
    ├── vite.config.ts              # Vite proxy configuration
    ├── tailwind.config.js          # Custom theme & animation keyframes
    ├── index.html                  # SEO tags & Google Fonts (Inter)
    └── src/
        ├── App.tsx                 # Routes, TanStack Query & session rehydration
        ├── main.tsx
        ├── types/                  # Unified TypeScript models
        ├── api/
        │   └── client.ts           # Axios client with 401 refresh retry queue
        ├── auth/
        │   ├── authStore.ts        # Zustand in-memory access token store
        │   └── ProtectedRoute.tsx  # Role-guard routing component
        ├── hooks/
        │   ├── useSocket.ts        # Authenticated Socket.io lifecycle hook
        │   └── useRealtimeSync.ts  # TanStack Query cache invalidation hook
        ├── components/
        │   └── Header.tsx          # Top navigation, presence, notifications
        └── features/
            ├── auth/
            │   └── LoginPage.tsx   # Sign in, sign up, eye password veil, role switcher
            ├── dashboard/
            │   ├── DashboardPage.tsx     # Dynamic role router
            │   ├── AdminDashboard.tsx     # Global metrics & presence
            │   ├── PMDashboard.tsx        # Projects & upcoming deadlines
            │   └── DeveloperDashboard.tsx # Prioritized task queue
            ├── projects/
            │   ├── ProjectsPage.tsx
            │   ├── ProjectDetailPage.tsx
            │   └── CreateProjectModal.tsx
            ├── tasks/
            │   ├── TasksPage.tsx
            │   ├── TaskCard.tsx
            │   ├── TaskStatusSelect.tsx
            │   ├── TaskFilters.tsx       # URL query parameter synchronization
            │   └── CreateTaskModal.tsx
            ├── activity/
            │   └── ActivityFeed.tsx      # DB catch-up + WebSocket live prepending
            └── notifications/
                └── NotificationDropdown.tsx # Real-time unread badge
```

---

## 💡 Key Engineering Challenges & System Design

The primary engineering challenge was ensuring watertight role-based isolation across both the REST API and the real-time WebSocket layer without duplicating authorization logic or leaking private data. In a multi-tenant dashboard, a naive implementation might broadcast task updates globally and rely on frontend filtering, or fetch all records from the database and filter in memory. To prevent cross-role data leaks and enumeration attacks, I enforced ownership scoping at the database query level (`where` clauses scoped by `createdById` for PMs and `assignedDeveloperId` for Developers) and strictly returned `404 Not Found` (rather than `403 Forbidden`) when single resources were accessed by unauthorized users.

For the live activity feed, I mapped application roles directly to a hierarchical Socket.io room topology: `global:admin`, `project:<id>:managers`, and `user:<userId>`. When a task status transitions, the server persists an immutable `TaskActivityLog` row and emits `activity:new` selectively to the admin room, the project managers' room, and the assigned developer's private room. Unassigned developers never receive packets over the wire. On reconnect, the client catches up by fetching the last 20 events directly from PostgreSQL before listening to live events.

If I were to approach this differently in a high-throughput production environment, I would decouple the real-time broadcasting and cron scheduler from the API process using Redis Pub/Sub and BullMQ with PostgreSQL advisory locks to enable seamless horizontal auto-scaling.

---

## ⚠️ Production Scaling Considerations

1. **Horizontal Socket.io Scaling**: The current user presence counter and WebSocket room broadcasts operate in-memory on the Node.js process. In a distributed multi-instance deployment, an adapter like `@socket.io/redis-adapter` would be introduced to synchronize presence state and event broadcasts across container instances.
2. **Distributed Job Scheduling**: `node-cron` runs in-process. In a multi-replica deployment, distributed locking (via PostgreSQL advisory locks `pg_try_advisory_lock` or Redis Redlock) prevents duplicate concurrent execution of the scheduled overdue scanner.
3. **Container vs. Serverless WebSockets**: Persistent WebSockets require long-lived connections, making container platforms (Railway, Render, Fly.io, AWS ECS) ideal for the backend, while the static React SPA is served at the edge via Vercel.

---

## 📜 License
MIT License.
