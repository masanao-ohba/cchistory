import os
import json
import logging
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

class Config:
    # 基本設定
    CLAUDE_PROJECTS_PATH = Path(os.getenv("CLAUDE_PROJECTS_PATH", "/data/projects"))
    CLAUDE_PROJECTS = os.getenv("CLAUDE_PROJECTS", "")  # カンマ区切りまたはJSON配列形式のプロジェクト名
    TIMEZONE = os.getenv("TIMEZONE", "Asia/Tokyo")
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    # APIの設定
    API_PREFIX = "/api"

    # WebSocketの設定
    WS_PREFIX = "/ws"

    # ファイル監視の設定
    WATCH_INTERVAL = 1.0  # 秒

    # パフォーマンス設定
    MAX_CONVERSATIONS_PER_REQUEST = 10000
    CACHE_TTL = 300  # 秒

    @classmethod
    def get_allowed_projects(cls) -> List[str]:
        """設定で許可されたプロジェクトのディレクトリパスから内部名に変換"""
        if not cls.CLAUDE_PROJECTS:
            return []

        # JSON配列形式を試す
        try:
            if cls.CLAUDE_PROJECTS.strip().startswith('['):
                paths = json.loads(cls.CLAUDE_PROJECTS)
            else:
                # カンマ区切り形式をフォールバック
                paths = [p.strip() for p in cls.CLAUDE_PROJECTS.split(',') if p.strip()]
        except json.JSONDecodeError:
            # JSON解析に失敗した場合は、カンマ区切りとして扱う
            paths = [p.strip() for p in cls.CLAUDE_PROJECTS.split(',') if p.strip()]

        project_names = []

        for path in paths:
            # ディレクトリパスを Claude の内部形式に変換
            # 例: /Users/masanao.oba/workspace/reserve-auto/api -> -Users-masanao-oba-workspace-reserve-auto-api
            # パスの正規化（重複スラッシュやドットを処理）
            normalized_path = os.path.normpath(path)
            # 先頭のスラッシュを除去してからハイフンに変換
            if normalized_path.startswith('/'):
                normalized_path = normalized_path[1:]
            # スラッシュ、ドット、アンダースコアをハイフンに変換
            claude_format = '-' + normalized_path.replace('/', '-').replace('.', '-').replace('_', '-')
            project_names.append(claude_format)

        return project_names

    @classmethod
    def get_project_display_name(cls, project_dir: Path) -> str:
        """プロジェクトディレクトリのパスから表示用の短縮名を生成"""
        # Claude内部形式から元のパスを復元
        # 例: -Users-masanao-oba-workspace-reserve-auto-api -> /Users/masanao.oba/workspace/reserve-auto/api
        internal_name = project_dir.name
        if internal_name.startswith('-'):
            # 先頭のハイフンを除去してスラッシュに変換（アンダースコアとドットは元に戻さない）
            original_path = internal_name[1:].replace('-', '/')

            # パスの構成要素から意味のある部分を抽出
            parts = original_path.split('/')

            # workspace以降を取得（一般的なパターン）
            if 'workspace' in parts:
                workspace_idx = parts.index('workspace')
                if workspace_idx + 1 < len(parts):
                    project_parts = parts[workspace_idx + 1:]
                    # 末尾が'.claude', 'projects'なら除外
                    if project_parts[-1] in ['.claude', 'projects']:
                        project_parts = project_parts[:-1]
                    return '/'.join(project_parts)

            # Documents以降を取得（別のパターン）
            if 'Documents' in parts:
                docs_idx = parts.index('Documents')
                if docs_idx + 1 < len(parts):
                    project_parts = parts[docs_idx + 1:]
                    if project_parts[-1] in ['.claude', 'projects']:
                        project_parts = project_parts[:-1]
                    return '/'.join(project_parts)

            # ホームディレクトリ以降を取得
            home_indicators = ['Users', 'home']
            for indicator in home_indicators:
                if indicator in parts:
                    home_idx = parts.index(indicator)
                    if home_idx + 2 < len(parts):  # /Users/username/...
                        project_parts = parts[home_idx + 2:]
                        if project_parts[-1] in ['.claude', 'projects']:
                            project_parts = project_parts[:-1]
                        return '/'.join(project_parts)

            # 最後の2-3セグメントを取得（フォールバック）
            if len(parts) >= 2:
                project_parts = parts[-3:] if len(parts) >= 3 else parts[-2:]
                if project_parts[-1] in ['.claude', 'projects']:
                    project_parts = project_parts[:-1]
                return '/'.join(project_parts)

        # 内部形式でない場合はそのまま返す
        return internal_name

    @classmethod
    def get_project_dirs(cls) -> List[Path]:
        """利用可能なプロジェクトディレクトリを取得"""
        if not cls.CLAUDE_PROJECTS_PATH.exists():
            return []

        all_dirs = [
            d for d in cls.CLAUDE_PROJECTS_PATH.iterdir()
            if d.is_dir() and not d.name.startswith('.')
        ]

        # 設定で指定されたプロジェクトのみをフィルタ
        allowed_projects = cls.get_allowed_projects()

        if allowed_projects:
            filtered_dirs = [d for d in all_dirs if d.name in allowed_projects]
            if filtered_dirs:
                return filtered_dirs
            else:
                logger.error(f"No matching directories found for allowed projects: {allowed_projects}")
                return []

        # CLAUDE_PROJECTSが設定されていない場合は全プロジェクトを返す
        logger.warning("CLAUDE_PROJECTS not configured, returning all directories")
        return all_dirs

    @classmethod
    def get_project_info(cls) -> List[dict]:
        """プロジェクト情報（ID、表示名、パス）を取得"""
        project_dirs = cls.get_project_dirs()
        projects = []
        display_names = set()  # 重複チェック用

        for project_dir in project_dirs:
            display_name = cls.get_project_display_name(project_dir)

            # 重複チェックと調整
            original_display_name = display_name
            counter = 1
            while display_name in display_names:
                display_name = f"{original_display_name} ({counter})"
                counter += 1

            display_names.add(display_name)

            projects.append({
                'id': project_dir.name,
                'display_name': display_name,
                'path': str(project_dir)
            })

        return projects
