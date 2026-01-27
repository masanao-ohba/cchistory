"""
Anthropic OAuth Usage API Service

Fetches real-time usage data from Anthropic's OAuth API.
Supports two methods for OAuth token:
1. Environment variable: ANTHROPIC_OAUTH_TOKEN (preferred for Docker)
2. macOS Keychain: Automatic extraction (host-only)
"""
import asyncio
import logging
import os
import platform
import subprocess
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import httpx

logger = logging.getLogger(__name__)


@dataclass
class AnthropicUsageData:
    """Usage data for a single period (5-hour or 7-day)"""
    utilization: float  # 0.0 to 1.0 (or higher if over limit)
    resets_at: str      # ISO timestamp


@dataclass
class AnthropicUsageResponse:
    """Response from Anthropic OAuth Usage API"""
    five_hour: AnthropicUsageData
    seven_day: AnthropicUsageData


class AnthropicUsageService:
    """
    Service for fetching real-time usage data from Anthropic OAuth API.

    This service:
    - Retrieves OAuth token from macOS Keychain
    - Fetches usage data from Anthropic API
    - Caches results with 60-second TTL
    - Provides fallback-safe interface (returns None on any error)

    Only works on macOS with Claude Code installed.
    """

    CACHE_TTL = 60  # seconds
    API_TIMEOUT = 3.0  # seconds
    API_URL = "https://api.anthropic.com/api/oauth/usage"
    KEYCHAIN_SERVICE = "Claude Code-credentials"

    def __init__(self):
        self._cache: Optional[AnthropicUsageResponse] = None
        self._cache_timestamp: Optional[datetime] = None
        self._is_macos = platform.system() == "Darwin"

    def _is_cache_valid(self) -> bool:
        """Check if cached data is still valid"""
        if self._cache is None or self._cache_timestamp is None:
            return False

        now = datetime.now(timezone.utc)
        age_seconds = (now - self._cache_timestamp).total_seconds()

        return age_seconds < self.CACHE_TTL

    def _update_cache(self, data: AnthropicUsageResponse) -> None:
        """Update cache with new data"""
        self._cache = data
        self._cache_timestamp = datetime.now(timezone.utc)
        logger.info("Updated Anthropic usage cache")

    def invalidate_cache(self) -> None:
        """Invalidate the cache to force a fresh fetch on next request"""
        self._cache = None
        self._cache_timestamp = None
        logger.info("Anthropic usage cache invalidated")

    async def get_oauth_token(self) -> Optional[str]:
        """
        Retrieve OAuth token from file, environment variable, or macOS Keychain.

        Priority:
        1. Token file: /app/secrets/oauth-token (auto-refreshed by host)
        2. ANTHROPIC_OAUTH_TOKEN environment variable
        3. macOS Keychain (host-only)

        Returns:
            OAuth token string or None if not available
        """
        # First, check token file (preferred for Docker - supports token refresh)
        token_file_paths = [
            '/secrets/oauth-token',
            '/tmp/anthropic-oauth-token',
        ]
        for token_path in token_file_paths:
            try:
                with open(token_path, 'r') as f:
                    file_token = f.read().strip()
                    if file_token:
                        logger.info(f"Using OAuth token from file: {token_path}")
                        return file_token
            except (FileNotFoundError, PermissionError):
                pass

        # Second, check environment variable
        env_token = os.environ.get('ANTHROPIC_OAUTH_TOKEN')
        if env_token:
            logger.info("Using OAuth token from environment variable")
            return env_token

        # Fall back to Keychain access (host macOS only)
        if not self._is_macos:
            logger.error("No OAuth token available (no token file, env var, or Keychain access)")
            return None

        try:
            # Run security command to get credentials from Keychain
            logger.info(f"Accessing Keychain service: {self.KEYCHAIN_SERVICE}")
            result = await asyncio.to_thread(
                subprocess.run,
                [
                    'security', 'find-generic-password',
                    '-s', self.KEYCHAIN_SERVICE,
                    '-w'  # Print password only
                ],
                capture_output=True,
                text=True,
                timeout=5.0
            )

            if result.returncode != 0:
                logger.error(f"Keychain access failed (code {result.returncode}): {result.stderr.strip()}")
                return None

            # Parse the JSON credentials
            credentials_json = result.stdout.strip()
            if not credentials_json:
                logger.error("Empty credentials from Keychain")
                return None

            logger.info(f"Keychain credentials length: {len(credentials_json)}")
            credentials = json.loads(credentials_json)
            logger.info(f"Credential keys: {list(credentials.keys())}")

            # Token is stored under claudeAiOauth.accessToken
            oauth_data = credentials.get('claudeAiOauth', {})
            if not oauth_data:
                logger.error("No claudeAiOauth in credentials")
                return None

            logger.info(f"claudeAiOauth keys: {list(oauth_data.keys())}")
            access_token = oauth_data.get('accessToken')

            if not access_token:
                logger.error("No accessToken in claudeAiOauth credentials")
                return None

            logger.info(f"Successfully retrieved OAuth token (length: {len(access_token)})")
            return access_token

        except subprocess.TimeoutExpired:
            logger.warning("Keychain access timed out")
            return None
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse Keychain credentials: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error accessing Keychain: {e}")
            return None

    async def fetch_usage(self) -> Optional[AnthropicUsageResponse]:
        """
        Fetch usage data from Anthropic OAuth API.

        Returns:
            AnthropicUsageResponse or None if not available
        """
        # Check cache first
        if self._is_cache_valid():
            logger.info("Returning cached Anthropic usage data")
            return self._cache

        logger.info("Fetching fresh usage data from Anthropic API...")

        # Get OAuth token
        token = await self.get_oauth_token()
        if not token:
            logger.error("Failed to get OAuth token - cannot fetch usage data")
            return None

        logger.info("OAuth token obtained, calling Anthropic API...")

        try:
            async with httpx.AsyncClient(timeout=self.API_TIMEOUT) as client:
                response = await client.get(
                    self.API_URL,
                    headers={
                        'Authorization': f'Bearer {token}',
                        'anthropic-beta': 'oauth-2025-04-20'
                    }
                )

                if response.status_code != 200:
                    logger.warning(f"Anthropic API returned status {response.status_code}")
                    return None

                data = response.json()

                # Parse response
                # Expected format:
                # {
                #   "five_hour": {"utilization": 14.0, "resets_at": "2025-01-24T19:00:00Z"},
                #   "seven_day": {"utilization": 31.0, "resets_at": "2025-01-27T05:00:00Z"}
                # }
                five_hour_data = data.get('five_hour', {})
                seven_day_data = data.get('seven_day', {})

                result = AnthropicUsageResponse(
                    five_hour=AnthropicUsageData(
                        utilization=five_hour_data.get('utilization', 0.0),
                        resets_at=five_hour_data.get('resets_at', '')
                    ),
                    seven_day=AnthropicUsageData(
                        utilization=seven_day_data.get('utilization', 0.0),
                        resets_at=seven_day_data.get('resets_at', '')
                    )
                )

                # Update cache
                self._update_cache(result)

                logger.info(
                    f"Fetched Anthropic usage: 5h={result.five_hour.utilization:.1f}%, "
                    f"7d={result.seven_day.utilization:.1f}%"
                )

                return result

        except httpx.TimeoutException:
            logger.warning("Anthropic API request timed out")
            return None
        except httpx.RequestError as e:
            logger.warning(f"Anthropic API request error: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error fetching Anthropic usage: {e}")
            return None

    def to_dict(self, data: AnthropicUsageResponse) -> Dict[str, Any]:
        """Convert AnthropicUsageResponse to dictionary for JSON serialization"""
        return {
            'five_hour': {
                'utilization': data.five_hour.utilization,
                'resets_at': data.five_hour.resets_at
            },
            'seven_day': {
                'utilization': data.seven_day.utilization,
                'resets_at': data.seven_day.resets_at
            }
        }


# Singleton instance
_service: Optional[AnthropicUsageService] = None


def get_anthropic_usage_service() -> AnthropicUsageService:
    """Get or create singleton AnthropicUsageService instance"""
    global _service
    if _service is None:
        _service = AnthropicUsageService()
    return _service
