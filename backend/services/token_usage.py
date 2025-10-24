"""Token usage service - reads Claude project JSONL files directly"""
import logging
from typing import Dict, Any
from pathlib import Path

from .usage_calculator import UsageCalculator

logger = logging.getLogger(__name__)


class TokenUsageService:
    """Service for retrieving Claude Code token usage from project JSONL files"""

    def __init__(self, projects_path: Path = None):
        """
        Initialize token usage service

        Args:
            projects_path: Path to Claude projects directory (defaults to ~/.claude/projects)
        """
        self.calculator = UsageCalculator(projects_path)

    async def get_current_usage(self) -> Dict[str, Any]:
        """Get current token usage statistics

        Returns:
            Dict containing:
            - available: bool - whether data is available
            - current_block: Optional[Dict] - current 5-hour block data
            - error: Optional[str] - error message if any
        """
        return self.calculator.get_current_block_usage()
