from fastapi import APIRouter, HTTPException, Query, Depends, Header
from typing import Optional, Literal
import logging
import os

from models.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    NotificationStatsResponse,
    NotificationMarkReadRequest
)
from services.notification_manager import NotificationManager
from config import Config

logger = logging.getLogger(__name__)

router = APIRouter()

# 通知マネージャーのインスタンス
notification_manager = NotificationManager()

# WebSocket ConnectionManager（main.pyから注入される）
connection_manager = None

def set_connection_manager(manager):
    """WebSocket ConnectionManagerを設定"""
    global connection_manager
    connection_manager = manager

def convert_project_path_to_internal_format(project_path: str) -> str:
    """
    プロジェクトパスをClaude内部形式に変換
    例: /Users/masanao.oba/workspace/cchistory -> -Users-masanao-oba-workspace-cchistory
    """
    try:
        # パスの正規化（重複スラッシュやドットを処理）
        normalized_path = os.path.normpath(project_path)
        # 先頭のスラッシュを除去してからハイフンに変換
        if normalized_path.startswith('/'):
            normalized_path = normalized_path[1:]
        # スラッシュ、ドット、アンダースコアをハイフンに変換
        claude_format = '-' + normalized_path.replace('/', '-').replace('.', '-').replace('_', '-')
        return claude_format
    except Exception as e:
        logger.warning(f"Failed to convert project path '{project_path}' to internal format: {e}")
        # フォールバック: 元のパスをそのまま返す
        return project_path

# 簡易認証（オプション）
async def verify_auth_token(authorization: Optional[str] = Header(None)):
    """認証トークンの検証（オプション）"""
    # 現在は認証を無効化（ローカル環境のため）
    # 将来的には環境変数で認証を有効化可能
    return True

@router.post("/hook", response_model=dict)
async def receive_notification(
    notification: NotificationCreate,
    auth: bool = Depends(verify_auth_token)
):
    """
    Claude hooksからの通知を受信

    Claude Code hooksから送信される通知データを受信し、
    cchistoryシステムで管理・表示するために保存します。
    """
    try:
        # 通知データの検証
        if not notification.project_id:
            raise HTTPException(status_code=400, detail="project_id is required")


        # プロジェクトパスをClaude内部形式に変換
        original_project_id = notification.project_id
        if notification.project_id.startswith('/'):
            # フルパスの場合は内部形式に変換
            notification.project_id = convert_project_path_to_internal_format(notification.project_id)
            # プロジェクトパスを内部フォーマットに変換

        # 通知タイプ別の追加検証
        if notification.type == "tool_use":
            if not notification.tool_name:
                raise HTTPException(status_code=400, detail="tool_name is required for tool_use notifications")

        if notification.type in ["notification", "permission_request"]:
            if not notification.notification:
                raise HTTPException(status_code=400, detail="notification content is required")

        # 通知を作成・保存
        created_notification = await notification_manager.create_notification(notification)

        logger.info(f"Received notification from project {notification.project_id}: {notification.type}")

        # WebSocket通知配信
        if connection_manager:
            await connection_manager.broadcast_notification(created_notification)

        return {
            "status": "success",
            "notification_id": created_notification.id,
            "message": "Notification received successfully"
        }

    except ValueError as e:
        logger.warning(f"Notification validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"Failed to process notification: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    project_id: Optional[str] = Query(None, description="プロジェクトでフィルタリング"),
    type: Optional[Literal["notification", "permission_request", "tool_use"]] = Query(None, description="通知タイプでフィルタリング"),
    unread_only: bool = Query(False, description="未読のみ取得"),
    limit: int = Query(50, ge=1, le=1000, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    auth: bool = Depends(verify_auth_token)
):
    """
    通知一覧を取得

    保存されている通知の一覧を、指定された条件でフィルタリングして取得します。
    """
    try:
        result = await notification_manager.get_notifications(
            project_id=project_id,
            notification_type=type,
            unread_only=unread_only,
            limit=limit,
            offset=offset
        )

        # 通知データ取得完了
        return result

    except Exception as e:
        logger.error(f"Failed to get notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notifications")

@router.patch("/{notification_id}/read", response_model=dict)
async def mark_notification_read(
    notification_id: str,
    auth: bool = Depends(verify_auth_token)
):
    """
    指定した通知を既読にマーク
    """
    try:
        success = await notification_manager.mark_notification_read(notification_id)

        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")

        # WebSocket通知配信
        if connection_manager:
            # 通知詳細を取得してプロジェクトIDを含める
            notifications = await notification_manager.get_notifications(limit=1000)
            for notif in notifications.notifications:
                if notif.id == notification_id:
                    await connection_manager.broadcast_notification_read(notification_id, notif.project_id)
                    break

        return {
            "status": "success",
            "message": "Notification marked as read"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to mark notification as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")

@router.post("/mark-all-read", response_model=dict)
async def mark_all_notifications_read(
    request: Optional[NotificationMarkReadRequest] = None,
    auth: bool = Depends(verify_auth_token)
):
    """
    全通知または指定プロジェクトの通知を既読にマーク
    """
    try:
        project_id = request.project_id if request else None
        marked_count = await notification_manager.mark_all_read(project_id)

        # WebSocket統計更新配信
        if connection_manager and marked_count > 0:
            stats = await notification_manager.get_stats()
            await connection_manager.broadcast_stats_update(stats.dict())

        return {
            "status": "success",
            "marked_count": marked_count,
            "message": f"{marked_count} notifications marked as read"
        }

    except Exception as e:
        logger.error(f"Failed to mark all notifications as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notifications as read")

@router.delete("/{notification_id}", response_model=dict)
async def delete_notification(
    notification_id: str,
    auth: bool = Depends(verify_auth_token)
):
    """
    指定した通知を削除
    """
    try:
        success = await notification_manager.delete_notification(notification_id)

        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")

        return {
            "status": "success",
            "message": "Notification deleted"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete notification")

@router.get("/stats", response_model=NotificationStatsResponse)
async def get_notification_stats(
    auth: bool = Depends(verify_auth_token)
):
    """
    通知統計情報を取得

    通知数、未読数、プロジェクト別統計、タイプ別統計、
    最近のアクティビティなどの統計情報を取得します。
    """
    try:
        stats = await notification_manager.get_stats()

        logger.debug("Retrieved notification stats")
        return stats

    except Exception as e:
        logger.error(f"Failed to get notification stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notification statistics")
