import asyncio
import logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from typing import Optional

logger = logging.getLogger(__name__)

class FileChangeHandler(FileSystemEventHandler):
    def __init__(self, connection_manager):
        self.connection_manager = connection_manager
        super().__init__()

    def on_modified(self, event):
        if event.is_directory:
            return

        if event.src_path.endswith('.jsonl'):
            logger.info(f"JSONL file modified: {event.src_path}")
            asyncio.create_task(self._notify_clients(event.src_path, 'modified'))

    def on_created(self, event):
        if event.is_directory:
            return

        if event.src_path.endswith('.jsonl'):
            logger.info(f"JSONL file created: {event.src_path}")
            asyncio.create_task(self._notify_clients(event.src_path, 'created'))

    async def _notify_clients(self, file_path: str, event_type: str):
        """クライアントに変更を通知"""
        message = {
            "type": "file_change",
            "event": event_type,
            "file_path": file_path,
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.connection_manager.broadcast(message)

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

        self.handler = FileChangeHandler(connection_manager)
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
