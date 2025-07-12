import logging
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from config import Config
from api import router as api_router
from services.file_watcher import FileWatcher
from api.websocket import ConnectionManager

# ロギング設定
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ヘルスチェックのアクセスログを除外
class HealthCheckFilter(logging.Filter):
    def filter(self, record):
        return not (record.getMessage().find("/api/health") != -1)

# uvicornのアクセスログからヘルスチェックを除外
logging.getLogger("uvicorn.access").addFilter(HealthCheckFilter())

# WebSocket接続マネージャー
manager = ConnectionManager()

# ファイル監視
file_watcher = FileWatcher(Config.CLAUDE_PROJECTS_PATH)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時の処理
    logger.info("Starting Claude Conversations History Viewer")
    await file_watcher.start(manager)
    yield
    # 終了時の処理
    logger.info("Stopping Claude Conversations History Viewer")
    await file_watcher.stop()

# FastAPIアプリケーション
app = FastAPI(
    title="Claude Conversations History Viewer",
    version="1.0.0",
    lifespan=lifespan
)

# 静的ファイルの配信
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

# 簡易フロントエンドを提供
@app.get("/", response_class=HTMLResponse)
async def read_root():
    return """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Conversations History Viewer</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }

        /* コンパクトヘッダー */
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; }
        .header h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
        .header p { font-size: 0.9rem; opacity: 0.9; }

        /* フィルター部分をコンパクトに */
        .filters { background: white; padding: 1rem; border-radius: 12px; margin-bottom: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .filter-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: end; }
        .filter-group { display: flex; flex-direction: column; }
        .filter-group label { font-weight: 600; margin-bottom: 0.25rem; color: #4a5568; font-size: 0.875rem; }
        .filter-group input { padding: 0.5rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; }

        /* 統計情報をコンパクトに */
        .stats { background: white; padding: 1rem; border-radius: 12px; margin-bottom: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; }
        .stat-item { text-align: center; padding: 0.75rem; border-radius: 8px; background: #f7fafc; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #667eea; }
        .stat-label { font-size: 0.75rem; color: #718096; }

        /* 会話履歴のコンテナを拡大 */
        .conversations { background: white; border-radius: 12px; overflow: hidden; height: calc(100vh - 280px); }
        .conversation-header { padding: 1rem; background: #f7fafc; border-bottom: 1px solid #e2e8f0; }
        .conversation-header h2 { font-size: 1.1rem; color: #4a5568; }
        .conversation-list { height: calc(100vh - 320px); overflow-y: auto; padding: 1rem; }

        /* チャットUIの統一感改善 */
        .conversation-item { margin-bottom: 1.5rem; display: flex; flex-direction: column; }
        .conversation-item.user { align-items: flex-end; }
        .conversation-item.assistant { align-items: flex-start; }

        .conversation-meta {
            font-size: 0.75rem;
            margin-bottom: 0.5rem;
            color: #718096;
            text-align: right;
            min-width: 120px;
        }

        .conversation-bubble {
            padding: 1rem 1.25rem;
            border-radius: 16px;
            position: relative;
            max-width: 85%;
            word-wrap: break-word;
        }

        .conversation-bubble.user {
            background: #3182ce;
            color: white;
            border-bottom-right-radius: 6px;
        }

        .conversation-bubble.assistant {
            background: #f7fafc;
            color: #2d3748;
            border: 1px solid #e2e8f0;
            border-bottom-left-radius: 6px;
        }

        .conversation-content {
            white-space: pre-wrap;
            word-break: break-word;
            line-height: 1.5;
        }

        .loading { text-align: center; padding: 3rem; color: #718096; }

        /* スクロール時の固定ヘッダー */
        .sticky-filters {
            position: sticky;
            top: 0;
            z-index: 100;
            background: #f5f7fa;
            padding-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="container">
            <div class="header">
                <h1>Claude Conversations History Viewer</h1>
                <p>会話履歴の検索とフィルタリング</p>
            </div>

            <div class="sticky-filters">
                <div class="filters">
                    <div class="filter-row">
                        <div class="filter-group">
                            <label>開始日</label>
                            <input type="date" v-model="filters.startDate">
                        </div>
                        <div class="filter-group">
                            <label>終了日</label>
                            <input type="date" v-model="filters.endDate">
                        </div>
                    </div>
                </div>

                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-value">{{ formatNumber(stats.total_conversations || 0) }}</div>
                        <div class="stat-label">全会話数</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{{ formatNumber(conversations.length) }}</div>
                        <div class="stat-label">フィルター結果</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{{ formatNumber(stats.unique_sessions || 0) }}</div>
                        <div class="stat-label">セッション数</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{{ formatNumber(stats.projects || 0) }}</div>
                        <div class="stat-label">プロジェクト数</div>
                    </div>
                </div>
            </div>

            <div class="conversations">
                <div class="conversation-header">
                    <h2>会話履歴</h2>
                </div>
                <div class="conversation-list">
                    <div v-if="loading && conversations.length === 0" class="loading">
                        データを読み込んでいます...
                    </div>
                    <div v-else-if="conversations.length === 0" class="loading">
                        会話が見つかりません
                    </div>
                    <div v-else>
                        <div v-for="conversation in conversations" :key="conversation.session_id + conversation.timestamp"
                             :class="['conversation-item', conversation.type]">
                            <div class="conversation-meta">
                                {{ formatTimestamp(conversation.timestamp) }}
                            </div>
                            <div :class="['conversation-bubble', conversation.type]">
                                <div class="conversation-content">{{ conversation.content }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const { createApp } = Vue;
        createApp({
            data() {
                return {
                    conversations: [],
                    stats: {},
                    loading: false,
                    filters: {
                        startDate: '',
                        endDate: ''
                    }
                }
            },
            watch: {
                'filters.startDate'() {
                    this.debouncedFilter();
                },
                'filters.endDate'() {
                    this.debouncedFilter();
                }
            },
            async mounted() {
                await this.loadStats();
                await this.loadConversations();

                // デバウンス関数を作成
                this.debouncedFilter = this.debounce(this.filterConversations, 500);
            },
            methods: {
                async loadStats() {
                    try {
                        const response = await axios.get('/api/conversations/stats');
                        this.stats = response.data;
                    } catch (error) {
                        console.error('Error loading stats:', error);
                    }
                },
                async loadConversations() {
                    this.loading = true;
                    try {
                        const response = await axios.get('/api/conversations?limit=100');
                        this.conversations = response.data.conversations;
                    } catch (error) {
                        console.error('Error loading conversations:', error);
                    } finally {
                        this.loading = false;
                    }
                },
                async filterConversations() {
                    this.loading = true;
                    try {
                        let url = '/api/conversations?limit=100';
                        if (this.filters.startDate) {
                            url += `&start_date=${this.filters.startDate}`;
                        }
                        if (this.filters.endDate) {
                            url += `&end_date=${this.filters.endDate}`;
                        }
                        const response = await axios.get(url);
                        this.conversations = response.data.conversations;
                    } catch (error) {
                        console.error('Error filtering conversations:', error);
                    } finally {
                        this.loading = false;
                    }
                },
                formatNumber(num) {
                    return new Intl.NumberFormat('ja-JP').format(num);
                },
                formatTimestamp(timestamp) {
                    const date = new Date(timestamp);
                    return new Intl.DateTimeFormat('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Tokyo'
                    }).format(date);
                },
                debounce(func, wait) {
                    let timeout;
                    return function executedFunction(...args) {
                        const later = () => {
                            clearTimeout(timeout);
                            func(...args);
                        };
                        clearTimeout(timeout);
                        timeout = setTimeout(later, wait);
                    };
                }
            }
        }).mount('#app');
    </script>
</body>
</html>
    """

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# APIルーターを追加
app.include_router(api_router, prefix=Config.API_PREFIX)

# WebSocketエンドポイント
@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # クライアントからのメッセージを待機
            data = await websocket.receive_text()
            logger.debug(f"Received message: {data}")

            try:
                message = json.loads(data)
                if message.get("type") == "update_filters":
                    # フィルタリング条件を更新
                    filters = message.get("filters", {})
                    manager.update_filters(websocket, filters)
                    logger.info(f"Updated filters for WebSocket connection: {filters}")
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received: {data}")
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")

# ヘルスチェック
@app.get("/api/health")
@app.head("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
