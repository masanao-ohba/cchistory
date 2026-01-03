import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)


class ClaudePlanType(Enum):
    """Claude subscription plan types"""
    PRO = "pro"
    MAX_5X = "max_5x"
    MAX_20X = "max_20x"


class ClaudePlanLimits:
    """
    Claude plan usage limits configuration

    Based on official Claude Code documentation (as of January 2026):
    - Session limits: 5-hour rolling window, token-based
    - Weekly limits: 7-day rolling window, hour-based (measured in usage hours, not tokens)
    - Opus limits: Separate weekly caps for Opus 4.5 usage
    - Session resets: Every 5 hours (timezone-specific display in /status)
    - Weekly resets: Every 7 days (timezone-specific display in /status)

    Official token limits (session) and hour limits (weekly):
    - Session limits are in actual tokens per 5-hour window
    - Weekly limits are measured in "usage hours" (not directly convertible to tokens)
    - Usage is shared across Claude.ai and Claude Code

    Sources:
    - https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan
    - https://support.claude.com/en/articles/11014257-about-claude-s-max-plan-usage
    """

    # Plan-specific limits
    # Session limits: actual tokens per 5-hour window (official)
    # Weekly limits: usage hours per 7-day window (official)
    LIMITS = {
        ClaudePlanType.PRO: {
            "session": {
                "tokens": 44_000,  # Official: ~44,000 tokens per 5-hour session
                "equivalent_prompts": "10-40",  # Approximate prompts per session
            },
            "weekly_all": {
                "hours_sonnet": "40-80",  # Official: 40-80 hours Sonnet per week
                "hours_opus": 0,  # Pro doesn't have Opus access
                "note": "Weekly limits are hour-based and measured by actual usage time, not tokens. Token-to-percentage conversion is an estimate only and may have significant variance (±10-20%).",
            },
        },
        ClaudePlanType.MAX_5X: {
            "session": {
                "tokens": 88_000,  # Official: ~88,000 tokens per 5-hour session
                "equivalent_prompts": "50-200",  # Approximate prompts per session
            },
            "weekly_all": {
                "hours_sonnet": "140-280",  # Official: 140-280 hours Sonnet per week
                "hours_opus": "15-35",  # Official: 15-35 hours Opus per week
                "note": "Weekly limits are hour-based and measured by actual usage time, not tokens. Token-to-percentage conversion is an estimate only and may have significant variance (±10-20%).",
            },
        },
        ClaudePlanType.MAX_20X: {
            "session": {
                "tokens": 220_000,  # Official: ~220,000 tokens per 5-hour session
                "equivalent_prompts": "200-800",  # Approximate prompts per session
            },
            "weekly_all": {
                "hours_sonnet": "240-480",  # Official: 240-480 hours Sonnet per week
                "hours_opus": "24-40",  # Official: 24-40 hours Opus per week (as of late 2025)
                "note": "Weekly limits are hour-based and measured by actual usage time, not tokens. Token-to-percentage conversion is an estimate only and may have significant variance (±10-20%).",
            },
        },
    }

    @classmethod
    def get_plan_from_env(cls) -> ClaudePlanType:
        """Get Claude plan type from environment variable"""
        plan_str = os.getenv("CLAUDE_PLAN", "max_20x").lower()
        try:
            return ClaudePlanType(plan_str)
        except ValueError:
            logger.warning(f"Invalid CLAUDE_PLAN '{plan_str}', defaulting to max_20x")
            return ClaudePlanType.MAX_20X

    @classmethod
    def get_limits(cls, plan_type: ClaudePlanType = None) -> Dict[str, Any]:
        """Get usage limits for the specified plan (or from environment)"""
        if plan_type is None:
            plan_type = cls.get_plan_from_env()

        return cls.LIMITS.get(plan_type, cls.LIMITS[ClaudePlanType.MAX_20X])


class Config:
    # 基本設定
    CLAUDE_PROJECTS_PATH = Path(os.getenv("CLAUDE_PROJECTS_PATH", "/data/projects"))
    CLAUDE_PROJECTS = os.getenv("CLAUDE_PROJECTS", "")  # カンマ区切りまたはJSON配列形式のプロジェクト名
    TIMEZONE = os.getenv("TIMEZONE", "Asia/Tokyo")
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    # Claude Code補正係数（Claude Codeの内部最適化に対応するための経験的補正）
    # これらの係数は、生のトークン数からClaude Code /statusに近い推定値を計算するために使用
    # 詳細: Claude Codeは非公開の最適化を行っているため、完全一致は不可能
    # ユーザーは自身の使用パターンに基づいて、環境変数で補正係数を調整できる
    CORRECTION_FACTORS = {
        "session": float(os.getenv("CORRECTION_FACTOR_SESSION", "0.24")),  # デフォルト: 0.24 (4.17xの逆数)
        "weekly_all": float(os.getenv("CORRECTION_FACTOR_WEEKLY_ALL", "0.20")),  # デフォルト: 0.20 (5.00xの逆数)
        "weekly_sonnet": float(os.getenv("CORRECTION_FACTOR_WEEKLY_SONNET", "0.18"))  # デフォルト: 0.18 (5.57xの逆数)
    }

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
        """
        利用可能なプロジェクトディレクトリを取得

        Returns:
            List[Path]: 更新時刻の新しい順にソートされたプロジェクトディレクトリのリスト
        """
        if not cls.CLAUDE_PROJECTS_PATH.exists():
            return []

        all_dirs = [
            d for d in cls.CLAUDE_PROJECTS_PATH.iterdir()
            if d.is_dir() and not d.name.startswith('.')
        ]

        # 更新時刻の新しい順にソート（最新のプロジェクトを優先的に処理）
        all_dirs.sort(key=lambda d: d.stat().st_mtime, reverse=True)

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
