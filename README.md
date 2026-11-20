# Team Task Manager (TeamFlow) 🚀
> Full-Stack Team Task & Workspace Management Web Application for the Full Stack Development Assessment.

A modern, production-minded SaaS application built with **React**, **Vite**, **Tailwind CSS**, **Node.js**, **Express**, **Passport.js**, **Express Session**, and **PostgreSQL** (Google Cloud SQL compatible).

---

## Table of Contents
1. [Project Overview](#project-overview)
   - [Assessment Requirements Checklist](#assessment-requirements-checklist)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Application Architecture](#application-architecture)
5. [Project Structure](#project-structure)
6. [Prerequisites](#prerequisites)
7. [Installation & Local Setup](#installation--local-setup)
   - [Windows PowerShell Quickstart](#windows-powershell-quickstart)
   - [Backend Configuration](#backend-configuration)
   - [Frontend Configuration](#frontend-configuration)
8. [Database Setup & Migrations](#database-setup--migrations)
9. [Running Automated Tests](#running-automated-tests)
10. [REST API Documentation](#rest-api-documentation)
11. [Authentication & Security Implementation](#authentication--security-implementation)
12. [Git Branching Workflow](#git-branching-workflow)
13. [Google Cloud Platform Deployment Guide](#google-cloud-platform-deployment-guide)
14. [Demo Credentials](#demo-credentials)
15. [Limitations & Notes](#limitations--notes)

---

## Project Overview

TeamFlow is an enterprise-grade Team Task Manager web application engineered to facilitate agile project management, cross-team accountability, and real-time task tracking. It incorporates role-based access control, secure session persistence, parameterized SQL database transactions, multi-dimensional search/filtering, and responsive desktop/mobile interfaces.

### Assessment Requirements Checklist

| Requirement | Where it is implemented |
|---|---|
| Register / login securely | `server/src/controllers/authController.js`, `client/src/pages/Login.jsx`, `Register.jsx` |
| Create & manage teams, add members | `server/src/routes/teamRoutes.js`, `client/src/pages/Teams.jsx`, `TeamDetails.jsx` |
| Create, assign, update, delete tasks | `server/src/routes/taskRoutes.js`, `client/src/components/TaskModal.jsx` (create/update modal) |
| View tasks filtered by team or assignee | `GET /api/tasks?teamId=&assigneeId=`, `client/src/components/SearchFilter.jsx`, `client/src/hooks/useAssigneeOptions.js` |
| React + Tailwind CSS + Vite | `client/` |
| Dashboard (team list, task list) | `client/src/pages/Dashboard.jsx` |
| Node.js + Express REST API (`/auth`, `/teams`, `/tasks`) | `server/src/app.js` (mounted under `/api`) |
| Validation (express-validator) | `server/src/validators/*`, `server/src/middleware/validate.js` |
| Passport.js + Express Session | `server/src/config/passport.js`, `server/src/app.js` |
| Sessions in PostgreSQL, memory fallback in dev | `createSessionStore()` in `server/src/app.js` (`connect-pg-simple` / `MemoryStore`) |
| HTTP-only cookies | `cookie.httpOnly: true` in `server/src/app.js` |
| Protect all non-auth routes | `ensureAuthenticated` in `server/src/middleware/authenticate.js` |
| Database on GCP | Google Cloud SQL for PostgreSQL ([deployment guide](#google-cloud-platform-deployment-guide)) |
| Input validation & sanitization | `trim`, `toLowerCase`, `toInt`, `stripHtml` sanitizers in `server/src/validators/` |
| No plain-text passwords (bcrypt) | `bcryptjs` hashing in `authController.register` |
| Bonus: due-date reminders on login | `GET /api/tasks/reminders`, login toast in `AuthContext.jsx`, reminders panel on Dashboard |
| Bonus: role-based access | Owners manage members/settings; only the **team creator** can delete the team |
| Bonus: invite via email (stubbed) | `POST /api/teams/:id/invite` (no SMTP) |

---

## Key Features

### 🔐 1. Authentication & Session Management
- **Secure Registration:** Full name, normalized unique email validation, minimum 6-character password with confirmation verification.
- **Bcrypt Password Hashing:** Salted hashes generated via `bcryptjs` (passwords never stored or transmitted in plain text).
- **Stateful Session Cookies:** Powered by Passport.js and Express Session with HTTP-only cookies, session regeneration to mitigate session fixation attacks, and configurable SameSite policies.
- **Safe Profile Serialization:** Sensitive attributes (password hashes) are strictly excluded from API responses and user profiles.

### 👥 2. Team Management & Permissions
- **Team Creation & Ownership:** Creators automatically become team owners with administrative privileges.
- **Role-Based Access Control (RBAC):** Distinct roles (`owner`, `member`) enforced on the server. Owners can edit the team and manage members; only the team **creator** can delete the team.
- **Member Directory:** Search registered users and add them to teams; prevent duplicate memberships.
- **Cascading Deletions:** Deleting a team automatically cleans up tasks and memberships; removing a member unassigns their tasks.
- **Bonus Feature - Email Invitations:** Send simulated email invites to external colleagues without requiring an SMTP provider.

### 📋 3. Task Management & Operations
- **Task Lifecycle:** Support for complete CRUD operations (Create, Read, Update, Delete).
- **Task Properties:** Title, description, team association, assignees, status (`To Do`, `In Progress`, `Completed`), priority (`Low`, `Medium`, `High`), and due dates.
- **Interactive Modals:** Dynamic modal supporting create and edit modes, live member population, and duplicate submission prevention.
- **Overdue Detection:** Visual alerts and indicators for overdue tasks.

### 📊 4. Real-Time Dashboard & Analytics
- **Live Aggregations:** Calculates total teams, total tasks, tasks assigned to the current user, in-progress items, completed items, and overdue tasks directly from database records.
- **Overdue Attention Banner:** Immediate banner alerting the user to overdue items.
- **Bonus - Due-Date Reminders on Login:** After signing in, a toast reports how many of your tasks are overdue or due within 3 days, and the dashboard lists them.
- **Immediate Utility:** Clean onboarding empty states guiding first-time users to create their first team and task.

### 🔍 5. Search & Multi-Dimensional Filtering
- **Keyword Search:** Search tasks by title or description preview.
- **Combined Filters:** Filter simultaneously by Team, Assignee, Status, Priority, and Overdue status. The assignee list shows the selected team's members, or everyone you share a team with.
- **Query Param Synchronization:** Allows direct deep-linking (e.g. `/tasks?myTasks=true`).

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS 3, React Router v6, Axios, Lucide Icons |
| **Backend** | Node.js (LTS), Express.js, Passport.js, Express Session, express-validator |
| **Database** | PostgreSQL (`pg` connection pool with SSL), `connect-pg-simple` session store, embedded `pg-mem` fallback |
| **Security** | Helmet (secure headers), express-rate-limit, CORS, bcrypt password hashing, HTTP-only cookies |
| **Testing** | Jest, Supertest, isolated database test fixtures |
| **Deployment** | Docker (multi-stage), Google Cloud Run, Google Cloud SQL (PostgreSQL), Google Cloud Build |

---

## Application Architecture

```
[ Browser / Client ] (React + Vite + Tailwind CSS)
        │
   HTTP Cookies / REST API
        ▼
[ Node.js + Express Server ] (Port 5000 / Cloud Run 8080)
   ├── Security Middleware (Helmet, CORS, RateLimiter, BodyParser)
   ├── Session Layer (Express Session + Passport.js + connect-pg-simple)
   ├── Validation Middleware (express-validator)
   ├── Route Handlers & Controllers (Auth, Teams, Members, Tasks)
   └── Centralized Error & Exception Handler
        │
   Parameterized Queries (pg.Pool)
        ▼
[ Managed PostgreSQL Database ] (Google Cloud SQL / Local PG)
   ├── Users, Teams, Team Members, Tasks, Session Tables
   └── Indexes & Foreign Key Constraints
```

---

## Project Structure

```text
team-task-manager/
├── client/                     # Frontend Application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Navbar.jsx      # Top header with profile & quick actions
│   │   │   ├── Sidebar.jsx     # Desktop sidebar and mobile drawer
│   │   │   ├── ProtectedRoute.jsx # Route authentication guard
│   │   │   ├── TaskCard.jsx    # Card with status toggle and actions
│   │   │   ├── TaskModal.jsx   # Create/Edit modal with validation
│   │   │   ├── TeamCard.jsx    # Workspace card with role badges
│   │   │   ├── SearchFilter.jsx# Multi-parameter search & filter bar
│   │   │   └── LoadingSpinner.jsx # Loading indicator
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Global user auth & toast notifications
│   │   ├── hooks/
│   │   │   └── useAssigneeOptions.js # Loads members for the assignee filter
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Sign in page with demo accounts
│   │   │   ├── Register.jsx    # Registration page
│   │   │   ├── Dashboard.jsx   # Analytics & overview dashboard
│   │   │   ├── Teams.jsx       # Teams listing and team modal
│   │   │   ├── TeamDetails.jsx # Team members & team tasks workspace
│   │   │   ├── Tasks.jsx       # All tasks / My tasks view
│   │   │   └── NotFound.jsx    # 404 page
│   │   ├── services/
│   │   │   └── api.js          # Axios client with interceptors
│   │   ├── App.jsx             # Router definition
│   │   ├── main.jsx            # React root mount
│   │   └── index.css           # Tailwind directives & theme
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js          # Vite config with /api proxy
│
├── server/                     # Backend REST API
│   ├── migrations/
│   │   ├── 001_initial_schema.sql # Schema DDL with constraints & indexes
│   │   ├── runMigrations.js    # Automated migration runner
│   │   └── seedData.js         # Development demo seed script
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js     # PostgreSQL connection pool & fallback
│   │   │   └── passport.js     # Passport local strategy config
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── teamController.js
│   │   │   ├── memberController.js
│   │   │   └── taskController.js
│   │   ├── middleware/
│   │   │   ├── authenticate.js # Auth and role verification
│   │   │   ├── validate.js     # Express-validator error formatter
│   │   │   └── errorHandler.js # Centralized error & 404 handler
│   │   ├── models/
│   │   │   ├── userModel.js
│   │   │   ├── teamModel.js
│   │   │   ├── memberModel.js
│   │   │   └── taskModel.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── teamRoutes.js
│   │   │   └── taskRoutes.js
│   │   ├── validators/
│   │   │   ├── common.js       # Shared sanitizers (stripHtml), ID & email rules
│   │   │   ├── authValidator.js
│   │   │   ├── teamValidator.js
│   │   │   └── taskValidator.js
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Server bootstrap and graceful shutdown
│   ├── tests/
│   │   ├── auth.test.js        # Auth and session integration tests
│   │   ├── teams.test.js       # Team CRUD and RBAC tests
│   │   ├── tasks.test.js       # Task CRUD, filters, and stats tests
│   │   └── security.test.js    # Validation, sanitization, RBAC, reminders, cookies
│   └── package.json
│
├── Dockerfile                  # Multi-stage production container
├── .dockerignore
├── cloudbuild.yaml             # Google Cloud Build pipeline (Artifact Registry + Cloud Run)
├── .env.example                # Environment variables template
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js:** v18.x, v20.x, or v22.x LTS
- **npm:** v9.x or higher
- **PostgreSQL:** v14+ (Local installation, Docker container, or managed Google Cloud SQL). *Note: The server includes an automatic in-memory fallback for immediate zero-config development when PostgreSQL is not running locally.*

---

## Installation & Local Setup

### Windows PowerShell Quickstart

Clone the repository and install dependencies:

```powershell
# 1. Navigate to project root
cd "team-task-manager"

# 2. Install server dependencies
cd server
npm install

# 3. Install client dependencies
cd ../client
npm install
cd ..
```

### Backend Configuration

Create a `.env` file in the `server/` directory (or copy from `.env.example`):

```ini
PORT=5000
NODE_ENV=development
SESSION_SECRET=your_secure_development_secret_key
CLIENT_URL=http://localhost:5173

# PostgreSQL Connection (Optional: if omitted or offline, automatic in-memory fallback activates)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/team_task_manager
USE_LOCAL_FALLBACK_IF_NO_PG=true
```

### Running the Application Locally

Open two Windows PowerShell terminals:

**Terminal 1 (Backend Server):**
```powershell
cd server
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```powershell
cd client
npm run dev
# Client starts at http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser.

---

## Database Setup & Migrations

If running against an external PostgreSQL database or Google Cloud SQL:

```powershell
cd server

# Execute database schema migrations
npm run migrate

# (Optional) Seed realistic demo accounts, teams, and tasks
npm run seed
```

The database schema initializes:
- `users`: ID, name, unique email, password hash, timestamps.
- `teams`: ID, name, description, owner reference, timestamps.
- `team_members`: ID, team ID, user ID, role (`owner` | `member`), join date with unique composite constraint.
- `tasks`: ID, title, description, team reference, creator reference, assignee reference, status, priority, due date, timestamps.
- `session`: Connect-PG-Simple session store schema with automatic expiration indexing.

---

## Running Automated Tests

The backend includes 34 automated integration tests written with **Jest** and **Supertest** covering authentication, password hashing, route protections, HTTP-only cookies, input validation & sanitization, team operations, role enforcement, task assignments, search filters, and due-date reminders. Tests run against the in-memory database, so no PostgreSQL is needed.

```powershell
cd server
npm test
```

Expected output:
```text
PASS tests/security.test.js
PASS tests/tasks.test.js
PASS tests/teams.test.js
PASS tests/auth.test.js

Test Suites: 4 passed, 4 total
Tests:       34 passed, 34 total
```

---

## REST API Documentation

### Base URL: `/api`

### 1. Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a user (validates name, email, password matching). |
| `POST` | `/api/auth/login` | No | Log in and issue session cookie (rate-limited). |
| `POST` | `/api/auth/logout` | Yes | Destroy session and clear authentication cookie. |
| `GET` | `/api/auth/me` | Yes | Return current user's safe profile. |
| `GET` | `/api/auth/users/search?q=...` | Yes | Search registered users by name/email to add to teams. |

### 2. Team Management Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/teams` | Yes | List all teams current user belongs to (with stats). |
| `POST` | `/api/teams` | Yes | Create a new team (creator becomes owner). |
| `GET` | `/api/teams/members` | Yes | Everyone who shares a team with the current user (assignee filter options). |
| `GET` | `/api/teams/:id` | Yes | Get team details, owner info, and member count. |
| `PATCH` | `/api/teams/:id` | Yes | Update team name and description (Owner only). |
| `DELETE` | `/api/teams/:id` | Yes | Delete team and cascade tasks (Team creator only). |
| `GET` | `/api/teams/:id/members` | Yes | List all team members with roles and joined dates. |
| `POST` | `/api/teams/:id/members` | Yes | Add existing user by email to team (Owner only). |
| `DELETE` | `/api/teams/:id/members/:userId` | Yes | Remove member from team (Owner or self). |
| `POST` | `/api/teams/:id/invite` | Yes | Send simulated email invitation to team. |

### 3. Task Management Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/tasks` | Yes | List authorized tasks with multi-parameter filters. |
| `GET` | `/api/tasks/dashboard/stats` | Yes | Calculate real database metrics for dashboard. |
| `GET` | `/api/tasks/reminders?days=3` | Yes | Your unfinished tasks that are overdue or due within `days` (bonus reminders). |
| `POST` | `/api/tasks` | Yes | Create task (verifies team membership & assignee). |
| `GET` | `/api/tasks/:id` | Yes | Get single task details. |
| `PATCH` | `/api/tasks/:id` | Yes | Update task fields, status, priority, or due date. |
| `DELETE` | `/api/tasks/:id` | Yes | Delete task (Owner or creator only). |

`GET /api/tasks` filters (all optional, combinable): `teamId`, `assigneeId` (a user ID or `unassigned`), `myTasks=true`, `status`, `priority`, `isOverdue=true`, `search`. Results are always limited to teams the caller belongs to.

---

## Authentication & Security Implementation

1. **Password Hashing:** Passwords are automatically hashed using `bcrypt` (10 salt rounds) before database insertion. Plaintext passwords are never stored or logged.
2. **Session Fixation Prevention:** Sessions are explicitly regenerated on login via `req.session.regenerate()`.
3. **Cookie Hardening:** Session cookies are configured with `httpOnly: true` (preventing XSS theft), `sameSite: 'lax'` (blocks cross-site POSTs / CSRF), and `secure: true` in production (HTTPS). The server refuses to start in production without a `SESSION_SECRET`.
4. **Parameterized SQL Queries:** All SQL operations use parameterized arguments (`$1, $2, ...`) to eliminate SQL injection risks.
5. **Validation & Sanitization:** Every body, query, and route parameter is validated with `express-validator` (IDs must be positive integers, enums are whitelisted, lengths are capped). Inputs are sanitized with `trim`, `toLowerCase` (emails), `toInt`, and a `stripHtml` sanitizer that removes HTML tags and control characters from free text. React escapes all output as a second layer.
6. **Session-Protected Routes:** Every route except `POST /api/auth/register`, `POST /api/auth/login`, and the health check is behind `ensureAuthenticated`; team/task access is additionally scoped to team membership.
7. **Rate Limiting:** Protects `/api/auth/login` and `/api/auth/register` against brute-force attacks via `express-rate-limit`.
8. **HTTP Security Headers:** Protected with `Helmet`.
9. **Body Size Limits:** Strict 1MB payload limits on incoming JSON bodies.
10. **Account Enumeration Defense:** Generic authentication failure messages ("Invalid email or password").

---

## Git Branching Workflow

As required by the assessment, work is developed on feature branches and merged through pull requests:

- `main`: Production-ready, verified code.
- `develop`: Integration branch.
- `feature/authentication`: User registration, bcrypt hashing, Passport.js sessions, and auth UI.
- `feature/team-management`: Team CRUD, role-based access control, member management.
- `feature/task-management`: Task CRUD, assignment validation, filtering, and TaskModal.
- `feature/dashboard`: Database metrics aggregation, SearchFilter bar, responsive layout.

---

## Google Cloud Platform Deployment Guide

The app ships as **one container**: Express serves both the REST API (`/api/*`) and the built React app, so the browser talks to a single origin and the session cookie stays first-party. It runs on **Google Cloud Run**, with **Google Cloud SQL for PostgreSQL** holding application data *and* sessions.

### Architecture

```
Internet ──HTTPS──► [ Google Cloud Run: Node.js/Express + built React SPA ]
                           │  Unix socket (/cloudsql/...)
                           ▼
             [ Google Cloud SQL (PostgreSQL) ]  users, teams, team_members, tasks, session
```

On start-up the server runs the idempotent schema migration automatically, so a fresh database needs no manual setup.

The commands below are written for **Google Cloud Shell** (bash), which already has `gcloud`, `git` and `openssl` installed. Clone this repository there first, then `cd` into it.

### Step 1: Project & APIs

```bash
gcloud config set project YOUR_PROJECT_ID
export PROJECT_ID=$(gcloud config get-value project)
export REGION=us-central1
export INSTANCE=team-task-db

gcloud services enable run.googleapis.com sqladmin.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com
```

### Step 2: Create the Cloud SQL PostgreSQL instance

```bash
gcloud sql instances create $INSTANCE \
  --database-version=POSTGRES_15 --edition=ENTERPRISE --tier=db-f1-micro --region=$REGION

gcloud sql databases create team_task_manager --instance=$INSTANCE
gcloud sql users set-password postgres --instance=$INSTANCE --password="YOUR_DB_PASSWORD"
```

### Step 3: Store secrets in Secret Manager

```bash
openssl rand -hex 32 | tr -d '\n' | gcloud secrets create session-secret --data-file=-

printf '%s' "postgresql://postgres:YOUR_DB_PASSWORD@/team_task_manager?host=/cloudsql/$PROJECT_ID:$REGION:$INSTANCE" \
  | gcloud secrets create database-url --data-file=-

# Let Cloud Run's runtime service account read the secrets and connect to Cloud SQL
export RUNTIME_SA="$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$RUNTIME_SA" --role=roles/secretmanager.secretAccessor
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$RUNTIME_SA" --role=roles/cloudsql.client
```

### Step 4: Build & deploy to Cloud Run

```bash
gcloud run deploy team-task-manager \
  --source . \
  --region=$REGION \
  --allow-unauthenticated \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:$INSTANCE \
  --set-env-vars=NODE_ENV=production,SEED_DEMO_DATA=true \
  --set-secrets=SESSION_SECRET=session-secret:latest,DATABASE_URL=database-url:latest
```

`--source .` builds the root `Dockerfile` with Cloud Build and stores the image in Artifact Registry. `SEED_DEMO_DATA=true` creates the [demo accounts](#demo-credentials) on first start so reviewers can sign in straight away; leave it out for an empty database.

**Alternative (CI pipeline):** create an Artifact Registry repo once with `gcloud artifacts repositories create team-task-manager --repository-format=docker --location=$REGION`, then run `gcloud builds submit --config cloudbuild.yaml --substitutions=_CLOUDSQL_INSTANCE=$PROJECT_ID:$REGION:$INSTANCE` (or attach `cloudbuild.yaml` to a GitHub trigger).

### Step 5: Verify

```bash
curl "$(gcloud run services describe team-task-manager --region=$REGION --format='value(status.url)')/api/health"
# {"status":"UP", ..., "database":"postgresql"}
```

---

## Demo Credentials

Demo accounts are seeded automatically in development, and in production when `SEED_DEMO_DATA=true`:

| Name | Role | Email | Password |
|---|---|---|---|
| **Alice Morgan** | Team Owner (Frontend Core) | `alice@example.com` | `Password123!` |
| **Bob Chen** | Team Owner (Infrastructure) | `bob@example.com` | `Password123!` |
| **Charlie Davis** | Team Member | `charlie@example.com` | `Password123!` |

---

## Limitations & Notes

- **Email Delivery:** Simulated email invitations demonstrate the business logic and user flow without requiring real SMTP credentials.
- **Local Fallback:** If a local PostgreSQL daemon is not running on port 5432 during local development or unit testing, the server automatically activates the embedded `pg-mem` engine. In staging and production, real PostgreSQL / Cloud SQL is used.
