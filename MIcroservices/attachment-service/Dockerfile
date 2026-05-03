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

# uploads doit appartenir à node pour qu'il puisse écrire dedans
RUN mkdir -p uploads && chown -R node:node uploads

ENV PORT=3004 \
    NODE_ENV=production

EXPOSE 3004
USER node

CMD ["node", "src/server.js"]
