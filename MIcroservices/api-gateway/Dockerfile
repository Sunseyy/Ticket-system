FROM nginx:alpine AS runtime

# Supprimer la config par défaut
RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf

# OpenShift tourne avec un UID aléatoire — on donne les droits au groupe root
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx \
    && chmod -R g+rwX /var/cache/nginx /var/log/nginx /var/run

EXPOSE 8080
USER nginx

CMD ["nginx", "-g", "daemon off;"]
