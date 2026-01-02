"""
Streaming thread grouper for incremental thread collection.
Stops processing when enough threads are collected.
"""

from typing import AsyncGenerator, Optional
import logging

from services.message_grouper import group_conversations_by_thread_array

logger = logging.getLogger(__name__)


class StreamingThreadGrouper:
    """
    Groups conversations into threads with early termination.
    Stops when enough threads are collected.
    """

    # Check for early termination every N conversations
    CHECK_INTERVAL = 50

    # Safety margin: collect 1.5x target to ensure we have enough
    SAFETY_MARGIN = 1.5

    async def collect_thread_groups(
        self,
        conversation_stream: AsyncGenerator[dict, None],
        limit: int,
        offset: int,
        sort_order: str,
        keyword_filter: Optional[str] = None,
        show_related_threads: bool = True
    ) -> tuple[list[list[dict]], int, int]:
        """
        Collect thread groups from conversation stream.

        Args:
            conversation_stream: Async generator of conversations
            limit: Number of threads to return
            offset: Number of threads to skip
            sort_order: 'asc' or 'desc'
            keyword_filter: Optional keyword for highlighting
            show_related_threads: If True, include entire thread when keyword matches

        Returns:
            (thread_groups, total_threads_scanned, total_messages_scanned)
        """
        all_conversations = []
        target_count = int((offset + limit) * self.SAFETY_MARGIN)

        # Collect conversations with early termination
        all_conversations = await self._collect_with_early_termination(
            conversation_stream,
            target_count,
            sort_order
        )

        # Group all collected conversations into threads
        all_thread_groups = group_conversations_by_thread_array(
            all_conversations,
            sort_order
        )

        # Apply keyword highlighting if needed
        if keyword_filter:
            all_thread_groups = self._apply_keyword_highlighting(
                all_thread_groups,
                keyword_filter,
                show_related_threads
            )

        # Paginate
        thread_groups = all_thread_groups[offset:offset + limit]

        return (
            thread_groups,
            len(all_thread_groups),  # total_threads
            len(all_conversations)    # total_messages
        )

    async def _collect_with_early_termination(
        self,
        conversation_stream: AsyncGenerator[dict, None],
        target_count: int,
        sort_order: str
    ) -> list[dict]:
        """Collect conversations and stop early when enough threads found"""
        all_conversations = []
        conversation_count = 0

        async for conversation in conversation_stream:
            all_conversations.append(conversation)
            conversation_count += 1

            # Periodically check if we have enough threads
            if conversation_count % self.CHECK_INTERVAL == 0:
                if self._has_enough_threads(all_conversations, target_count, sort_order):
                    logger.info(
                        f"Early termination: Collected {len(all_conversations)} conversations, "
                        f"target was {target_count} threads"
                    )
                    break

        return all_conversations

    def _has_enough_threads(
        self,
        conversations: list[dict],
        target_count: int,
        sort_order: str
    ) -> bool:
        """Check if we have enough thread groups"""
        temp_groups = group_conversations_by_thread_array(conversations, sort_order)
        return len(temp_groups) >= target_count

    def _apply_keyword_highlighting(
        self,
        thread_groups: list[list[dict]],
        keyword: str,
        show_related_threads: bool
    ) -> list[list[dict]]:
        """
        Add keyword highlighting flags to conversations.

        If show_related_threads=True:
            - Include entire thread if any message matches
            - Mark only matching messages with is_search_match

        If show_related_threads=False:
            - Filter out threads with no matches
            - Mark matching messages
        """
        keyword_lower = keyword.lower()
        filtered_groups = []

        for thread_group in thread_groups:
            has_match_in_thread = self._mark_keyword_matches(
                thread_group,
                keyword,
                keyword_lower
            )

            # Only include threads that have at least one matching message
            if has_match_in_thread:
                filtered_groups.append(thread_group)

        return filtered_groups

    def _mark_keyword_matches(
        self,
        thread_group: list[dict],
        keyword: str,
        keyword_lower: str
    ) -> bool:
        """
        Mark messages that match keyword.
        Returns True if at least one message in thread matches.
        """
        has_match = False

        for conv in thread_group:
            is_match = keyword_lower in conv['content'].lower()
            conv['is_search_match'] = is_match

            if is_match:
                conv['search_keyword'] = keyword
                has_match = True

        return has_match
