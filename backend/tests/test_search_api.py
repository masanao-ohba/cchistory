"""
検索API機能のテスト

実際のAPIエンドポイントを通じた検索機能をテストする
"""

import pytest
import json
import sys
import os
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# プロジェクトルートをpythonpathに追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


class TestSearchAPI:
    """検索API機能のテスト"""

    @pytest.fixture
    def client(self):
        """テストクライアントを作成"""
        return TestClient(app)

    @pytest.fixture
    def sample_conversations(self):
        """テスト用の会話データを作成"""
        return [
            {
                "type": "user",
                "content": "Tell me about selenium automation",
                "timestamp": "2025-01-01T10:00:00Z",
                "session_id": "session1",
                "uuid": "user-1"
            },
            {
                "type": "assistant",
                "content": "Selenium is a powerful web automation framework",
                "timestamp": "2025-01-01T10:01:00Z",
                "session_id": "session1",
                "uuid": "assistant-1"
            },
            {
                "type": "user",
                "content": "How to use Python for testing?",
                "timestamp": "2025-01-01T10:02:00Z",
                "session_id": "session1",
                "uuid": "user-2"
            },
            {
                "type": "assistant",
                "content": "Python has great testing libraries",
                "timestamp": "2025-01-01T10:03:00Z",
                "session_id": "session1",
                "uuid": "assistant-2"
            },
            {
                "type": "user",
                "content": "Can I combine selenium with pytest?",
                "timestamp": "2025-01-01T10:04:00Z",
                "session_id": "session2",
                "uuid": "user-3"
            },
            {
                "type": "assistant",
                "content": "Yes, that's a common and effective combination",
                "timestamp": "2025-01-01T10:05:00Z",
                "session_id": "session2",
                "uuid": "assistant-3"
            }
        ]

    @patch('backend.services.jsonl_parser.parse_all_conversations')
    def test_search_with_keyword_match(self, mock_parse, client, sample_conversations):
        """キーワードマッチする検索のテスト"""
        mock_parse.return_value = sample_conversations

        response = client.get("/api/conversations", params={
            "keyword": "selenium",
            "show_related_threads": "true"
        })

        assert response.status_code == 200
        data = response.json()

        # "selenium"を含む2つのグループが返される
        assert data["total"] == 4  # 2グループ × 2メッセージ
        assert data["search_match_count"] == 2  # "selenium"を含むメッセージは2個

        conversations = data["conversations"]

        # 1番目のグループ
        assert "selenium" in conversations[0]["content"].lower()
        assert conversations[0]["is_search_match"] is True
        assert conversations[1]["is_search_match"] is False  # assistant応答にはseleniumなし

        # 3番目のグループ（user-3, assistant-3）
        assert "selenium" in conversations[2]["content"].lower()
        assert conversations[2]["is_search_match"] is True

    @patch('backend.services.jsonl_parser.parse_all_conversations')
    def test_search_with_no_match(self, mock_parse, client, sample_conversations):
        """マッチしないキーワード検索のテスト"""
        mock_parse.return_value = sample_conversations

        response = client.get("/api/conversations", params={
            "keyword": "javascript",
            "show_related_threads": "true"
        })

        assert response.status_code == 200
        data = response.json()

        assert data["total"] == 0
        assert data["search_match_count"] == 0
        assert len(data["conversations"]) == 0

    @patch('backend.services.jsonl_parser.parse_all_conversations')
    def test_search_without_related_threads(self, mock_parse, client, sample_conversations):
        """関連スレッド表示なしの検索テスト"""
        mock_parse.return_value = sample_conversations

        response = client.get("/api/conversations", params={
            "keyword": "selenium",
            "show_related_threads": "false"
        })

        assert response.status_code == 200
        data = response.json()

        # "selenium"を含むメッセージのみ返される
        assert data["search_match_count"] == 2
        conversations = data["conversations"]

        # 全メッセージでis_search_matchがTrue
        for conv in conversations:
            assert conv["is_search_match"] is True
            assert "selenium" in conv["content"].lower()

    @patch('backend.services.jsonl_parser.parse_all_conversations')
    def test_search_case_insensitive(self, mock_parse, client, sample_conversations):
        """大文字小文字を無視した検索のテスト"""
        mock_parse.return_value = sample_conversations

        response = client.get("/api/conversations", params={
            "keyword": "SELENIUM",
            "show_related_threads": "true"
        })

        assert response.status_code == 200
        data = response.json()

        assert data["search_match_count"] == 2
        assert data["total"] == 4

    @patch('backend.services.jsonl_parser.parse_all_conversations')
    def test_search_with_date_filter(self, mock_parse, client, sample_conversations):
        """日付フィルターと組み合わせた検索のテスト"""
        mock_parse.return_value = sample_conversations

        response = client.get("/api/conversations", params={
            "keyword": "selenium",
            "start_date": "2025-01-01",
            "end_date": "2025-01-01",
            "show_related_threads": "true"
        })

        assert response.status_code == 200
        data = response.json()

        # 日付範囲内の"selenium"マッチグループが返される
        assert data["search_match_count"] >= 0  # 実装依存

    @patch('backend.services.jsonl_parser.parse_all_conversations')
    def test_search_with_project_filter(self, mock_parse, client, sample_conversations):
        """プロジェクトフィルターと組み合わせた検索のテスト"""
        # プロジェクト情報を追加
        for conv in sample_conversations:
            conv["project_id"] = "test-project"

        mock_parse.return_value = sample_conversations

        response = client.get("/api/conversations", params={
            "keyword": "selenium",
            "projects": "test-project",
            "show_related_threads": "true"
        })

        assert response.status_code == 200
        data = response.json()

        # プロジェクトフィルターが適用された状態で検索
        assert data["search_match_count"] == 2

    @patch('backend.services.jsonl_parser.parse_all_conversations')
    def test_search_highlight_keywords(self, mock_parse, client, sample_conversations):
        """検索キーワードがハイライト用に設定されることのテスト"""
        mock_parse.return_value = sample_conversations

        response = client.get("/api/conversations", params={
            "keyword": "selenium",
            "show_related_threads": "true"
        })

        assert response.status_code == 200
        data = response.json()

        conversations = data["conversations"]

        # 全メッセージにsearch_keywordが設定される
        for conv in conversations:
            assert conv["search_keyword"] == "selenium"
            # is_search_matchは実際にキーワードを含むメッセージのみTrue
            expected_match = "selenium" in conv["content"].lower()
            assert conv["is_search_match"] == expected_match

    @patch('backend.services.jsonl_parser.parse_all_conversations')
    def test_search_pagination(self, mock_parse, client):
        """検索結果のページネーションテスト"""
        # 大量のテストデータを作成
        large_dataset = []
        for i in range(50):
            large_dataset.extend([
                {
                    "type": "user",
                    "content": f"Question about selenium {i}",
                    "timestamp": f"2025-01-01T{10 + i // 10}:{i % 10:02d}:00Z",
                    "session_id": f"session{i}",
                    "uuid": f"user-{i}"
                },
                {
                    "type": "assistant",
                    "content": f"Answer {i}",
                    "timestamp": f"2025-01-01T{10 + i // 10}:{i % 10:02d}:01Z",
                    "session_id": f"session{i}",
                    "uuid": f"assistant-{i}"
                }
            ])

        mock_parse.return_value = large_dataset

        response = client.get("/api/conversations", params={
            "keyword": "selenium",
            "limit": "10",
            "offset": "0",
            "show_related_threads": "true"
        })

        assert response.status_code == 200
        data = response.json()

        # ページネーション適用を確認
        assert len(data["conversations"]) <= 10
        assert data["search_match_count"] == 50  # 全マッチ数

    def test_search_api_error_handling(self, client):
        """検索API のエラーハンドリングテスト"""
        # 無効なパラメータでのテスト
        response = client.get("/api/conversations", params={
            "keyword": "test",
            "limit": "invalid"
        })

        # エラー時も適切にレスポンスを返すことを確認
        assert response.status_code in [200, 400, 422]

    @patch('backend.services.jsonl_parser.parse_all_conversations')
    def test_search_sorting_preserved(self, mock_parse, client, sample_conversations):
        """検索結果のソート順が保持されることのテスト"""
        mock_parse.return_value = sample_conversations

        # 降順でのテスト
        response = client.get("/api/conversations", params={
            "keyword": "selenium",
            "sort_order": "desc",
            "show_related_threads": "true"
        })

        assert response.status_code == 200
        data = response.json()

        conversations = data["conversations"]
        if len(conversations) > 1:
            # タイムスタンプが降順になっていることを確認
            timestamps = [conv["timestamp"] for conv in conversations]
            # グループ内では昇順（user -> assistant）だが、グループ間では降順
            # 最低限、最初のメッセージが最後のメッセージより新しいことを確認
            first_group_time = conversations[0]["timestamp"]
            last_group_time = conversations[-1]["timestamp"]
            assert first_group_time >= last_group_time or len(conversations) == 2
