FROM postgres:15-alpine

# Copie du script d'initialisation
COPY init.sql /docker-entrypoint-initdb.d/init.sql

# Entrypoint : attend la DB, exécute le script, puis sort
ENTRYPOINT ["sh", "-c", "\
  echo '⏳ Attente de la base de données...'; \
  until pg_isready -h $DB_HOST -U $DB_USER -d $DB_NAME; do \
    sleep 2; \
  done; \
  echo '✅ DB prête. Exécution du script...'; \
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /docker-entrypoint-initdb.d/init.sql; \
  echo '🏁 Initialisation terminée.' \
"]  