"""
検索機能のテスト

グループベースの検索ロジックをテストする
"""

import pytest
import sys
import os
from datetime import datetime

# プロジェクトルートをpythonpathに追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.message_grouper import (
    group_messages_by_user_thread,
    find_matching_user_threads,
    group_conversations_by_thread_array
)


class TestSearchFunctionality:
    """検索機能のテスト"""

    def create_test_message(self, msg_type: str, content: str, timestamp: str, session_id: str = "session1"):
        """テスト用メッセージを作成"""
        return {
            "type": msg_type,
            "content": content,
            "timestamp": timestamp,
            "session_id": session_id,
            "uuid": f"{msg_type}-{timestamp}"
        }

    def test_group_messages_by_user_thread_basic(self):
        """基本的なグループ化のテスト"""
        messages = [
            self.create_test_message("user", "Question 1", "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "Answer 1", "2025-01-01T10:01:00Z"),
            self.create_test_message("user", "Question 2", "2025-01-01T10:02:00Z"),
            self.create_test_message("assistant", "Answer 2", "2025-01-01T10:03:00Z"),
        ]

        groups = group_messages_by_user_thread(messages)

        assert len(groups) == 2
        assert len(groups[0]) == 2  # user + assistant
        assert len(groups[1]) == 2  # user + assistant
        assert groups[0][0]["type"] == "user"
        assert groups[0][1]["type"] == "assistant"

    def test_group_messages_multiple_assistant_responses(self):
        """複数のアシスタント応答を含むグループのテスト"""
        messages = [
            self.create_test_message("user", "Question", "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "Answer 1", "2025-01-01T10:01:00Z"),
            self.create_test_message("assistant", "Answer 2", "2025-01-01T10:02:00Z"),
            self.create_test_message("user", "Next question", "2025-01-01T10:03:00Z"),
            self.create_test_message("assistant", "Final answer", "2025-01-01T10:04:00Z"),
        ]

        groups = group_messages_by_user_thread(messages)

        assert len(groups) == 2
        assert len(groups[0]) == 3  # user + 2 assistants
        assert len(groups[1]) == 2  # user + assistant

    def test_find_matching_user_threads_basic(self):
        """基本的なキーワード検索のテスト"""
        messages = [
            self.create_test_message("user", "Tell me about selenium", "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "Selenium is a web automation tool", "2025-01-01T10:01:00Z"),
            self.create_test_message("user", "What about python?", "2025-01-01T10:02:00Z"),
            self.create_test_message("assistant", "Python is a programming language", "2025-01-01T10:03:00Z"),
        ]

        results = find_matching_user_threads(messages, "selenium")

        # "selenium"を含むグループ（最初のグループ）のみ返される
        assert len(results) == 2  # user + assistant
        assert "selenium" in results[0]["content"].lower()
        assert results[1]["content"] == "Selenium is a web automation tool"

    def test_find_matching_user_threads_no_match(self):
        """マッチしないキーワード検索のテスト"""
        messages = [
            self.create_test_message("user", "Tell me about python", "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "Python is great", "2025-01-01T10:01:00Z"),
        ]

        results = find_matching_user_threads(messages, "selenium")

        assert len(results) == 0

    def test_find_matching_user_threads_assistant_match(self):
        """アシスタントメッセージがマッチするケースのテスト"""
        messages = [
            self.create_test_message("user", "Tell me about automation", "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "You can use selenium for automation", "2025-01-01T10:01:00Z"),
            self.create_test_message("user", "What about testing?", "2025-01-01T10:02:00Z"),
            self.create_test_message("assistant", "Testing is important", "2025-01-01T10:03:00Z"),
        ]

        results = find_matching_user_threads(messages, "selenium")

        # アシスタントメッセージに"selenium"があるので、そのグループ全体が返される
        assert len(results) == 2  # user + assistant
        assert results[0]["content"] == "Tell me about automation"
        assert "selenium" in results[1]["content"].lower()

    def test_find_matching_user_threads_multiple_groups(self):
        """複数グループがマッチするケースのテスト"""
        messages = [
            self.create_test_message("user", "What is selenium?", "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "Selenium is automation", "2025-01-01T10:01:00Z"),
            self.create_test_message("user", "How to use python?", "2025-01-01T10:02:00Z"),
            self.create_test_message("assistant", "Python is easy", "2025-01-01T10:03:00Z"),
            self.create_test_message("user", "Selenium with python?", "2025-01-01T10:04:00Z"),
            self.create_test_message("assistant", "Great combination", "2025-01-01T10:05:00Z"),
        ]

        results = find_matching_user_threads(messages, "selenium")

        # 1番目と3番目のグループがマッチ
        assert len(results) == 4  # 2グループ × 2メッセージ
        assert "selenium" in results[0]["content"].lower()  # 1番目のグループのuser
        assert "selenium" in results[2]["content"].lower()  # 3番目のグループのuser

    def test_find_matching_user_threads_cross_session(self):
        """複数セッション間での検索テスト（セッション概念を無視）"""
        messages = [
            self.create_test_message("user", "About selenium", "2025-01-01T10:00:00Z", "session1"),
            self.create_test_message("assistant", "Selenium info", "2025-01-01T10:01:00Z", "session1"),
            self.create_test_message("user", "About python", "2025-01-01T11:00:00Z", "session2"),
            self.create_test_message("assistant", "Python info", "2025-01-01T11:01:00Z", "session2"),
            self.create_test_message("user", "Selenium usage", "2025-01-01T12:00:00Z", "session2"),
            self.create_test_message("assistant", "Usage guide", "2025-01-01T12:01:00Z", "session2"),
        ]

        results = find_matching_user_threads(messages, "selenium")

        # セッション1の1グループ + セッション2の1グループ = 4メッセージ
        assert len(results) == 4

        # 時系列順に並んでいることを確認
        timestamps = [msg["timestamp"] for msg in results]
        assert timestamps == sorted(timestamps)

    def test_find_matching_user_threads_case_insensitive(self):
        """大文字小文字を無視した検索のテスト"""
        messages = [
            self.create_test_message("user", "Tell me about SELENIUM", "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "Selenium is great", "2025-01-01T10:01:00Z"),
        ]

        results = find_matching_user_threads(messages, "selenium")

        assert len(results) == 2
        assert "SELENIUM" in results[0]["content"]

    def test_find_matching_user_threads_partial_match(self):
        """部分マッチのテスト"""
        messages = [
            self.create_test_message("user", "WebDriver selenium-based tool", "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "Yes, seleniumwebdriver", "2025-01-01T10:01:00Z"),
        ]

        results = find_matching_user_threads(messages, "selenium")

        assert len(results) == 2

    def test_find_matching_user_threads_orphaned_assistant(self):
        """孤立したアシスタントメッセージの処理テスト"""
        messages = [
            self.create_test_message("assistant", "Selenium is useful", "2025-01-01T10:00:00Z"),
            self.create_test_message("user", "What about python?", "2025-01-01T10:01:00Z"),
            self.create_test_message("assistant", "Python is good", "2025-01-01T10:02:00Z"),
        ]

        results = find_matching_user_threads(messages, "selenium")

        # 孤立したアシスタントメッセージは破棄される（group_messages_by_user_threadの仕様）
        assert len(results) == 0

    def test_group_conversations_by_thread_array_integration(self):
        """グループ配列機能との統合テスト"""
        messages = [
            self.create_test_message("user", "Selenium question", "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "Selenium answer", "2025-01-01T10:01:00Z"),
            self.create_test_message("user", "Python question", "2025-01-01T10:02:00Z"),
            self.create_test_message("assistant", "Python answer", "2025-01-01T10:03:00Z"),
        ]

        # 検索結果をグループ配列として取得
        search_results = find_matching_user_threads(messages, "selenium")
        grouped_results = group_conversations_by_thread_array(search_results)

        assert len(grouped_results) == 1  # 1つのグループのみマッチ
        assert len(grouped_results[0]) == 2  # user + assistant
        assert "selenium" in grouped_results[0][0]["content"].lower()


class TestSearchEdgeCases:
    """検索機能のエッジケースのテスト"""

    def create_test_message(self, msg_type: str, content: str, timestamp: str, session_id: str = "session1"):
        """テスト用メッセージを作成"""
        return {
            "type": msg_type,
            "content": content,
            "timestamp": timestamp,
            "session_id": session_id,
            "uuid": f"{msg_type}-{timestamp}"
        }

    def test_empty_messages(self):
        """空のメッセージリストのテスト"""
        results = find_matching_user_threads([], "selenium")
        assert len(results) == 0

    def test_empty_keyword(self):
        """空のキーワードのテスト"""
        messages = [
            self.create_test_message("user", "Test message", "2025-01-01T10:00:00Z"),
        ]

        results = find_matching_user_threads(messages, "")
        # 空文字は全メッセージにマッチするため
        assert len(results) == 1

    def test_special_characters_in_keyword(self):
        """特殊文字を含むキーワードのテスト"""
        messages = [
            self.create_test_message("user", "Use driver.find_element() method", "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "That's correct", "2025-01-01T10:01:00Z"),
        ]

        results = find_matching_user_threads(messages, "find_element")
        assert len(results) == 2

    def test_unicode_characters(self):
        """Unicode文字のテスト"""
        messages = [
            self.create_test_message("user", "Seleniumで自動化", "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "素晴らしいですね", "2025-01-01T10:01:00Z"),
        ]

        results = find_matching_user_threads(messages, "selenium")
        assert len(results) == 2

    def test_very_long_content(self):
        """非常に長いコンテンツのテスト"""
        long_content = "selenium " + "test " * 1000
        messages = [
            self.create_test_message("user", long_content, "2025-01-01T10:00:00Z"),
            self.create_test_message("assistant", "OK", "2025-01-01T10:01:00Z"),
        ]

        results = find_matching_user_threads(messages, "selenium")
        assert len(results) == 2
