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
    projects = Config.get_project_info()
    return {"projects": projects}

@router.get("/conversations")
async def get_conversations(
    start_date: Optional[date] = Query(None, description="開始日（日本時間）"),
    end_date: Optional[date] = Query(None, description="終了日（日本時間）"),
    projects: List[str] = Query(default=[], alias="project[]", description="プロジェクトID"),
    keyword: Optional[str] = Query(None, description="検索キーワード"),
    show_related_threads: bool = Query(True, description="関連スレッド全体を表示"),
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

        # ソート（タイムスタンプ昇順）
        all_conversations.sort(key=lambda x: x["timestamp"])

        # 日付フィルタリング（会話の流れを保持）
        if start_date or end_date:
            # まず日付範囲内のメッセージを特定
            date_filtered_indices = set()
            for i, conv in enumerate(all_conversations):
                conv_date = datetime.fromisoformat(conv["timestamp"].replace('Z', '+00:00'))
                conv_date = conv_date.astimezone(tz).date()

                in_date_range = True
                if start_date and end_date:
                    in_date_range = start_date <= conv_date <= end_date
                elif start_date:
                    in_date_range = conv_date >= start_date
                elif end_date:
                    in_date_range = conv_date <= end_date

                if in_date_range:
                    date_filtered_indices.add(i)

            # 各セッションの最初のメッセージがアシスタントの場合、ユーザーメッセージを追加
            enhanced_indices = set(date_filtered_indices)
            session_first_indices = {}

            # 日付範囲内の各セッションの最初のインデックスを特定
            for i in sorted(date_filtered_indices):
                session_id = all_conversations[i]["session_id"]
                if session_id not in session_first_indices:
                    session_first_indices[session_id] = i

            # 各セッションの最初がアシスタントならユーザーメッセージまで遡る
            for session_id, first_idx in session_first_indices.items():
                if all_conversations[first_idx]["type"] == "assistant":
                    # このセッションの開始（ユーザーメッセージ）を探す
                    for j in range(first_idx - 1, -1, -1):
                        if all_conversations[j]["session_id"] == session_id:
                            enhanced_indices.add(j)
                            if all_conversations[j]["type"] == "user":
                                break
                        else:
                            # 異なるセッションに到達
                            break

            # インデックス順に会話を構築
            filtered_conversations = []
            for i in sorted(enhanced_indices):
                filtered_conversations.append(all_conversations[i])

            all_conversations = filtered_conversations

        # キーワード検索処理
        search_match_count = 0
        if keyword:
            keyword_lower = keyword.lower()

            # 最初にキーワードマッチするメッセージ数をカウント
            search_match_count = sum(1 for conv in all_conversations if keyword_lower in conv["content"].lower())

            if show_related_threads:
                # 関連スレッド全体を表示：キーワードにマッチするメッセージが含まれるセッションの全メッセージを取得
                matching_session_ids = set()
                for conv in all_conversations:
                    if keyword_lower in conv["content"].lower():
                        matching_session_ids.add(conv["session_id"])

                # マッチしたセッションの全メッセージを取得
                thread_conversations = [
                    conv for conv in all_conversations
                    if conv["session_id"] in matching_session_ids
                ]

                # キーワードマッチフラグとハイライト用のキーワードを追加
                for conv in thread_conversations:
                    conv["is_search_match"] = keyword_lower in conv["content"].lower()
                    conv["search_keyword"] = keyword

                all_conversations = thread_conversations
            else:
                # キーワードにマッチするメッセージのみを表示
                keyword_conversations = [
                    conv for conv in all_conversations
                    if keyword_lower in conv["content"].lower()
                ]

                # キーワードマッチフラグとハイライト用のキーワードを追加
                for conv in keyword_conversations:
                    conv["is_search_match"] = True
                    conv["search_keyword"] = keyword

                all_conversations = keyword_conversations
        else:
            # キーワードがない場合は、既存のsearch_keywordフィールドを除去
            for conv in all_conversations:
                if "search_keyword" in conv:
                    del conv["search_keyword"]
                if "is_search_match" in conv:
                    del conv["is_search_match"]

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
            "search_match_count": search_match_count,
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
