"""
Date filtering utilities for conversation data.

This module provides utilities for filtering conversation messages by date range
while preserving the natural flow of conversations. It ensures that conversation
context is maintained even when messages span date boundaries.

Key Principles:
    - Session continuity: Assistant responses include their triggering user messages
    - Timezone awareness: All date comparisons use the specified timezone
    - Context preservation: Message relationships are maintained across date boundaries
"""

from typing import List, Dict, Any, Optional, Set
from datetime import datetime, date
import pytz


def apply_date_filter(
    conversations: List[Dict[str, Any]],
    start_date: Optional[date],
    end_date: Optional[date],
    timezone: pytz.timezone
) -> List[Dict[str, Any]]:
    """
    Apply date filtering to conversations while preserving conversation flow.

    Why this is important:
        Without this test, users would see assistant responses without their triggering
        user messages when filtering by date, breaking conversation context.

    Args:
        conversations: List of message dicts with 'timestamp', 'session_id', 'type' fields
        start_date: Start date (inclusive), None for no start boundary
        end_date: End date (inclusive), None for no end boundary
        timezone: pytz timezone for converting UTC timestamps to local dates

    Returns:
        Filtered messages with context preserved. If an assistant message is in range,
        its preceding user message is included even if outside the range.
    """
    # First identify messages within date range
    date_filtered_indices: Set[int] = set()
    for i, conv in enumerate(conversations):
        conv_date = datetime.fromisoformat(conv["timestamp"].replace('Z', '+00:00'))
        conv_date = conv_date.astimezone(timezone).date()

        if start_date and end_date and not (start_date <= conv_date <= end_date):
            continue
        if start_date and not end_date and conv_date < start_date:
            continue
        if end_date and not start_date and conv_date > end_date:
            continue

        date_filtered_indices.add(i)

    # Extend indices to include user messages that precede assistant messages in range
    enhanced_indices = set(date_filtered_indices)
    session_first_indices: Dict[str, int] = {}

    # Identify first index in date range for each session
    for i in sorted(date_filtered_indices):
        session_id = conversations[i]["session_id"]
        if session_id not in session_first_indices:
            session_first_indices[session_id] = i

    # For sessions starting with assistant message, find preceding user message
    for session_id, first_idx in session_first_indices.items():
        if conversations[first_idx]["type"] != "assistant":
            continue

        # Search backwards for user message in same session
        for j in range(first_idx - 1, -1, -1):
            if conversations[j]["session_id"] != session_id:
                break

            enhanced_indices.add(j)
            if conversations[j]["type"] == "user":
                break

    # Build filtered list maintaining original order
    filtered_conversations = [
        conversations[i] for i in sorted(enhanced_indices)
    ]

    return filtered_conversations
