

HOST="${DB_HOST:-db}"
MYSQL_PORT="${DB_PORT:-3306}"
MAX_TRIES=30
COUNT=0

echo "[WAIT] Waiting for MySQL at $HOST:$MYSQL_PORT ..."

while [ $COUNT -lt $MAX_TRIES ]; do
  if nc -z "$HOST" "$MYSQL_PORT" 2>/dev/null; then
    echo "[WAIT] MySQL is up after $COUNT seconds. Starting app..."
    exec node app.js
  fi
  COUNT=$((COUNT + 1))
  echo "[WAIT] Attempt $COUNT/$MAX_TRIES — MySQL not ready yet. Retrying in 2s..."
  sleep 2
done

echo "[ERROR] MySQL did not become ready after $((MAX_TRIES * 2)) seconds. Exiting."
exit 1
