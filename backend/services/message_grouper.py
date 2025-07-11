"""
メッセージのグループ化処理を行うモジュール

主にユーザー発言からアシスタント応答群までをまとめてグループ化する機能を提供する
"""

from typing import List, Dict, Any


def group_messages_by_user_thread(conversations: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
    """
    ユーザー発言からそれに対するアシスタント応答群までをグループ化

    Args:
        conversations: 会話メッセージのリスト

    Returns:
        グループ化されたメッセージのリスト（各グループはメッセージのリスト）

    例:
        [user1, assistant1, assistant2, user2, assistant3]
        -> [[user1, assistant1, assistant2], [user2, assistant3]]
    """
    groups = []
    current_group = []

    for conv in conversations:
        if conv["type"] == "user":
            # 新しいユーザー発言が始まったら、前のグループを確定
            if current_group:
                groups.append(current_group)
            current_group = [conv]
        else:
            # アシスタントの応答は現在のグループに追加
            current_group.append(conv)

    # 最後のグループを追加
    if current_group:
        groups.append(current_group)

    return groups


def find_matching_user_threads(conversations: List[Dict[str, Any]], keyword: str) -> List[Dict[str, Any]]:
    """
    キーワードにマッチするユーザー発言スレッドを検索

    Args:
        conversations: 会話メッセージのリスト
        keyword: 検索キーワード（小文字）

    Returns:
        マッチしたスレッドに含まれる全メッセージのフラット化されたリスト
    """
    # セッション別にグループ化
    session_groups = {}
    for conv in conversations:
        session_id = conv["session_id"]
        if session_id not in session_groups:
            session_groups[session_id] = []
        session_groups[session_id].append(conv)

    matching_messages = []

    for session_id, session_conversations in session_groups.items():
        # セッション内でユーザー発言単位のグループに分ける
        user_thread_groups = group_messages_by_user_thread(session_conversations)

        # キーワードにマッチするグループを特定
        for group in user_thread_groups:
            if any(keyword in conv["content"].lower() for conv in group):
                matching_messages.extend(group)

    return matching_messages
