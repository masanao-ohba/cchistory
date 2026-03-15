#!/bin/bash
# Start cchistory-next with OAuth token refresh
# Usage: ./start.sh [docker compose args]
#
# Examples:
#   ./start.sh              # Start all services
#   ./start.sh -d           # Start in background
#   ./start.sh up -d        # Same as above
#   ./start.sh down         # Stop services
#   ./start.sh stop         # Stop services and token server

set -e
cd "$(dirname "$0")"

# Handle stop/down commands
if [[ "$1" == "down" ]] || [[ "$1" == "stop" ]]; then
    # Kill token refresh server if running
    pkill -f "token-refresh-server.sh" 2>/dev/null || true
    docker compose "$@"
    exit 0
fi

# Refresh OAuth token before starting
./scripts/refresh-oauth-token.sh

# Start token refresh server in background (if not already running)
if ! pgrep -f "token-refresh-server.sh" > /dev/null; then
    echo "Starting token refresh server on port 18081..."
    nohup ./scripts/token-refresh-server.sh > /tmp/token-refresh-server.log 2>&1 &
    sleep 1
fi

# Run docker compose with any passed arguments
if [[ $# -eq 0 ]]; then
    docker compose up --build -d
else
    docker compose "$@"
fi

echo ""
echo "Token refresh server: http://localhost:18081/refresh"
