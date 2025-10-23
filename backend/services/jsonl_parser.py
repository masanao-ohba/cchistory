import json
import logging
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

class JSONLParser:
    def __init__(self):
        self._cache = {}
        self._cache_timestamps = {}
        self._project_cache = {}  # Project-level cache
        self._project_cache_timestamps = {}

    def _is_cache_valid(self, cache_key: str, mtime: float, size: int = None) -> bool:
        """
        Check if cached data is still valid.

        Why this is important:
            Without this test, stale cache returns outdated data. Dual validation
            (mtime + size) catches rapid file appends where mtime might not update.

        Args:
            cache_key: File/project path used as cache key
            mtime: Current modification time from Path.stat().st_mtime
            size: Current file size (optional, for file-level cache only)

        Returns:
            True if cache is valid, False if stale
        """
        if cache_key not in self._cache_timestamps:
            return False

        cached_data = self._cache_timestamps[cache_key]

        # Handle both dict format (file cache) and float format (project cache)
        if isinstance(cached_data, dict):
            cached_mtime = cached_data.get('mtime', 0)
            cached_size = cached_data.get('size', 0)
            if size is not None:
                return cached_mtime >= mtime and cached_size == size
            return cached_mtime >= mtime
        else:
            # Float format (legacy project cache)
            return cached_data >= mtime

    async def parse_project(self, project_dir: Path) -> List[Dict[str, Any]]:
        """
        Parse all JSONL files in project directory with two-tier caching.

        Why this is important:
            Without this test, every API request would parse 160+ files, causing
            10+ second page loads. Cache returns results in < 100ms.

        Args:
            project_dir: Path to project directory containing *.jsonl files

        Returns:
            List of conversation dicts with session continuation chains linked
        """
        if not project_dir.exists():
            logger.warning(f"Project directory does not exist: {project_dir}")
            return []

        project_key = str(project_dir)

        # Get latest file modification time for cache validation
        # First do a quick check without glob if cache exists
        if project_key in self._project_cache:
            # Quick validation using directory mtime as first check
            dir_mtime = project_dir.stat().st_mtime
            if self._is_cache_valid(project_key, dir_mtime):
                # Cache appears valid - return cached data
                return self._project_cache[project_key]

        # Cache miss or possibly stale - scan files
        conversations = []
        jsonl_files = list(project_dir.glob("*.jsonl"))

        # Only log when actually scanning (to reduce log spam)
        if not jsonl_files:
            return conversations

        # Get max mtime from all files for accurate cache validation
        max_mtime = max((f.stat().st_mtime for f in jsonl_files), default=0)

        # Check if we can still use cache based on file mtimes
        if project_key in self._project_cache and self._is_cache_valid(project_key, max_mtime):
            # All files are older than cache - return cached data
            return self._project_cache[project_key]

        # Need to re-parse files
        logger.info(f"Parsing {len(jsonl_files)} JSONL files in {project_dir}")

        # 各ファイルを並行処理で解析
        tasks = [self.parse_file(file_path, project_dir) for file_path in jsonl_files]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Error parsing file: {result}")
            elif isinstance(result, list):
                conversations.extend(result)

        # Build session continuation chains
        conversations = self._build_session_continuation_chains(conversations)

        # Update project cache with max file mtime
        self._project_cache[project_key] = conversations
        self._project_cache_timestamps[project_key] = max_mtime

        return conversations

    def _build_session_continuation_chains(self, conversations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Build session continuation chains by linking parent UUIDs to session IDs"""
        # Build a map of UUID -> session_id for quick lookup
        uuid_to_session = {}
        for conv in conversations:
            if 'uuid' in conv:
                uuid_to_session[conv['uuid']] = conv['session_id']

        # Process conversations and add parent session info
        for conv in conversations:
            if conv.get('continued_from_uuid'):
                parent_uuid = conv['continued_from_uuid']
                parent_session_id = uuid_to_session.get(parent_uuid)
                if parent_session_id:
                    conv['parent_session_id'] = parent_session_id
                    logger.debug(f"Linked session {conv['session_id']} to parent {parent_session_id}")

        return conversations

    def invalidate_project_cache(self, project_dir: Path):
        """Invalidate cache for a specific project"""
        project_key = str(project_dir)
        if project_key in self._project_cache:
            del self._project_cache[project_key]
        if project_key in self._project_cache_timestamps:
            del self._project_cache_timestamps[project_key]

    async def parse_file(self, file_path: Path, project_dir: Path = None) -> List[Dict[str, Any]]:
        """
        Parse single JSONL file with file-level caching (mtime + size validation).

        Why this is important:
            Without this test, rapid file appends wouldn't be detected when mtime
            doesn't update. Size check ensures cache invalidation.

        Args:
            file_path: Path to JSONL file
            project_dir: Optional project path for adding metadata

        Returns:
            List of conversation dicts (user/assistant messages only, filtered)
        """
        conversations = []
        pending_continuation_uuid = None  # Track continuation UUID from system messages

        try:
            # ファイルの更新時間とサイズをチェック（キャッシュ用）
            file_stat = file_path.stat()
            file_mtime = file_stat.st_mtime
            file_size = file_stat.st_size
            cache_key = str(file_path)

            # キャッシュがある場合は、mtime AND size の両方をチェック
            # size が異なる = ファイルが追記された = キャッシュ無効
            if cache_key in self._cache and self._is_cache_valid(cache_key, file_mtime, file_size):
                return self._cache[cache_key]

            with open(file_path, 'r', encoding='utf-8') as f:
                for line_no, line in enumerate(f, 1):
                    try:
                        if not line.strip():
                            continue

                        data = json.loads(line.strip())

                        # Check for system compact_boundary with logicalParentUuid
                        if data.get('type') == 'system' and data.get('subtype') == 'compact_boundary':
                            logical_parent = data.get('logicalParentUuid')
                            if logical_parent:
                                pending_continuation_uuid = logical_parent
                                logger.debug(f"Found session continuation marker: {logical_parent[:20]}...")

                        conversation = self._extract_conversation(data, file_path.name, project_dir, pending_continuation_uuid)

                        if conversation:
                            conversations.append(conversation)
                            # Clear pending continuation after first real user message
                            if conversation.get('type') == 'user' and pending_continuation_uuid:
                                pending_continuation_uuid = None

                    except json.JSONDecodeError as e:
                        logger.warning(f"Invalid JSON in {file_path}:{line_no}: {e}")
                    except Exception as e:
                        logger.error(f"Error processing line {line_no} in {file_path}: {e}")

            # キャッシュを更新（mtime と size の両方を保存）
            self._cache[cache_key] = conversations
            self._cache_timestamps[cache_key] = {
                'mtime': file_mtime,
                'size': file_size
            }

        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")

        return conversations

    def _is_json_message(self, content: str) -> bool:
        """メッセージがJSONかどうかを判定"""
        if not isinstance(content, str):
            return False

        content = content.strip()

        # JSON形式の判定
        if (content.startswith('[') and content.endswith(']')) or (content.startswith('{') and content.endswith('}')):
            try:
                json.loads(content)
                return True
            except json.JSONDecodeError:
                pass

        # 自動生成メッセージのパターンを除外
        auto_patterns = [
            'system-reminder>',
            'antml:function_calls',
            'antml:invoke',
            '<command-message>',
            '</command-message>',
            '<command-name>',
            '</command-name>',
            '(no content)',
            '<local-command-stdout>',
            '<user-memory-input>',
            'Your todo list has changed',
            'This is a reminder that your todo list',
            '[{\'type\':',
            '{"type":',
            'analyzing your codebase',
            'Caveat: ',
        ]

        for pattern in auto_patterns:
            if pattern in content:
                return True

        # コマンドメッセージのパターン（XML形式）
        if '<command-message>' in content and '</command-message>' in content:
            return True

        # 長いJSONライクなメッセージ（特定の文字列パターン）
        if (content.startswith('[{') and content.endswith('}]')) or \
           (content.startswith('{{') and content.endswith('}}')) or \
           ('Please analyze this codebase and create a CLAUDE.md file' in content):
            return True

        return False

    def _extract_conversation(self, data: Dict[str, Any], filename: str, project_dir: Path = None, pending_continuation_uuid: str = None) -> Dict[str, Any]:
        """JSONLデータから会話情報を抽出"""
        try:
            timestamp = data.get('timestamp', '')
            session_id = data.get('sessionId', '')
            message_type = data.get('type', '')
            uuid = data.get('uuid', '')

            # Filter out system compact_boundary messages
            if message_type == 'system':
                subtype = data.get('subtype', '')
                if subtype == 'compact_boundary':
                    logger.debug(f"Filtering out compact_boundary system message: {session_id}")
                    return None

            # プロジェクト情報を準備
            project_info = None
            if project_dir:
                from config import Config
                project_info = {
                    'id': project_dir.name,
                    'display_name': Config.get_project_display_name(project_dir),
                    'path': str(project_dir)
                }

            if message_type == 'user':
                message = data.get('message', {})
                content = message.get('content', '')

                # Session continuation detection - filter out auto-generated summary messages
                is_compact_summary = data.get('isCompactSummary', False)
                is_visible_transcript_only = data.get('isVisibleInTranscriptOnly', False)
                logical_parent_uuid = data.get('logicalParentUuid', None) or pending_continuation_uuid

                # Exclude session continuation summary messages
                if is_compact_summary or (is_visible_transcript_only and logical_parent_uuid):
                    # これはセッション継続の自動生成サマリーなので除外
                    logger.debug(f"Filtering out session continuation summary message: {session_id}")
                    return None

                # Check for continuation summary content pattern
                if isinstance(content, str) and content.startswith('This session is being continued from a previous conversation'):
                    logger.debug(f"Filtering out continuation content by pattern: {session_id}")
                    return None

                # ツール結果は除外
                if isinstance(content, list) and content:
                    if content[0].get('type') == 'tool_result':
                        return None

                # 空のコンテンツは除外
                if not content:
                    return None

                # JSONメッセージや自動生成メッセージは除外
                if self._is_json_message(content):
                    return None

                # リスト形式の場合は文字列として処理
                if isinstance(content, list):
                    content_str = str(content)
                    if self._is_json_message(content_str):
                        return None
                    content = content_str

                result = {
                    'timestamp': timestamp,
                    'type': 'user',
                    'content': content,
                    'session_id': session_id,
                    'filename': filename
                }

                if uuid:
                    result['uuid'] = uuid

                # Store session continuation metadata if this session is a continuation
                if logical_parent_uuid:
                    result['continued_from_uuid'] = logical_parent_uuid
                    result['is_continuation_session'] = True

                if project_info:
                    result['project'] = project_info

                return result

            elif message_type == 'assistant':
                message = data.get('message', {})
                content_list = message.get('content', [])
                content_text = ""

                for item in content_list:
                    if isinstance(item, dict):
                        if item.get('type') == 'text':
                            content_text = item.get('text', '')
                            break
                        elif item.get('type') == 'tool_use':
                            # ツール使用ログは除外
                            return None

                # テキストコンテンツがある場合のみ追加
                if content_text:
                    result = {
                        'timestamp': timestamp,
                        'type': 'assistant',
                        'content': content_text,
                        'session_id': session_id,
                        'filename': filename
                    }

                    if uuid:
                        result['uuid'] = uuid

                    if project_info:
                        result['project'] = project_info

                    return result

        except Exception as e:
            logger.error(f"Error extracting conversation: {e}")

        return None
