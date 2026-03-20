# Docker 3-Tier Application — FiftyFive Technologies DevOps Intern Assessment

A fully containerized 3-tier web application using **Nginx + Node.js + MySQL**, orchestrated with Docker Compose.

---

## Architecture Diagram

```
                        ┌────────────────────────────────────────────────────┐
                        │               Docker Custom Network (app_network)  │
                        │                                                    │
 ┌─────────┐  :80       │  ┌─────────────────┐     ┌──────────────────────┐  │
 │ Browser │ ─────────► │  │  TIER 1: Nginx  │     │  TIER 2: Node.js API │  │
 └─────────┘            │  │  nginx:alpine   │     │  node:18-alpine      │  │
                        │  │  port 80        │────►│  port 3000           │  │
                        │  │  /api → backend │     │  GET /               │  │
                        │  └─────────────────┘     │  GET /health         │  │
                        │                          └──────────┬───────────┘  │
                        │                                     │              │
                        │                          ┌──────────▼───────────┐  │
                        │                          │  TIER 3: MySQL       │  │
                        │                          │  mysql:8.0           │  │
                        │                          │  port 3306           │  │
                        │                          │  volume: mysql_data  │  │
                        │                          └──────────────────────┘  │
                        └────────────────────────────────────────────────────┘
```

**Only port 80 (Nginx) is exposed to the host.** Backend and DB are internal only.

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/SANIL8011/Docker-Assignment.git
cd Docker-Assignment
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` with your preferred values:

```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=appdb
MYSQL_USER=appuser
MYSQL_PASSWORD=apppassword
BACKEND_PORT=3000
```

### 3. Start the entire stack with one command

```bash
docker compose up --build
```

This will:
- Build the Nginx and Node.js images from their Dockerfiles
- Pull the MySQL 8.0 image
- Start all 3 containers on the custom `app_network`
- Wait for MySQL to be healthy before starting the backend
- Inject `BACKEND_URL` into Nginx config via `envsubst`

---

## How Each Requirement Is Implemented

### 1. Backend Waits for MySQL (Startup Dependency)

`depends_on` with `condition: service_healthy` ensures Docker does not start the backend until MySQL passes its healthcheck (`mysqladmin ping`).

Additionally, the backend container runs `wait-for-mysql.sh` as its entrypoint. This script uses `nc` (netcat) to probe `DB_HOST:DB_PORT` in a loop (up to 30 attempts, 2 seconds apart) before launching `node app.js`. This double-layer approach guarantees the backend never crashes permanently due to MySQL not being ready.

### 2. How Nginx Gets the Backend URL (Dynamic Config)

The `nginx.conf.template` file contains `${BACKEND_URL}` as a placeholder — the backend URL is never hardcoded. At container startup, the `CMD` in the frontend Dockerfile runs:

```sh
envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
```

This replaces `${BACKEND_URL}` with the value from the environment variable (e.g., `http://backend:3000`) before Nginx starts.

### 3. How Services Communicate

All services are on the custom bridge network `app_network`. Docker's internal DNS resolves service names (`db`, `backend`, `frontend`) to their container IPs automatically. No hardcoded IPs are used anywhere.

---

## Health Checks

| Service  | Health Check Command                            | Interval | Retries |
|----------|-------------------------------------------------|----------|---------|
| MySQL    | `mysqladmin ping -h localhost`                  | 10s      | 10      |
| Backend  | `wget -qO- http://localhost:3000/`              | 10s      | 5       |
| Frontend | `wget -qO- http://localhost/`                   | 10s      | 5       |

Check health status at any time:

```bash
docker compose ps
```

---

## Testing Steps

### Access the Frontend

Open your browser and go to:

```
http://localhost
```

You'll see the 3-tier dashboard page with an API test console.

### Test API via Nginx Proxy (browser)

Click the **GET /api/** or **GET /api/health** buttons on the page.

### Test API via curl

```bash
# Test root endpoint
curl http://localhost/api/

# Test health endpoint (checks DB connectivity)
curl http://localhost/api/health
```

Expected responses:

```json
// GET /api/
{ "status": "ok", "message": "Backend API is running", "timestamp": "..." }

// GET /api/health — DB connected
{ "status": "ok", "database": "connected", "timestamp": "..." }

// GET /api/health — DB down
{ "status": "error", "database": "disconnected", "error": "...", "timestamp": "..." }
```

### View logs from all services

```bash
docker compose logs -f
```

View logs for a specific service:

```bash
docker compose logs -f backend
docker compose logs -f db
docker compose logs -f frontend
```

---

## Failure Scenario: What Happens When MySQL Restarts

### Test it yourself

```bash
docker restart mysql_db
```

### What happens — step by step

| Time     | Event |
|----------|-------|
| 0s       | MySQL container stops. DB connections from backend are lost. |
| 0–2s     | `GET /api/health` returns `500` — `{ "status": "error", "database": "disconnected" }` |
| ~2s      | MySQL restarts (fast — data volume already exists, no reinitialization needed). |
| ~3s      | MySQL passes its healthcheck (`mysqladmin ping` succeeds). |
| ~3–5s    | Backend's next `GET /health` call reconnects successfully (mysql2 creates a new connection per request — no persistent pool to drain). |
| ~5s      | `GET /api/health` returns `200` — `{ "status": "ok", "database": "connected" }` |

### How recovery works

- The backend uses **`mysql2/promise`** with a fresh connection per `/health` request — there is no stale connection pool to clear.
- The backend itself **does not crash or restart** when MySQL goes down. It gracefully catches DB errors and returns a 500 response.
- Once MySQL is back up, the very next `/health` request automatically succeeds.
- **Recovery time: approximately 3–5 seconds** (fast because the data volume already exists — no reinitialization needed).

---

## Repository Structure

```
.
├── frontend/
│   ├── Dockerfile               # Nginx Alpine image, runs envsubst at startup
│   ├── nginx.conf.template      # Nginx config with ${BACKEND_URL} placeholder
│   └── index.html               # Static dashboard page with API test console
│
├── backend/
│   ├── Dockerfile               # Node.js Alpine image
│   ├── .dockerignore            # Excludes node_modules, .env, etc.
│   ├── app.js                   # Express API — GET / and GET /health
│   ├── package.json             # Dependencies: express, mysql2
│   └── wait-for-mysql.sh        # Startup script: waits for MySQL before launching app
│
├── docker-compose.yml           # Orchestrates all 3 services
├── .env.example                 # Placeholder env vars — safe to commit
├── .env                         # Your real secrets — DO NOT COMMIT (in .gitignore)
├── .gitignore
└── README.md
```

---

## Tech Stack

| Layer    | Technology        | Image             |
|----------|-------------------|-------------------|
| Frontend | Nginx             | `nginx:alpine`    |
| Backend  | Node.js + Express | `node:18-alpine`  |
| Database | MySQL             | `mysql:8.0`       |
