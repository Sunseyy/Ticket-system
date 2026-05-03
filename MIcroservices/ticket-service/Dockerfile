# ── Stage 1 : builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# ── Stage 2 : runtime ─────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node src/ ./src/

ENV PORT=3002 \
    NODE_ENV=production

EXPOSE 3002
USER node

CMD ["node", "src/server.js"]
