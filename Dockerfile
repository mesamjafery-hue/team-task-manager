# =========================================================
# Multi-Stage Dockerfile for Google Cloud Run Deployment
# Builds the React frontend and packages the Node.js backend,
# which serves both the REST API and the built SPA.
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
RUN npm ci --omit=dev

# Stage 3: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copy server dependencies and code
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY server/package.json ./server/package.json
COPY server/src ./server/src
COPY server/migrations ./server/migrations

# Copy built frontend client assets
COPY --from=client-builder /app/client/dist ./client/dist

# Run as the unprivileged "node" user that ships with the image
USER node

# Cloud Run sends traffic to $PORT (8080 by default) on 0.0.0.0
EXPOSE 8080

WORKDIR /app/server
CMD ["node", "src/server.js"]
