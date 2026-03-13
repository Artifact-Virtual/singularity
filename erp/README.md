# ERP — Artifact Virtual Enterprise Resource Platform

Integrated into Singularity on 2026-03-13.

This directory contains the full Artifact Virtual ERP stack, imported from
`business_erp` and wired to the Singularity Python runtime.

## Structure

```
erp/
├── backend/        Fastify + Prisma API server (Node.js/TypeScript)
├── studio/         React + Vite frontend (ERP Studio)
├── Makefile        Unified build/dev/start commands
└── README.md       This file
```

## Quick Start

```bash
# Install all dependencies (backend + studio)
make install

# Start both services in dev mode (parallel)
make dev

# Build for production
make build

# Start in production mode
make start
```

## Ports

| Service  | Port | Description                        |
|----------|------|------------------------------------|
| Backend  | 3100 | Fastify REST API                   |
| Studio   | 5173 | Vite dev server (dev mode)         |
| Singularity | 8450 | Python AI runtime (upstream)    |

## Singularity Integration

The ERP backend proxies AI chat requests to Singularity via:

- **Endpoint:** `POST /api/ai/chat` → forwarded to `http://localhost:8450/api/v1/chat`
- **Auth:** Bearer token (`SINGULARITY_API_KEY` in `backend/.env`)
- **Session tracking:** `sessionId` passed through; Singularity maintains context
- **Timeout:** 5 minutes per request (supports long-running tool calls)

Health check available at `GET /api/ai/health` — no auth required.

## Environment

Backend config lives in `backend/.env`. Key values for Singularity integration:

```
SINGULARITY_API_URL=http://localhost:8450
DATABASE_URL=postgresql://artifact:artifact123@localhost:5432/artifact_erp
```

See `backend/.env.example` for the full reference.

## Database

Uses PostgreSQL via Prisma. After `make install`:

```bash
cd backend
npm run prisma:migrate    # run migrations
npm run prisma:seed       # seed initial data
```

## Architecture

- **Backend** authenticates all requests with JWT, then proxies AI messages
  to Singularity without modification.
- **Studio** is a single-page React app that communicates exclusively through
  the backend API — no direct connection to Singularity.
- **Singularity** (`singularity/` directory — Python) is the autonomous AI
  runtime. The ERP stack is a UI layer on top; the Python source is not
  modified by this integration.

## What Was NOT Changed

- `singularity/singularity/` — Python source is untouched
- Singularity's own `.env` and config files — untouched
- Git history — no commits made; files only
