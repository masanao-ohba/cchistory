from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from datetime import datetime, date
import pytz
import logging

from services.jsonl_parser import JSONLParser
from config import Config

logger = logging.getLogger(__name__)

router = APIRouter()
parser = JSONLParser()

# タイムゾーン設定
tz = pytz.timezone(Config.TIMEZONE)

@router.get("/projects")
async def get_projects():
    """利用可能なプロジェクト一覧を取得"""
    projects = []
    for project_dir in Config.get_project_dirs():
        projects.append({
            "id": project_dir.name,
            "name": project_dir.name.replace("-", " ").title(),
            "path": str(project_dir)
        })
    return {"projects": projects}

@router.get("/conversations")
async def get_conversations(
    start_date: Optional[date] = Query(None, description="開始日（日本時間）"),
    end_date: Optional[date] = Query(None, description="終了日（日本時間）"),
    projects: List[str] = Query(default=[], alias="project[]", description="プロジェクトID"),
    offset: int = Query(0, ge=0, description="オフセット"),
    limit: int = Query(100, ge=1, le=1000, description="取得件数")
):
    """会話履歴を取得"""
    try:
        # 全プロジェクトから会話を取得
        all_conversations = []

        # プロジェクトフィルタリング
        project_dirs = Config.get_project_dirs()

        if projects:
            project_dirs = [d for d in project_dirs if d.name in projects]

        for project_dir in project_dirs:
            conversations = await parser.parse_project(project_dir)
            all_conversations.extend(conversations)

        # 日付フィルタリング
        if start_date or end_date:
            filtered = []
            for conv in all_conversations:
                conv_date = datetime.fromisoformat(conv["timestamp"].replace('Z', '+00:00'))
                conv_date = conv_date.astimezone(tz).date()

                if start_date and end_date:
                    if start_date <= conv_date <= end_date:
                        filtered.append(conv)
                elif start_date:
                    if conv_date >= start_date:
                        filtered.append(conv)
                elif end_date:
                    if conv_date <= end_date:
                        filtered.append(conv)
            all_conversations = filtered

        # ソート（タイムスタンプ昇順）
        all_conversations.sort(key=lambda x: x["timestamp"])

        # ページング
        total = len(all_conversations)
        conversations = all_conversations[offset:offset + limit]

        # 統計情報
        unique_sessions = set(c["session_id"] for c in all_conversations)

        return {
            "conversations": conversations,
            "total": total,
            "offset": offset,
            "limit": limit,
            "stats": {
                "total_conversations": total,
                "unique_sessions": len(unique_sessions)
            }
        }
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/stats")
async def get_stats():
    """統計情報を取得"""
    try:
        all_conversations = []

        project_dirs = Config.get_project_dirs()

        for project_dir in project_dirs:
            conversations = await parser.parse_project(project_dir)
            all_conversations.extend(conversations)

        unique_sessions = set(c["session_id"] for c in all_conversations)

        # 日別の会話数を集計
        daily_counts = {}
        for conv in all_conversations:
            conv_date = datetime.fromisoformat(conv["timestamp"].replace('Z', '+00:00'))
            conv_date = conv_date.astimezone(tz).date()
            date_str = conv_date.isoformat()
            daily_counts[date_str] = daily_counts.get(date_str, 0) + 1

        return {
            "total_conversations": len(all_conversations),
            "unique_sessions": len(unique_sessions),
            "daily_counts": daily_counts,
            "projects": len(Config.get_project_dirs())
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
