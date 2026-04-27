#--Build stage 
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

#--Runtime stage 
FROM gcr.io/distroless/nodejs:20-debian12
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

ENV PORT=3001 NODE_ENV=production
EXPOSE 3001
CMD ["dist/server.js"]