# Claude Conversations History Viewer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688.svg)](https://fastapi.tiangolo.com/)

A web-based viewer for browsing and searching your Claude Code conversation history with real-time sync, multi-project support, and powerful filtering.

![Claude Conversations History Viewer](screenshot.png)

*Main interface showing conversation history with search and filtering capabilities (dark mode)*

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
- [Hooks Integration](#hooks-integration)
- [Token Usage](#token-usage)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)

## Quick Start

1. **Clone and configure**
   ```bash
   git clone https://github.com/masanao-ohba/cchistory.git
   cd cchistory
   cp .env.example .env
   ```

2. **Start the application**
   ```bash
   ./start.sh
   ```

3. **Open in browser**
   ```
   http://localhost:18080
   ```

## Features

- **Lightweight & Fast** - Dockerized microservice architecture with Turbopack for instant hot reloading
- **Responsive Design** - Modern UI built with Tailwind CSS v4 for comfortable browsing experience
- **Dark/Light Mode** - Theme switcher with system preference support (toggle in bottom-right corner)
- **Multi-language Support** - Full internationalization with English, Japanese, Chinese, and Korean
- **Flexible Search** - Filter by date, project, and keywords with quick filter buttons
- **Real-time Updates** - Automatic updates via WebSocket with streaming Server Components
- **Multi-project Support** - Integrated display of multiple Claude projects with project tabs
- **Claude Code Hooks Integration** - Real-time notifications from Claude Code hooks
- **Token Usage Tracking** - Monitor session and weekly usage via OAuth API integration
- **Configurable** - Flexible configuration through environment variables

## How It Works

**Docker Container Structure:**
```
                        +-----------------------+
                        |    Nginx (Port 80)    |
                        |  - Reverse Proxy      |
                        |  - Static Files       |
                        +-----------+-----------+
                                    |
              +---------------------+---------------------+
              |                                           |
+-------------v-------------+             +---------------v---------------+
|  Next.js Frontend (3000)  |             |   FastAPI Backend (8000)      |
|  - React 19 + App Router  |             |   - REST API                  |
|  - TanStack React Query   |             |   - WebSocket                 |
|  - Zustand State          |             |   - File Watcher              |
|  - Tailwind CSS v4        |             +---------------+---------------+
+---------------------------+                             |
                                                          | Volume Mount
                                                          | (Read-Only)
                                                          v
                                          +-------------------------------+
                                          |   Host: ~/.claude/projects/   |
                                          |   - project1/session1.jsonl   |
                                          |   - project2/session2.jsonl   |
                                          +-------------------------------+
```

<details>
<summary><strong>Technology Stack</strong></summary>

**Frontend:**
- Next.js 15.5 with Turbopack (React framework with App Router, Server Components, Suspense streaming)
- React 19.1 (Latest React with concurrent features)
- TypeScript 5 (Type-safe JavaScript)
- Tailwind CSS v4 (Modern utility-first CSS framework)
- TanStack React Query v5 (Server state management)
- Zustand (Client state management)
- next-intl (Internationalization - EN, JA, ZH, KO)

**Backend:**
- FastAPI (High-performance Python web framework)
- uvicorn (ASGI server)
- watchdog (File monitoring)
- WebSocket (Real-time communication)
- Pydantic (Data validation)

**Infrastructure:**
- Docker & Docker Compose
- Nginx (Reverse proxy)
- Alpine Linux (Lightweight container images)

</details>

## Configuration

Configure the application using environment variables in `.env`.

### Changing Port

```bash
echo "VIEWER_PORT=19080" >> .env
./start.sh stop && ./start.sh
```

### ngrok Public Access with OAuth

Expose the application to the internet with Google OAuth authentication:

1. Get ngrok credentials at [ngrok.com](https://ngrok.com)
2. Configure `.env`:
   ```bash
   NGROK_AUTHTOKEN=your_authtoken_here
   NGROK_DOMAIN=your-domain.ngrok-free.app
   NGROK_OAUTH_ALLOW_EMAIL=your-email@gmail.com
   ```
3. Start with `./start.sh`
4. Access via your ngrok domain

<details>
<summary><strong>Environment Variables Reference</strong></summary>

| Variable | Default | Description |
|----------|---------|-------------|
| `VIEWER_PORT` | `18080` | Application port |
| `CLAUDE_PROJECTS_PATH` | `~/.claude/projects` | Path to Claude projects |
| `CLAUDE_PROJECTS` | - | Specific project paths (comma-separated or JSON array) |
| `TIMEZONE` | `Asia/Tokyo` | Display timezone |
| `LOG_LEVEL` | `INFO` | Logging level |
| `NGROK_AUTHTOKEN` | - | ngrok authentication token |
| `NGROK_DOMAIN` | - | ngrok domain name |
| `NGROK_OAUTH_ALLOW_EMAIL` | - | Allowed email address for OAuth |
| `NGROK_OAUTH_ALLOW_DOMAIN` | - | Allowed email domain for OAuth |

</details>

## Hooks Integration

Receive real-time notifications from Claude Code hooks across multiple projects.

### Setup

```bash
# Install hooks for a project
./scripts/install-hooks.sh --target-project-path /path/to/your/project

# Preview changes without applying
./scripts/install-hooks.sh --target-project-path ~/myproject --dry-run
```

The script automatically reads port settings from `.env` and configures the webhook URL.

### Supported Notification Types

- **Permission Requests** - When Claude Code requests permissions
- **Tool Usage** - When Claude Code uses tools like file operations
- **General Notifications** - Other Claude Code activity

### Viewing Notifications

Click the notification bell icon in the top-right corner to view real-time notifications. You can mark them as read/unread or delete them individually.

<details>
<summary><strong>Advanced Hook Configuration</strong></summary>

#### Manual Hook Installation

If you prefer to configure hooks manually, add the following to your project's `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:18080/api/notifications/hook -H 'Content-Type: application/json' -d '{\"type\":\"PreToolUse\",\"tool\":\"'\"$TOOL_NAME\"'\",\"project_id\":\"'\"$(basename $(pwd))\"'\"}'"
          }
        ]
      }
    ]
  }
}
```

#### Testing Webhook Endpoint

```bash
curl -X POST http://localhost:18080/api/notifications/hook \
  -H "Content-Type: application/json" \
  -d '{"type":"test","project_id":"test","notification":"test","timestamp":"2024-01-01T00:00:00Z"}'
```

</details>

## Token Usage

Display real-time token usage from the Anthropic API, showing session and weekly limits matching the official Claude Code status.

### Data Sources

1. **Anthropic API** (preferred): Real-time usage data via OAuth token
2. **Local JSONL files** (fallback): Estimated usage from conversation history

### OAuth Token Refresh (macOS only)

The `start.sh` script starts a lightweight HTTP server on port 18081 that extracts the OAuth token from macOS Keychain. If the token expires, click the "Refresh" button in the token usage panel.

```bash
# Refresh token manually
./scripts/refresh-oauth-token.sh

# Check token refresh server status
curl http://localhost:18081/refresh
```

<details>
<summary><strong>How Token Tracking Works</strong></summary>

#### OAuth API Integration

When available, the application fetches real-time usage data from the Anthropic API using the OAuth token stored in macOS Keychain. This provides accurate session and weekly usage matching the official Claude Code interface.

#### Local JSONL Estimation

On non-macOS systems or when OAuth is unavailable, the application estimates token usage by analyzing local conversation JSONL files. This method counts tokens from conversation history but may not match the exact API usage.

#### Non-macOS Usage

On Linux/Windows, the application falls back to local JSONL estimation:

```bash
export ANTHROPIC_OAUTH_TOKEN="your_token_here"
docker compose up -d
```

</details>

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/conversations` | GET | Retrieve conversation history |
| `/api/projects` | GET | Get list of available projects |
| `/api/token-usage` | GET | Get token usage statistics |
| `/api/notifications/hook` | POST | Receive Claude Code hooks notifications |
| `/api/notifications` | GET | Get notification history |
| `/ws/updates` | WebSocket | Real-time updates |

<details>
<summary><strong>Endpoint Parameters</strong></summary>

### GET `/api/conversations`

| Parameter | Description |
|-----------|-------------|
| `start_date` | Start date (YYYY-MM-DD) |
| `end_date` | End date (YYYY-MM-DD) |
| `project[]` | Project IDs (multiple allowed) |
| `keyword` | Search keyword |
| `offset` | Offset (default: 0) |
| `limit` | Number of items (default: 100, max: 1000) |

### GET `/api/projects`

No parameters required. Returns a list of available projects with their IDs and names.

### GET `/api/token-usage`

No parameters required. Returns current session and weekly token usage statistics.

### POST `/api/notifications/hook`

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Notification type (e.g., "PreToolUse", "PostToolUse") |
| `project_id` | string | Project identifier |
| `tool` | string | Tool name (optional) |
| `notification` | string | Notification message (optional) |
| `timestamp` | string | ISO 8601 timestamp |

### WebSocket `/ws/updates`

Connects to receive real-time updates for:
- New conversations
- Updated conversations
- New notifications

</details>

## Troubleshooting

<details>
<summary><strong>Port Already in Use</strong></summary>

```bash
echo "VIEWER_PORT=19080" >> .env
./start.sh stop && ./start.sh
```

</details>

<details>
<summary><strong>Claude Projects Not Found</strong></summary>

```bash
ls -la ~/.claude/projects
echo "CLAUDE_PROJECTS_PATH=/path/to/claude/projects" >> .env
```

</details>

<details>
<summary><strong>Data Not Displayed</strong></summary>

```bash
docker compose logs backend
docker compose ps
```

</details>

<details>
<summary><strong>Claude Code Hooks Not Working</strong></summary>

```bash
# Check hooks installation
cat .claude/settings.local.json

# Test webhook endpoint
curl -X POST http://localhost:18080/api/notifications/hook \
  -H "Content-Type: application/json" \
  -d '{"type":"test","project_id":"test","notification":"test","timestamp":"2024-01-01T00:00:00Z"}'
```

</details>

<details>
<summary><strong>Token Usage Not Displaying</strong></summary>

```bash
# Check if token refresh server is running
pgrep -f token-refresh-server.sh

# Restart with start.sh
./start.sh stop && ./start.sh

# Check OAuth token file
cat ./secrets/oauth-token | head -c 50
```

**Common causes:**
- Token refresh server not running (use `./start.sh` instead of `docker compose up`)
- Claude Code not logged in (run `claude` CLI and log in first)
- Not on macOS (OAuth token refresh requires macOS Keychain access)

</details>

<details>
<summary><strong>Checking Logs</strong></summary>

```bash
docker compose logs -f              # All services
docker compose logs -f backend      # Backend only
docker compose logs -f frontend-nextjs  # Frontend only
```

</details>

## Development

### Local Development Setup

```bash
# Start with hot reload
docker compose up --build

# Frontend development
cd frontend-nextjs
npm install
npm run dev  # Starts Next.js with Turbopack on port 3000

# Backend development
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## Contributing

1. Fork and create a development branch
2. Implement your changes
3. Run tests
4. Create a Pull Request

## License

MIT License

## Author

Masanao Ohba

## Support

If you encounter any issues or have questions, please create an issue on [GitHub Issues](https://github.com/masanao-ohba/cchistory/issues).
