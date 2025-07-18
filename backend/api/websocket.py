from typing import List, Dict, Any
from fastapi import WebSocket
import json
import logging
from models.notification import NotificationInDB, WebSocketMessage

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_filters: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.connection_filters:
            del self.connection_filters[websocket]
        logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    def update_filters(self, websocket: WebSocket, filters: Dict[str, Any]):
        """クライアントのフィルタリング条件を更新"""
        self.connection_filters[websocket] = filters
        # フィルター設定を更新

    def _should_notify_connection(self, websocket: WebSocket, project_id: str) -> bool:
        """接続がこのプロジェクト変更の通知を受け取るべきかを判定"""
        if websocket not in self.connection_filters:
            return True  # フィルターが設定されていない場合は通知

        filtered_projects = self.connection_filters[websocket].get('projects', [])

        if not filtered_projects or project_id in filtered_projects:
            return True

        return False

    async def broadcast(self, message: dict):
        """全ての接続クライアントにメッセージを送信"""
        if not self.active_connections:
            return

        message_str = json.dumps(message)
        disconnected = []

        for connection in self.active_connections:
            try:
                # ファイル変更通知の場合、フィルタリング条件をチェック
                if message.get("type") == "file_change" and message.get("project_id"):
                    if not self._should_notify_connection(connection, message["project_id"]):
                        continue

                await connection.send_text(message_str)
            except Exception as e:
                logger.error(f"Error sending message: {e}")
                disconnected.append(connection)

        # 切断されたコネクションを削除
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_notification(self, notification: NotificationInDB):
        """新着通知をブロードキャスト"""
        # datetimeオブジェクトを文字列に変換
        notification_dict = notification.dict()
        if 'timestamp' in notification_dict:
            notification_dict['timestamp'] = notification_dict['timestamp'].isoformat()
        if 'created_at' in notification_dict:
            notification_dict['created_at'] = notification_dict['created_at'].isoformat()
        if 'updated_at' in notification_dict:
            notification_dict['updated_at'] = notification_dict['updated_at'].isoformat()

        message_data = {
            "type": "new_notification",
            "data": notification_dict
        }

        await self.broadcast(message_data)
        logger.info(f"Broadcasted new notification {notification.id} to {len(self.active_connections)} clients")

    async def broadcast_notification_read(self, notification_id: str, project_id: str):
        """通知既読更新をブロードキャスト"""
        message_data = {
            "type": "notification_read",
            "data": {
                "notification_id": notification_id,
                "project_id": project_id
            }
        }

        await self.broadcast(message_data)
        logger.info(f"Broadcasted notification read update for {notification_id}")

    async def broadcast_stats_update(self, stats_data: Dict[str, Any]):
        """統計情報更新をブロードキャスト"""
        message_data = {
            "type": "stats_update",
            "data": stats_data
        }

        await self.broadcast(message_data)
        logger.info("Broadcasted stats update")
