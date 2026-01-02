from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from datetime import datetime, date
import pytz
import logging

from services.jsonl_parser import JSONLParser
from services.message_grouper import group_conversations_by_thread_array
from services.token_usage import TokenUsageService
from services.streaming_collector import StreamingConversationCollector
from services.streaming_grouper import StreamingThreadGrouper
from services.lazy_streaming_grouper import LazyStreamingGrouper
from config import Config
from .notifications import router as notifications_router

logger = logging.getLogger(__name__)

from pathlib import Path

router = APIRouter()
parser = JSONLParser()
token_usage_service = TokenUsageService(projects_path=Config.CLAUDE_PROJECTS_PATH)

# 通知APIルーターを含める
router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])

tz = pytz.timezone(Config.TIMEZONE)

# Initialize streaming services
streaming_collector = StreamingConversationCollector(parser, tz)
streaming_grouper = StreamingThreadGrouper()
lazy_grouper = LazyStreamingGrouper()

def _calculate_filtered_stats(thread_groups):
    """フィルター適用後の統計情報を計算"""
    filtered_projects = set()
    daily_thread_counts = {}

    for thread_group in thread_groups:
        if not thread_group:
            continue

        # プロジェクト数の集計
        for msg in thread_group:
            if "project" in msg and msg["project"]:
                filtered_projects.add(msg["project"]["id"])

        # 日別スレッド数の集計（スレッドの最初のメッセージの日付を使用）
        first_message = thread_group[0]
        conv_date = datetime.fromisoformat(first_message["timestamp"].replace('Z', '+00:00'))
        conv_date = conv_date.astimezone(tz).date()
        date_str = conv_date.isoformat()
        daily_thread_counts[date_str] = daily_thread_counts.get(date_str, 0) + 1

    return {
        "projects": len(filtered_projects),
        "daily_thread_counts": daily_thread_counts
    }


def _count_search_matches(thread_groups: list[list[dict]], keyword: Optional[str]) -> int:
    """Count messages that match search keyword"""
    if not keyword:
        return 0

    count = 0
    for thread_group in thread_groups:
        for conv in thread_group:
            if conv.get('is_search_match', False):
                count += 1
    return count

@router.get("/projects")
async def get_projects():
    """利用可能なプロジェクト一覧を取得"""
    projects = Config.get_project_info()
    return {"projects": projects}

@router.get("/conversations")
async def get_conversations(
    start_date: Optional[date] = Query(None, description="開始日（日本時間）"),
    end_date: Optional[date] = Query(None, description="終了日（日本時間）"),
    projects: List[str] = Query(default=[], alias="project[]", description="プロジェクトID"),
    keyword: Optional[str] = Query(None, description="検索キーワード"),
    show_related_threads: bool = Query(True, description="関連スレッド全体を表示"),
    sort_order: str = Query("desc", description="表示順（asc=昇順、desc=降順）"),
    offset: int = Query(0, ge=0, description="オフセット"),
    limit: int = Query(15, ge=1, le=1000, description="取得件数"),
    _t: Optional[str] = Query(None, description="Cache busting timestamp")
):
    """
    会話履歴を取得（ストリーミングアーキテクチャ）

    Unified code path for all queries using streaming-based filtering.
    Applies filters during collection and stops early when enough data is collected.
    """
    try:
        # Get project directories (filter by 'projects' param if provided)
        project_dirs = Config.get_project_dirs()
        if projects:
            project_dirs = [d for d in project_dirs if d.name in projects]

        # Build filter dictionary
        filters = {
            'start_date': start_date,
            'end_date': end_date,
            'keyword': keyword,
            'show_related_threads': show_related_threads,
        }

        # Stream conversations with filtering
        conversation_stream = streaming_collector.collect_conversations(
            project_dirs=project_dirs,
            filters=filters,
            sort_order=sort_order
        )

        # Collect thread groups with early termination
        thread_groups, total_threads, total_messages = \
            await streaming_grouper.collect_thread_groups(
                conversation_stream=conversation_stream,
                limit=limit,
                offset=offset,
                sort_order=sort_order,
                keyword_filter=keyword,
                show_related_threads=show_related_threads
            )

        # Calculate stats
        filtered_stats = _calculate_filtered_stats(thread_groups)
        search_match_count = _count_search_matches(thread_groups, keyword)

        # Build response
        return {
            "conversations": thread_groups,
            "total_threads": total_threads,
            "total_messages": total_messages,
            "actual_threads": len(thread_groups),
            "actual_messages": sum(len(group) for group in thread_groups),
            "offset": offset,
            "limit": limit,
            "search_match_count": search_match_count,
            "stats": {
                "total_threads": total_threads,
                "total_messages": total_messages,
                "projects": filtered_stats["projects"],
                "daily_thread_counts": filtered_stats["daily_thread_counts"]
            }
        }

    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/lazy")
async def get_conversations_lazy(
    start_date: Optional[date] = Query(None, description="開始日（日本時間）"),
    end_date: Optional[date] = Query(None, description="終了日（日本時間）"),
    projects: List[str] = Query(default=[], alias="project[]", description="プロジェクトID"),
    keyword: Optional[str] = Query(None, description="検索キーワード"),
    show_related_threads: bool = Query(True, description="関連スレッド全体を表示"),
    sort_order: str = Query("desc", description="表示順（asc=昇順、desc=降順）"),
    offset: int = Query(0, ge=0, description="オフセット"),
    limit: int = Query(15, ge=1, le=1000, description="取得件数"),
    _t: Optional[str] = Query(None, description="Cache busting timestamp")
):
    """
    会話履歴を取得（Lazy K-Way Merge アルゴリズム）

    Uses lazy loading with priority queue for O(log p + k) performance.
    Only loads data as needed for pagination.
    """
    try:
        # Quick test - return early for debugging
        logger.info(f"Lazy endpoint called with limit={limit}, offset={offset}")

        # Get project directories
        project_dirs = Config.get_project_dirs()
        if projects:
            project_dirs = [d for d in project_dirs if d.name in projects]

        logger.info(f"Found {len(project_dirs)} project directories")

        # Get project files mapping
        project_files = lazy_grouper.get_project_files(project_dirs)

        logger.info(f"Project files: {len(project_files)} projects")

        # Convert date to string if provided
        start_date_str = start_date.isoformat() if start_date else None
        end_date_str = end_date.isoformat() if end_date else None

        # Get conversations using lazy loading
        thread_groups, stats = lazy_grouper.get_conversations_lazy(
            project_files=project_files,
            offset=offset,
            limit=limit,
            start_date=start_date_str,
            end_date=end_date_str,
            keyword=keyword,
            sort_order=sort_order,
            show_related_threads=show_related_threads
        )

        logger.info(f"Lazy loading returned {len(thread_groups)} thread groups")

        # Calculate additional stats
        filtered_stats = _calculate_filtered_stats(thread_groups)
        search_match_count = _count_search_matches(thread_groups, keyword)

        # Build response
        return {
            "conversations": thread_groups,
            "total_threads": stats.get("total_threads", 0),
            "total_messages": stats.get("total_messages", 0),
            "actual_threads": len(thread_groups),
            "actual_messages": sum(len(group) for group in thread_groups),
            "offset": offset,
            "limit": limit,
            "search_match_count": search_match_count,
            "lazy_loaded": True,  # Indicator that this used lazy loading
            "messages_scanned": stats.get("messages_scanned", 0),
            "stats": {
                "total_threads": stats.get("total_threads", 0),
                "total_messages": stats.get("total_messages", 0),
                "projects": filtered_stats["projects"],
                "daily_thread_counts": filtered_stats["daily_thread_counts"]
            }
        }

    except Exception as e:
        logger.error(f"Error getting lazy conversations: {e}", exc_info=True)
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

        # スレッドグループ化して統計を計算
        grouped_conversations = group_conversations_by_thread_array(all_conversations, "desc")
        total_threads = len(grouped_conversations)
        total_messages = len(all_conversations)

        # 日別の会話数を集計（スレッド数ベース）
        daily_thread_counts = {}
        for thread_group in grouped_conversations:
            if thread_group:
                # スレッドの最初のメッセージの日付を使用
                first_message = thread_group[0]
                conv_date = datetime.fromisoformat(first_message["timestamp"].replace('Z', '+00:00'))
                conv_date = conv_date.astimezone(tz).date()
                date_str = conv_date.isoformat()
                daily_thread_counts[date_str] = daily_thread_counts.get(date_str, 0) + 1

        return {
            "total_threads": total_threads,
            "total_messages": total_messages,
            "daily_thread_counts": daily_thread_counts,
            "projects": len(Config.get_project_dirs())
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/token-usage")
async def get_token_usage():
    """トークン使用状況を取得"""
    try:
        usage = await token_usage_service.get_current_usage()
        return usage
    except Exception as e:
        logger.error(f"Error getting token usage: {e}")
        raise HTTPException(status_code=500, detail=str(e))
