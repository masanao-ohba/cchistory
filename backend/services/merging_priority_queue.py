"""
Merging Priority Queue for K-Way Merge Algorithm
Efficiently merges multiple sorted message streams from different projects
"""
import heapq
from typing import List, Optional, Dict, Any, Tuple
from pathlib import Path
import logging
from .lazy_file_reader import LazyFileReader

logger = logging.getLogger(__name__)


class MessageStreamItem:
    """
    Wrapper for messages in the priority queue to handle comparisons
    """

    def __init__(self, timestamp: str, project_id: str, message: Dict[str, Any], reader_index: int):
        self.timestamp = timestamp
        self.project_id = project_id
        self.message = message
        self.reader_index = reader_index

    def __lt__(self, other):
        """Compare based on timestamp for min-heap ordering"""
        return self.timestamp < other.timestamp

    def __eq__(self, other):
        """Equality comparison"""
        return self.timestamp == other.timestamp


class MergingPriorityQueue:
    """
    Priority queue for efficiently merging multiple sorted message streams.
    Uses a min-heap to always get the oldest message across all projects.
    """

    def __init__(self, project_files: Dict[str, List[Path]], buffer_size: int = 10):
        """
        Initialize merging priority queue

        Args:
            project_files: Dictionary mapping project IDs to lists of JSONL file paths
            buffer_size: Buffer size for each lazy file reader
        """
        self.project_files = project_files
        self.buffer_size = buffer_size
        self.readers: List[Optional[LazyFileReader]] = []
        self.project_ids: List[str] = []
        self.heap: List[MessageStreamItem] = []
        self.total_messages_read = 0

        # Initialize readers and heap
        self._initialize_readers()

    def _initialize_readers(self):
        """Initialize lazy file readers for all project files"""
        reader_index = 0

        for project_id, file_paths in self.project_files.items():
            for file_path in file_paths:
                try:
                    reader = LazyFileReader(file_path, self.buffer_size)
                    first_message = reader.peek()

                    if first_message:
                        # Add project info to message
                        first_message['_project_id'] = project_id
                        first_message['_file_path'] = str(file_path)

                        # Get timestamp for sorting
                        timestamp = first_message.get('timestamp', '')

                        # Add to heap
                        item = MessageStreamItem(
                            timestamp=timestamp,
                            project_id=project_id,
                            message=first_message,
                            reader_index=reader_index
                        )
                        heapq.heappush(self.heap, item)

                    self.readers.append(reader)
                    self.project_ids.append(project_id)
                    reader_index += 1

                except Exception as e:
                    logger.warning(f"Failed to initialize reader for {file_path}: {e}")
                    self.readers.append(None)
                    self.project_ids.append(project_id)
                    reader_index += 1

        logger.info(f"Initialized {len(self.readers)} readers for {len(self.project_files)} projects")

    def _refill_from_reader(self, reader_index: int):
        """
        Refill heap with next message from specified reader

        Args:
            reader_index: Index of the reader to refill from
        """
        if reader_index >= len(self.readers):
            return

        reader = self.readers[reader_index]
        if reader is None:
            return

        # Consume the message we just popped (it was peeked before)
        reader.next()

        # Get next message
        next_message = reader.peek()
        if next_message:
            # Add project info
            project_id = self.project_ids[reader_index]
            next_message['_project_id'] = project_id
            next_message['_file_path'] = str(reader.file_path)

            # Get timestamp for sorting
            timestamp = next_message.get('timestamp', '')

            # Add to heap
            item = MessageStreamItem(
                timestamp=timestamp,
                project_id=project_id,
                message=next_message,
                reader_index=reader_index
            )
            heapq.heappush(self.heap, item)

    def get_next_message(self) -> Optional[Dict[str, Any]]:
        """
        Get the next oldest message across all projects

        Returns:
            Next message with project metadata or None if all streams exhausted
        """
        if not self.heap:
            return None

        # Pop the oldest message
        item = heapq.heappop(self.heap)
        self.total_messages_read += 1

        # Refill from the same reader
        self._refill_from_reader(item.reader_index)

        return item.message

    def get_messages_batch(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get a batch of messages in chronological order

        Args:
            limit: Maximum number of messages to return

        Returns:
            List of messages in chronological order
        """
        messages = []
        for _ in range(limit):
            msg = self.get_next_message()
            if msg is None:
                break
            messages.append(msg)

        return messages

    def seek_all(self, timestamp: str):
        """
        Seek all readers to specified timestamp

        Args:
            timestamp: Target timestamp to seek to
        """
        # Clear heap
        self.heap = []

        # Seek each reader and rebuild heap
        for reader_index, reader in enumerate(self.readers):
            if reader is None:
                continue

            if reader.seek(timestamp):
                msg = reader.peek()
                if msg:
                    project_id = self.project_ids[reader_index]
                    msg['_project_id'] = project_id
                    msg['_file_path'] = str(reader.file_path)

                    item = MessageStreamItem(
                        timestamp=msg.get('timestamp', ''),
                        project_id=project_id,
                        message=msg,
                        reader_index=reader_index
                    )
                    heapq.heappush(self.heap, item)

    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about all loaded files

        Returns:
            Dictionary with metadata about all files
        """
        metadata = {
            'total_files': len(self.readers),
            'active_streams': len(self.heap),
            'messages_read': self.total_messages_read,
            'projects': {}
        }

        for project_id in set(self.project_ids):
            metadata['projects'][project_id] = {
                'files': [],
                'total_messages': 0
            }

        for reader, project_id in zip(self.readers, self.project_ids):
            if reader and reader.metadata:
                metadata['projects'][project_id]['files'].append(reader.metadata)
                metadata['projects'][project_id]['total_messages'] += reader.metadata.get('message_count', 0)

        return metadata

    def close(self):
        """Close all file readers"""
        for reader in self.readers:
            if reader:
                reader.close()

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()