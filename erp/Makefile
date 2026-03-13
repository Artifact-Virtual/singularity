# ─────────────────────────────────────────────────────────────────────────────
#  Artifact Virtual ERP — Makefile
#  Manages backend (Fastify/Prisma, Node.js) and studio (React/Vite)
#
#  Targets:
#    make install  — npm install in backend/ and studio/app/
#    make dev      — start both in development mode (parallel)
#    make build    — build studio (Vite), compile backend (tsc)
#    make start    — production start (requires prior `make build`)
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: install dev build start \
        install-backend install-studio \
        dev-backend dev-studio \
        build-backend build-studio \
        start-backend start-studio

# ── Paths ────────────────────────────────────────────────────────────────────
BACKEND_DIR  := backend
STUDIO_DIR   := studio/app

# ── Composite targets ────────────────────────────────────────────────────────

## install: npm install in both backend and studio
install: install-backend install-studio

## dev: start backend and studio in parallel dev mode
dev:
	@echo "→ Starting ERP backend and studio in dev mode…"
	@$(MAKE) -j2 dev-backend dev-studio

## build: compile backend TypeScript + Vite-build studio
build: build-backend build-studio

## start: production start (backend compiled dist, studio served via nginx/static)
start: start-backend start-studio

# ── Backend ──────────────────────────────────────────────────────────────────

install-backend:
	@echo "→ Installing backend dependencies…"
	cd $(BACKEND_DIR) && npm install

dev-backend:
	@echo "→ Starting backend in dev mode (tsx watch, port 3100)…"
	cd $(BACKEND_DIR) && npm run dev

build-backend:
	@echo "→ Compiling backend TypeScript…"
	cd $(BACKEND_DIR) && npm run build

start-backend:
	@echo "→ Starting backend in production mode…"
	cd $(BACKEND_DIR) && npm start

# ── Studio ───────────────────────────────────────────────────────────────────

install-studio:
	@echo "→ Installing studio dependencies…"
	cd $(STUDIO_DIR) && npm install

dev-studio:
	@echo "→ Starting studio dev server (Vite, port 5173)…"
	cd $(STUDIO_DIR) && npm run dev

build-studio:
	@echo "→ Building studio for production…"
	cd $(STUDIO_DIR) && npm run build

start-studio:
	@echo "→ Previewing studio production build…"
	cd $(STUDIO_DIR) && npm run preview
