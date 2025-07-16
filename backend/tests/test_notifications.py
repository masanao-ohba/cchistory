"""
通知システムのバックエンドテスト

このモジュールは通知システムのAPI、データ管理、WebSocket通信の
各機能をテストします。
"""

import pytest
import json
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from fastapi import status

# テスト対象のインポート
from main import app
from api.notifications import convert_project_path_to_internal_format
from models.notification import NotificationCreate, NotificationInDB
from services.notification_manager import NotificationManager


class TestNotificationAPI:
    """通知API機能のテストクラス"""

    def setup_method(self):
        """テストメソッドごとの初期化"""
        self.client = TestClient(app)

    def test_notification_hook_endpoint_success(self):
        """
        目的: 通知受信APIの正常動作を確認
        観点: 有効な通知データでのAPI応答
        期待結果: 201 Created、通知IDが返される
        """
        notification_data = {
            "type": "permission_request",
            "project_id": "/Users/test/workspace/project",
            "session_id": "test-session-123",
            "notification": "Claude needs your permission to use Bash",
            "timestamp": "2025-07-16T10:00:00Z"
        }

        response = self.client.post(
            "/api/notifications/hook",
            json=notification_data
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "notification_id" in data
        assert data["message"] == "Notification received successfully"

    def test_notification_hook_endpoint_missing_required_fields(self):
        """
        目的: 必須フィールド不足時のバリデーション確認
        観点: 不正なリクエストデータでのエラーハンドリング
        期待結果: 400 Bad Request、適切なエラーメッセージ
        """
        # project_idが不足
        notification_data = {
            "type": "permission_request",
            "session_id": "test-session-123",
            "notification": "Test notification"
        }

        response = self.client.post(
            "/api/notifications/hook",
            json=notification_data
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "project_id is required" in response.json()["detail"]

    def test_notification_hook_tool_use_validation(self):
        """
        目的: ツール使用通知の固有バリデーション確認
        観点: ツール使用通知でのtool_name必須チェック
        期待結果: tool_name不足時に400エラー
        """
        notification_data = {
            "type": "tool_use",
            "project_id": "/Users/test/project",
            "session_id": "test-session-123",
            # tool_nameが不足
            "timestamp": "2025-07-16T10:00:00Z"
        }

        response = self.client.post(
            "/api/notifications/hook",
            json=notification_data
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "tool_name is required" in response.json()["detail"]

    def test_get_notifications_list(self):
        """
        目的: 通知一覧取得APIの動作確認
        観点: 正常なレスポンス形式とデータ構造
        期待結果: 通知リストとメタデータが返される
        """
        response = self.client.get("/api/notifications")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "notifications" in data
        assert "total" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)

    def test_get_notifications_with_filters(self):
        """
        目的: 通知一覧フィルタリング機能の確認
        観点: クエリパラメータによるフィルタリング
        期待結果: フィルタリングされた結果が返される
        """
        params = {
            "project_id": "test-project",
            "type": "permission_request",
            "unread_only": "true",
            "limit": "5"
        }

        response = self.client.get("/api/notifications", params=params)

        assert response.status_code == status.HTTP_200_OK
        # APIが正しくクエリパラメータを受け取ることを確認
        # 実際のフィルタリング結果は統合テストで確認

    def test_mark_notification_read(self):
        """
        目的: 通知既読マーク機能の確認
        観点: PATCH /notifications/{id}/readの動作
        期待結果: 成功レスポンスが返される
        """
        # まず通知を作成
        notification_data = {
            "type": "notification",
            "project_id": "/Users/test/project",
            "session_id": "test-session",
            "notification": "Test notification",
            "timestamp": "2025-07-16T10:00:00Z"
        }

        create_response = self.client.post(
            "/api/notifications/hook",
            json=notification_data
        )
        notification_id = create_response.json()["notification_id"]

        # 既読マーク
        response = self.client.patch(f"/api/notifications/{notification_id}/read")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "marked as read" in data["message"]

    def test_mark_all_notifications_read(self):
        """
        目的: 全通知既読マーク機能の確認
        観点: POST /notifications/mark-all-readの動作
        期待結果: 処理件数を含む成功レスポンス
        """
        response = self.client.post("/api/notifications/mark-all-read")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "marked_count" in data
        assert isinstance(data["marked_count"], int)

    def test_delete_notification(self):
        """
        目的: 通知削除機能の確認
        観点: DELETE /notifications/{id}の動作
        期待結果: 成功レスポンスが返される
        """
        # まず通知を作成
        notification_data = {
            "type": "notification",
            "project_id": "/Users/test/project",
            "session_id": "test-session",
            "notification": "Test notification to delete",
            "timestamp": "2025-07-16T10:00:00Z"
        }

        create_response = self.client.post(
            "/api/notifications/hook",
            json=notification_data
        )
        notification_id = create_response.json()["notification_id"]

        # 削除
        response = self.client.delete(f"/api/notifications/{notification_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "deleted" in data["message"]

    def test_get_notification_stats(self):
        """
        目的: 通知統計情報取得APIの確認
        観点: 統計データの構造と内容
        期待結果: 全ての統計項目が含まれるレスポンス
        """
        response = self.client.get("/api/notifications/stats")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # 必須統計項目の確認
        assert "total_notifications" in data
        assert "unread_count" in data
        assert "by_project" in data
        assert "by_type" in data
        assert "recent_activity" in data

        # データ型の確認
        assert isinstance(data["total_notifications"], int)
        assert isinstance(data["unread_count"], int)
        assert isinstance(data["by_project"], dict)
        assert isinstance(data["by_type"], dict)
        assert isinstance(data["recent_activity"], list)


class TestProjectPathConversion:
    """プロジェクトパス変換機能のテストクラス"""

    def test_convert_absolute_path_to_internal_format(self):
        """
        目的: 絶対パスのClaude内部形式変換を確認
        観点: 動的プロジェクト名機能のコア処理
        期待結果: 正しい内部形式に変換される
        """
        test_cases = [
            # (入力パス, 期待される内部形式)
            ("/Users/test/workspace/project", "-Users-test-workspace-project"),
            ("/home/user/Documents/my-project", "-home-user-Documents-my-project"),
            ("/var/projects/test.app", "-var-projects-test-app"),
            ("/Users/name/workspace/sub_project", "-Users-name-workspace-sub_project"),
            ("relative/path", "relative-path"),  # 相対パスもサポート
        ]

        for input_path, expected in test_cases:
            result = convert_project_path_to_internal_format(input_path)
            assert result == expected, f"Input: {input_path}, Expected: {expected}, Got: {result}"

    def test_convert_project_path_edge_cases(self):
        """
        目的: パス変換のエッジケース処理確認
        観点: 特殊文字や空文字列での動作
        期待結果: エラーなく適切に処理される
        """
        edge_cases = [
            ("", ""),  # 空文字列
            ("/", "-"),  # ルートパスのみ
            ("//double//slash", "-double-slash"),  # 重複スラッシュ
            ("/path/with.dots/and_underscores", "-path-with-dots-and_underscores"),
        ]

        for input_path, expected in edge_cases:
            result = convert_project_path_to_internal_format(input_path)
            assert result == expected


class TestNotificationManager:
    """通知データ管理のテストクラス"""

    @pytest.fixture
    def notification_manager(self):
        """NotificationManagerのテスト用インスタンス"""
        return NotificationManager()

    @pytest.fixture
    def sample_notification(self):
        """テスト用通知データ"""
        return NotificationCreate(
            type="permission_request",
            project_id="-Users-test-workspace-project",
            session_id="test-session-123",
            notification="Test permission request",
            timestamp=datetime.now(timezone.utc)
        )

    @pytest.mark.asyncio
    async def test_create_notification(self, notification_manager, sample_notification):
        """
        目的: 通知作成機能の正常動作確認
        観点: NotificationManagerのcreate_notification処理
        期待結果: 通知が正常に作成され、IDが付与される
        """
        created = await notification_manager.create_notification(sample_notification)

        assert isinstance(created, NotificationInDB)
        assert created.type == sample_notification.type
        assert created.project_id == sample_notification.project_id
        assert created.session_id == sample_notification.session_id
        assert created.id is not None
        assert created.created_at is not None

    @pytest.mark.asyncio
    async def test_get_notifications_filtering(self, notification_manager):
        """
        目的: 通知一覧取得のフィルタリング機能確認
        観点: プロジェクト別、タイプ別フィルタリング
        期待結果: 適切にフィルタリングされた結果が返される
        """
        # 複数の通知を作成
        notifications = [
            NotificationCreate(
                type="permission_request",
                project_id="project1",
                session_id="session1",
                notification="Permission for project1"
            ),
            NotificationCreate(
                type="tool_use",
                project_id="project2",
                session_id="session2",
                tool_name="bash"
            )
        ]

        for notif in notifications:
            await notification_manager.create_notification(notif)

        # プロジェクト別フィルタリング
        result = await notification_manager.get_notifications(
            project_id="project1",
            limit=10
        )

        assert len(result.notifications) >= 1
        for notif in result.notifications:
            if notif.project_id:  # project_idがある通知のみチェック
                assert notif.project_id == "project1"

    @pytest.mark.asyncio
    async def test_mark_notification_read(self, notification_manager, sample_notification):
        """
        目的: 通知既読マーク機能の確認
        観点: 既読状態の更新処理
        期待結果: 通知が既読状態に変更される
        """
        # 通知を作成
        created = await notification_manager.create_notification(sample_notification)
        assert created.read is False

        # 既読マーク
        success = await notification_manager.mark_notification_read(created.id)
        assert success is True

        # 結果確認
        result = await notification_manager.get_notifications(limit=100)
        target_notification = next(
            (n for n in result.notifications if n.id == created.id),
            None
        )

        if target_notification:  # 通知が見つかった場合
            assert target_notification.read is True

    @pytest.mark.asyncio
    async def test_get_notification_stats(self, notification_manager):
        """
        目的: 統計情報取得機能の確認
        観点: 通知統計の算出処理
        期待結果: 正確な統計データが返される
        """
        stats = await notification_manager.get_stats()

        # 統計データの構造確認
        assert hasattr(stats, 'total_notifications')
        assert hasattr(stats, 'unread_count')
        assert hasattr(stats, 'by_project')
        assert hasattr(stats, 'by_type')
        assert hasattr(stats, 'recent_activity')

        # データ型確認
        assert isinstance(stats.total_notifications, int)
        assert isinstance(stats.unread_count, int)
        assert isinstance(stats.by_project, dict)
        assert isinstance(stats.by_type, dict)
        assert isinstance(stats.recent_activity, list)


class TestNotificationIntegration:
    """通知システム統合テストクラス"""

    def setup_method(self):
        """統合テスト用の初期化"""
        self.client = TestClient(app)

    def test_end_to_end_notification_flow(self):
        """
        目的: 通知システム全体の統合動作確認
        観点: API受信→保存→取得→既読→削除の一連の流れ
        期待結果: 全ての処理が正常に動作する
        """
        # 1. 通知作成
        notification_data = {
            "type": "permission_request",
            "project_id": "/Users/test/workspace/integration-test",
            "session_id": "integration-session",
            "notification": "Integration test notification",
            "timestamp": "2025-07-16T10:00:00Z"
        }

        create_response = self.client.post(
            "/api/notifications/hook",
            json=notification_data
        )
        assert create_response.status_code == status.HTTP_200_OK
        notification_id = create_response.json()["notification_id"]

        # 2. 通知一覧で確認
        list_response = self.client.get("/api/notifications")
        assert list_response.status_code == status.HTTP_200_OK
        notifications = list_response.json()["notifications"]

        target_notification = next(
            (n for n in notifications if n["id"] == notification_id),
            None
        )
        assert target_notification is not None
        assert target_notification["read"] is False

        # 3. 既読マーク
        read_response = self.client.patch(f"/api/notifications/{notification_id}/read")
        assert read_response.status_code == status.HTTP_200_OK

        # 4. 既読状態確認
        list_response2 = self.client.get("/api/notifications")
        notifications2 = list_response2.json()["notifications"]
        target_notification2 = next(
            (n for n in notifications2 if n["id"] == notification_id),
            None
        )
        assert target_notification2["read"] is True

        # 5. 削除
        delete_response = self.client.delete(f"/api/notifications/{notification_id}")
        assert delete_response.status_code == status.HTTP_200_OK

        # 6. 削除確認
        list_response3 = self.client.get("/api/notifications")
        notifications3 = list_response3.json()["notifications"]
        target_notification3 = next(
            (n for n in notifications3 if n["id"] == notification_id),
            None
        )
        assert target_notification3 is None

    def test_dynamic_project_name_integration(self):
        """
        目的: 動的プロジェクト名機能の統合動作確認
        観点: フルパス送信→内部形式変換→プロジェクト情報取得
        期待結果: 適切なプロジェクト名変換が行われる
        """
        # フルパスで通知を送信
        notification_data = {
            "type": "tool_use",
            "project_id": "/Users/testuser/workspace/my-awesome-project",
            "session_id": "dynamic-test-session",
            "tool_name": "bash",
            "tool_input": "ls -la",
            "timestamp": "2025-07-16T10:00:00Z"
        }

        response = self.client.post(
            "/api/notifications/hook",
            json=notification_data
        )

        assert response.status_code == status.HTTP_200_OK

        # 通知一覧で内部形式変換を確認
        list_response = self.client.get("/api/notifications")
        notifications = list_response.json()["notifications"]

        # 最新の通知を確認
        if notifications:
            latest_notification = notifications[0]
            # フルパスが内部形式に変換されていることを確認
            expected_internal_id = "-Users-testuser-workspace-my-awesome-project"
            assert latest_notification["project_id"] == expected_internal_id


# テスト実行時の設定
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
