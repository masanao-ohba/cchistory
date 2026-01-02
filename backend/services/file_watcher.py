import asyncio
import logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from typing import Optional
import threading

logger = logging.getLogger(__name__)

class FileChangeHandler(FileSystemEventHandler):
    def __init__(self, connection_manager, loop):
        self.connection_manager = connection_manager
        self.loop = loop
        self._debounce_timers = {}  # Track debounce timers per project
        self._debounce_delay = 2.0  # 2 seconds debounce delay
        super().__init__()

    def on_modified(self, event):
        if event.is_directory:
            return
        if not event.src_path.endswith('.jsonl'):
            return

        logger.info(f"JSONL file modified: {event.src_path}")
        self._schedule_notification(event.src_path, 'modified')

    def on_created(self, event):
        if event.is_directory:
            return
        if not event.src_path.endswith('.jsonl'):
            return

        logger.info(f"JSONL file created: {event.src_path}")
        self._schedule_notification(event.src_path, 'created')

    def _schedule_notification(self, file_path: str, event_type: str):
        """非同期コンテキストでnotificationをスケジュール"""
        if not self.loop or self.loop.is_closed():
            return

        asyncio.run_coroutine_threadsafe(
            self._notify_clients(file_path, event_type),
            self.loop
        )

    async def _notify_clients(self, file_path: str, event_type: str):
        """クライアントに変更を通知 (デバウンス付き)"""
        # ファイルパスからプロジェクトIDを抽出
        from config import Config

        project_id = None
        project_dir_path = None
        file_path_obj = Path(file_path)

        # プロジェクトディレクトリを特定
        for project_dir in Config.get_project_dirs():
            try:
                file_path_obj.relative_to(project_dir)
                project_id = project_dir.name
                project_dir_path = project_dir
                break
            except ValueError:
                continue

        if not project_id:
            return

        # Cancel existing timer for this project if it exists
        if project_id in self._debounce_timers:
            self._debounce_timers[project_id].cancel()

        # Create new debounced notification
        async def debounced_notification():
            # Wait for debounce delay
            await asyncio.sleep(self._debounce_delay)

            # Remove timer from tracking
            if project_id in self._debounce_timers:
                del self._debounce_timers[project_id]

            # File-level cache automatically invalidates on mtime/size change
            # No need for explicit cache invalidation
            logger.info(f"File change detected for {project_id} after debounce")

            message = {
                "type": "file_change",
                "event": event_type,
                "file_path": file_path,
                "project_id": project_id,
                "timestamp": asyncio.get_event_loop().time()
            }
            await self.connection_manager.broadcast(message)

        # Schedule debounced notification
        task = asyncio.create_task(debounced_notification())
        self._debounce_timers[project_id] = task

class FileWatcher:
    def __init__(self, watch_path: Path):
        self.watch_path = watch_path
        self.observer: Optional[Observer] = None
        self.handler: Optional[FileChangeHandler] = None

    async def start(self, connection_manager):
        """ファイル監視を開始"""
        if not self.watch_path.exists():
            logger.warning(f"Watch path does not exist: {self.watch_path}")
            return

        # 現在のイベントループを取得
        loop = asyncio.get_event_loop()
        self.handler = FileChangeHandler(connection_manager, loop)
        self.observer = Observer()

        # 再帰的に監視
        self.observer.schedule(self.handler, str(self.watch_path), recursive=True)
        self.observer.start()

        logger.info(f"Started file watcher for: {self.watch_path}")

    async def stop(self):
        """ファイル監視を停止"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            logger.info("File watcher stopped")
