"""
Claude Code Token Usage Calculator
Reads project JSONL files from ~/.claude/projects and calculates usage metrics:
- Current 5-hour session usage
- Weekly usage (all models)
- Weekly Opus usage

Based on official Claude Code behavior
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

# Weekly reset day (Monday) and time in Eastern Time
WEEKLY_RESET_DAY = 0  # 0 = Monday
WEEKLY_RESET_HOUR = 0  # Midnight

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

        # Cache for current block usage (invalidated every 5 minutes)
        self._cache = None
        self._cache_timestamp = None
        self._cache_block_id = None
        self.CACHE_TTL_SECONDS = 300  # 5 minutes

    def _is_cache_valid(self, block_id: str) -> bool:
        """Check if cached data is still valid"""
        if self._cache is None:
            return False

        # Different block - cache invalid
        if self._cache_block_id != block_id:
            return False

        # Check TTL
        if self._cache_timestamp is None:
            return False

        now = datetime.now(timezone.utc)
        age_seconds = (now - self._cache_timestamp).total_seconds()

        return age_seconds < self.CACHE_TTL_SECONDS

    def _update_cache(self, block_id: str, result: Dict[str, Any]):
        """Update cache with new data"""
        self._cache = result
        self._cache_block_id = block_id
        self._cache_timestamp = datetime.now(timezone.utc)
        logger.info(f"Updated cache for block {block_id}")

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

                                    # Extract timestamp, usage, and model
                                    timestamp = entry.get('timestamp')
                                    usage = entry['message']['usage']
                                    model = entry['message'].get('model', '')

                                    if timestamp and usage:
                                        usage_entries.append({
                                            'timestamp': timestamp,
                                            'usage': usage,
                                            'model': model
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

    def _get_week_start_time(self, timestamp: datetime) -> datetime:
        """
        Calculate the start time of the week containing the given timestamp

        Weeks start on Monday at 00:00 (America/New_York)
        """
        # Convert timestamp to US Eastern Time
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        eastern_time = timestamp.astimezone(CLAUDE_TIMEZONE)

        # Calculate days since Monday (0 = Monday, 6 = Sunday)
        days_since_monday = (eastern_time.weekday() - WEEKLY_RESET_DAY) % 7

        # Get Monday of this week
        week_start = eastern_time - timedelta(days=days_since_monday)
        week_start = week_start.replace(
            hour=WEEKLY_RESET_HOUR,
            minute=0,
            second=0,
            microsecond=0
        )

        return week_start

    def _is_opus_model(self, usage_entry: Dict[str, Any]) -> bool:
        """
        Determine if the usage entry is from an Opus model

        Checks the 'model' field for 'opus' substring.
        Model examples:
        - claude-opus-4-1-20250805 (Opus)
        - claude-sonnet-4-5-20250929 (Not Opus)
        - claude-haiku-4-5-20251001 (Not Opus)
        """
        model = usage_entry.get('model', '').lower()
        return 'opus' in model

    def _get_opus_period_times(
        self,
        entries: List[Dict[str, Any]],
        now: datetime
    ) -> tuple[datetime, datetime]:
        """
        Calculate Opus weekly limit period.

        Opus period is 7 days from the FIRST Opus usage in the current period.
        If reset time has passed, only count Opus usage after that reset time.

        Returns:
            Tuple of (period_start, period_end) where:
            - period_start: First Opus usage time in current period
            - period_end: period_start + 7 days (reset time)
        """
        # Find all Opus entries and sort by timestamp
        opus_timestamps = []
        for entry in entries:
            if self._is_opus_model(entry):
                timestamp_str = entry.get('timestamp')
                if timestamp_str:
                    try:
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        opus_timestamps.append(timestamp.astimezone(CLAUDE_TIMEZONE))
                    except (ValueError, TypeError):
                        continue

        if not opus_timestamps:
            # No Opus usage, use current week as fallback
            week_start = self._get_week_start_time(now)
            week_end = week_start + timedelta(days=7)
            return week_start, week_end

        opus_timestamps.sort()

        # Find the first Opus usage within the last 7 days
        # If all Opus usage is older than 7 days, the period has reset
        seven_days_ago = now - timedelta(days=7)

        first_usage_in_period = None
        for ts in opus_timestamps:
            if ts >= seven_days_ago:
                first_usage_in_period = ts
                break

        if first_usage_in_period is None:
            # All Opus usage is older than 7 days - period has reset
            # Use most recent usage + 7 days as reference
            last_usage = opus_timestamps[-1]
            period_start = last_usage
            period_end = last_usage + timedelta(days=7)
            return period_start, period_end

        # Period is from first usage to first usage + 7 days
        period_start = first_usage_in_period
        period_end = first_usage_in_period + timedelta(days=7)

        return period_start, period_end

    def _get_rolling_session_entries(
        self,
        entries: List[Dict[str, Any]],
        now: datetime
    ) -> tuple[List[Dict[str, Any]], Optional[datetime], Optional[datetime]]:
        """
        Get entries for the rolling 5-hour session window.

        Claude Code uses a rolling window starting from the first message in the last 5 hours,
        not fixed block boundaries.

        Returns:
            Tuple of (session_entries, session_start, session_end)
        """
        # Find all messages in the last 5 hours
        five_hours_ago = now - timedelta(hours=BLOCK_DURATION_HOURS)
        recent_entries = []

        for entry in entries:
            timestamp_str = entry.get('timestamp')
            if not timestamp_str:
                continue

            try:
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                timestamp_et = timestamp.astimezone(CLAUDE_TIMEZONE)

                if timestamp_et >= five_hours_ago:
                    recent_entries.append((timestamp_et, entry))
            except (ValueError, TypeError):
                continue

        if not recent_entries:
            # No messages in last 5 hours
            return [], None, None

        # Sort by timestamp
        recent_entries.sort(key=lambda x: x[0])

        # Session starts from first message
        session_start = recent_entries[0][0]
        session_end = session_start + timedelta(hours=BLOCK_DURATION_HOURS)

        # Get all entries within the session window
        session_entries = [entry for ts, entry in recent_entries if ts < session_end]

        return session_entries, session_start, session_end

    def _get_rolling_weekly_entries(
        self,
        entries: List[Dict[str, Any]],
        now: datetime
    ) -> tuple[List[Dict[str, Any]], Optional[datetime], Optional[datetime]]:
        """
        Get entries for the rolling 7-day weekly window.

        Similar to session, uses a rolling window starting from the first message in the last 7 days,
        not fixed Monday boundaries.

        Returns:
            Tuple of (weekly_entries, week_start, week_end)
        """
        # Find all messages in the last 7 days
        seven_days_ago = now - timedelta(days=7)
        recent_entries = []

        for entry in entries:
            timestamp_str = entry.get('timestamp')
            if not timestamp_str:
                continue

            try:
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                timestamp_et = timestamp.astimezone(CLAUDE_TIMEZONE)

                if timestamp_et >= seven_days_ago:
                    recent_entries.append((timestamp_et, entry))
            except (ValueError, TypeError):
                continue

        if not recent_entries:
            # No messages in last 7 days
            return [], None, None

        # Sort by timestamp
        recent_entries.sort(key=lambda x: x[0])

        # Week starts from first message
        week_start = recent_entries[0][0]
        week_end = week_start + timedelta(days=7)

        # Get all entries within the weekly window
        weekly_entries = [entry for ts, entry in recent_entries if ts < week_end]

        return weekly_entries, week_start, week_end

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

    def _group_by_weeks(self, entries: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group entries by weeks (Monday to Sunday)"""
        weeks = defaultdict(list)

        for entry in entries:
            # Get timestamp from entry
            timestamp_str = entry.get('timestamp')
            if not timestamp_str:
                continue

            try:
                # Parse ISO timestamp
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                week_start = self._get_week_start_time(timestamp)
                week_id = week_start.isoformat()
                weeks[week_id].append(entry)
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid timestamp: {timestamp_str}: {e}")
                continue

        return dict(weeks)

    def _filter_entries_by_period(
        self,
        entries: List[Dict[str, Any]],
        period_start: datetime,
        period_end: datetime
    ) -> List[Dict[str, Any]]:
        """Filter entries that fall within the specified time period"""
        filtered = []

        for entry in entries:
            timestamp_str = entry.get('timestamp')
            if not timestamp_str:
                continue

            try:
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                timestamp_et = timestamp.astimezone(CLAUDE_TIMEZONE)

                if period_start <= timestamp_et < period_end:
                    filtered.append(entry)
            except (ValueError, TypeError):
                continue

        return filtered

    def _calculate_block_usage(self, block_entries: List[Dict[str, Any]], opus_only: bool = False) -> Dict[str, Any]:
        """
        Calculate token usage for a block

        Args:
            block_entries: List of usage entries
            opus_only: If True, only count Opus model usage

        Returns:
            Dict with token counts and entry count
        """
        usage = {
            'input_tokens': 0,
            'output_tokens': 0,
            'cache_creation_tokens': 0,
            'cache_read_tokens': 0,
            'total_tokens': 0,
            'entry_count': 0
        }

        for entry in block_entries:
            # Skip if we're filtering for Opus only and this isn't Opus
            if opus_only and not self._is_opus_model(entry):
                continue

            # Extract usage from entry
            entry_usage = entry.get('usage', {})

            usage['input_tokens'] += entry_usage.get('input_tokens', 0)
            usage['output_tokens'] += entry_usage.get('output_tokens', 0)
            usage['cache_creation_tokens'] += entry_usage.get('cache_creation_input_tokens', 0)
            usage['cache_read_tokens'] += entry_usage.get('cache_read_input_tokens', 0)
            usage['entry_count'] += 1

        # Calculate total (only count actual I/O tokens, not cache reads)
        usage['total_tokens'] = usage['input_tokens'] + usage['output_tokens']

        return usage

    def get_current_block_usage(self) -> Dict[str, Any]:
        """
        Get comprehensive token usage data matching Claude Code's official status

        Returns three usage metrics:
        1. Current session (rolling 5-hour window from first message)
        2. Current week (all models)
        3. Current week (Opus only)

        Each metric includes:
        - Token counts
        - Percentage of limit used
        - Reset time
        - Remaining time

        Returns:
            Dict containing:
            - available: bool
            - plan_type: str
            - limits: Dict[str, Any]
            - current_session: Dict[str, Any]
            - weekly_all: Dict[str, Any]
            - weekly_opus: Dict[str, Any]
            - error: Optional[str]
        """
        try:
            # Import limits configuration
            from config import ClaudePlanLimits

            # Get current time
            now = datetime.now(CLAUDE_TIMEZONE)

            # Get plan and limits
            plan_type = ClaudePlanLimits.get_plan_from_env()
            plan_limits = ClaudePlanLimits.get_limits(plan_type)

            # Get current week start time
            current_week_start = self._get_week_start_time(now)

            # Quick TTL-based cache check BEFORE expensive file parsing
            # This prevents parsing 240 files on every request
            if self._cache is not None and self._cache_timestamp is not None:
                age_seconds = (now - self._cache_timestamp).total_seconds()
                if age_seconds < self.CACHE_TTL_SECONDS:
                    logger.info(f"Returning cached data (age: {age_seconds:.1f}s < {self.CACHE_TTL_SECONDS}s TTL)")
                    return self._cache

            # Parse project files for usage data (expensive - 5+ seconds for 240 files)
            entries = self._parse_project_files()

            if not entries:
                # Use fixed block for empty result
                current_block_start = self._get_block_start_time(now)
                block_id = current_block_start.isoformat()
                result = self._build_empty_result(now, current_block_start, current_week_start, plan_type, plan_limits)
                self._update_cache(block_id, result)
                return result

            # Calculate rolling 5-hour session window
            session_entries, session_start, session_end = self._get_rolling_session_entries(entries, now)
            block_id = session_start.isoformat() if session_start else now.isoformat()

            # Check cache validity
            if self._is_cache_valid(block_id):
                logger.info("Returning cached token usage data")
                return self._cache

            logger.info(f"Cache miss or invalid - recalculating token usage for session starting {block_id}")

            # Calculate rolling weekly entries (all models)
            weekly_all_entries, week_start, week_end = self._get_rolling_weekly_entries(entries, now)

            # Calculate Opus period based on first usage
            opus_period_start, opus_period_end = self._get_opus_period_times(entries, now)

            # Opus usage is counted from first usage to first usage + 7 days (fixed period)
            opus_period_entries = self._filter_entries_by_period(entries, opus_period_start, opus_period_end)

            # Calculate usage for each metric
            session_usage = self._calculate_block_usage(session_entries)
            weekly_all_usage = self._calculate_block_usage(weekly_all_entries)
            weekly_opus_usage = self._calculate_block_usage(opus_period_entries, opus_only=True)

            # Calculate time remaining
            session_time_remaining = max(0, (session_end - now).total_seconds() / 60) if session_end else 0
            weekly_time_remaining = max(0, (week_end - now).total_seconds() / 60) if week_end else 0
            opus_time_remaining = max(0, (opus_period_end - now).total_seconds() / 60)

            # Calculate percentages
            session_percentage = self._calculate_percentage(
                session_usage['total_tokens'],
                plan_limits['session']['tokens']
            )
            weekly_all_percentage = self._calculate_percentage(
                weekly_all_usage['total_tokens'],
                plan_limits['weekly_all']['tokens']
            )
            weekly_opus_percentage = self._calculate_percentage(
                weekly_opus_usage['total_tokens'],
                plan_limits['weekly_opus']['tokens']
            ) if plan_limits['weekly_opus']['tokens'] > 0 else 0

            result = {
                'available': True,
                'plan_type': plan_type.value,
                'limits': plan_limits,
                'current_session': {
                    'start_time': session_start.isoformat() if session_start else now.isoformat(),
                    'end_time': session_end.isoformat() if session_end else now.isoformat(),
                    'time_remaining_minutes': session_time_remaining,
                    'usage': {
                        'input_tokens': session_usage['input_tokens'],
                        'output_tokens': session_usage['output_tokens'],
                        'cache_creation_tokens': session_usage['cache_creation_tokens'],
                        'cache_read_tokens': session_usage['cache_read_tokens'],
                        'total_tokens': session_usage['total_tokens'],
                    },
                    'limit_tokens': plan_limits['session']['tokens'],
                    'percentage_used': session_percentage,
                    'entries': session_usage['entry_count'],
                },
                'weekly_all': {
                    'start_time': week_start.isoformat() if week_start else now.isoformat(),
                    'end_time': week_end.isoformat() if week_end else now.isoformat(),
                    'time_remaining_minutes': weekly_time_remaining,
                    'usage': {
                        'input_tokens': weekly_all_usage['input_tokens'],
                        'output_tokens': weekly_all_usage['output_tokens'],
                        'cache_creation_tokens': weekly_all_usage['cache_creation_tokens'],
                        'cache_read_tokens': weekly_all_usage['cache_read_tokens'],
                        'total_tokens': weekly_all_usage['total_tokens'],
                    },
                    'limit_tokens': plan_limits['weekly_all']['tokens'],
                    'percentage_used': weekly_all_percentage,
                    'entries': weekly_all_usage['entry_count'],
                },
                'weekly_opus': {
                    'start_time': opus_period_start.isoformat(),
                    'end_time': opus_period_end.isoformat(),
                    'time_remaining_minutes': opus_time_remaining,
                    'usage': {
                        'input_tokens': weekly_opus_usage['input_tokens'],
                        'output_tokens': weekly_opus_usage['output_tokens'],
                        'cache_creation_tokens': weekly_opus_usage['cache_creation_tokens'],
                        'cache_read_tokens': weekly_opus_usage['cache_read_tokens'],
                        'total_tokens': weekly_opus_usage['total_tokens'],
                    },
                    'limit_tokens': plan_limits['weekly_opus']['tokens'],
                    'percentage_used': weekly_opus_percentage,
                    'entries': weekly_opus_usage['entry_count'],
                },
                'error': None
            }

            # Update cache
            self._update_cache(block_id, result)
            return result

        except Exception as e:
            logger.error(f"Error calculating usage: {e}", exc_info=True)
            return {
                'available': False,
                'error': f"Error calculating usage: {str(e)}"
            }

    def _calculate_percentage(self, used: int, limit: int) -> float:
        """Calculate percentage used, handling division by zero"""
        if limit <= 0:
            return 0.0
        percentage = (used / limit) * 100
        return min(round(percentage, 1), 100.0)

    def _build_empty_result(
        self,
        now: datetime,
        block_start: datetime,
        week_start: datetime,
        plan_type,
        plan_limits: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build result structure with zero usage"""
        block_end = block_start + timedelta(hours=BLOCK_DURATION_HOURS)
        week_end = week_start + timedelta(days=7)

        session_time_remaining = max(0, (block_end - now).total_seconds() / 60)
        weekly_time_remaining = max(0, (week_end - now).total_seconds() / 60)

        empty_usage = {
            'input_tokens': 0,
            'output_tokens': 0,
            'cache_creation_tokens': 0,
            'cache_read_tokens': 0,
            'total_tokens': 0,
        }

        return {
            'available': True,
            'plan_type': plan_type.value,
            'limits': plan_limits,
            'current_session': {
                'start_time': block_start.isoformat(),
                'end_time': block_end.isoformat(),
                'time_remaining_minutes': session_time_remaining,
                'usage': empty_usage.copy(),
                'limit_tokens': plan_limits['session']['tokens'],
                'percentage_used': 0.0,
                'entries': 0,
            },
            'weekly_all': {
                'start_time': week_start.isoformat(),
                'end_time': week_end.isoformat(),
                'time_remaining_minutes': weekly_time_remaining,
                'usage': empty_usage.copy(),
                'limit_tokens': plan_limits['weekly_all']['tokens'],
                'percentage_used': 0.0,
                'entries': 0,
            },
            'weekly_opus': {
                'start_time': week_start.isoformat(),
                'end_time': week_end.isoformat(),
                'time_remaining_minutes': weekly_time_remaining,
                'usage': empty_usage.copy(),
                'limit_tokens': plan_limits['weekly_opus']['tokens'],
                'percentage_used': 0.0,
                'entries': 0,
            },
            'error': None
        }
