#!/bin/bash

# Claude Code Hooks インストールスクリプト
# 通知機能に必要な hooks 設定のみを
# 既存の settings.local.json に安全にマージします。

set -e

# 色付きメッセージ用の関数
print_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

print_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

print_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

print_header() {
    echo "🔧 Claude Code Hooks Installer"
    echo "==============================="
}

# 通知受信プロジェクトの.envファイルからポート番号を取得
get_port_from_notification_env() {
    local notification_path="$1"
    local env_file="$notification_path/.env"
    local port=""

    if [[ -f "$env_file" ]]; then
        # VIEWER_PORTを探す
        port=$(grep -E "^VIEWER_PORT=" "$env_file" 2>/dev/null | cut -d'=' -f2 | tr -d ' "'"'"'')
        if [[ -n "$port" ]]; then
            echo "$port"
            return 0
        fi
    fi

    # .envファイルがない、またはVIEWER_PORTが設定されていない場合
    print_warning "Notification receiver .env file not found or VIEWER_PORT not set at: $env_file"
    print_info "Please ensure the notification receiver project has a .env file with VIEWER_PORT setting:"
    print_info "  echo 'VIEWER_PORT=18080' > $notification_path/.env"
    print_info "Or use --port option to specify the port"
    exit 1
}

# 通知受信プロジェクトのパスを取得
get_notification_receiver_path() {
    local notification_path=""

    # 対話式でパスを取得
    while true; do
        print_info "Enter the path to the project directory where you want to receive notifications:"
        print_info "(This is the root directory of the project that will display Claude Code notifications)"
        read -r notification_path

        # 入力が空の場合は再入力を促す
        if [[ -z "$notification_path" ]]; then
            print_warning "Path cannot be empty. Please try again."
            continue
        fi

        # チルダ展開
        notification_path="${notification_path/#\~/$HOME}"

        # 絶対パスに変換
        if [[ ! "$notification_path" = /* ]]; then
            notification_path="$(pwd)/$notification_path"
        fi

        # ディレクトリの存在確認
        if [[ ! -d "$notification_path" ]]; then
            print_warning "Directory does not exist: $notification_path"
            print_info "Please enter a valid directory path."
            continue
        fi

        # プロジェクトディレクトリかどうかの簡易チェック
        if [[ ! -f "$notification_path/docker-compose.yml" ]] || [[ ! -d "$notification_path/backend" ]]; then
            print_warning "This doesn't appear to be a notification receiver project directory."
            print_info "Expected files: docker-compose.yml, backend/ directory"
            print_info "Continue anyway? (y/n): "
            read -r confirm
            if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
                continue
            fi
        fi

        echo "$notification_path"
        return 0
    done
}

# コマンドライン引数の処理
PORT_FROM_ENV=""
WEBHOOK_URL=""
NOTIFICATION_RECEIVER_PATH=""
TARGET_PROJECT_PATH=""
DRY_RUN=false
UPDATE_EXISTING=false
HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --webhook-url)
            WEBHOOK_URL="$2"
            shift 2
            ;;
        --port)
            PORT_FROM_ENV="$2"
            shift 2
            ;;
        --notification-receiver-path)
            NOTIFICATION_RECEIVER_PATH="$2"
            shift 2
            ;;
        --target-project-path)
            TARGET_PROJECT_PATH="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --update|--force)
            UPDATE_EXISTING=true
            shift
            ;;
        --help|-h)
            HELP=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [ "$HELP" = true ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script configures a project to send Claude Code notifications."
    echo "Run this script from cchistory directory."
    echo ""
    echo "Options:"
    echo "  --webhook-url URL                   Webhook URL for notifications"
    echo "                                     (default: read from notification receiver .env file)"
    echo "  --port PORT                        Override port number"
    echo "  --notification-receiver-path PATH  Path to notification receiver project directory"
    echo "                                     (default: current directory)"
    echo "  --target-project-path PATH         Path to project directory to monitor"
    echo "                                     (default: current directory)"
    echo "  --update, --force                  Update existing notification hooks with enhanced version"
    echo "  --dry-run                          Show what would be changed without making changes"
    echo "  --help, -h                         Show this help message"
    echo ""
    echo "Examples:"
    echo "  # Monitor a specific project from cchistory directory"
    echo "  $0 --target-project-path ~/myproject"
    echo ""
    echo "  # Update existing hooks with enhanced version"
    echo "  $0 --target-project-path ~/myproject --update"
    echo "  # Specify custom notification receiver and port"
    echo "  $0 --target-project-path ~/myproject --notification-receiver-path ~/cchistory --port 8080"
    echo "  # Preview changes"
    echo "  $0 --target-project-path ~/myproject --dry-run"
    echo ""
    echo "Note: This script will:"
    echo "1. Add hooks configuration to target project's .claude/settings.local.json"
    echo "2. Read port settings from notification receiver project's .env file"
    echo "3. Configure webhook to send notifications to your notification receiver"
    exit 0
fi

print_header

# jq の存在確認 (early check)
check_jq_early() {
    if ! command -v jq &> /dev/null; then
        # jqがない場合は、まずWebhook URLを構築してから手動設定を表示
        print_error "jq is required but not installed."
        print_info ""
        print_info "Option 1: Install jq (recommended)"
        print_info "  macOS: brew install jq"
        print_info "  Ubuntu/Debian: sudo apt-get install jq"
        print_info "  Windows: Download from https://stedolan.github.io/jq/"
        print_info ""

        # 通知受信パスとWebhook URLを先に決定
        local notification_path_for_manual=""
        if [[ -n "$NOTIFICATION_RECEIVER_PATH" ]]; then
            notification_path_for_manual="$NOTIFICATION_RECEIVER_PATH"
        else
            print_info "For manual configuration, first specify your notification receiver path:"
            notification_path_for_manual=$(get_notification_receiver_path)
        fi

        local webhook_url_for_manual=""
        if [[ -n "$WEBHOOK_URL" ]]; then
            webhook_url_for_manual="$WEBHOOK_URL"
        elif [[ -n "$PORT_FROM_ENV" ]]; then
            webhook_url_for_manual="http://localhost:${PORT_FROM_ENV}/api/notifications/hook"
        else
            local port_for_manual=$(get_port_from_notification_env "$notification_path_for_manual")
            webhook_url_for_manual="http://localhost:${port_for_manual}/api/notifications/hook"
        fi

        print_info "Option 2: Manual configuration"
        print_info "Add the following to your target project's .claude/settings.local.json:"
        echo ""
        cat << EOF
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "FULL_JSON=\$(cat); MESSAGE=\$(echo \"\$FULL_JSON\" | jq -r '.message // \"\"' 2>/dev/null); TOOL_NAME=\$(echo \"\$FULL_JSON\" | jq -r '.tool_name // \"\"' 2>/dev/null); TOOL_INPUT=\$(echo \"\$FULL_JSON\" | jq -r '.tool_input // \"\"' 2>/dev/null); DETAILS=\$(echo \"\$FULL_JSON\" | jq -c '. | del(.message) | del(.tool_name) | del(.tool_input)' 2>/dev/null); curl -X POST \"$webhook_url_for_manual\" -H \"Content-Type: application/json\" -d '{\\"type\\":\\"permission_request\\",\\"project_id\\":\\"'\"\$(basename \$(pwd))\"'\",\\"notification\\":\\"'\"\$MESSAGE\"'\",\\"tool_name\\":\\"'\"\$TOOL_NAME\"'\",\\"tool_input\\":\\"'\"\$TOOL_INPUT\"'\",\\"details\\":'\"\\$DETAILS\"',\\"timestamp\\":\\"'\"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\"'\\"}' 2>/dev/null"
          }
        ]
      }
    ]
  }
}
EOF
        echo ""
        print_info "Note: If you already have settings, merge the above carefully to avoid conflicts."
        exit 1
    fi
}

check_jq_early

# Claude settings.local.json のパスを見つける
find_claude_settings() {
    local target_path="$1"
    local current_path="$target_path"

    while [[ "$current_path" != "/" ]]; do
        if [[ -f "$current_path/.claude/settings.local.json" ]]; then
            echo "$current_path/.claude/settings.local.json"
            return 0
        fi
        current_path="$(dirname "$current_path")"
    done

    mkdir -p "$target_path/.claude"
    echo "$target_path/.claude/settings.local.json"
}

# 設定ファイルのバックアップ
backup_settings() {
    local settings_file="$1"
    if [[ -f "$settings_file" ]]; then
        cp "$settings_file" "${settings_file}.backup.$(date +%Y%m%d_%H%M%S)"
        print_info "Backup created: ${settings_file}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
}

# 設定をマージ
merge_notification_hook() {
    local existing_file="$1"
    local webhook_url="$2"

    local existing_settings="{}"
    if [[ -f "$existing_file" ]]; then
        existing_settings=$(cat "$existing_file")
    fi

    # 既存設定にnotification webhookが存在するかチェック
    if echo "$existing_settings" | jq -e '.hooks.Notification[]?.hooks[]?.command | contains("api/notifications/hook")' &> /dev/null; then
        if [[ "$UPDATE_EXISTING" == true ]]; then
            print_warning "Existing notification webhook hook found" >&2
            print_info "Updating with enhanced version (--update flag specified)" >&2
            # 既存のNotificationフックから、api/notifications/hookを含むコマンドを除外
            # 他のhooks（sayコマンドなど）は保持
            existing_settings=$(echo "$existing_settings" | jq '
                if .hooks.Notification then
                    .hooks.Notification |= map({
                        matcher: .matcher,
                        hooks: (.hooks | map(select(.command | contains("api/notifications/hook") | not)))
                    }) | 
                    .hooks.Notification |= map(select(.hooks | length > 0))
                else . end
            ')
        else
            print_warning "Notification webhook hook already exists" >&2
            print_info "Use --update flag to replace with enhanced version" >&2
            print_info "Example: $0 --target-project-path $TARGET_PROJECT_PATH --update" >&2
            return 1
        fi
    fi

    # Notificationフックの追加（URLを直接埋め込み）
    # 完全なJSONデータをキャプチャして詳細情報を含める
    local hook_command
    read -r -d '' hook_command << 'EOF'
FULL_JSON=$(cat)
MESSAGE=$(echo "$FULL_JSON" | jq -r '.message // ""' 2>/dev/null)
TOOL_NAME=$(echo "$FULL_JSON" | jq -r '.tool_name // ""' 2>/dev/null)
TOOL_INPUT=$(echo "$FULL_JSON" | jq -r '.tool_input // ""' 2>/dev/null)
OPTIONS=$(echo "$FULL_JSON" | jq -c '.options // []' 2>/dev/null)
DETAILS=$(echo "$FULL_JSON" | jq -c '. | del(.message) | del(.tool_name) | del(.tool_input)' 2>/dev/null)

curl -X POST "WEBHOOK_URL_PLACEHOLDER" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"permission_request\",\"project_id\":\"$(basename $(pwd))\",\"notification\":\"$MESSAGE\",\"tool_name\":\"$TOOL_NAME\",\"tool_input\":\"$TOOL_INPUT\",\"details\":$DETAILS,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
  2>/dev/null
EOF

    # URLを置換
    hook_command="${hook_command//WEBHOOK_URL_PLACEHOLDER/$webhook_url}"

    # jqでJSONを構築
    echo "$existing_settings" | jq --arg cmd "$hook_command" '
        .hooks.Notification = (.hooks.Notification // []) + [{
            "matcher": "",
            "hooks": [{
                "type": "command",
                "command": $cmd
            }]
        }]'
}

# メイン処理
main() {
    # 監視対象プロジェクトのパスを決定
    if [[ -z "$TARGET_PROJECT_PATH" ]]; then
        TARGET_PROJECT_PATH="$(pwd)"
    else
        # 指定されたパスの妥当性チェック
        TARGET_PROJECT_PATH="${TARGET_PROJECT_PATH/#\~/$HOME}"
        if [[ ! "$TARGET_PROJECT_PATH" = /* ]]; then
            TARGET_PROJECT_PATH="$(pwd)/$TARGET_PROJECT_PATH"
        fi
        if [[ ! -d "$TARGET_PROJECT_PATH" ]]; then
            print_error "Target project directory does not exist: $TARGET_PROJECT_PATH"
            exit 1
        fi
    fi

    print_info "Target project directory: $TARGET_PROJECT_PATH"

    # 通知受信プロジェクトのパスを取得
    if [[ -z "$NOTIFICATION_RECEIVER_PATH" ]]; then
        # デフォルトでは現在のディレクトリを通知受信プロジェクトとして使用
        NOTIFICATION_RECEIVER_PATH="$(pwd)"
    else
        # 指定されたパスの妥当性チェック
        NOTIFICATION_RECEIVER_PATH="${NOTIFICATION_RECEIVER_PATH/#\~/$HOME}"
        if [[ ! "$NOTIFICATION_RECEIVER_PATH" = /* ]]; then
            NOTIFICATION_RECEIVER_PATH="$(pwd)/$NOTIFICATION_RECEIVER_PATH"
        fi
        if [[ ! -d "$NOTIFICATION_RECEIVER_PATH" ]]; then
            print_error "Notification receiver directory does not exist: $NOTIFICATION_RECEIVER_PATH"
            exit 1
        fi
    fi

    print_info "Notification receiver path: $NOTIFICATION_RECEIVER_PATH"

    # ポート番号とWebhook URLの決定
    if [[ -n "$PORT_FROM_ENV" ]]; then
        PORT="$PORT_FROM_ENV"
    elif [[ -z "$WEBHOOK_URL" ]]; then
        PORT=$(get_port_from_notification_env "$NOTIFICATION_RECEIVER_PATH")
    fi

    # Webhook URLの構築
    if [[ -z "$WEBHOOK_URL" ]]; then
        WEBHOOK_URL="http://localhost:${PORT}/api/notifications/hook"
    fi

    print_info "Webhook URL: $WEBHOOK_URL"

    # 監視対象プロジェクトのsettings.local.jsonに設定を追加
    SETTINGS_FILE=$(find_claude_settings "$TARGET_PROJECT_PATH")
    print_info "Settings file: $SETTINGS_FILE"

    MERGED_CONFIG=$(merge_notification_hook "$SETTINGS_FILE" "$WEBHOOK_URL")
    MERGE_EXIT_CODE=$?

    if [[ $MERGE_EXIT_CODE -ne 0 ]]; then
        exit 0
    fi

    if [[ "$DRY_RUN" == true ]]; then
        print_info "Dry run - Changes that would be made:"
        # Debug output to check what's in MERGED_CONFIG
        if [[ -z "$MERGED_CONFIG" ]]; then
            print_error "MERGED_CONFIG is empty"
            exit 1
        fi
        # Try to validate JSON before piping to jq
        if ! echo "$MERGED_CONFIG" | jq empty 2>/dev/null; then
            print_error "Invalid JSON in MERGED_CONFIG"
            echo "Content (first 500 chars): ${MERGED_CONFIG:0:500}" >&2
            exit 1
        fi
        echo "$MERGED_CONFIG" | jq '.'
        return 0
    fi

    backup_settings "$SETTINGS_FILE"
    echo "$MERGED_CONFIG" | jq '.' > "$SETTINGS_FILE"

    print_success "Notification hooks installation completed!"
    print_info "Settings saved to: $SETTINGS_FILE"
    print_info "Project $TARGET_PROJECT_PATH will now send notifications to: $WEBHOOK_URL"

    echo ""
    echo "📝 Next steps:"
    echo "1. Restart your Claude Code session to apply the changes"
    echo "2. Make sure notification receiver is running (docker compose up in $NOTIFICATION_RECEIVER_PATH)"
    echo "3. Test by triggering a permission request in Claude Code"
    echo "4. Check the notification bell in the web interface"

    echo ""
    echo "💡 Tip: You may need to add these to your permissions:"
    echo '   "Bash(curl:*)",'
    echo '   "Bash(jq:*)",'

    echo ""
    echo "🔧 To monitor other projects, run this script with --target-project-path pointing to each project directory."
}

main
