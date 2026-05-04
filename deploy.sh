#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  AInswer Frontend — Deploy Script
#  Usage: bash deploy.sh
#  Run this on your server after SSH-ing in.
# ─────────────────────────────────────────────────────────────

set -e  # Stop on any error

BRANCH="feature/settings-and-tools-integration"
CONTAINER="ainswer-frontend"
IMAGE="ainswer-frontend"
PORT="8002"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AInswer Frontend — Deploying..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Pull latest code
echo "→ Pulling latest code from branch: $BRANCH"
git pull origin $BRANCH

# 2. Build new Docker image
echo "→ Building Docker image..."
docker build -t $IMAGE .

# 3. Stop & remove old container (ignore error if not running)
echo "→ Stopping old container (if running)..."
docker stop $CONTAINER 2>/dev/null || true
docker rm   $CONTAINER 2>/dev/null || true

# 4. Start fresh container
echo "→ Starting new container on port $PORT..."
docker run -d -p $PORT:80 --name $CONTAINER --restart unless-stopped $IMAGE

echo ""
echo "✅ Deployed! App is running at http://YOUR_SERVER_IP:$PORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
