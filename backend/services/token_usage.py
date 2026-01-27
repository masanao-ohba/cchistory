"""Token usage service - fetches usage data from Anthropic OAuth API"""
import logging
from typing import Dict, Any
from pathlib import Path

from .usage_calculator import UsageCalculator
from .anthropic_usage_service import get_anthropic_usage_service

logger = logging.getLogger(__name__)


class TokenUsageService:
    """
    Service for retrieving Claude Code token usage from Anthropic OAuth API.

    No fallback - if API fails, returns error.
    This ensures users are aware of any issues rather than silently showing incorrect data.
    """

    def __init__(self, projects_path: Path = None):
        """
        Initialize token usage service

        Args:
            projects_path: Path to Claude projects directory (defaults to ~/.claude/projects)
        """
        self.calculator = UsageCalculator(projects_path)
        self.anthropic_service = get_anthropic_usage_service()

    def invalidate_cache(self) -> None:
        """
        Invalidate all caches to force fresh data on next request.

        This invalidates:
        - UsageCalculator cache (JSONL-based usage data)
        - AnthropicUsageService cache (API-based usage data)
        """
        # Invalidate UsageCalculator cache
        self.calculator.invalidate_cache()

        # Invalidate AnthropicUsageService cache
        self.anthropic_service.invalidate_cache()

    async def get_current_usage(self) -> Dict[str, Any]:
        """Get current token usage statistics from Anthropic OAuth API

        Returns:
            Dict containing:
            - available: bool - whether data is available
            - source: str - always "anthropic_api"
            - current_session: Dict - 5-hour block data
            - weekly_all: Dict - weekly all models data
            - weekly_sonnet: Dict - weekly Sonnet data
            - anthropic_data: Dict - raw Anthropic API data
            - error: Optional[str] - error message if any
        """
        # Get JSONL-based calculation for token counts and time info
        jsonl_result = self.calculator.get_current_block_usage()

        if not jsonl_result.get('available'):
            return jsonl_result

        # Fetch Anthropic API data - NO FALLBACK
        anthropic_data = await self.anthropic_service.fetch_usage()

        if anthropic_data is None:
            logger.error("Anthropic API failed - no fallback available")
            return {
                'available': False,
                'error': "Failed to fetch usage data from Anthropic API. Check OAuth credentials in Keychain."
            }

        # Anthropic API succeeded - use its utilization values
        logger.info("Using Anthropic API data for usage percentages")

        # API returns utilization as percentage (e.g., 14.0 means 14%)
        five_hour_percentage = anthropic_data.five_hour.utilization
        seven_day_percentage = anthropic_data.seven_day.utilization

        # Update session data with Anthropic values
        jsonl_result['current_session']['anthropic_utilization'] = five_hour_percentage
        jsonl_result['current_session']['anthropic_resets_at'] = anthropic_data.five_hour.resets_at

        # Update weekly data with Anthropic values
        jsonl_result['weekly_all']['anthropic_utilization'] = seven_day_percentage
        jsonl_result['weekly_all']['anthropic_resets_at'] = anthropic_data.seven_day.resets_at

        # Sonnet uses same 7-day limit in Anthropic API
        jsonl_result['weekly_sonnet']['anthropic_utilization'] = seven_day_percentage
        jsonl_result['weekly_sonnet']['anthropic_resets_at'] = anthropic_data.seven_day.resets_at

        # Set source and include raw API data
        jsonl_result['source'] = 'anthropic_api'
        jsonl_result['anthropic_data'] = self.anthropic_service.to_dict(anthropic_data)

        logger.info(
            f"Anthropic usage: 5h={five_hour_percentage:.1f}%, 7d={seven_day_percentage:.1f}%"
        )

        return jsonl_result
