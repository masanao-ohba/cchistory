"""
動的プロジェクト名変換機能のテスト

プロジェクトパス変換とプロジェクト表示名生成の
各機能を個別にテストします。
"""

import pytest
from pathlib import Path

from api.notifications import convert_project_path_to_internal_format
from config import Config


class TestProjectPathConversion:
    """プロジェクトパス変換機能の専用テストクラス"""

    def test_absolute_unix_paths(self):
        """
        目的: Unix系システムの絶対パス変換を確認
        観点: 一般的なUnixパス形式での変換精度
        期待結果: 正確な内部形式への変換
        """
        test_cases = [
            # (入力パス, 期待される内部形式)
            ("/Users/john/workspace/my-project", "-Users-john-workspace-my-project"),
            ("/home/user/Documents/project", "-home-user-Documents-project"),
            ("/var/www/html/app", "-var-www-html-app"),
            ("/opt/projects/test", "-opt-projects-test"),
        ]

        for input_path, expected in test_cases:
            result = convert_project_path_to_internal_format(input_path)
            assert result == expected, f"Input: {input_path}, Expected: {expected}, Got: {result}"

    def test_special_characters_in_paths(self):
        """
        目的: パス内の特殊文字処理を確認
        観点: ドット、アンダースコア、ハイフンの処理
        期待結果: 特殊文字が適切にハイフンに変換される
        """
        test_cases = [
            # ドットを含むパス
            ("/Users/test/my.project", "-Users-test-my-project"),
            ("/Users/test/project.v2.0", "-Users-test-project-v2-0"),

            # アンダースコアを含むパス
            ("/Users/test/my_awesome_project", "-Users-test-my_awesome_project"),
            ("/Users/test/test_app_v1", "-Users-test-test_app_v1"),

            # 混合パターン
            ("/Users/test/my-project.v1_final", "-Users-test-my-project-v1_final"),
        ]

        for input_path, expected in test_cases:
            result = convert_project_path_to_internal_format(input_path)
            assert result == expected, f"Input: {input_path}, Expected: {expected}, Got: {result}"

    def test_relative_paths(self):
        """
        目的: 相対パスの処理を確認
        観点: 先頭スラッシュがない場合の処理
        期待結果: 相対パスも適切に変換される
        """
        test_cases = [
            ("workspace/project", "-workspace-project"),
            ("my-project", "-my-project"),
            ("../parent/project", "-----parent-project"),
            ("./current/project", "-----current-project"),
        ]

        for input_path, expected in test_cases:
            result = convert_project_path_to_internal_format(input_path)
            assert result == expected, f"Input: {input_path}, Expected: {expected}, Got: {result}"

    def test_edge_cases(self):
        """
        目的: エッジケースでの堅牢性確認
        観点: 空文字列、ルートパス、重複スラッシュの処理
        期待結果: エラーなく適切に処理される
        """
        test_cases = [
            ("", ""),  # 空文字列
            ("/", "-"),  # ルートパスのみ
            ("//double//slash///path", "-double-slash-path"),  # 重複スラッシュ
            ("/single", "-single"),  # 単一セグメント
            ("/Users/test/", "-Users-test"),  # 末尾スラッシュ
        ]

        for input_path, expected in test_cases:
            result = convert_project_path_to_internal_format(input_path)
            assert result == expected, f"Input: {input_path}, Expected: {expected}, Got: {result}"

    def test_real_world_scenarios(self):
        """
        目的: 実際の使用シナリオでの動作確認
        観点: Claude Code実行環境での典型的なパス
        期待結果: 実用的なパスが正しく変換される
        """
        test_cases = [
            # macOS典型例
            ("/Users/developer/workspace/cchistory", "-Users-developer-workspace-cchistory"),
            ("/Users/jane.doe/Documents/my-app", "-Users-jane-doe-Documents-my-app"),

            # Linux典型例
            ("/home/ubuntu/projects/api-server", "-home-ubuntu-projects-api-server"),
            ("/opt/workspace/microservice", "-opt-workspace-microservice"),

            # 開発環境典型例
            ("/var/projects/node-app/backend", "-var-projects-node-app-backend"),
            ("/home/dev/workspace/frontend.v2", "-home-dev-workspace-frontend-v2"),
        ]

        for input_path, expected in test_cases:
            result = convert_project_path_to_internal_format(input_path)
            assert result == expected, f"Input: {input_path}, Expected: {expected}, Got: {result}"


class TestProjectDisplayNameGeneration:
    """プロジェクト表示名生成機能のテストクラス"""

    def test_workspace_pattern_extraction(self):
        """
        目的: workspace以降のパス抽出を確認
        観点: 一般的なworkspaceパターンでの表示名生成
        期待結果: workspace以降の部分が表示名になる
        """
        test_cases = [
            # (内部形式パス, 期待される表示名)
            ("-Users-john-workspace-my-project", "my-project"),
            ("-Users-jane-workspace-frontend-app", "frontend/app"),
            ("-home-dev-workspace-api-v2", "api/v2"),
            ("-var-workspace-microservice-auth", "microservice/auth"),
        ]

        for internal_path, expected in test_cases:
            path_obj = Path(internal_path)
            result = Config.get_project_display_name(path_obj)
            assert result == expected, f"Input: {internal_path}, Expected: {expected}, Got: {result}"

    def test_documents_pattern_extraction(self):
        """
        目的: Documents以降のパス抽出を確認
        観点: Documentsディレクトリパターンでの表示名生成
        期待結果: Documents以降の部分が表示名になる
        """
        test_cases = [
            ("-Users-john-Documents-my-app", "my-app"),
            ("-Users-jane-Documents-projects-web", "projects/web"),
            ("-home-user-Documents-coding-python", "coding/python"),
        ]

        for internal_path, expected in test_cases:
            path_obj = Path(internal_path)
            result = Config.get_project_display_name(path_obj)
            assert result == expected, f"Input: {internal_path}, Expected: {expected}, Got: {result}"

    def test_home_directory_pattern_extraction(self):
        """
        目的: ホームディレクトリパターンでの表示名生成を確認
        観点: Users/username以降のパス抽出
        期待結果: ユーザーディレクトリ以降の部分が表示名になる
        """
        test_cases = [
            ("-Users-john-projects-webapp", "projects/webapp"),
            ("-home-ubuntu-development-api", "development/api"),
            ("-Users-developer-code-react-app", "code/react/app"),
        ]

        for internal_path, expected in test_cases:
            path_obj = Path(internal_path)
            result = Config.get_project_display_name(path_obj)
            assert result == expected, f"Input: {internal_path}, Expected: {expected}, Got: {result}"

    def test_claude_projects_suffix_removal(self):
        """
        目的: Claude関連ディレクトリ名の除外を確認
        観点: .claude、projectsディレクトリ名の自動除外
        期待結果: 末尾の特殊ディレクトリ名が除外される
        """
        test_cases = [
            ("-Users-dev-workspace-my-app-projects", "my-app"),
            ("-Users-dev-workspace-frontend--claude", "frontend"),
            ("-home-user-Documents-api-projects", "api"),
        ]

        for internal_path, expected in test_cases:
            path_obj = Path(internal_path)
            result = Config.get_project_display_name(path_obj)
            assert result == expected, f"Input: {internal_path}, Expected: {expected}, Got: {result}"

    def test_fallback_patterns(self):
        """
        目的: フォールバックパターンでの表示名生成を確認
        観点: 標準パターンに該当しない場合の処理
        期待結果: 最後の2-3セグメントが表示名になる
        """
        test_cases = [
            # 標準パターンにマッチしない場合
            ("-opt-projects-my-app", "projects/my-app"),
            ("-var-www-html", "var/www/html"),
            ("-tmp-build-output", "tmp/build/output"),

            # 短いパス
            ("-my-project", "my-project"),
            ("-app", "app"),
        ]

        for internal_path, expected in test_cases:
            path_obj = Path(internal_path)
            result = Config.get_project_display_name(path_obj)
            assert result == expected, f"Input: {internal_path}, Expected: {expected}, Got: {result}"

    def test_non_internal_format_paths(self):
        """
        目的: 内部形式でないパス名の処理を確認
        観点: ハイフン先頭でないパスでの動作
        期待結果: そのまま返される
        """
        test_cases = [
            ("regular-project-name", "regular-project-name"),
            ("simple", "simple"),
            ("multi-word-project", "multi-word-project"),
        ]

        for input_path, expected in test_cases:
            path_obj = Path(input_path)
            result = Config.get_project_display_name(path_obj)
            assert result == expected, f"Input: {input_path}, Expected: {expected}, Got: {result}"


class TestIntegrationScenarios:
    """動的プロジェクト名機能の統合シナリオテスト"""

    def test_full_conversion_pipeline(self):
        """
        目的: フルパス→内部形式→表示名の完全な変換パイプラインを確認
        観点: 通知システム全体での変換の一貫性
        期待結果: 入力パスから適切な表示名が生成される
        """
        test_scenarios = [
            # (元のフルパス, 期待される表示名)
            ("/Users/developer/workspace/cchistory", "cchistory"),
            ("/Users/jane/workspace/my-awesome-app", "my-awesome-app"),
            ("/home/ubuntu/workspace/api/backend", "api/backend"),
            ("/Users/john.doe/Documents/projects/frontend", "projects/frontend"),
            ("/var/projects/microservice-auth", "projects/microservice-auth"),
        ]

        for original_path, expected_display_name in test_scenarios:
            # ステップ1: フルパスを内部形式に変換
            internal_format = convert_project_path_to_internal_format(original_path)

            # ステップ2: 内部形式から表示名を生成
            path_obj = Path(internal_format)
            display_name = Config.get_project_display_name(path_obj)

            assert display_name == expected_display_name, (
                f"Full pipeline test failed:\n"
                f"  Original: {original_path}\n"
                f"  Internal: {internal_format}\n"
                f"  Expected: {expected_display_name}\n"
                f"  Got: {display_name}"
            )

    def test_notification_system_integration(self):
        """
        目的: 通知システムでの実際の使用パターンを確認
        観点: API受信時の変換処理の動作
        期待結果: 通知データで適切な変換が行われる
        """
        # 実際の通知でよく使用されるパスパターン
        common_paths = [
            "/Users/masanao.oba/workspace/cchistory",
            "/Users/developer/workspace/my-project",
            "/home/user/Documents/coding/python-app",
            "/var/www/projects/web-service",
        ]

        for path in common_paths:
            # 変換処理をテスト
            internal_format = convert_project_path_to_internal_format(path)

            # 変換結果の基本的な妥当性をチェック
            assert internal_format.startswith("-"), f"Internal format should start with '-': {internal_format}"
            assert "/" not in internal_format, f"Internal format should not contain '/': {internal_format}"
            assert len(internal_format) > 1, f"Internal format should not be empty: {internal_format}"

            # 表示名生成をテスト
            path_obj = Path(internal_format)
            display_name = Config.get_project_display_name(path_obj)

            # 表示名の基本的な妥当性をチェック
            assert len(display_name) > 0, f"Display name should not be empty: {display_name}"
            assert not display_name.startswith("-"), f"Display name should not start with '-': {display_name}"

    def test_error_resilience(self):
        """
        目的: エラー耐性の確認
        観点: 異常な入力でのシステムの堅牢性
        期待結果: エラーが発生せず、適切にフォールバックされる
        """
        problematic_inputs = [
            "",  # 空文字列
            "/",  # ルートのみ
            "///",  # 複数スラッシュ
            "/Users",  # 短すぎるパス
            "/Users/",  # 末尾スラッシュのみ
            "/Users/test/../test",  # 相対パス記号
            "/Users/test/./project",  # カレントディレクトリ記号
        ]

        for problematic_input in problematic_inputs:
            try:
                # 変換処理がエラーを投げないことを確認
                internal_format = convert_project_path_to_internal_format(problematic_input)

                # 表示名生成もエラーを投げないことを確認
                path_obj = Path(internal_format)
                display_name = Config.get_project_display_name(path_obj)

                # 結果が文字列であることを確認
                assert isinstance(internal_format, str), f"Internal format should be string: {type(internal_format)}"
                assert isinstance(display_name, str), f"Display name should be string: {type(display_name)}"

            except Exception as e:
                pytest.fail(f"Conversion failed for input '{problematic_input}': {e}")


# テスト実行時の設定
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
