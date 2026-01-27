#!/bin/bash
# Refresh Anthropic OAuth token from macOS Keychain to file
# This script should be run periodically (e.g., every 30 minutes) via cron or launchd
#
# Usage:
#   ./scripts/refresh-oauth-token.sh          # One-time refresh
#   ./scripts/refresh-oauth-token.sh --watch  # Continuous refresh every 30 minutes

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TOKEN_FILE="${PROJECT_DIR}/secrets/oauth-token"

refresh_token() {
    # Only works on macOS
    if [[ "$(uname)" != "Darwin" ]]; then
        echo "Error: This script only works on macOS"
        return 1
    fi

    # Extract token from Keychain
    CREDENTIALS=$(security find-generic-password -s 'Claude Code-credentials' -w 2>/dev/null) || {
        echo "Error: Could not find 'Claude Code-credentials' in Keychain"
        return 1
    }

    # Parse OAuth token from JSON credentials
    TOKEN=$(echo "$CREDENTIALS" | jq -r '.claudeAiOauth.accessToken // empty')
    if [[ -z "$TOKEN" ]]; then
        echo "Error: Could not extract accessToken from credentials"
        return 1
    fi

    # Ensure secrets directory exists
    mkdir -p "$(dirname "$TOKEN_FILE")"

    # Write token to file (atomic write)
    TEMP_FILE=$(mktemp)
    echo -n "$TOKEN" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"

    echo "$(date '+%Y-%m-%d %H:%M:%S') - Token refreshed (${#TOKEN} chars)"
}

# Main
if [[ "$1" == "--watch" ]]; then
    echo "Starting OAuth token refresh daemon..."
    echo "Token file: $TOKEN_FILE"
    echo "Refresh interval: 30 minutes"
    echo ""

    while true; do
        refresh_token || true
        sleep 1800  # 30 minutes
    done
else
    refresh_token
fi
