# ─────────────────────────────────────────────────────────────────────────────
# Backend Dockerfile - Production Ready
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build for smaller image size and better security

# Stage 1: Build dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including dev for any build steps)
RUN npm ci --only=production

# Stage 2: Production image
FROM node:20-alpine AS production

# Add labels for better maintainability
LABEL maintainer="TnD Support Team"
LABEL description="Ticketing System Backend API"
LABEL version="1.0.0"

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Set environment defaults (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=5000

# Change ownership of the app directory to the built-in node user
RUN chown -R node:node /app

# Switch to the non-root user
USER node

# Expose the port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "server.js"]
