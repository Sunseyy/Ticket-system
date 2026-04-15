FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN mkdir -p uploads
ENV PORT=3004 NODE_ENV=production
EXPOSE 3004
USER node
CMD ["node", "src/server.js"]
