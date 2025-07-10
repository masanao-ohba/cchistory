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
            # スラッシュをハイフンに変換
            claude_format = '-' + normalized_path.replace('/', '-').replace('.', '-')
            project_names.append(claude_format)

        return project_names

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
