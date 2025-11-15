# Lightsail single-instance deployment (≈ $5/mo)

## 1. Create instance
- Plan: **$5** (1 GB RAM, 1 vCPU, 40 GB SSD)  
- Image: **Ubuntu 22.04 LTS**  
- Open ports **80 & 443** only (delete default 22 if you use Session Manager)

## 2. Connect & install Docker
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker
```

## 3. Clone repo & env files
```bash
git clone <repo> app && cd app
cp .env.example .env              # fill DB / JWT secrets
cp frontend/.env.example frontend/.env
```

## 4. docker-compose.yml (prod)
```yaml
version: "3.9"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks: [internal]
  backend:
    build: .
    env_file: .env
    networks: [internal]
  frontend:
    build: frontend
    networks: [internal]
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /opt/ssl:/etc/nginx/ssl:ro
    networks: [internal]
    depends_on: [backend, frontend]
volumes: { pgdata: }
networks:
  internal:
    driver: bridge
```

## 5. nginx.conf (SPA + /api proxy)
```nginx
events { worker_connections 1024; }
http {
  upstream backend { server backend:8000; }
  upstream frontend { server frontend:5173; }
  server {
    listen 80;
    location /api/ { proxy_pass http://backend/; }
    location / { proxy_pass http://frontend/; try_files $uri $uri/ /index.html; }
  }
}
```

## 6. SSL (Lightsail console)
- DNS zone → create A record → **Lightsail certificate** (free) → attach to instance
- Download bundle → `scp` to `/opt/ssl` on server
- Edit nginx.conf to add `listen 443 ssl; ssl_certificate ...`

## 7. Build & run
```bash
docker compose -f docker-compose.yml up -d --build
```

## 8. Parent ↔ child control (internal)
- Parent container joins same `internal` network → calls `http://backend:8000/health`  
- No extra public ports; all traffic via nginx

## 9. Zero-downtime restart script
```bash
#!/bin/bash
cd ~/app
git pull
docker compose build backend frontend
docker compose up -d --no-deps backend frontend
```

## 10. Scale later
- **Vertical**: snapshot → create bigger plan → re-attach IP
- **Horizontal**: export DB snapshot → move to managed RDS → change `DB_HOST` in `.env`

> Keep an off-instance backup of `/opt/ssl` and latest snapshot for disaster recovery.