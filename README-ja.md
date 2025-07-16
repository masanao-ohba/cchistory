# Claude Conversations History Viewer

A modern web application for viewing and searching Claude CLI conversation history.

Claude CLIの会話履歴を閲覧・検索するためのモダンなWebアプリケーションです。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-green.svg)](https://vuejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688.svg)](https://fastapi.tiangolo.com/)

## 特徴

- 🚀 **軽量で高速** - Docker化されたマイクロサービス構成
- 📱 **レスポンシブデザイン** - モダンなUIで快適な閲覧体験
- 🔍 **柔軟な検索** - 日付・プロジェクト別フィルタリング
- ⚡ **リアルタイム更新** - WebSocketによる自動更新
- 🎯 **マルチプロジェクト対応** - 複数のClaude Projectsを統合表示
- 🔔 **Claude Code Hooks連携** - Claude Code hooksからのリアルタイム通知
- 🔧 **設定可能** - 環境変数による柔軟な設定

## 画面概要

**UI概要:**

| 検索・フィルター機能 |
|---------------------|
| **開始日** \| **終了日** \| **実行ボタン** |

| 統計表示 |
|----------|
| **42,257** 全会話数 \| **1,234** フィルター結果 \| **156** セッション \| **3** プロジェクト |

**会話履歴表示:**
```
[User] 2024-01-15 14:30:45
APIの実装についてサポートしてください...

[Assistant] 2024-01-15 14:31:02  
APIの実装についてお手伝いします...
```

## 必要要件

- Docker & Docker Compose
- Claude CLI（`~/.claude/projects`にデータが存在する）

## クイックスタート

### 1. リポジトリのクローン

```bash
git clone https://github.com/masanao-ohba/cchistory.git
cd cchistory
```

### 2. 環境設定

```bash
# 設定ファイルをコピー
cp .env.example .env

# 必要に応じて設定を編集
vim .env
```

### 3. 起動

```bash
# Docker Composeで起動
docker-compose up -d

# ログを確認
docker-compose logs -f
```

### 4. アクセス

ブラウザで http://localhost:18080 にアクセス

## Claude Code Hooks連携

このアプリケーションは、Claude Code hooksからのリアルタイム通知を受信し、複数のプロジェクトのClaude CLI活動を監視できます。

### Hooksの設定

1. **プロジェクトにhooksをインストール**（cchistoryディレクトリから実行）：
   ```bash
   # cchistoryディレクトリに移動
   cd /path/to/cchistory
   
   # 対象プロジェクトのパスを指定してhooks インストーラを実行
   ./scripts/install-hooks.sh --target-project-path /path/to/your/claude/project
   ```

2. **自動セットアップ** - スクリプトが以下を実行します：
   - このプロジェクトの`.env`ファイルからポート設定を読み取り
   - Webhook URLを自動設定
   - 対象プロジェクトの`.claude/settings.local.json`にhooksをインストール

3. **Claude Codeを再起動**して変更を適用

### 高度なHook設定

```bash
# 基本的な使用方法
./scripts/install-hooks.sh --target-project-path ~/myproject

# カスタム通知受信プロジェクトのパスを指定
./scripts/install-hooks.sh --target-project-path ~/myproject --notification-receiver-path ~/cchistory

# カスタムポートを使用
./scripts/install-hooks.sh --target-project-path ~/myproject --port 8080

# 変更を適用せずにプレビュー
./scripts/install-hooks.sh --target-project-path ~/myproject --dry-run

# ヘルプを表示
./scripts/install-hooks.sh --help
```

### サポートされる通知タイプ

- **権限要求** - Claude Codeが権限を要求するとき
- **ツール使用** - Claude Codeがファイル操作などのツールを使用するとき
- **一般通知** - その他のClaude Code活動

### 通知の表示

- 右上の通知ベルアイコンをクリック
- リアルタイム通知がすぐに表示される
- 通知を既読/未読にマーク
- 個別通知を削除
- 全通知を既読にマーク

## 開発

```bash
# 開発用Docker Composeで起動
docker-compose -f docker-compose.yml up --build

# ログを確認
docker-compose -f docker-compose.yml logs -f
```

開発用では以下のポートでアクセス可能：
- フロントエンド: http://localhost:3000 （Vite開発サーバー）
- バックエンド: http://localhost:8000 （FastAPI）

ファイルを編集すると自動でリロードされます。


## 設定

### 環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `VIEWER_PORT` | `18080` | アプリケーションのポート |
| `CLAUDE_PROJECTS_PATH` | `~/.claude/projects` | Claude projectsのパス |
| `TIMEZONE` | `Asia/Tokyo` | タイムゾーン |
| `LOG_LEVEL` | `INFO` | ログレベル |

### ポートの変更

他のサービスとポートが競合する場合：

```bash
# .envファイルを編集
echo "VIEWER_PORT=19080" >> .env

# 再起動
docker-compose down
docker-compose up -d
```

### カスタムClaude Projectsパス

```bash
# .envファイルを編集
echo "CLAUDE_PROJECTS_PATH=/path/to/your/claude/projects" >> .env

# 再起動
docker-compose down
docker-compose up -d
```

## 使用方法

### 基本操作

1. **全件表示**: 初期状態では全ての会話が表示されます
2. **日付フィルター**: 開始日・終了日を指定して期間検索
3. **プロジェクトフィルター**: 特定のプロジェクトのみ表示
4. **クイックフィルター**: 今日、昨日、過去7日、過去30日の便利ボタン
5. **通知機能**: ベルアイコンからClaude Code hooksのリアルタイム通知を確認

### リアルタイム更新

- WebSocketにより、新しい会話が自動的に反映されます
- 画面右下のインジケーターで接続状態を確認できます

### パフォーマンス

- 大量のデータに対応するため、ページング機能を実装
- 初回表示は100件、「もっと読み込む」で追加取得
- ファイル変更の監視とキャッシュ機能により高速動作

## アーキテクチャ

**Docker Container:**
```
├── Nginx (Port 80)
│   ├── リバースプロキシ
│   └── 静的ファイル配信
├── Vue.js Frontend  
│   ├── モダンなSPA
│   └── Tailwind CSS
└── FastAPI Backend (Port 8000)
    ├── REST API
    ├── WebSocket  
    └── ファイル監視
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

### 技術スタック

**バックエンド:**
- FastAPI (高性能Python Webフレームワーク)
- uvicorn (ASGIサーバー)
- watchdog (ファイル監視)
- WebSocket (リアルタイム通信)

**フロントエンド:**
- Vue 3 (Composition API)
- Vite (高速ビルドツール)
- Pinia (状態管理)
- Tailwind CSS (ユーティリティファーストCSS)

**インフラ:**
- Docker & Docker Compose
- Nginx (リバースプロキシ)
- Alpine Linux (軽量コンテナイメージ)

## API仕様

### エンドポイント

#### GET `/api/conversations`

会話履歴を取得

**パラメータ:**
- `start_date` (optional): 開始日 (YYYY-MM-DD)
- `end_date` (optional): 終了日 (YYYY-MM-DD)
- `project[]` (optional): プロジェクトID（複数指定可）
- `offset` (optional): オフセット (default: 0)
- `limit` (optional): 取得件数 (default: 100, max: 1000)

**レスポンス:**
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

利用可能なプロジェクト一覧を取得

#### GET `/api/conversations/stats`

統計情報を取得

#### POST `/api/notifications/hook`

Claude Code hooksからの通知を受信（webhook エンドポイント）

#### GET `/api/notifications`

通知履歴を取得

#### WebSocket `/ws/updates`

会話と通知のリアルタイム更新を受信

## トラブルシューティング

### よくある問題

#### 1. ポートが使用中

```bash
# ポートを変更
echo "VIEWER_PORT=19080" >> .env
docker-compose down
docker-compose up -d
```

#### 2. Claude Projectsが見つからない

```bash
# パスを確認
ls -la ~/.claude/projects

# カスタムパスを設定
echo "CLAUDE_PROJECTS_PATH=/path/to/claude/projects" >> .env
```

#### 3. データが表示されない

```bash
# ログを確認
docker-compose logs backend

# コンテナの状態確認
docker-compose ps
```

#### 4. WebSocket接続エラー

```bash
# Nginxの設定確認
docker-compose logs nginx

# バックエンドの状態確認
docker-compose logs backend
```

#### 5. Claude Code Hooksが動作しない

```bash
# hooksが正しくインストールされているか確認
cat .claude/settings.local.json

# webhook URLにアクセス可能か確認
curl -X POST http://localhost:18080/api/notifications/hook \
  -H "Content-Type: application/json" \
  -d '{"type":"test","project_id":"test","notification":"test","timestamp":"2024-01-01T00:00:00Z"}'

# 通知ログを確認
docker-compose logs -f backend | grep notification
```

### ログの確認

```bash
# 全サービスのログ
docker-compose logs -f

# 特定サービスのログ
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

## 開発

### 開発環境のセットアップ

```bash
# バックエンド開発
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# フロントエンド開発
cd frontend
npm install
npm run dev
```

### 貢献方法

1. Forkして開発用ブランチを作成
2. 変更を実装
3. テストを実行
4. Pull Requestを作成

## ライセンス

MIT License

## 作者

Masanao Ohba
