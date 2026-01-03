"""
Claude Code Token Usage Calculator
Reads project JSONL files from ~/.claude/projects and calculates usage metrics:
- Current 5-hour session usage (FIXED blocks matching ccusage)
  - Block boundaries in UTC: 00:00, 04:00, 09:00, 14:00, 19:00
  - Each block is 4-5 hours (00:00-04:00 is 4h, others are 5h)
  - Reset time = when current block ends (e.g., 14:00 UTC for 09:00-14:00 block)
- Weekly usage (all models)
- Weekly Sonnet usage

Based on official Claude Code behavior (fixed blocks, NOT rolling windows)
"""
import json
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from collections import defaultdict
from zoneinfo import ZoneInfo

from config import Config

logger = logging.getLogger(__name__)

# Claude Code uses FIXED 5-hour blocks (matches ccusage behavior)
# Block boundaries in UTC: 00:00, 04:00, 09:00, 14:00, 19:00
# Current time 10:50 EST (15:50 UTC) → in 14:00-19:00 UTC block (09:00-14:00 EST)
# NOT rolling windows from first message!
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
        """
        Parse project JSONL files and extract usage data from assistant messages

        Counts ALL projects in ~/.claude/projects directory to match Claude Code behavior.
        This includes main session files and all agent files (agent-*.jsonl).
        """
        if not self.projects_path.exists():
            logger.warning(f"Projects directory not found: {self.projects_path}")
            return []

        usage_entries = []

        try:
            # Get ALL project directories
            project_dirs = [d for d in self.projects_path.iterdir() if d.is_dir()]

            if not project_dirs:
                logger.warning("No project directories found")
                return []

            logger.info(f"Scanning {len(project_dirs)} projects for usage data")

            # Process ALL projects (not just the most recent)
            total_files = 0
            for project_dir in project_dirs:
                jsonl_files = list(project_dir.glob("*.jsonl"))
                if not jsonl_files:
                    continue

                total_files += len(jsonl_files)

                # Parse all JSONL files in this project
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

            logger.info(f"Scanned {total_files} files across {len(project_dirs)} projects")
            logger.info(f"Extracted {len(usage_entries)} usage entries from all projects")

        except Exception as e:
            logger.error(f"Error scanning project files: {e}")
            return []

        return usage_entries

    def _get_block_start_time(self, timestamp: datetime) -> datetime:
        """
        Calculate the start time of the 5-hour block containing the given timestamp

        Blocks are fixed at: 04:00, 09:00, 14:00, 19:00, 00:00 UTC
        These correspond to 00:00, 05:00, 10:00, 15:00, 20:00 EDT (UTC-4)
        In EST (UTC-5), these become: 23:00, 04:00, 09:00, 14:00, 19:00 EST

        Claude Code uses fixed UTC block boundaries, not timezone-aware boundaries.
        """
        # Convert timestamp to UTC
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        else:
            timestamp = timestamp.astimezone(timezone.utc)

        # Fixed block boundaries in UTC (corresponding to EDT boundaries)
        # 04:00, 09:00, 14:00, 19:00, 00:00 UTC
        hour = timestamp.hour

        # Determine which block this hour falls into
        if hour < 4:
            block_start_hour = 0
        elif hour < 9:
            block_start_hour = 4
        elif hour < 14:
            block_start_hour = 9
        elif hour < 19:
            block_start_hour = 14
        else:  # hour >= 19
            block_start_hour = 19

        # Create block start time in UTC
        block_start = timestamp.replace(
            hour=block_start_hour,
            minute=0,
            second=0,
            microsecond=0
        )

        # Convert to Eastern timezone for display
        return block_start.astimezone(CLAUDE_TIMEZONE)

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

    def _is_sonnet_model(self, usage_entry: Dict[str, Any]) -> bool:
        """
        Determine if the usage entry is from a Sonnet model

        Checks the 'model' field for 'sonnet' substring.
        Model examples:
        - claude-sonnet-4-5-20250929 (Sonnet)
        - claude-opus-4-1-20250805 (Not Sonnet)
        - claude-haiku-4-5-20251001 (Not Sonnet)
        """
        model = usage_entry.get('model', '').lower()
        return 'sonnet' in model

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

    def _get_session_entries_from_first_message(
        self,
        entries: List[Dict[str, Any]],
        now: datetime
    ) -> tuple[List[Dict[str, Any]], Optional[datetime], Optional[datetime]]:
        """
        Get entries for the current 5-hour session block.

        Claude Code uses FIXED 5-hour blocks (like ccusage), NOT rolling windows.
        Block boundaries in UTC: 00:00, 04:00, 09:00, 14:00, 19:00

        Logic:
        1. Convert current time to UTC
        2. Find which fixed block we're currently in
        3. Return all entries within that block

        Returns:
            Tuple of (session_entries, session_start, session_end)
        """
        # Convert now to UTC for block calculation
        now_utc = now.astimezone(timezone.utc)

        # Fixed block boundaries in UTC (matches ccusage)
        # Blocks: 00:00-04:00 (4h), 04:00-09:00 (5h), 09:00-14:00 (5h), 14:00-19:00 (5h), 19:00-00:00 (5h)
        block_starts_utc = [0, 4, 9, 14, 19]  # Hours in UTC

        # Find which block we're currently in
        current_hour_utc = now_utc.hour
        block_start_hour = None
        block_end_hour = None

        for i, start_hour in enumerate(block_starts_utc):
            end_hour = block_starts_utc[(i + 1) % len(block_starts_utc)]

            # Check if current hour falls in this block
            if start_hour < end_hour:
                # Normal case (doesn't wrap midnight)
                if start_hour <= current_hour_utc < end_hour:
                    block_start_hour = start_hour
                    block_end_hour = end_hour
                    break
            else:
                # Wraps around midnight (19:00-00:00 case)
                if current_hour_utc >= start_hour or current_hour_utc < end_hour:
                    block_start_hour = start_hour
                    block_end_hour = end_hour
                    break

        if block_start_hour is None:
            logger.warning(f"Could not determine current block for hour {current_hour_utc} UTC")
            return [], None, None

        # Calculate block start and end times
        # Use today's date at the block start hour
        session_start_utc = now_utc.replace(hour=block_start_hour, minute=0, second=0, microsecond=0)

        # Handle end hour (might wrap to next day)
        if block_end_hour > block_start_hour:
            session_end_utc = now_utc.replace(hour=block_end_hour, minute=0, second=0, microsecond=0)
        else:
            # Wraps to next day (e.g., 19:00 today to 00:00 tomorrow)
            session_end_utc = (now_utc + timedelta(days=1)).replace(hour=block_end_hour, minute=0, second=0, microsecond=0)

        # If session started "yesterday" (for blocks that wrap midnight)
        if now_utc < session_start_utc:
            session_start_utc = session_start_utc - timedelta(days=1)
            session_end_utc = session_end_utc - timedelta(days=1)

        # Convert back to Eastern Time for consistency
        session_start = session_start_utc.astimezone(CLAUDE_TIMEZONE)
        session_end = session_end_utc.astimezone(CLAUDE_TIMEZONE)

        logger.info(f"Fixed session block: {session_start.strftime('%Y-%m-%d %H:%M %Z')} to {session_end.strftime('%H:%M %Z')}")
        logger.info(f"Session window UTC: {session_start_utc.strftime('%Y-%m-%d %H:%M:%S')} to {session_end_utc.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"Current time UTC: {now_utc.strftime('%Y-%m-%d %H:%M:%S')} (hour: {now_utc.hour})")
        logger.info(f"Block hours: start={block_start_hour}, end={block_end_hour}")

        # Filter entries within this fixed block
        session_entries = []
        entry_timestamps = []  # For debugging

        for entry in entries:
            timestamp_str = entry.get('timestamp')
            if not timestamp_str:
                continue

            try:
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                timestamp_utc = timestamp.astimezone(timezone.utc)

                if session_start_utc <= timestamp_utc < session_end_utc:
                    session_entries.append(entry)
                    entry_timestamps.append(timestamp_utc)
            except (ValueError, TypeError):
                continue

        # Log first and last entry for debugging
        if entry_timestamps:
            entry_timestamps.sort()
            logger.info(f"Session entries: {len(session_entries)} total")
            logger.info(f"First entry: {entry_timestamps[0].strftime('%Y-%m-%d %H:%M:%S %Z')}")
            logger.info(f"Last entry:  {entry_timestamps[-1].strftime('%Y-%m-%d %H:%M:%S %Z')}")
        else:
            logger.info("No session entries found in current block")

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

        # Weekly window is exactly 7 days back from now
        # (NOT from first message, which would extend the window)
        week_start = seven_days_ago
        week_end = now

        # All recent_entries are already within the 7-day window
        weekly_entries = [entry for ts, entry in recent_entries]

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

        # Calculate total for subscription usage limits (NOT billing/cost, NOT API rate limits)
        # Reference: ccusage blocks command analysis - confirmed behavior
        # Subscription limits (44K/88K/220K per 5-hour session) count ONLY input + output
        # Cache tokens affect cost but NOT subscription usage limits
        usage['total_tokens'] = (
            usage['input_tokens'] +
            usage['output_tokens']
            # cache_creation_tokens excluded from subscription limits
            # cache_read_tokens excluded from subscription limits
        )

        return usage

    def get_current_block_usage(self) -> Dict[str, Any]:
        """
        Get comprehensive token usage data matching Claude Code's official status

        Returns three usage metrics:
        1. Current session (rolling 5-hour window from first message in last 5 hours)
        2. Current week (all models)
        3. Current week (Sonnet only)

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
            - weekly_sonnet: Dict[str, Any]
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

            # Calculate ROLLING 5-hour session window (matching Claude Code behavior)
            # Claude Code uses a rolling window from the first message in the last 5 hours
            session_entries, session_start, session_end = self._get_session_entries_from_first_message(entries, now)

            # Calculate session reset time (5 hours from first message)
            # session_end is first_message_time + 5 hours
            session_reset_time = session_end

            # Calculate fallback times for when session is inactive
            current_block_start = self._get_block_start_time(now)
            next_block_start = current_block_start + timedelta(hours=BLOCK_DURATION_HOURS)

            # For cache key, use session start time if available, otherwise use current block
            if session_start is not None:
                block_id = session_start.isoformat()
            else:
                # No session active - use fixed block for cache key
                block_id = current_block_start.isoformat()

            # Check cache validity
            if self._is_cache_valid(block_id):
                logger.info("Returning cached token usage data")
                return self._cache

            logger.info(f"Cache miss or invalid - recalculating token usage for rolling session window")

            # Use rolling session window for calculation
            # session_entries already filtered by _get_session_entries_from_first_message

            # Calculate ROLLING weekly entries (past 7 days from now)
            weekly_all_entries, week_start, week_end = self._get_rolling_weekly_entries(entries, now)

            # Sonnet only usage (changed from Opus only)
            # Filter for Sonnet model usage within rolling weekly window
            weekly_sonnet_entries = [e for e in weekly_all_entries if self._is_sonnet_model(e)]

            # Calculate usage for each metric
            session_usage = self._calculate_block_usage(session_entries)
            weekly_all_usage = self._calculate_block_usage(weekly_all_entries)
            weekly_sonnet_usage = self._calculate_block_usage(weekly_sonnet_entries)

            # Calculate time remaining
            # Session: time until reset (use next_block_start as fallback if no active session)
            if session_reset_time is not None:
                session_time_remaining = max(0, (session_reset_time - now).total_seconds() / 60)
            else:
                session_time_remaining = max(0, (next_block_start - now).total_seconds() / 60)
            # Weekly: time until rolling window shifts (continuously rolling, so show time to next week)
            weekly_time_remaining = max(0, (week_end + timedelta(days=7) - now).total_seconds() / 60) if week_end else 0

            # Calculate percentages (raw values)
            # Session limits are token-based - can calculate percentage
            session_percentage = self._calculate_percentage(
                session_usage['total_tokens'],
                plan_limits['session']['tokens']
            )

            # Weekly limits are hour-based, but we can estimate percentage
            # based on empirical token-to-hour conversion
            # For MAX 20x: ~240-480 hours Sonnet = approximately 4-8M tokens (middle: 6M)
            # This is a rough estimate to match Claude Code's percentage display

            # Estimated weekly token limits (empirical, based on observed usage patterns)
            estimated_weekly_limit_all = 4_200_000  # ~360 hours middle estimate
            estimated_weekly_limit_sonnet = 10_000_000  # Sonnet-specific limit (higher than all-models)

            weekly_all_percentage = self._calculate_percentage(
                weekly_all_usage['total_tokens'],
                estimated_weekly_limit_all
            )
            weekly_sonnet_percentage = self._calculate_percentage(
                weekly_sonnet_usage['total_tokens'],
                estimated_weekly_limit_sonnet
            )

            # Calculate corrected values (Claude Code estimated)
            # Apply correction factors to estimate Claude Code's internal optimized values
            correction_factors = Config.CORRECTION_FACTORS

            session_corrected_tokens = int(self._apply_correction_factor(
                session_usage['total_tokens'],
                correction_factors['session']
            ))
            session_corrected_percentage = self._apply_correction_factor(
                session_percentage,
                correction_factors['session']
            )

            weekly_all_corrected_tokens = int(self._apply_correction_factor(
                weekly_all_usage['total_tokens'],
                correction_factors['weekly_all']
            ))
            weekly_all_corrected_percentage = self._apply_correction_factor(
                weekly_all_percentage,
                correction_factors['weekly_all']
            )

            weekly_sonnet_corrected_tokens = int(self._apply_correction_factor(
                weekly_sonnet_usage['total_tokens'],
                correction_factors['weekly_sonnet']
            ))
            weekly_sonnet_corrected_percentage = self._apply_correction_factor(
                weekly_sonnet_percentage,
                correction_factors['weekly_sonnet']
            )

            result = {
                'available': True,
                'plan_type': plan_type.value,
                'limits': plan_limits,
                'current_session': {
                    'start_time': session_start.isoformat() if session_start else current_block_start.isoformat(),
                    'end_time': session_end.isoformat() if session_end else next_block_start.isoformat(),
                    'reset_time': session_reset_time.isoformat() if session_reset_time else next_block_start.isoformat(),
                    'time_remaining_minutes': session_time_remaining,
                    'usage': {
                        'input_tokens': session_usage['input_tokens'],
                        'output_tokens': session_usage['output_tokens'],
                        'cache_creation_tokens': session_usage['cache_creation_tokens'],
                        'cache_read_tokens': session_usage['cache_read_tokens'],
                        'total_tokens': session_usage['total_tokens'],
                    },
                    'limit_tokens': plan_limits['session']['tokens'],
                    'percentage_used': session_percentage,  # 後方互換性のため残す
                    'entries': session_usage['entry_count'],
                    # ハイブリッド表示: 生の値と補正値
                    'raw': {
                        'tokens': session_usage['total_tokens'],
                        'percentage': session_percentage,
                    },
                    'corrected': {
                        'tokens': session_corrected_tokens,
                        'percentage': session_corrected_percentage,
                        'factor': correction_factors['session'],
                    },
                },
                'weekly_all': {
                    'start_time': week_start.isoformat() if week_start else now.isoformat(),
                    'end_time': (week_end + timedelta(days=7)).isoformat() if week_end else now.isoformat(),
                    'time_remaining_minutes': weekly_time_remaining,
                    'usage': {
                        'input_tokens': weekly_all_usage['input_tokens'],
                        'output_tokens': weekly_all_usage['output_tokens'],
                        'cache_creation_tokens': weekly_all_usage['cache_creation_tokens'],
                        'cache_read_tokens': weekly_all_usage['cache_read_tokens'],
                        'total_tokens': weekly_all_usage['total_tokens'],
                    },
                    'limit_hours_sonnet': plan_limits['weekly_all']['hours_sonnet'],
                    'limit_hours_opus': plan_limits['weekly_all']['hours_opus'],
                    'limit_note': plan_limits['weekly_all']['note'],
                    'percentage_used': weekly_all_percentage,  # 後方互換性のため残す
                    'entries': weekly_all_usage['entry_count'],
                    # ハイブリッド表示: 生の値と補正値
                    'raw': {
                        'tokens': weekly_all_usage['total_tokens'],
                        'percentage': weekly_all_percentage,
                    },
                    'corrected': {
                        'tokens': weekly_all_corrected_tokens,
                        'percentage': weekly_all_corrected_percentage,
                        'factor': correction_factors['weekly_all'],
                    },
                },
                'weekly_sonnet': {
                    'start_time': week_start.isoformat() if week_start else now.isoformat(),
                    'end_time': (week_end + timedelta(days=7)).isoformat() if week_end else now.isoformat(),
                    'time_remaining_minutes': weekly_time_remaining,
                    'usage': {
                        'input_tokens': weekly_sonnet_usage['input_tokens'],
                        'output_tokens': weekly_sonnet_usage['output_tokens'],
                        'cache_creation_tokens': weekly_sonnet_usage['cache_creation_tokens'],
                        'cache_read_tokens': weekly_sonnet_usage['cache_read_tokens'],
                        'total_tokens': weekly_sonnet_usage['total_tokens'],
                    },
                    'limit_hours_sonnet': plan_limits['weekly_all']['hours_sonnet'],
                    'limit_hours_opus': plan_limits['weekly_all']['hours_opus'],
                    'limit_note': plan_limits['weekly_all']['note'],
                    'percentage_used': weekly_sonnet_percentage,  # 後方互換性のため残す
                    'entries': weekly_sonnet_usage['entry_count'],
                    # ハイブリッド表示: 生の値と補正値
                    'raw': {
                        'tokens': weekly_sonnet_usage['total_tokens'],
                        'percentage': weekly_sonnet_percentage,
                    },
                    'corrected': {
                        'tokens': weekly_sonnet_corrected_tokens,
                        'percentage': weekly_sonnet_corrected_percentage,
                        'factor': correction_factors['weekly_sonnet'],
                    },
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

    def _apply_correction_factor(self, value: float, factor: float) -> float:
        """
        Apply correction factor to convert raw value to Claude Code estimated value

        Args:
            value: Raw value (tokens or percentage)
            factor: Correction factor (e.g., 0.24 for session)

        Returns:
            Corrected value rounded to 1 decimal place
        """
        return round(value * factor, 1)

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
                'reset_time': block_end.isoformat(),
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
                'limit_hours_sonnet': plan_limits['weekly_all']['hours_sonnet'],
                'limit_hours_opus': plan_limits['weekly_all']['hours_opus'],
                'limit_note': plan_limits['weekly_all']['note'],
                'percentage_used': None,
                'entries': 0,
            },
            'weekly_sonnet': {
                'start_time': week_start.isoformat(),
                'end_time': week_end.isoformat(),
                'time_remaining_minutes': weekly_time_remaining,
                'usage': empty_usage.copy(),
                'limit_hours_sonnet': plan_limits['weekly_all']['hours_sonnet'],
                'limit_hours_opus': plan_limits['weekly_all']['hours_opus'],
                'limit_note': plan_limits['weekly_all']['note'],
                'percentage_used': None,
                'entries': 0,
            },
            'error': None
        }
