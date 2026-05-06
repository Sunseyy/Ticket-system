
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS production
LABEL maintainer="TnD Support Team"
LABEL description="Ticketing System Frontend"
LABEL version="1.0.0"

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R g+rwX /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx \
    && chmod -R g+rwX /var/cache/nginx /var/log/nginx /var/run

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1
USER nginx
CMD ["nginx", "-g", "daemon off;"]
EOF
