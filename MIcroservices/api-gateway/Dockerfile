FROM nginx:alpine AS runtime

RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf

RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx \
    && chmod -R g+rwX /var/cache/nginx /var/log/nginx /var/run \
    && chmod 777 /run

EXPOSE 8080
USER nginx

CMD ["nginx", "-g", "daemon off;"]
