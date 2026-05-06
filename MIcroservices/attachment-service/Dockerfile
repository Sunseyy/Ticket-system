# ── Stage 1 : builder ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && \
    npm install --save-exact \
      cross-spawn@7.0.5 \
      glob@10.5.0 \
      minimatch@9.0.7 \
      tar@7.5.11
# ── Stage 2 : runtime ─────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node src/ ./src/
RUN mkdir -p uploads && chown -R node:node uploads
ENV PORT=3004 \
    NODE_ENV=production
EXPOSE 3004
USER node
CMD ["node", "src/server.js"]
