#!/bin/bash

# Test script to send sample notification data to the notification endpoint
# Usage: ./test-notification.sh

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Claude Code Notification System${NC}"
echo "======================================="

# Test 1: Simple permission request
echo -e "\n${GREEN}Test 1: Simple Permission Request${NC}"
curl -X POST "http://localhost:18080/api/notifications/hook" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "permission_request",
    "project_id": "test-project",
    "notification": "Claude needs your permission to use",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }' \
  2>/dev/null

echo -e "\n✓ Simple notification sent"

# Test 2: Permission request with options
echo -e "\n${GREEN}Test 2: Permission Request with Options${NC}"
curl -X POST "http://localhost:18080/api/notifications/hook" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "permission_request",
    "project_id": "test-project",
    "notification": "Claude needs your permission to use the following tools",
    "details": {
      "options": [
        "Run build command: npm run build",
        "Execute test suite: npm test",
        "Stop development server: kill process on port 3000"
      ],
      "session_id": "test-session-123",
      "cwd": "/Users/test/project",
      "tool_count": 3
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }' \
  2>/dev/null

echo -e "\n✓ Notification with options sent"

# Test 3: Tool use notification with details
echo -e "\n${GREEN}Test 3: Tool Use Notification${NC}"
curl -X POST "http://localhost:18080/api/notifications/hook" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "tool_use",
    "project_id": "test-project",
    "notification": "Claude is requesting permission to use: Bash",
    "tool_name": "Bash",
    "tool_input": "npm install && npm run build",
    "details": {
      "session_id": "test-session-456",
      "transcript_path": "/Users/test/.claude/projects/test/session.jsonl",
      "cwd": "/Users/test/project",
      "options": [
        "Allow this operation",
        "Deny this operation",
        "Allow all Bash commands for this session"
      ],
      "risk_level": "medium",
      "description": "Install dependencies and build the project"
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }' \
  2>/dev/null

echo -e "\n✓ Tool use notification with detailed options sent"

# Test 4: Complex permission request
echo -e "\n${GREEN}Test 4: Complex Permission Request${NC}"
curl -X POST "http://localhost:18080/api/notifications/hook" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "permission_request",
    "project_id": "complex-project",
    "notification": "Claude needs permission for multiple operations",
    "details": {
      "message": "The following operations require your approval:",
      "options": [
        "1. Update package.json dependencies",
        "2. Modify 5 source files",
        "3. Run database migration",
        "4. Restart application server",
        "5. Clear application cache"
      ],
      "session_id": "complex-session-789",
      "cwd": "/Users/test/complex-project",
      "affected_files": [
        "package.json",
        "src/index.js",
        "src/components/App.vue",
        "database/migrations/001_initial.sql",
        "config/server.conf"
      ],
      "estimated_duration": "2-3 minutes",
      "risk_assessment": {
        "level": "high",
        "reason": "Database migration cannot be easily rolled back"
      }
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }' \
  2>/dev/null

echo -e "\n✓ Complex notification sent"

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${GREEN}All test notifications sent successfully!${NC}"
echo -e "\nCheck your notification popup in the web interface to see the results."
echo -e "The notifications should display with expandable detail sections."