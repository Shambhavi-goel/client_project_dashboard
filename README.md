# Real-Time Client Project Dashboard

A full-stack, role-scoped project management dashboard featuring real-time activity feeds, live presence tracking, background overdue task scanning, and instant WebSocket notifications.

Built as a clean, modular monorepo with `/backend` and `/frontend`.

---

## 🚀 Quick Start

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
This starts PostgreSQL 16 on port `5432` with username `cpd_user`, password `cpd_password`, and database `client_project_dashboard`.

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

Start both backend and frontend servers:

```bash
# Terminal 1 — Backend (Express + Socket.io + cron on port 3001)
npm run dev:backend

# Terminal 2 — Frontend (Vite + React on port 5173)
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Pre-Seeded Accounts (One-Click Switcher Available on Login)

All pre-seeded accounts share the password: **`Password123!`**

| Role | Name | Email | Scope / Permissions |
|---|---|---|---|
| **ADMIN** | Anika Sharma | `admin@cpd.dev` | Global access: all projects, all tasks, live online presence count, user registration |
| **PM** | Ravi Mehta | `ravi.pm@cpd.dev` | Owns 2 projects (Zenith Cloud, NovaPulse Mobile), full CRUD over own projects & tasks |
| **PM** | Priya Nair | `priya.pm@cpd.dev` | Owns 1 project (Crescendo E-Commerce), full CRUD over own project & tasks |
| **DEVELOPER** | Kiran Patel | `kiran@cpd.dev` | Assigned to tasks in Zenith Cloud Migration; sees only their assigned tasks |
| **DEVELOPER** | Sara Malik | `sara@cpd.dev` | Assigned to tasks in Zenith Cloud & NovaPulse; sees only their assigned tasks |
| **DEVELOPER** | Arjun Das | `arjun@cpd.dev` | Assigned to tasks in NovaPulse & Crescendo; sees only their assigned tasks |
| **DEVELOPER** | Meera Iyer | `meera@cpd.dev` | Assigned to tasks in Crescendo E-Commerce; sees only their assigned tasks |

> 💡 **Tip**: The login page includes a **One-Click Role Switcher** to immediately log in as any role without typing passwords.

---

## 🏛️ Architectural & Security Justifications

### 1. Socket.io over Native WebSockets
- **Room-Based Role Filtering**: Socket.io provides native room primitives (`socket.join()` / `io.to()`). This directly maps to our multi-tenant permission model:
  - `global:admin` for Admins
  - `project:<projectId>:managers` for owning PMs
  - `user:<userId>` for private developer notifications
- **Selective Broadcasting**: Status change events (`activity:new`) are emitted exclusively to the project manager room, admin room, and the assigned developer's room. Other developers in the same project never receive the packet over the wire.
- **Connection Reliability**: Built-in heartbeat detection, automatic reconnection with exponential backoff, and transparent fallback to HTTP long-polling if WebSockets are blocked by corporate proxies.

### 2. Express for Explicit Middleware-Based Access Control
- **Auditable Pipeline**: Express enables a clean, linear, and explicit chain:
  `authenticate` ➔ `authorize(roles)` ➔ `validate(zod)` ➔ `controller` ➔ `errorHandler`
- **Query-Level Scoping**: We deliberately avoid "fetch all then filter in JavaScript" anti-patterns. Every list endpoint translates caller identity directly into Prisma `where` criteria:
  - PM list: `where: { createdById: user.id }`
  - Developer task list: `where: { assignedDeveloperId: user.id }`
- **404 over 403 for Ownership Mismatches**: When a caller requests a single resource they don't own (e.g., a developer requesting another developer's task, or PM 1 requesting PM 2's project), the server returns **`404 NOT_FOUND`** instead of `403 FORBIDDEN`. This prevents resource enumeration attacks where unauthorized users probe IDs to discover whether private resources exist.

### 3. node-cron over Bull / Redis
- **Zero Additional Infrastructure**: The system requires only a single recurring background job (the 5-minute overdue task scanner). Introducing Bull or Bee-Queue would require deploying and maintaining a Redis cluster, adding operational overhead, configuration latency, and failure points.
- **Simplicity & Predictability**: `node-cron` runs within the Node.js event loop, directly querying PostgreSQL for tasks where `dueDate < now AND status != DONE AND isOverdue = false`, batch-updating rows, and triggering live WebSocket notifications.

### 4. HttpOnly Refresh Cookie + In-Memory Access Token (XSS & CSRF Defense)
- **In-Memory Access Token (Zustand)**: Storing the short-lived (~15 min) JWT access token in JavaScript memory makes it completely inaccessible to malicious scripts or XSS payloads (unlike `localStorage` or `sessionStorage` which any injected script can read).
- **HttpOnly, Secure, SameSite=Strict Refresh Cookie**: The long-lived (~7 days) refresh token is stored exclusively in a cookie with:
  - `HttpOnly: true`: Cannot be accessed or read by JavaScript.
  - `SameSite: Strict`: Not sent on cross-site requests, completely eliminating CSRF attacks.
  - `Secure: true`: Only transmitted over TLS/HTTPS in production.
- **Token Rotation & Reuse Detection**: Every `/api/auth/refresh` call revokes the presented refresh token and issues a fresh one. If an already-revoked refresh token is ever presented (indicating a replay or theft attack), the server **immediately invalidates all active sessions** for that user.

---

## 📊 Database Schema (Prisma Models & Indexes)

```mermaid
erDiagram
    User ||--o{ Project : "creates (PM)"
    User ||--o{ Task : "assigned to (Developer)"
    User ||--o{ TaskActivityLog : "performs"
    User ||--o{ Notification : "receives"
    User ||--o{ RefreshToken : "owns"
    Client ||--o{ Project : "has"
    Project ||--o{ Task : "contains"
    Project ||--o{ TaskActivityLog : "logs"
    Task ||--o{ TaskActivityLog : "has logs"
    Task ||--o{ Notification : "references"

    User {
        String id PK
        String name
        String email UK
        String passwordHash
        Role role "ADMIN | PM | DEVELOPER"
        DateTime createdAt
    }

    Client {
        String id PK
        String name
        String contactEmail
        DateTime createdAt
    }

    Project {
        String id PK
        String name
        String clientId FK "idx"
        String createdById FK "idx"
        DateTime createdAt
    }

    Task {
        String id PK
        String projectId FK "idx"
        String title
        String description
        String assignedDeveloperId FK "idx"
        TaskStatus status "TODO | IN_PROGRESS | IN_REVIEW | DONE (idx)"
        TaskPriority priority "LOW | MEDIUM | HIGH | CRITICAL (idx)"
        DateTime dueDate "idx"
        Boolean isOverdue "idx"
        DateTime createdAt
        DateTime updatedAt
    }

    TaskActivityLog {
        String id PK
        String taskId FK "idx"
        String projectId FK "idx (composite with createdAt DESC)"
        String userId FK "nullable for system logs"
        TaskStatus fromStatus
        TaskStatus toStatus
        String message
        DateTime createdAt
    }

    Notification {
        String id PK
        String userId FK "idx (composite with isRead)"
        NotificationType type
        String message
        String relatedTaskId FK "nullable"
        Boolean isRead
        DateTime createdAt
    }

    RefreshToken {
        String id PK
        String userId FK "idx"
        String tokenHash "idx"
        DateTime expiresAt
        Boolean revoked
        DateTime createdAt
    }
```

### Key Schema Optimizations
1. **`TaskActivityLog` Composite Index `@@index([projectId, createdAt(sort: Desc)])`**: Accelerates project-scoped activity feed queries and catch-up ordering.
2. **`Notification` Composite Index `@@index([userId, isRead])`**: Powers ultra-fast badge count queries (`SELECT COUNT(*) WHERE userId = ? AND isRead = false`).
3. **`Task` Composite Query Indexes**: Separate indexes on `status`, `priority`, `dueDate`, `isOverdue`, `projectId`, and `assignedDeveloperId` enable instantaneous filtering via URL query parameters (`?status=&priority=&dueFrom=&dueTo=`).
4. **`RefreshToken.tokenHash` Index**: Uses SHA-256 token hashing so raw secrets are never persisted in plaintext, with fast indexed lookups on refresh.

---

## 🧪 Automated Test Suites

The project includes 4 comprehensive test suites covering all business logic, security constraints, and real-time operations:

```bash
# 1. Auth & Middleware verification (validation, JWT, cookies, rotation, replay defense, 403, 404)
npm run test:auth --workspace=backend

# 2. Role Scoping verification (Prisma where clauses, 404 on ownership mismatch, dev isolation)
npm run test:scoping --workspace=backend

# 3. Real-Time & Cron verification (Socket.io auth, room routing, presence tracking, overdue scanner)
npm run test:realtime --workspace=backend

# 4. Notifications verification (unread counts, mark read, 404 on other's notif, live push)
npm run test:notifications --workspace=backend
```

---

## 📁 Repository Structure

```
client_project_dashboard/
├── docker-compose.yml              # PostgreSQL 16 container definition
├── package.json                    # Monorepo workspaces (backend, frontend)
├── .env.example                    # Environment variable template
├── README.md                       # Documentation & architecture justifications
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma           # All 7 models, enums, indexes, relations
│   │   ├── migrations/             # Versioned SQL migrations
│   │   └── seed.ts                 # 7 users, 3 clients, 16 tasks, logs, notifs
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
│       │   ├── auth/               # Login, refresh, logout, rotation
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
        │   └── useSocket.ts        # Authenticated Socket.io lifecycle hook
        ├── components/
        │   └── Header.tsx          # Top navigation, presence, notifications
        └── features/
            ├── auth/
            │   └── LoginPage.tsx   # Login form + 1-click role switcher
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
            │   ├── TaskFilters.tsx       # useSearchParams URL sync
            │   └── CreateTaskModal.tsx
            ├── activity/
            │   └── ActivityFeed.tsx      # DB catch-up + WebSocket live prepending
            └── notifications/
                └── NotificationDropdown.tsx # Real-time unread badge
```

---

## ⚠️ Known Limitations & Production Scaling Considerations

1. **Single-Node Socket.io Presence & Memory State**: The active user presence counter and WebSocket room broadcasts operate in-memory on the Node.js process. In a horizontally scaled multi-instance cluster, a pub/sub adapter such as `@socket.io/redis-adapter` would be required to synchronize presence state and broadcasts across container instances.
2. **Cron Scheduler in Multi-Replica Deployments**: `node-cron` runs in-process. If multiple server instances run simultaneously behind a load balancer, each instance would execute the 5-minute overdue scan simultaneously. For horizontal scaling, distributed locking (via PostgreSQL advisory locks `pg_try_advisory_lock` or Redis Redlock) or a standalone scheduler service would prevent redundant runs.
3. **Persistent WebSockets on Serverless Platforms**: Platforms like Vercel Functions are serverless and stateless (terminating after request execution), making long-lived WebSocket connections unsuitable for raw serverless lambdas. For production deployment, the backend should be hosted on a container runtime (such as Railway, Render, Fly.io, or AWS ECS), while the frontend is deployed to Vercel with rewrites configured to the persistent backend domain.

---

## 📝 Technical Assessment Explanation (150–250 Words)

> *Use this exact explanation in the submission form field:*

The most challenging engineering challenge was ensuring watertight role-based isolation across both the REST API and the real-time WebSocket layer without duplicating authorization logic or leaking private data. In a multi-tenant dashboard, a naive implementation might broadcast task updates globally and rely on frontend filtering, or fetch all records from the database and filter in memory. To prevent cross-role data leaks and enumeration attacks, I enforced ownership scoping at the database query level (`where` clauses scoped by `createdById` for PMs and `assignedDeveloperId` for Developers) and strictly returned `404 Not Found` (rather than `403 Forbidden`) when single resources were accessed by unauthorized users.

For the live activity feed, I mapped application roles directly to a hierarchical Socket.io room topology: `global:admin`, `project:<id>:managers`, and `user:<userId>`. When a task status transitions, the server persists an immutable `TaskActivityLog` row and emits `activity:new` selectively to the admin room, the project managers' room, and the assigned developer's private room. Unassigned developers never receive packets over the wire. On reconnect, the client catches up by fetching the last 20 events directly from PostgreSQL before listening to live events.

If I were to approach this differently in a high-throughput production environment, I would decouple the real-time broadcasting and cron scheduler from the API process using Redis Pub/Sub and BullMQ with PostgreSQL advisory locks to enable seamless horizontal auto-scaling.

---

## 📜 License
MIT License. Created for technical assessment.
