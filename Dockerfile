# =========================================================
# Multi-Stage Dockerfile for Google Cloud Run Deployment
# Builds React frontend and packages Node.js backend
# =========================================================

# Stage 1: Build React Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Install Production Dependencies for Backend
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production

# Stage 3: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copy server dependencies and code
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY server/ ./server/

# Copy built frontend client assets
COPY --from=client-builder /app/client/dist ./client/dist

# Expose Google Cloud Run standard port
EXPOSE 8080

WORKDIR /app/server
CMD ["node", "src/server.js"]
