from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from datetime import datetime, date
import pytz
import logging

from services.jsonl_parser import JSONLParser
from services.message_grouper import find_matching_user_threads, group_conversations_by_thread, group_conversations_by_thread_array
from config import Config
from .notifications import router as notifications_router

logger = logging.getLogger(__name__)

router = APIRouter()
parser = JSONLParser()

# 通知APIルーターを含める
router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])

tz = pytz.timezone(Config.TIMEZONE)

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

def _apply_date_filter(conversations, start_date, end_date):
    """日付フィルタリングを適用（会話の流れを保持）"""
    # まず日付範囲内のメッセージを特定
    date_filtered_indices = set()
    for i, conv in enumerate(conversations):
        conv_date = datetime.fromisoformat(conv["timestamp"].replace('Z', '+00:00'))
        conv_date = conv_date.astimezone(tz).date()

        if start_date and end_date and not (start_date <= conv_date <= end_date):
            continue
        if start_date and not end_date and conv_date < start_date:
            continue
        if end_date and not start_date and conv_date > end_date:
            continue

        date_filtered_indices.add(i)

    # 各セッションの最初のメッセージがアシスタントの場合、ユーザーメッセージを追加
    enhanced_indices = set(date_filtered_indices)
    session_first_indices = {}

    # 日付範囲内の各セッションの最初のインデックスを特定
    for i in sorted(date_filtered_indices):
        session_id = conversations[i]["session_id"]
        if session_id not in session_first_indices:
            session_first_indices[session_id] = i

    for session_id, first_idx in session_first_indices.items():
        if conversations[first_idx]["type"] != "assistant":
            continue

        # このセッションの開始（ユーザーメッセージ）を探す
        for j in range(first_idx - 1, -1, -1):
            if conversations[j]["session_id"] != session_id:
                break

            enhanced_indices.add(j)
            if conversations[j]["type"] == "user":
                break

    # インデックス順に会話を構築
    filtered_conversations = []
    for i in sorted(enhanced_indices):
        filtered_conversations.append(conversations[i])

    return filtered_conversations

def _apply_keyword_filter(conversations, keyword, show_related_threads):
    """キーワード検索フィルタリングを適用"""
    keyword_lower = keyword.lower()

    # キーワードマッチするメッセージ数をカウント
    search_match_count = sum(1 for conv in conversations if keyword_lower in conv["content"].lower())

    if show_related_threads:
        # 関連スレッド全体を表示
        matching_messages = find_matching_user_threads(conversations, keyword_lower)

        # キーワードマッチフラグとハイライト用のキーワードを追加
        for conv in matching_messages:
            conv["is_search_match"] = keyword_lower in conv["content"].lower()
            conv["search_keyword"] = keyword

        return matching_messages, search_match_count
    else:
        # キーワードにマッチするメッセージのみを表示
        keyword_conversations = [
            conv for conv in conversations
            if keyword_lower in conv["content"].lower()
        ]

        # キーワードマッチフラグとハイライト用のキーワードを追加
        for conv in keyword_conversations:
            conv["is_search_match"] = True
            conv["search_keyword"] = keyword

        return keyword_conversations, search_match_count

def _clean_search_fields(conversations):
    """検索関連フィールドをクリーンアップ"""
    for conv in conversations:
        if "search_keyword" in conv:
            del conv["search_keyword"]
        if "is_search_match" in conv:
            del conv["is_search_match"]

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
    limit: int = Query(50, ge=1, le=1000, description="取得件数"),
    _t: Optional[str] = Query(None, description="Cache busting timestamp")
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

        # ソート（表示順に応じて昇順または降順）
        reverse_sort = (sort_order == "desc")
        all_conversations.sort(key=lambda x: x["timestamp"], reverse=reverse_sort)

        # 日付フィルタリング（会話の流れを保持）
        if start_date or end_date:
            all_conversations = _apply_date_filter(all_conversations, start_date, end_date)

        # キーワード検索処理
        search_match_count = 0
        if keyword:
            all_conversations, search_match_count = _apply_keyword_filter(all_conversations, keyword, show_related_threads)
        else:
            # キーワードがない場合は、既存のsearch_keywordフィールドを除去
            _clean_search_fields(all_conversations)

        # スレッド単位でのグループ化処理（ページング前に実行）
        all_thread_groups = group_conversations_by_thread_array(all_conversations, sort_order)
        total_threads = len(all_thread_groups)
        total_messages = sum(len(group) for group in all_thread_groups)

        # スレッド単位でページング
        thread_groups = all_thread_groups[offset:offset + limit]
        actual_threads = len(thread_groups)
        actual_messages = sum(len(group) for group in thread_groups)

        conversations = thread_groups

        # フィルター適用後の統計情報を計算
        filtered_stats = _calculate_filtered_stats(all_thread_groups)

        return {
            "conversations": conversations,
            "total_threads": total_threads,
            "total_messages": total_messages,
            "actual_threads": actual_threads,
            "actual_messages": actual_messages,
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
