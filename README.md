# Team Task Manager (TeamFlow) 🚀
> Full-Stack Team Task & Workspace Management Web Application for the Full Stack Development Assessment.

A modern, production-minded SaaS application built with **React**, **Vite**, **Tailwind CSS**, **Node.js**, **Express**, **Passport.js**, **Express Session**, and **PostgreSQL** (Google Cloud SQL compatible).

---

## Table of Contents
1. [Project Overview](#project-overview)
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

---

## Key Features

### 🔐 1. Authentication & Session Management
- **Secure Registration:** Full name, normalized unique email validation, minimum 6-character password with confirmation verification.
- **Bcrypt Password Hashing:** Salted hashes generated via `bcryptjs` (passwords never stored or transmitted in plain text).
- **Stateful Session Cookies:** Powered by Passport.js and Express Session with HTTP-only cookies, session regeneration to mitigate session fixation attacks, and configurable SameSite policies.
- **Safe Profile Serialization:** Sensitive attributes (password hashes) are strictly excluded from API responses and user profiles.

### 👥 2. Team Management & Permissions
- **Team Creation & Ownership:** Creators automatically become team owners with administrative privileges.
- **Role-Based Access Control (RBAC):** Distinct roles (`owner`, `member`) enforced on the server.
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
- **Immediate Utility:** Clean onboarding empty states guiding first-time users to create their first team and task.

### 🔍 5. Search & Multi-Dimensional Filtering
- **Keyword Search:** Search tasks by title or description preview.
- **Combined Filters:** Filter simultaneously by Team, Assignee, Status, Priority, and Overdue status.
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
│   │   │   ├── authValidator.js
│   │   │   ├── teamValidator.js
│   │   │   └── taskValidator.js
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Server bootstrap and graceful shutdown
│   ├── tests/
│   │   ├── auth.test.js        # Auth and session integration tests
│   │   ├── teams.test.js       # Team CRUD and RBAC tests
│   │   └── tasks.test.js       # Task CRUD, filters, and stats tests
│   └── package.json
│
├── Dockerfile                  # Multi-stage production container
├── cloudbuild.yaml             # Google Cloud Build pipeline
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

The backend includes 25 automated integration tests written with **Jest** and **Supertest** covering authentication, password hashing, route protections, team operations, role enforcement, task assignments, and search filters.

```powershell
cd server
npm test
```

Expected output:
```text
PASS tests/auth.test.js
PASS tests/teams.test.js
PASS tests/tasks.test.js

Test Suites: 3 passed, 3 total
Tests:       25 passed, 25 total
Snapshots:   0 total
Time:        5.4 s
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
| `GET` | `/api/teams/:id` | Yes | Get team details, owner info, and member count. |
| `PATCH` | `/api/teams/:id` | Yes | Update team name and description (Owner only). |
| `DELETE` | `/api/teams/:id` | Yes | Delete team and cascade tasks (Owner only). |
| `GET` | `/api/teams/:id/members` | Yes | List all team members with roles and joined dates. |
| `POST` | `/api/teams/:id/members` | Yes | Add existing user by email to team (Owner only). |
| `DELETE` | `/api/teams/:id/members/:userId` | Yes | Remove member from team (Owner or self). |
| `POST` | `/api/teams/:id/invite` | Yes | Send simulated email invitation to team. |

### 3. Task Management Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/tasks` | Yes | List authorized tasks with multi-parameter filters. |
| `GET` | `/api/tasks/dashboard/stats` | Yes | Calculate real database metrics for dashboard. |
| `POST` | `/api/tasks` | Yes | Create task (verifies team membership & assignee). |
| `GET` | `/api/tasks/:id` | Yes | Get single task details. |
| `PATCH` | `/api/tasks/:id` | Yes | Update task fields, status, priority, or due date. |
| `DELETE` | `/api/tasks/:id` | Yes | Delete task (Owner or creator only). |

---

## Authentication & Security Implementation

1. **Password Hashing:** Passwords are automatically hashed using `bcrypt` (10 salt rounds) before database insertion. Plaintext passwords are never stored or logged.
2. **Session Fixation Prevention:** Sessions are explicitly regenerated on login via `req.session.regenerate()`.
3. **Cookie Hardening:** Session cookies are configured with `httpOnly: true` (preventing XSS theft), configurable `sameSite` policy, and `secure: true` in production (HTTPS).
4. **Parameterized SQL Queries:** All SQL operations use parameterized arguments (`$1, $2, ...`) to eliminate SQL injection risks.
5. **Rate Limiting:** Protects `/api/auth/login` and `/api/auth/register` against brute-force attacks via `express-rate-limit`.
6. **HTTP Security Headers:** Protected with `Helmet`.
7. **Body Size Limits:** Strict 1MB payload limits on incoming JSON bodies.
8. **Account Enumeration Defense:** Generic authentication failure messages ("Invalid email or password").

---

## Git Branching Workflow

In accordance with Section 15 of the assessment guidelines, the repository maintains a clear branching and commit history:

- `main`: Production-ready, verified code.
- `develop`: Integration branch.
- `feature/authentication`: User registration, bcrypt hashing, Passport.js sessions, and auth UI.
- `feature/team-management`: Team CRUD, role-based access control, member management.
- `feature/task-management`: Task CRUD, assignment validation, filtering, and TaskModal.
- `feature/dashboard`: Database metrics aggregation, SearchFilter bar, responsive layout.

---

## Google Cloud Platform Deployment Guide

The application is containerized and ready for deployment on **Google Cloud Platform (GCP)** using **Google Cloud Run** and **Google Cloud SQL (PostgreSQL)**.

### Architecture

```
Internet ──HTTPS──► [ Google Cloud Run ] (Unified Container / NGINX Proxy)
                           │
                      Private IP / Cloud SQL Proxy
                           ▼
             [ Google Cloud SQL (PostgreSQL) ]
```

### Step 1: Create Cloud SQL PostgreSQL Instance

```bash
# Enable required Google Cloud APIs
gcloud services enable run.googleapis.com sqladmin.googleapis.com cloudbuild.yaml

# Create Cloud SQL instance
gcloud sql instances create team-task-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1

# Create database and user
gcloud sql databases create team_task_manager --instance=team-task-db
gcloud sql users set-password postgres \
    --instance=team-task-db \
    --password="YOUR_SECURE_PASSWORD"
```

### Step 2: Build & Deploy Container to Cloud Run

Using Google Cloud Build and Cloud Run:

```bash
# Submit build using root Dockerfile
gcloud builds submit --tag gcr.io/$PROJECT_ID/team-task-manager

# Deploy to Cloud Run with Cloud SQL connection
gcloud run deploy team-task-manager \
    --image gcr.io/$PROJECT_ID/team-task-manager \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --add-cloudsql-instances $PROJECT_ID:us-central1:team-task-db \
    --set-env-vars NODE_ENV=production,SESSION_SECRET="STRONG_PROD_SESSION_SECRET",DATABASE_URL="postgresql://postgres:YOUR_SECURE_PASSWORD@localhost:5432/team_task_manager?host=/cloudsql/$PROJECT_ID:us-central1:team-task-db"
```

### Step 3: Verify Deployment

Check the Cloud Run health endpoint:
```bash
curl https://team-task-manager-<hash>-uc.a.run.app/api/health
```

---

## Demo Credentials

The application includes pre-seeded demo accounts:

| Name | Role | Email | Password |
|---|---|---|---|
| **Alice Morgan** | Team Owner (Frontend Core) | `alice@example.com` | `Password123!` |
| **Bob Chen** | Team Owner (Infrastructure) | `bob@example.com` | `Password123!` |
| **Charlie Davis** | Team Member | `charlie@example.com` | `Password123!` |

---

## Limitations & Notes

- **Email Delivery:** Simulated email invitations demonstrate the business logic and user flow without requiring real SMTP credentials.
- **Local Fallback:** If a local PostgreSQL daemon is not running on port 5432 during local development or unit testing, the server automatically activates the embedded `pg-mem` engine. In staging and production, real PostgreSQL / Cloud SQL is used.
