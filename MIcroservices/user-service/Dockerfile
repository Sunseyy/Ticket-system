#--Build stage 
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

#--Runtime stage (secure)
FROM gcr.io/distroless/nodejs:20-debian12
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

ENV PORT=3003 NODE_ENV=production
EXPOSE 3003
CMD ["dist/server.js"]
