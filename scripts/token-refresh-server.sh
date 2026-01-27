#!/bin/bash
# Lightweight HTTP server for OAuth token refresh
# Listens on port 18081 and refreshes token when called
# Usage: ./scripts/token-refresh-server.sh

# Note: Intentionally NOT using set -e to keep server running on errors
PORT=18081
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TOKEN_FILE="${PROJECT_DIR}/secrets/oauth-token"

refresh_token() {
    if [[ "$(uname)" != "Darwin" ]]; then
        echo '{"success":false,"error":"Not on macOS"}'
        return
    fi

    CREDENTIALS=$(security find-generic-password -s 'Claude Code-credentials' -w 2>/dev/null) || {
        echo '{"success":false,"error":"Keychain access failed"}'
        return
    }

    TOKEN=$(echo "$CREDENTIALS" | jq -r '.claudeAiOauth.accessToken // empty')
    if [[ -z "$TOKEN" ]]; then
        echo '{"success":false,"error":"No token in credentials"}'
        return
    fi

    mkdir -p "$(dirname "$TOKEN_FILE")"
    echo -n "$TOKEN" > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"

    echo "{\"success\":true,\"message\":\"Token refreshed\",\"length\":${#TOKEN}}"
}

echo "Token refresh server starting on port $PORT..."
echo "Endpoint: http://localhost:$PORT/refresh"

# Simple HTTP server using netcat
while true; do
    RESPONSE=$(refresh_token)
    echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\nConnection: close\r\n\r\n${RESPONSE}" | nc -l $PORT > /dev/null 2>&1 || {
        echo "$(date '+%Y-%m-%d %H:%M:%S') - nc error, retrying..."
        sleep 1
        continue
    }
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Request handled"
    sleep 0.1  # Small delay to ensure port is released
done
