# ── Stage 1 : builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# ── Stage 2 : runtime ─────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Copier les dépendances du builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copier uniquement le code source (pas tout le repo)
COPY --chown=node:node src/ ./src/

# Variables d'environnement
ENV PORT=3004 \
    NODE_ENV=production

EXPOSE 3004

# Non-root user AVANT le CMD
USER node

CMD ["node", "src/server.js"]
