# Claude Conversations History Viewer

A modern web application for viewing and searching Claude CLI conversation history.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-green.svg)](https://vuejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688.svg)](https://fastapi.tiangolo.com/)

## Features

- 🚀 **Lightweight & Fast** - Dockerized microservice architecture
- 📱 **Responsive Design** - Modern UI for comfortable browsing experience
- 🔍 **Flexible Search** - Filter by date, project, and keywords
- ⚡ **Real-time Updates** - Automatic updates via WebSocket
- 🎯 **Multi-project Support** - Integrated display of multiple Claude projects
- 🔔 **Claude Code Hooks Integration** - Real-time notifications from Claude Code hooks
- 🔧 **Configurable** - Flexible configuration through environment variables

## Screenshots

![Claude Conversations History Viewer](screenshot.png)

*Main interface showing conversation history with search and filtering capabilities*

## Requirements

- Docker & Docker Compose
- Claude CLI (with data in `~/.claude/projects`)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/masanao-ohba/cchistory.git
cd cchistory
```

### 2. Configuration

```bash
# Copy the configuration file
cp .env.example .env

# Edit the configuration as needed
vim .env
```

### 3. Launch

```bash
# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 4. Access

Open your browser and navigate to http://localhost:18080

## Claude Code Hooks Integration

This application can receive real-time notifications from Claude Code hooks, allowing you to monitor Claude CLI activity across multiple projects.

### Setup Hooks

1. **Install hooks for a project** (run from cchistory directory):
   ```bash
   # Navigate to the cchistory directory
   cd /path/to/cchistory
   
   # Run the hooks installer with target project path
   ./scripts/install-hooks.sh --target-project-path /path/to/your/claude/project
   ```

2. **Automatic setup** - The script will:
   - Read port settings from this project's `.env` file
   - Configure webhook URL automatically
   - Install hooks to the target project's `.claude/settings.local.json`

3. **Restart Claude Code** to apply the changes

### Advanced Hook Configuration

```bash
# Basic usage
./scripts/install-hooks.sh --target-project-path ~/myproject

# Specify custom notification receiver path
./scripts/install-hooks.sh --target-project-path ~/myproject --notification-receiver-path ~/cchistory

# Use custom port
./scripts/install-hooks.sh --target-project-path ~/myproject --port 8080

# Preview changes without applying
./scripts/install-hooks.sh --target-project-path ~/myproject --dry-run

# Get help
./scripts/install-hooks.sh --help
```

### Supported Notification Types

- **Permission Requests** - When Claude Code requests permissions
- **Tool Usage** - When Claude Code uses tools like file operations
- **General Notifications** - Other Claude Code activity

### Viewing Notifications

- Click the notification bell icon in the top-right corner
- Real-time notifications appear immediately
- Mark notifications as read/unread
- Delete individual notifications
- Mark all notifications as read

## Development

```bash
# Start with development Docker Compose
docker-compose -f docker-compose.yml up --build

# Check logs
docker-compose -f docker-compose.yml logs -f
```

In development mode, you can access:
- Frontend: http://localhost:3000 (Vite dev server)
- Backend: http://localhost:8000 (FastAPI)

Files are automatically reloaded when edited.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VIEWER_PORT` | `18080` | Application port |
| `CLAUDE_PROJECTS_PATH` | `~/.claude/projects` | Path to Claude projects |
| `CLAUDE_PROJECTS` | - | Specific project paths (comma-separated or JSON array) |
| `TIMEZONE` | `Asia/Tokyo` | Display timezone |
| `LOG_LEVEL` | `INFO` | Logging level |
| `NGROK_AUTHTOKEN` | - | ngrok authentication token |
| `NGROK_DOMAIN` | - | ngrok domain name |
| `NGROK_OAUTH_ALLOW_EMAIL` | - | Allowed email address for OAuth (single value, can be used with domain) |
| `NGROK_OAUTH_ALLOW_DOMAIN` | - | Allowed email domain for OAuth (single value, can be used with email) |

### ngrok Public Access with OAuth

You can expose this application to the internet using ngrok with Google OAuth authentication:

1. **Get ngrok credentials**: Sign up at [ngrok.com](https://ngrok.com) and get your authtoken and domain
2. **Configure `.env`**:
   ```bash
   NGROK_AUTHTOKEN=your_authtoken_here
   NGROK_DOMAIN=your-domain.ngrok-free.app
   NGROK_OAUTH_ALLOW_EMAIL=your-email@gmail.com
   NGROK_OAUTH_ALLOW_DOMAIN=your-company.com
   ```
3. **Start with ngrok**: `docker-compose up -d`
4. **Access**: Visit your ngrok domain (e.g., `https://your-domain.ngrok-free.app`)

Users will be prompted to authenticate with Google, and only authorized emails/domains can access the application.

### Changing Port

If the port conflicts with other services:

```bash
# Edit .env file
echo "VIEWER_PORT=19080" >> .env

# Restart
docker-compose down
docker-compose up -d
```

### Custom Claude Projects Path

```bash
# Edit .env file
echo "CLAUDE_PROJECTS_PATH=/path/to/your/claude/projects" >> .env

# Restart
docker-compose down
docker-compose up -d
```

### Specific Project Selection

```bash
# Select specific projects (comma-separated)
echo "CLAUDE_PROJECTS=project1,project2" >> .env

# Or use JSON array format
echo 'CLAUDE_PROJECTS=["project1", "project2"]' >> .env
```

## Usage

### Basic Operations

1. **View All**: Initially displays all conversations
2. **Date Filter**: Search by date range using start and end dates
3. **Project Filter**: Display only specific projects
4. **Keyword Search**: Search within conversation content
5. **Quick Filters**: Convenient buttons for Today, Yesterday, Past 7 days, Past 30 days
6. **Notifications**: Real-time Claude Code hooks notifications via bell icon

### Real-time Updates

- WebSocket automatically reflects new conversations
- Connection status indicator in the bottom right corner

### Performance

- Pagination for handling large amounts of data
- Initial display of 100 items, load more on demand
- Fast operation through file monitoring and caching

## Architecture

**Docker Container Structure:**
```
├── Nginx (Port 80)
│   ├── Reverse Proxy
│   └── Static File Serving
├── Vue.js Frontend  
│   ├── Modern SPA
│   └── Tailwind CSS
└── FastAPI Backend (Port 8000)
    ├── REST API
    ├── WebSocket  
    └── File Watcher
```

**↑ Volume Mount (Read-Only)**

**Host: ~/.claude/projects/**
```
├── project1/
│   ├── session1.jsonl
│   └── session2.jsonl
└── project2/
    └── session3.jsonl
```

### Technology Stack

**Backend:**
- FastAPI (High-performance Python web framework)
- uvicorn (ASGI server)
- watchdog (File monitoring)
- WebSocket (Real-time communication)

**Frontend:**
- Vue 3 (Composition API)
- Vite (Fast build tool)
- Pinia (State management)
- Tailwind CSS (Utility-first CSS)

**Infrastructure:**
- Docker & Docker Compose
- Nginx (Reverse proxy)
- Alpine Linux (Lightweight container images)

## API Specification

### Endpoints

#### GET `/api/conversations`

Retrieve conversation history

**Parameters:**
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `project[]` (optional): Project IDs (multiple allowed)
- `keyword` (optional): Search keyword
- `offset` (optional): Offset (default: 0)
- `limit` (optional): Number of items (default: 100, max: 1000)

**Response:**
```json
{
  "conversations": [...],
  "total": 42257,
  "offset": 0,
  "limit": 100,
  "stats": {
    "total_conversations": 42257,
    "unique_sessions": 156
  }
}
```

#### GET `/api/projects`

Get list of available projects

#### GET `/api/conversations/stats`

Get statistics

#### POST `/api/notifications/hook`

Receive Claude Code hooks notifications (webhook endpoint)

#### GET `/api/notifications`

Get notification history

#### WebSocket `/ws/updates`

Receive real-time updates for conversations and notifications

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Change port
echo "VIEWER_PORT=19080" >> .env
docker-compose down
docker-compose up -d
```

#### 2. Claude Projects Not Found

```bash
# Check path
ls -la ~/.claude/projects

# Set custom path
echo "CLAUDE_PROJECTS_PATH=/path/to/claude/projects" >> .env
```

#### 3. Data Not Displayed

```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps
```

#### 4. WebSocket Connection Error

```bash
# Check Nginx configuration
docker-compose logs nginx

# Check backend status
docker-compose logs backend
```

#### 5. Claude Code Hooks Not Working

```bash
# Check if hooks are properly installed
cat .claude/settings.local.json

# Verify webhook URL is accessible
curl -X POST http://localhost:18080/api/notifications/hook \
  -H "Content-Type: application/json" \
  -d '{"type":"test","project_id":"test","notification":"test","timestamp":"2024-01-01T00:00:00Z"}'

# Check notification logs
docker-compose logs -f backend | grep notification
```

### Checking Logs

```bash
# All service logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

## Development

### Development Environment Setup

```bash
# Backend development
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend development
cd frontend
npm install
npm run dev
```

### Contributing

1. Fork and create a development branch
2. Implement your changes
3. Run tests
4. Create a Pull Request

## License

MIT License

## Author

Masanao Ohba

## Support

If you encounter any issues or have questions:
- Create an issue on [GitHub Issues](https://github.com/masanao-ohba/cchistory/issues)
- Check the [project documentation](https://github.com/masanao-ohba/cchistory)

## Acknowledgments

This project utilizes the conversation history generated by [Claude CLI](https://claude.ai) to provide an enhanced viewing and searching experience.
