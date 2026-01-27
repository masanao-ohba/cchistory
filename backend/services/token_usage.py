"""Token usage service - fetches usage data from Anthropic OAuth API only (fast mode)"""
import logging
from typing import Dict, Any
from pathlib import Path

from .anthropic_usage_service import get_anthropic_usage_service

logger = logging.getLogger(__name__)


class TokenUsageService:
    """
    Service for retrieving Claude Code token usage from Anthropic OAuth API only.

    This is the fast mode - no JSONL parsing, only API data.
    Returns utilization percentages and reset times (no token breakdowns).
    """

    def __init__(self, projects_path: Path = None):
        """
        Initialize token usage service

        Args:
            projects_path: Ignored in fast mode (kept for backward compatibility)
        """
        self.anthropic_service = get_anthropic_usage_service()

    def invalidate_cache(self) -> None:
        """
        Invalidate cache to force fresh data on next request.
        """
        self.anthropic_service.invalidate_cache()

    async def get_current_usage(self) -> Dict[str, Any]:
        """Get current token usage statistics from Anthropic OAuth API only

        Returns:
            Dict containing:
            - available: bool - whether data is available
            - source: str - always "anthropic_api"
            - current_session: Dict - 5-hour utilization and reset time
            - weekly: Dict - 7-day utilization and reset time
            - anthropic_data: Dict - raw Anthropic API data
            - error: Optional[str] - error message if any
        """
        # Fetch Anthropic API data
        anthropic_data = await self.anthropic_service.fetch_usage()

        if anthropic_data is None:
            logger.error("Anthropic API failed")
            return {
                'available': False,
                'error': "Failed to fetch usage data from Anthropic API. Check OAuth credentials in Keychain."
            }

        logger.info("Fetched usage data from Anthropic API")

        # API returns utilization as percentage (e.g., 14.0 means 14%)
        five_hour_percentage = anthropic_data.five_hour.utilization
        seven_day_percentage = anthropic_data.seven_day.utilization

        result = {
            'available': True,
            'source': 'anthropic_api',
            'current_session': {
                'utilization': five_hour_percentage,
                'resets_at': anthropic_data.five_hour.resets_at,
            },
            'weekly': {
                'utilization': seven_day_percentage,
                'resets_at': anthropic_data.seven_day.resets_at,
            },
            'anthropic_data': self.anthropic_service.to_dict(anthropic_data),
            'error': None,
        }

        logger.info(
            f"Anthropic usage: 5h={five_hour_percentage:.1f}%, 7d={seven_day_percentage:.1f}%"
        )

        return result
