# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Project name: **devops**, located at `~/Downloads/devops`.

DevOps management platform with Go backend and React frontend. Features include host monitoring, application deployment, and configuration management.

## Languages & Stack

- Backend: Go (Gin + GORM + PostgreSQL)
- Frontend: TypeScript (React 18 + Vite + Ant Design + Zustand)
- When making changes, respect the existing language conventions in each part of the codebase.

## VSCode Preferences

- Always open projects/files in the **current window** (`code -r`), do not open a new window unless explicitly asked.

## Commands

### Backend
```bash
cd backend
go run cmd/server/main.go          # Run server (requires PostgreSQL on localhost:5432)
go build -o server cmd/server/main.go  # Build binary
go test ./...                       # Run all tests
go test ./internal/service/...      # Run specific package tests
```

### Frontend
```bash
cd frontend
npm install                         # Install dependencies
npm run dev                         # Start dev server on port 3000
npm run build                       # Production build (runs tsc first)
npm run lint                        # ESLint check
```

## Architecture

### Backend (`backend/`)

Standard Go project layout with dependency injection:

- `cmd/server/main.go` - Entry point, wires up all dependencies
- `internal/handler/` - HTTP handlers organized by domain (auth, user, deploy, monitor, config)
- `internal/service/` - Business logic layer
- `internal/repository/` - Database access layer (GORM/PostgreSQL)
- `internal/middleware/` - JWT auth, CORS, RBAC, audit logging
- `internal/model/` - Database models
- `internal/pkg/` - Shared utilities (jwt, response helpers, ssh executor)

**Request flow**: Handler → Service → Repository

**Key patterns**:
- Handlers receive services via constructor injection
- Each handler has `RegisterRoutes(r *gin.RouterGroup)` to set up endpoints
- API responses use `internal/pkg/response` helpers with `code: 0` for success
- All protected routes use JWT middleware; admin routes add `RequireAdmin()` middleware

### Frontend (`frontend/`)

React 18 + TypeScript with Vite:

- `src/pages/` - Page components (Dashboard, Monitor/HostList, Deploy/AppList, Config, System/UserList)
- `src/services/` - API client functions
- `src/stores/` - Zustand state stores (auth.ts)
- `src/components/` - Shared components (MainLayout)

**Key patterns**:
- `@` alias maps to `src/` directory
- API client at `src/services/api.ts` handles auth tokens and error responses
- Routes protected via `PrivateRoute` component checking auth store
- Vite proxies `/api` requests to backend at localhost:8080

## Configuration

Backend uses `backend/config.yaml`:
- Server port (default: 8080)
- PostgreSQL connection (default: localhost:5432, db: devops)
- Redis connection (default: localhost:6379)
- JWT secret and expiry

## API Structure

All API endpoints under `/api/v1`:
- `/auth/*` - Login, logout, user info
- `/users/*` - User management (admin only)
- `/roles/*` - Role listing
- `/hosts/*`, `/host-groups/*`, `/host-tags/*` - Host monitoring
- `/apps/*`, `/deployments/*`, `/environments/*` - Deployment
- `/configs/*` - Configuration management
