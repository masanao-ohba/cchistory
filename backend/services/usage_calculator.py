"""
Claude Code Token Usage Calculator
Reads project JSONL files from ~/.claude/projects and calculates current 5-hour block usage
Based on ccusage logic but implemented in Python
"""
import json
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from collections import defaultdict
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

# Claude Code uses 5-hour block duration (official documentation)
# Blocks are calculated in US Eastern Time (America/New_York)
# EDT (UTC-4) blocks: 00:00, 05:00, 10:00, 15:00, 20:00
# In JST (UTC+9), these become: 13:00, 18:00, 23:00, 04:00, 09:00 (next day)
BLOCK_DURATION_HOURS = 5

# Claude Code uses US Eastern Time for block boundaries
# This handles EDT/EST transitions automatically
CLAUDE_TIMEZONE = ZoneInfo("America/New_York")


class UsageCalculator:
    """Calculate Claude Code token usage from project JSONL files"""

    def __init__(self, projects_path: Optional[Path] = None):
        """
        Initialize calculator with path to Claude projects directory

        Args:
            projects_path: Path to projects directory (defaults to ~/.claude/projects)
        """
        if projects_path is None:
            projects_path = Path.home() / ".claude" / "projects"

        self.projects_path = projects_path

    def _parse_project_files(self) -> List[Dict[str, Any]]:
        """Parse all project JSONL files and extract usage data from assistant messages"""
        if not self.projects_path.exists():
            logger.warning(f"Projects directory not found: {self.projects_path}")
            return []

        usage_entries = []

        try:
            # Find all .jsonl files in all project directories
            jsonl_files = list(self.projects_path.glob("*/*.jsonl"))
            logger.info(f"Found {len(jsonl_files)} project files")

            for jsonl_file in jsonl_files:
                try:
                    with open(jsonl_file, 'r', encoding='utf-8') as f:
                        for line_num, line in enumerate(f, 1):
                            line = line.strip()
                            if not line:
                                continue

                            try:
                                entry = json.loads(line)

                                # Only process assistant messages with usage data
                                if (entry.get('type') == 'assistant' and
                                    'message' in entry and
                                    isinstance(entry['message'], dict) and
                                    'usage' in entry['message']):

                                    # Extract timestamp and usage
                                    timestamp = entry.get('timestamp')
                                    usage = entry['message']['usage']

                                    if timestamp and usage:
                                        usage_entries.append({
                                            'timestamp': timestamp,
                                            'usage': usage
                                        })

                            except json.JSONDecodeError as e:
                                logger.warning(f"Failed to parse line {line_num} in {jsonl_file.name}: {e}")
                                continue

                except Exception as e:
                    logger.warning(f"Error reading file {jsonl_file}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error scanning project files: {e}")
            return []

        logger.info(f"Extracted {len(usage_entries)} usage entries from project files")
        return usage_entries

    def _get_block_start_time(self, timestamp: datetime) -> datetime:
        """
        Calculate the start time of the 5-hour block containing the given timestamp

        Blocks start at: 00:00, 05:00, 10:00, 15:00, 20:00 (America/New_York)
        Claude Code uses US Eastern Time for block boundaries.
        """
        # Convert timestamp to US Eastern Time
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        # Convert to Eastern Time for block calculation
        eastern_time = timestamp.astimezone(CLAUDE_TIMEZONE)

        # Calculate block index (0-4 for 5 blocks per day) based on Eastern time
        hour = eastern_time.hour
        block_index = hour // BLOCK_DURATION_HOURS
        block_start_hour = block_index * BLOCK_DURATION_HOURS

        # Create block start time in Eastern timezone
        block_start = eastern_time.replace(
            hour=block_start_hour,
            minute=0,
            second=0,
            microsecond=0
        )

        return block_start

    def _group_by_blocks(self, entries: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group entries by 5-hour blocks"""
        blocks = defaultdict(list)

        for entry in entries:
            # Get timestamp from entry
            timestamp_str = entry.get('timestamp')
            if not timestamp_str:
                continue

            try:
                # Parse ISO timestamp
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                block_start = self._get_block_start_time(timestamp)
                block_id = block_start.isoformat()
                blocks[block_id].append(entry)
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid timestamp: {timestamp_str}: {e}")
                continue

        return dict(blocks)

    def _calculate_block_usage(self, block_entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate token usage for a block"""
        usage = {
            'input_tokens': 0,
            'output_tokens': 0,
            'cache_creation_tokens': 0,
            'cache_read_tokens': 0,
            'total_tokens': 0,
            'entry_count': len(block_entries)
        }

        for entry in block_entries:
            # Extract usage from entry
            entry_usage = entry.get('usage', {})

            usage['input_tokens'] += entry_usage.get('input_tokens', 0)
            usage['output_tokens'] += entry_usage.get('output_tokens', 0)
            usage['cache_creation_tokens'] += entry_usage.get('cache_creation_input_tokens', 0)
            usage['cache_read_tokens'] += entry_usage.get('cache_read_input_tokens', 0)

        # Calculate total (only count actual I/O tokens, not cache reads)
        usage['total_tokens'] = usage['input_tokens'] + usage['output_tokens']

        return usage

    def get_current_block_usage(self) -> Dict[str, Any]:
        """
        Get token usage for the current 5-hour block

        Returns:
            Dict containing:
            - available: bool - whether data is available
            - current_block: Optional[Dict] - current block data
            - error: Optional[str] - error message if any
        """
        try:
            # Parse project files for usage data
            entries = self._parse_project_files()

            if not entries:
                return {
                    'available': True,
                    'current_block': None,
                    'error': 'No usage data found in project files'
                }

            # Get current time and block (using US Eastern Time)
            now = datetime.now(CLAUDE_TIMEZONE)
            current_block_start = self._get_block_start_time(now)
            current_block_end = current_block_start + timedelta(hours=BLOCK_DURATION_HOURS)

            # Group entries by blocks
            blocks = self._group_by_blocks(entries)

            # Get current block entries
            block_id = current_block_start.isoformat()
            current_entries = blocks.get(block_id, [])

            if not current_entries:
                # No usage in current block
                return {
                    'available': True,
                    'current_block': {
                        'start_time': current_block_start.isoformat(),
                        'end_time': current_block_end.isoformat(),
                        'is_active': True,
                        'entries': 0,
                        'token_counts': {
                            'input_tokens': 0,
                            'output_tokens': 0,
                            'cache_creation_tokens': 0,
                            'cache_read_tokens': 0
                        },
                        'total_tokens': 0
                    },
                    'error': None
                }

            # Calculate usage for current block
            usage = self._calculate_block_usage(current_entries)

            # Calculate time remaining
            time_remaining = (current_block_end - now).total_seconds() / 60  # minutes

            return {
                'available': True,
                'current_block': {
                    'start_time': current_block_start.isoformat(),
                    'end_time': current_block_end.isoformat(),
                    'is_active': True,
                    'entries': usage['entry_count'],
                    'token_counts': {
                        'input_tokens': usage['input_tokens'],
                        'output_tokens': usage['output_tokens'],
                        'cache_creation_tokens': usage['cache_creation_tokens'],
                        'cache_read_tokens': usage['cache_read_tokens']
                    },
                    'total_tokens': usage['total_tokens'],
                    'time_remaining_minutes': max(0, time_remaining)
                },
                'error': None
            }

        except Exception as e:
            logger.error(f"Error calculating usage: {e}", exc_info=True)
            return {
                'available': True,
                'current_block': None,
                'error': f"Error calculating usage: {str(e)}"
            }
