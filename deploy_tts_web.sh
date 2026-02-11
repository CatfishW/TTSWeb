#!/bin/bash
# TTSWeb Frontend Deployment Script
# Deploys frontend to vpn.agaii.org:/mnt/data/Yanlai/TTS/

set -e

REMOTE_USER="lobin"
REMOTE_HOST="vpn.agaii.org"
REMOTE_PATH="/mnt/data/Yanlai/TTS/"
FRONTEND_DIR="$HOME/frontend-temp"

echo "======================================"
echo "TTSWeb Frontend Deployment"
echo "======================================"
echo ""

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Error: Frontend directory not found at $FRONTEND_DIR"
    echo "Make sure the frontend is built first:"
    echo "  cd ~/frontend-temp && npm run build"
    exit 1
fi

# Check if dist folder exists
if [ ! -d "$FRONTEND_DIR/dist" ]; then
    echo "Error: dist folder not found. Building..."
    cd "$FRONTEND_DIR"
    npm run build
fi

echo "1. Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 "$REMOTE_USER@$REMOTE_HOST" "echo 'OK'" > /dev/null 2>&1; then
    echo "Error: Cannot connect to remote server"
    exit 1
fi
echo "   ✓ SSH connection OK"

echo ""
echo "2. Creating remote directory..."
ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH"
echo "   ✓ Directory ready"

echo ""
echo "3. Copying files to remote server..."
rsync -avz --delete "$FRONTEND_DIR/dist/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"
echo "   ✓ Files copied"

echo ""
echo "4. Verifying deployment..."
ssh "$REMOTE_USER@$REMOTE_HOST" "ls -la $REMOTE_PATH"
echo "   ✓ Deployment verified"

echo ""
echo "5. Testing web access..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://mc.agaii.org/TTS/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✓ Web interface accessible (HTTP 200)"
else
    echo "   ⚠ Web interface returned HTTP $HTTP_CODE"
fi

echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo ""
echo "Access URL: https://mc.agaii.org/TTS/"
echo "API Health: https://mc.agaii.org/TTS/api/v1/health"
echo ""
