"""
Lazy File Reader for JSONL files
Reads messages on-demand with cursor tracking for efficient pagination
"""
import json
import os
from typing import Optional, List, Dict, Any, Iterator
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class LazyFileReader:
    """
    Lazily reads messages from a JSONL file with cursor tracking.
    Maintains a small buffer for efficient reading.
    """

    def __init__(self, file_path: Path, buffer_size: int = 10):
        """
        Initialize lazy file reader

        Args:
            file_path: Path to JSONL file
            buffer_size: Number of messages to buffer ahead
        """
        self.file_path = file_path
        self.buffer_size = buffer_size
        self.buffer: List[Dict[str, Any]] = []
        self.file_handle = None
        self.cursor_position = 0
        self.eof_reached = False
        self.metadata = None

        # Initialize metadata
        self._load_metadata()

    def _load_metadata(self):
        """Load or calculate file metadata"""
        try:
            # Quick scan for metadata
            message_count = 0
            first_timestamp = None
            last_timestamp = None

            with open(self.file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if not line.strip():
                        continue
                    message_count += 1
                    try:
                        data = json.loads(line)
                        timestamp = data.get('timestamp')
                        if timestamp:
                            if first_timestamp is None:
                                first_timestamp = timestamp
                            last_timestamp = timestamp
                    except json.JSONDecodeError:
                        continue

            self.metadata = {
                'file_path': str(self.file_path),
                'message_count': message_count,
                'first_timestamp': first_timestamp,
                'last_timestamp': last_timestamp,
                'file_size': os.path.getsize(self.file_path)
            }
        except Exception as e:
            logger.warning(f"Failed to load metadata for {self.file_path}: {e}")
            self.metadata = {
                'file_path': str(self.file_path),
                'message_count': 0,
                'first_timestamp': None,
                'last_timestamp': None,
                'file_size': 0
            }

    def _open_file(self):
        """Open file handle if not already open"""
        if self.file_handle is None:
            self.file_handle = open(self.file_path, 'r', encoding='utf-8')

    def _fill_buffer(self):
        """Fill buffer with next messages from file"""
        if self.eof_reached:
            return

        self._open_file()

        while len(self.buffer) < self.buffer_size:
            try:
                line = self.file_handle.readline()
                if not line:
                    self.eof_reached = True
                    break

                line = line.strip()
                if not line:
                    continue

                try:
                    message = json.loads(line)
                    self.buffer.append(message)
                    self.cursor_position += 1
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse JSON line: {e}")
                    continue
            except Exception as e:
                logger.error(f"Error reading from {self.file_path}: {e}")
                self.eof_reached = True
                break

    def peek(self) -> Optional[Dict[str, Any]]:
        """
        Look at next message without consuming it

        Returns:
            Next message or None if end of file
        """
        if not self.buffer and not self.eof_reached:
            self._fill_buffer()

        if self.buffer:
            return self.buffer[0]
        return None

    def next(self) -> Optional[Dict[str, Any]]:
        """
        Consume and return next message

        Returns:
            Next message or None if end of file
        """
        if not self.buffer and not self.eof_reached:
            self._fill_buffer()

        if self.buffer:
            return self.buffer.pop(0)
        return None

    def seek(self, timestamp: str) -> bool:
        """
        Seek to approximate position based on timestamp
        Binary search could be implemented here for optimization

        Args:
            timestamp: Target timestamp to seek to

        Returns:
            True if seek successful, False otherwise
        """
        # For prototype, simple linear scan
        # In production, use binary search with byte offsets
        self.close()
        self.__init__(self.file_path, self.buffer_size)

        while True:
            msg = self.peek()
            if msg is None:
                return False

            msg_timestamp = msg.get('timestamp', '')
            if msg_timestamp >= timestamp:
                return True

            self.next()  # Consume message

    def get_all_remaining(self) -> Iterator[Dict[str, Any]]:
        """
        Generator to get all remaining messages

        Yields:
            Messages from current position to end of file
        """
        while True:
            msg = self.next()
            if msg is None:
                break
            yield msg

    def close(self):
        """Close file handle and reset state"""
        if self.file_handle:
            self.file_handle.close()
            self.file_handle = None
        self.buffer = []
        self.cursor_position = 0
        self.eof_reached = False

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()

    def __del__(self):
        """Destructor to ensure file is closed"""
        self.close()