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

    async def parse_project(self, project_dir: Path) -> List[Dict[str, Any]]:
        """プロジェクトディレクトリ内の全JSONLファイルを解析"""
        if not project_dir.exists():
            logger.warning(f"Project directory does not exist: {project_dir}")
            return []

        project_key = str(project_dir)

        # Get latest file modification time for cache validation
        # First do a quick check without glob if cache exists
        if project_key in self._project_cache:
            # Quick validation using directory mtime as first check
            dir_mtime = project_dir.stat().st_mtime
            if (project_key in self._project_cache_timestamps and
                self._project_cache_timestamps[project_key] >= dir_mtime):
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
        if (project_key in self._project_cache and
            project_key in self._project_cache_timestamps and
            self._project_cache_timestamps[project_key] >= max_mtime):
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

        # Update project cache with max file mtime
        self._project_cache[project_key] = conversations
        self._project_cache_timestamps[project_key] = max_mtime

        return conversations

    def invalidate_project_cache(self, project_dir: Path):
        """Invalidate cache for a specific project"""
        project_key = str(project_dir)
        if project_key in self._project_cache:
            del self._project_cache[project_key]
        if project_key in self._project_cache_timestamps:
            del self._project_cache_timestamps[project_key]

    async def parse_file(self, file_path: Path, project_dir: Path = None) -> List[Dict[str, Any]]:
        """単一のJSONLファイルを解析"""
        conversations = []

        try:
            # ファイルの更新時間をチェック（キャッシュ用）
            file_mtime = file_path.stat().st_mtime
            cache_key = str(file_path)

            # キャッシュがある場合はそれを使用
            if (cache_key in self._cache and
                cache_key in self._cache_timestamps and
                self._cache_timestamps[cache_key] >= file_mtime):
                return self._cache[cache_key]

            with open(file_path, 'r', encoding='utf-8') as f:
                for line_no, line in enumerate(f, 1):
                    try:
                        if not line.strip():
                            continue

                        data = json.loads(line.strip())
                        conversation = self._extract_conversation(data, file_path.name, project_dir)

                        if conversation:
                            conversations.append(conversation)

                    except json.JSONDecodeError as e:
                        logger.warning(f"Invalid JSON in {file_path}:{line_no}: {e}")
                    except Exception as e:
                        logger.error(f"Error processing line {line_no} in {file_path}: {e}")

            # キャッシュを更新
            self._cache[cache_key] = conversations
            self._cache_timestamps[cache_key] = file_mtime

            # 会話データパース完了

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

    def _extract_conversation(self, data: Dict[str, Any], filename: str, project_dir: Path = None) -> Dict[str, Any]:
        """JSONLデータから会話情報を抽出"""
        try:
            timestamp = data.get('timestamp', '')
            session_id = data.get('sessionId', '')
            message_type = data.get('type', '')
            uuid = data.get('uuid', '')

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
