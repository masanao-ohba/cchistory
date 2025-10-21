# Enhanced Claude Code Notifications - Implementation Summary

## 実装完了した機能

### 1. 詳細データキャプチャ機能
- Claude Code Hooksから完全なJSONデータを取得
- `message`、`tool_name`、`tool_input`に加えて、全フィールドを`details`として保存
- 権限要求の選択肢（options/choices）を構造化データとして保持

### 2. バックエンド拡張
**更新ファイル:**
- `backend/models/notification.py`: `details`フィールド追加
- `backend/api/notifications.py`: 詳細データのログ記録追加
- `scripts/install-hooks.sh`: 完全なJSONキャプチャに対応

### 3. フロントエンド拡張
**更新ファイル:**
- `frontend/src/components/NotificationItem.vue`
  - 展開可能な詳細セクション追加
  - 番号付きオプションリスト表示
  - 追加情報のJSON表示
  - セッションID等のメタデータ表示

### 4. 新規作成ファイル
- `scripts/enhanced-hooks-config.json`: NotificationとPreToolUse両方のフック設定
- `scripts/test-notification.sh`: テスト用スクリプト

## 使用方法

### Hookの設定

#### 方法1: インストールスクリプト使用（推奨）
```bash
./scripts/install-hooks.sh --target-project-path /path/to/your/project
```

#### 方法2: 手動設定
`enhanced-hooks-config.json`の内容を対象プロジェクトの`.claude/settings.local.json`にコピー

### テスト方法
```bash
# テストデータ送信
./scripts/test-notification.sh

# Webインターフェースで確認
# http://localhost:18080 を開いて通知ベルアイコンをクリック
```

## 表示例

### 基本的な権限要求
```
🔐 Permission Request
Claude needs your permission to use
[Mark Read]
```

### 詳細情報付き権限要求（展開時）
```
🔐 Permission Request
Claude needs your permission to use the following tools

▶ Show Details
━━━━━━━━━━━━━━━━━━━━━━━━━
Available Options:
1. Run build command: npm run build
2. Execute test suite: npm test
3. Stop development server: kill process on port 3000

Additional Information:
{
  "risk_level": "medium",
  "estimated_duration": "2-3 minutes"
}

Session: test-session-123
━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 技術的な詳細

### データフロー
1. Claude Code Hook発生
2. Hookスクリプトが完全なJSONをキャプチャ
3. `/api/notifications/hook`エンドポイントへPOST
4. バックエンドが`details`フィールドを含めて保存
5. WebSocketで通知配信
6. フロントエンドが詳細情報を展開可能に表示

### 対応するHookイベント
- `Notification`: 権限要求時の通知
- `PreToolUse`: ツール実行前の詳細情報（オプション）

## 今後の拡張可能性

1. **選択肢への応答機能**
   - 各オプションにボタンを追加
   - WebSocket経由でClaude Codeに応答送信

2. **リスクレベル表示**
   - 高リスク操作の警告表示
   - 色分けによる視覚的識別

3. **履歴・監査機能**
   - 承認/拒否の履歴記録
   - セッション別の操作追跡

## トラブルシューティング

### 詳細が表示されない場合
1. Hookスクリプトが最新版か確認
2. ブラウザのキャッシュをクリア
3. Docker再起動: `docker-compose restart`

### テストスクリプトが動作しない場合
1. ポート18080でアプリケーションが起動しているか確認
2. `.env`ファイルの`VIEWER_PORT`設定を確認

## 関連ドキュメント
- [Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [requirements.md](./requirements.md)