"""
Lazy Streaming Grouper for Conversations
Uses K-Way merge algorithm for efficient pagination without loading all data
"""
import logging
from typing import List, Dict, Any, Optional, Set, Tuple
from pathlib import Path
from datetime import datetime, timezone
from .merging_priority_queue import MergingPriorityQueue

logger = logging.getLogger(__name__)


class LazyStreamingGrouper:
    """
    Groups messages into conversations using lazy loading and K-way merge.
    Only loads data as needed for pagination.
    """

    def __init__(self):
        """Initialize lazy streaming grouper"""
        pass

    def get_conversations_lazy(
        self,
        project_files: Dict[str, List[Path]],
        offset: int = 0,
        limit: int = 50,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        keyword: Optional[str] = None,
        sort_order: str = 'desc',
        show_related_threads: bool = False
    ) -> Tuple[List[List[Dict[str, Any]]], Dict[str, Any]]:
        """
        Get conversations using lazy loading with K-way merge

        Args:
            project_files: Dictionary mapping project IDs to lists of JSONL file paths
            offset: Number of conversations to skip
            limit: Number of conversations to return
            start_date: Filter by start date (ISO format)
            end_date: Filter by end date (ISO format)
            keyword: Search keyword
            sort_order: Sort order ('asc' or 'desc')
            show_related_threads: Include related threads when searching

        Returns:
            Tuple of (conversations, metadata)
        """
        # Initialize the merging priority queue
        with MergingPriorityQueue(project_files) as merger:
            # Get metadata for estimation
            metadata = merger.get_metadata()

            # If date filtering, seek to start position
            if start_date and sort_order == 'asc':
                merger.seek_all(start_date)
            elif end_date and sort_order == 'desc':
                # For descending order with end date, we need different approach
                # For now, we'll load from beginning and filter
                pass

            # Collect messages efficiently
            messages = []
            conversations = []
            current_conversation = []
            skipped = 0
            returned = 0

            # Process messages in streaming fashion
            while returned < limit:
                # Get next batch of messages
                batch = merger.get_messages_batch(limit=100)
                if not batch:
                    # No more messages
                    if current_conversation:
                        if self._matches_criteria(current_conversation, start_date, end_date, keyword):
                            if skipped >= offset:
                                conversations.append(current_conversation)
                                returned += 1
                            else:
                                skipped += 1
                    break

                # Process batch
                for message in batch:
                    # Apply date filtering
                    if start_date and message.get('timestamp', '') < start_date:
                        continue
                    if end_date and message.get('timestamp', '') > end_date:
                        continue

                    # Add message to current conversation
                    if message.get('type') == 'user':
                        # Start of new conversation
                        if current_conversation:
                            if self._matches_criteria(current_conversation, start_date, end_date, keyword):
                                if skipped >= offset:
                                    conversations.append(current_conversation)
                                    returned += 1
                                    if returned >= limit:
                                        break
                                else:
                                    skipped += 1
                        current_conversation = [message]
                    elif current_conversation:
                        # Add to existing conversation
                        current_conversation.append(message)

                messages.extend(batch)

            # Apply sorting if needed
            if sort_order == 'desc':
                conversations.reverse()

            # Calculate stats
            stats = {
                'total_threads': metadata.get('total_files', 0) * 10,  # Estimate
                'total_messages': sum(
                    proj.get('total_messages', 0)
                    for proj in metadata.get('projects', {}).values()
                ),
                'actual_threads': len(conversations),
                'actual_messages': sum(len(conv) for conv in conversations),
                'projects_included': len(project_files),
                'lazy_loaded': True,
                'messages_scanned': len(messages)
            }

            return conversations, stats

    def _matches_criteria(
        self,
        conversation: List[Dict[str, Any]],
        start_date: Optional[str],
        end_date: Optional[str],
        keyword: Optional[str]
    ) -> bool:
        """
        Check if conversation matches filter criteria

        Args:
            conversation: List of messages in conversation
            start_date: Start date filter
            end_date: End date filter
            keyword: Search keyword

        Returns:
            True if conversation matches criteria
        """
        if not conversation:
            return False

        # Check date range
        conv_timestamp = conversation[0].get('timestamp', '')
        if start_date and conv_timestamp < start_date:
            return False
        if end_date and conv_timestamp > end_date:
            return False

        # Check keyword
        if keyword:
            keyword_lower = keyword.lower()
            for msg in conversation:
                content = msg.get('content', '')
                if isinstance(content, str) and keyword_lower in content.lower():
                    return True
            return False

        return True

    def get_project_files(self, project_dirs: List[Path]) -> Dict[str, List[Path]]:
        """
        Get all JSONL files grouped by project

        Args:
            project_dirs: List of project directories

        Returns:
            Dictionary mapping project IDs to lists of JSONL file paths
        """
        project_files = {}

        for project_dir in project_dirs:
            if not project_dir.exists():
                continue

            project_id = project_dir.name
            jsonl_files = sorted(project_dir.glob('*.jsonl'), key=lambda f: f.stat().st_mtime)

            if jsonl_files:
                project_files[project_id] = jsonl_files

        return project_files