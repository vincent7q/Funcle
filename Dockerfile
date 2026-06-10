# Funcle — multi-stage production image (spec §15)
# Build:  docker build -t funcle .
# Run:    docker run -p 3000:3000 -v funcle-data:/data \
#           -e JWT_SECRET=... -e ADMIN_PASSWORD='...' funcle
#
# node:20-slim (Debian) is used so better-sqlite3 can use its prebuilt
# glibc binaries — alpine/musl would force a native compile.

# ---- Stage 1: build frontend (Vue 3 + Vite → static files) ----
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY shared/ shared/
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci
COPY frontend/ frontend/
RUN cd frontend && npm run build

# ---- Stage 2: build backend (tsc → dist/) ----
FROM node:20-slim AS backend-build
WORKDIR /app
COPY shared/ shared/
COPY backend/package.json backend/package-lock.json backend/
RUN cd backend && npm ci
COPY backend/ backend/
RUN cd backend && npm run build
# Prune dev dependencies for the runtime image
RUN cd backend && npm prune --omit=dev

# ---- Stage 3: runtime ----
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=frontend-build /app/frontend/dist ./public

# SQLite lives on a persistent volume mounted at /data (spec §15)
ENV PORT=3000 \
    DB_PATH=/data/funcle.db \
    STATIC_DIR=/app/public
VOLUME /data
EXPOSE 3000

# JWT_SECRET and ADMIN_PASSWORD (bcrypt hash) must be provided at runtime —
# they are deliberately NOT baked into the image.
CMD ["node", "dist/backend/server.js"]
