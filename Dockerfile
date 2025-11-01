# Use the official Node.js 18 Alpine image as base
FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Install necessary packages for microservice operations
RUN apk add --no-cache dumb-init curl netcat-openbsd

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY tsconfig.json ./
COPY . .
EXPOSE 3001
CMD ["dumb-init", "sh", "-c", "until nc -z mongodb 27017 && nc -z redis 6379; do echo 'Waiting for services...'; sleep 2; done; npm run dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci --include=dev
COPY tsconfig.json ./
COPY . .
# Compile TypeScript without failing on linting
RUN npx tsc -p tsconfig.json && \
  npm prune --omit=dev && \
  npm cache clean --force

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy built application and production dependencies
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Create logs directory and set permissions for non-root user
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose the application port
EXPOSE 3001

# Health check for container orchestration (checks if service responds)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Wait for dependencies and start the application
CMD ["dumb-init", "sh", "-c", "until nc -z mongodb 27017 && nc -z redis 6379; do echo 'Waiting for services...'; sleep 2; done; npm start"]
