"""
Streaming conversation collector for incremental data processing.
Applies filters during collection to avoid loading unnecessary data.
"""

from typing import AsyncGenerator, Optional
from datetime import datetime, date
from pathlib import Path
import pytz

from services.jsonl_parser import JSONLParser


class StreamingConversationCollector:
    """
    Incrementally collects conversations from projects.
    Applies filters during collection (not after).
    Stops early when enough data is collected.
    """

    def __init__(self, parser: JSONLParser, timezone: pytz.timezone):
        self.parser = parser
        self.tz = timezone

    async def collect_conversations(
        self,
        project_dirs: list[Path],
        filters: dict,
        sort_order: str = "desc"
    ) -> AsyncGenerator[dict, None]:
        """
        Stream conversations from ALL projects, sorted by message timestamp.

        Strategy:
        1. Parse all projects (uses cache, so fast)
        2. Collect all conversations into a single list
        3. Sort by timestamp
        4. Yield in order (StreamingGrouper handles early termination)

        This ensures we get the latest messages regardless of which project they're in.

        Args:
            project_dirs: List of project directories to parse
            filters: {
                'start_date': Optional[date],
                'end_date': Optional[date],
                'keyword': Optional[str],
                'show_related_threads': bool,
            }
            sort_order: 'asc' or 'desc'

        Yields:
            Filtered conversations one by one, sorted by timestamp
        """
        # Collect all conversations from all projects
        all_conversations = []

        for project_dir in project_dirs:
            # Parse project (uses cache if available)
            conversations = await self.parser.parse_project(project_dir)
            all_conversations.extend(conversations)

        # Sort by timestamp (ensures correct chronological order)
        reverse_sort = (sort_order == "desc")
        all_conversations.sort(key=lambda x: x["timestamp"], reverse=reverse_sort)

        # Apply filters and yield
        for conv in all_conversations:
            if self._matches_all_filters(conv, filters):
                yield conv

    async def _process_project(
        self,
        project_dir: Path,
        filters: dict,
        sort_order: str
    ) -> AsyncGenerator[dict, None]:
        """Process single project and yield matching conversations"""
        # Parse single project (uses cache if available)
        conversations = await self.parser.parse_project(project_dir)

        # Sort conversations within project
        conversations.sort(
            key=lambda x: x["timestamp"],
            reverse=(sort_order == "desc")
        )

        # Apply filters and yield matching conversations
        for conv in conversations:
            if self._matches_all_filters(conv, filters):
                yield conv

    def _matches_all_filters(self, conversation: dict, filters: dict) -> bool:
        """Check if conversation matches all filter criteria"""
        # Early return pattern to reduce nesting
        if not self._matches_date_filter(conversation, filters):
            return False

        if not self._matches_keyword_filter(conversation, filters):
            return False

        return True

    def _matches_date_filter(self, conversation: dict, filters: dict) -> bool:
        """Check date range filter"""
        start_date = filters.get('start_date')
        end_date = filters.get('end_date')

        # No date filter - pass
        if not start_date and not end_date:
            return True

        conv_date = self._extract_conversation_date(conversation)

        # Check start date
        if start_date and conv_date < start_date:
            return False

        # Check end date
        if end_date and conv_date > end_date:
            return False

        return True

    def _matches_keyword_filter(self, conversation: dict, filters: dict) -> bool:
        """
        Check keyword filter.

        For show_related_threads=True:
          - Pass all messages (grouper will include entire thread if any message matches)

        For show_related_threads=False:
          - Only pass messages that match keyword
        """
        keyword = filters.get('keyword')

        # No keyword filter - pass all
        if not keyword:
            return True

        # For show_related_threads=True, we need to pass ALL conversations
        # The StreamingThreadGrouper will filter threads based on whether
        # they contain at least one matching message
        show_related_threads = filters.get('show_related_threads', True)
        if show_related_threads:
            return True  # Pass all, grouper handles thread-level filtering

        # For show_related_threads=False, only pass matching messages
        keyword_lower = keyword.lower()
        return keyword_lower in conversation['content'].lower()

    def _extract_conversation_date(self, conversation: dict) -> date:
        """Extract date from conversation timestamp"""
        timestamp = datetime.fromisoformat(
            conversation["timestamp"].replace('Z', '+00:00')
        )
        return timestamp.astimezone(self.tz).date()
