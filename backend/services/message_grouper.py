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
        if conv["type"] != "user":
            current_group.append(conv)
            continue

        if current_group:
            groups.append(current_group)
        current_group = [conv]

    # 最後のグループを追加
    if current_group:
        groups.append(current_group)

    # アシスタントメッセージのみのグループを直前のグループに統合
    filtered_groups = []
    for group in groups:
        # ユーザーメッセージが含まれていないグループ（アシスタントのみ）
        if not any(msg["type"] == "user" for msg in group):
            # 直前のグループに統合
            if filtered_groups:
                filtered_groups[-1].extend(group)
            # 直前のグループがない場合は破棄（孤立したアシスタントメッセージ）
        else:
            filtered_groups.append(group)

    return filtered_groups


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


def group_conversations_by_thread_array(conversations: List[Dict[str, Any]], sort_order: str = "asc") -> List[List[Dict[str, Any]]]:
    """
    会話をスレッド単位でグループ化し、グループ配列を返す

    Args:
        conversations: 会話メッセージのリスト
        sort_order: ソート順序（"asc"=昇順、"desc"=降順）

    Returns:
        スレッド単位でグループ化されたメッセージのグループ配列
    """
    if not conversations:
        return []

    # セッション別にグループ化
    session_groups = {}
    for conv in conversations:
        session_id = conv["session_id"]
        if session_id not in session_groups:
            session_groups[session_id] = []
        session_groups[session_id].append(conv)

    # 各セッション内でスレッド単位にグループ化
    all_thread_groups = []
    for session_id, session_conversations in session_groups.items():
        # セッション内のメッセージを時系列ソート（常に昇順）
        session_conversations.sort(key=lambda x: x["timestamp"])
        thread_groups = group_messages_by_user_thread(session_conversations)

        # 各スレッドグループに代表タイムスタンプを設定
        for group in thread_groups:
            if group:
                group_timestamp = group[0]["timestamp"]
                all_thread_groups.append({
                    "timestamp": group_timestamp,
                    "messages": group
                })

    # スレッドグループを時系列でソート
    reverse_sort = (sort_order == "desc")
    all_thread_groups.sort(key=lambda x: x["timestamp"], reverse=reverse_sort)

    # グループ配列として返す（フラット化しない）
    return [thread_group["messages"] for thread_group in all_thread_groups]


def group_conversations_by_thread(conversations: List[Dict[str, Any]], sort_order: str = "asc") -> List[Dict[str, Any]]:
    """
    会話をスレッド単位でグループ化し、ソートする

    Args:
        conversations: 会話メッセージのリスト
        sort_order: ソート順序（"asc"=昇順、"desc"=降順）

    Returns:
        スレッド単位でグループ化・ソートされたメッセージのフラットリスト

    処理の流れ:
    1. セッション別にグループ化
    2. 各セッション内でユーザー発言単位のスレッドにグループ化
    3. スレッドを時系列でソート（降順の場合も各スレッド内はユーザー→アシスタント順を保持）
    4. フラット化して返却
    """
    if not conversations:
        return []

    # セッション別にグループ化
    session_groups = {}
    for conv in conversations:
        session_id = conv["session_id"]
        if session_id not in session_groups:
            session_groups[session_id] = []
        session_groups[session_id].append(conv)

    # 各セッション内でスレッド単位にグループ化
    all_thread_groups = []
    for session_id, session_conversations in session_groups.items():
        # セッション内のメッセージを時系列ソート（常に昇順）
        session_conversations.sort(key=lambda x: x["timestamp"])
        thread_groups = group_messages_by_user_thread(session_conversations)

        # 各スレッドグループに代表タイムスタンプを設定（最初のメッセージの時刻）
        for group in thread_groups:
            if group:
                group_timestamp = group[0]["timestamp"]
                all_thread_groups.append({
                    "timestamp": group_timestamp,
                    "messages": group
                })

    # スレッドグループを時系列でソート
    reverse_sort = (sort_order == "desc")
    all_thread_groups.sort(key=lambda x: x["timestamp"], reverse=reverse_sort)

    # スレッド境界情報を保持しながらフラット化
    result = []
    for thread_index, thread_group in enumerate(all_thread_groups):
        for message_index, message in enumerate(thread_group["messages"]):
            # メッセージにスレッド情報を追加
            enhanced_message = message.copy()
            enhanced_message["thread_id"] = f"{thread_group['timestamp']}_{thread_index}"
            enhanced_message["is_thread_start"] = (message_index == 0)
            enhanced_message["thread_size"] = len(thread_group["messages"])
            result.append(enhanced_message)

    return result
