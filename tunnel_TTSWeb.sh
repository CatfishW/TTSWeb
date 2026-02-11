#!/bin/bash
# Reverse SSH Tunnel Maintainer for Terminal Dashboard

REMOTE_USER="lobin"
REMOTE_HOST="vpn.agaii.org"
REMOTE_PORT=24536
LOCAL_PORT=24536
RECONNECT_DELAY=5

echo "=== SSH Tunnel ==="
echo "Forwarding: $REMOTE_HOST:$REMOTE_PORT -> 127.0.0.1:$LOCAL_PORT"
echo "Started at: $(date)"
echo ""

# Check local server
curl -s --max-time 2 http://127.0.0.1:$LOCAL_PORT/api/health >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "[OK] Local backend is responding on port $LOCAL_PORT"
else
    echo "[WARN] Local backend not responding on port $LOCAL_PORT"
fi
echo ""

# Main loop with auto-reconnect
ATTEMPT=0
while true; do
    ((ATTEMPT++))
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting tunnel (attempt #$ATTEMPT)..."
    
    ssh -R $REMOTE_PORT:127.0.0.1:$LOCAL_PORT \
        -o ServerAliveInterval=30 \
        -o ServerAliveCountMax=3 \
        -o ExitOnForwardFailure=yes \
        -o StrictHostKeyChecking=no \
        -N $REMOTE_USER@$REMOTE_HOST
    
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tunnel closed normally"
        break
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] Tunnel disconnected (exit code: $EXIT_CODE). Reconnecting in ${RECONNECT_DELAY}s..."
        sleep $RECONNECT_DELAY
    fi
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tunnel maintainer exiting"


