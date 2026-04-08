# ─────────────────────────────────────────────────────────────────────────────
# Frontend Dockerfile - Production Ready with Nginx
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build: Build React app, then serve with Nginx

# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build argument for API URL (passed during docker build)
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL

# Build the production bundle
RUN npm run build

# Stage 2: Production image with Nginx
FROM nginx:alpine AS production

# Add labels for better maintainability
LABEL maintainer="TnD Support Team"
LABEL description="Ticketing System Frontend"
LABEL version="1.0.0"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a script to inject environment variables at runtime
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-envsubst-on-index.sh && \
    echo 'if [ -n "$VITE_API_URL" ]; then' >> /docker-entrypoint.d/40-envsubst-on-index.sh && \
    echo '  sed -i "s|http://localhost:5000|$VITE_API_URL|g" /usr/share/nginx/html/assets/*.js' >> /docker-entrypoint.d/40-envsubst-on-index.sh && \
    echo 'fi' >> /docker-entrypoint.d/40-envsubst-on-index.sh && \
    chmod +x /docker-entrypoint.d/40-envsubst-on-index.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
