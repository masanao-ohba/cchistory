import json
import os
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pathlib import Path
import logging

from models.notification import (
    NotificationCreate,
    NotificationInDB,
    NotificationResponse,
    NotificationListResponse,
    NotificationStatsResponse
)

logger = logging.getLogger(__name__)

class NotificationManager:
    """通知管理サービス"""

    def __init__(self, storage_path: str = "/app/storage/notifications.json"):
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()
        self._rate_limit_cache: Dict[str, List[datetime]] = {}

        # レート制限設定（同一プロジェクトから1分間に最大60リクエスト）
        self.rate_limit_requests = 60
        self.rate_limit_window = 60  # seconds

        # 通知の最大保存数
        self.max_notifications = 10000

    async def _load_notifications(self) -> List[NotificationInDB]:
        """通知データを読み込み"""
        try:
            if not self.storage_path.exists():
                return []

            with open(self.storage_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return [NotificationInDB(**item) for item in data]
        except Exception as e:
            logger.error(f"Failed to load notifications: {e}")
            return []

    async def _save_notifications(self, notifications: List[NotificationInDB]):
        """通知データを保存"""
        try:
            # 最大保存数を超えた場合、古いものから削除
            if len(notifications) > self.max_notifications:
                notifications = sorted(notifications, key=lambda x: x.created_at, reverse=True)
                notifications = notifications[:self.max_notifications]
                logger.info(f"Trimmed notifications to {self.max_notifications} items")

            data = [notification.dict() for notification in notifications]

            # 一時ファイルに書き込み後、アトミックに移動
            temp_path = self.storage_path.with_suffix('.tmp')
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)

            temp_path.replace(self.storage_path)
            # 通知データを保存完了

        except Exception as e:
            logger.error(f"Failed to save notifications: {e}")
            raise

    def _check_rate_limit(self, project_id: str) -> bool:
        """レート制限チェック"""
        now = datetime.utcnow()

        # 古いエントリを削除
        if project_id in self._rate_limit_cache:
            cutoff = now - timedelta(seconds=self.rate_limit_window)
            self._rate_limit_cache[project_id] = [
                timestamp for timestamp in self._rate_limit_cache[project_id]
                if timestamp > cutoff
            ]
        else:
            self._rate_limit_cache[project_id] = []

        # レート制限チェック
        if len(self._rate_limit_cache[project_id]) >= self.rate_limit_requests:
            logger.warning(f"Rate limit exceeded for project {project_id}")
            return False

        # 現在のリクエストを記録
        self._rate_limit_cache[project_id].append(now)
        return True

    def _should_filter_notification(self, notification: NotificationCreate) -> bool:
        """通知をフィルタリングするかどうかを判定"""

        # 重複通知の検出（同一セッション・同一内容の通知を短時間で重複送信防止）
        # ここでは簡単な実装として、同一プロジェクト・セッション・通知内容を5分以内に受信した場合は重複とみなす
        # 実際の実装では、より複雑なフィルタリングロジックが必要かもしれません

        return False  # 現時点では全ての通知を許可

    async def create_notification(self, notification_data: NotificationCreate) -> NotificationInDB:
        """新しい通知を作成"""
        async with self._lock:
            # レート制限チェック
            if not self._check_rate_limit(notification_data.project_id):
                raise ValueError(f"Rate limit exceeded for project {notification_data.project_id}")

            # 通知フィルタリング
            if self._should_filter_notification(notification_data):
                raise ValueError("Notification filtered out")

            # 既存通知を読み込み
            notifications = await self._load_notifications()

            # 新しい通知を作成
            new_notification = NotificationInDB(**notification_data.dict())
            notifications.append(new_notification)

            # 保存
            await self._save_notifications(notifications)

            logger.info(f"Created notification {new_notification.id} for project {notification_data.project_id}")
            return new_notification

    async def get_notifications(
        self,
        project_id: Optional[str] = None,
        notification_type: Optional[str] = None,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> NotificationListResponse:
        """通知一覧を取得"""
        async with self._lock:
            notifications = await self._load_notifications()

            # フィルタリング
            if project_id:
                notifications = [n for n in notifications if n.project_id == project_id]

            if notification_type:
                notifications = [n for n in notifications if n.type == notification_type]

            if unread_only:
                notifications = [n for n in notifications if not n.read]

            # ソート（新しい順）
            notifications.sort(key=lambda x: x.created_at, reverse=True)

            # ページング
            total = len(notifications)
            paginated_notifications = notifications[offset:offset + limit]

            # 未読数計算
            unread_count = len([n for n in notifications if not n.read])

            return NotificationListResponse(
                notifications=[NotificationResponse(**n.dict()) for n in paginated_notifications],
                total=total,
                unread_count=unread_count
            )

    async def mark_notification_read(self, notification_id: str) -> bool:
        """通知を既読にマーク"""
        async with self._lock:
            notifications = await self._load_notifications()

            for notification in notifications:
                if notification.id == notification_id:
                    notification.read = True
                    notification.updated_at = datetime.utcnow()
                    await self._save_notifications(notifications)
                    logger.info(f"Marked notification {notification_id} as read")
                    return True

            return False

    async def mark_all_read(self, project_id: Optional[str] = None) -> int:
        """全通知または指定プロジェクトの通知を既読にマーク"""
        async with self._lock:
            notifications = await self._load_notifications()
            marked_count = 0

            for notification in notifications:
                if not notification.read:
                    if project_id is None or notification.project_id == project_id:
                        notification.read = True
                        notification.updated_at = datetime.utcnow()
                        marked_count += 1

            if marked_count > 0:
                await self._save_notifications(notifications)
                logger.info(f"Marked {marked_count} notifications as read")

            return marked_count

    async def delete_notification(self, notification_id: str) -> bool:
        """通知を削除"""
        async with self._lock:
            notifications = await self._load_notifications()
            original_count = len(notifications)

            notifications = [n for n in notifications if n.id != notification_id]

            if len(notifications) < original_count:
                await self._save_notifications(notifications)
                logger.info(f"Deleted notification {notification_id}")
                return True

            return False

    async def get_stats(self) -> NotificationStatsResponse:
        """通知統計を取得"""
        async with self._lock:
            notifications = await self._load_notifications()

            total_notifications = len(notifications)
            unread_count = len([n for n in notifications if not n.read])

            # プロジェクト別統計
            by_project: Dict[str, Dict[str, int]] = {}
            for notification in notifications:
                project_id = notification.project_id
                if project_id not in by_project:
                    by_project[project_id] = {"total": 0, "unread": 0}

                by_project[project_id]["total"] += 1
                if not notification.read:
                    by_project[project_id]["unread"] += 1

            # タイプ別統計
            by_type: Dict[str, int] = {}
            for notification in notifications:
                notification_type = notification.type
                by_type[notification_type] = by_type.get(notification_type, 0) + 1

            # 最近のアクティビティ（過去7日間の日別統計）
            recent_activity = []
            now = datetime.utcnow()
            for i in range(7):
                date = (now - timedelta(days=i)).date()
                date_str = date.isoformat()
                count = len([
                    n for n in notifications
                    if n.created_at.date() == date
                ])
                recent_activity.append({"date": date_str, "count": count})

            return NotificationStatsResponse(
                total_notifications=total_notifications,
                unread_count=unread_count,
                by_project=by_project,
                by_type=by_type,
                recent_activity=recent_activity
            )
