from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal, List, Dict, Union, Any
from datetime import datetime
import uuid

class NotificationBase(BaseModel):
    """通知の基本データモデル"""
    type: Literal["notification", "permission_request", "tool_use"]
    project_id: str
    session_id: Optional[str] = None
    timestamp: datetime
    notification: Optional[str] = None
    tool_name: Optional[str] = None
    tool_input: Optional[str] = None
    details: Optional[Dict[str, Any]] = None  # Claude Code hookからの詳細データ（選択肢、オプションなど）

class NotificationCreate(NotificationBase):
    """通知作成用データモデル"""
    pass

class NotificationInDB(NotificationBase):
    """データベース保存用通知モデル"""
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationResponse(NotificationInDB):
    """API応答用通知モデル"""
    pass

class NotificationListResponse(BaseModel):
    """通知一覧応答モデル"""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int

class NotificationStatsResponse(BaseModel):
    """通知統計応答モデル"""
    total_notifications: int
    unread_count: int
    by_project: Dict[str, Dict[str, int]]
    by_type: Dict[str, int]
    recent_activity: List[Dict[str, Union[str, int]]]

class NotificationMarkReadRequest(BaseModel):
    """通知既読マーク用リクエスト"""
    project_id: Optional[str] = None

class WebSocketMessage(BaseModel):
    """WebSocketメッセージモデル"""
    type: Literal["new_notification", "notification_read", "stats_update"]
    data: Dict[str, Union[str, int, bool, Dict, List]]
