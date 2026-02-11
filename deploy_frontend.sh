#!/bin/bash
# TTSWeb Frontend Deployment Script
# Deploys frontend to vpn.agaii.org:/mnt/data/Yanlai/TTS/

set -e

REMOTE_USER="lobin"
REMOTE_HOST="vpn.agaii.org"
REMOTE_PATH="/mnt/data/Yanlai/TTS/"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "======================================"
echo "TTSWeb Frontend Deployment"
echo "======================================"
echo ""

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Error: Frontend directory not found at $FRONTEND_DIR"
    echo "Make sure the frontend exists:"
    echo "  $SCRIPT_DIR/frontend/"
    exit 1
fi

# Navigate to frontend directory
cd "$FRONTEND_DIR"

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "1. Building frontend..."
npm run build

echo ""
echo "2. Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 "$REMOTE_USER@$REMOTE_HOST" "echo 'OK'" > /dev/null 2>&1; then
    echo "Error: Cannot connect to remote server"
    exit 1
fi
echo "   ✓ SSH connection OK"

echo ""
echo "3. Creating remote directory..."
ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH"
echo "   ✓ Directory ready"

echo ""
echo "4. Copying files to remote server..."
rsync -avz --delete "dist/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"
echo "   ✓ Files copied"

echo ""
echo "5. Verifying deployment..."
ssh "$REMOTE_USER@$REMOTE_HOST" "ls -la $REMOTE_PATH"
echo "   ✓ Deployment verified"

echo ""
echo "6. Testing web access..."
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
