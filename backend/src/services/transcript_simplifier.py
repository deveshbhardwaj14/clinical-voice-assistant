# ---------------------------------------------------------------------------------------------
#  Copyright (c) Microsoft Corporation. All rights reserved.
#  Licensed under the MIT License. See LICENSE in the project root for license information.
# --------------------------------------------------------------------------------------------

"""Real-time transcript simplification and translation for patient-facing display."""

import asyncio
import logging
from typing import Optional

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI

from src.config import config

logger = logging.getLogger(__name__)

SIMPLIFY_RETRY_ATTEMPTS = 2

# Supported reading levels and their plain-language instructions
READING_LEVEL_INSTRUCTIONS: dict[str, str] = {
    "grade_5": "Rewrite at a 5th-grade reading level. Use short sentences and simple, everyday words.",
    "grade_8": "Rewrite at an 8th-grade reading level. Keep sentences clear and avoid jargon.",
    "plain": "Rewrite in plain language. Remove medical jargon and explain any necessary terms.",
}

_SYSTEM_PROMPT = (
    "You are a medical interpreter assistant. Your role is to take a spoken segment from a "
    "doctor-patient conversation and rewrite it so the patient can understand it easily. "
    "Preserve the meaning and intent. Do not add, remove, or invent medical facts. "
    "Return only the rewritten text with no additional commentary or formatting."
)


class TranscriptSimplifier:
    """Simplifies and optionally translates transcript segments for patient-facing display."""

    def __init__(self) -> None:
        self._client: Optional[AzureOpenAI] = self._build_client()

    def _build_client(self) -> Optional[AzureOpenAI]:
        endpoint = config.get("azure_openai_endpoint", "")
        if not endpoint:
            logger.warning("azure_openai_endpoint not configured; TranscriptSimplifier disabled")
            return None
        api_key = config.get("azure_openai_api_key", "")
        if api_key:
            return AzureOpenAI(
                api_version=config["api_version"],
                azure_endpoint=endpoint,
                api_key=api_key,
            )
        token_provider = get_bearer_token_provider(
            DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
        )
        return AzureOpenAI(
            api_version=config["api_version"],
            azure_endpoint=endpoint,
            azure_ad_token_provider=token_provider,
        )

    def _build_user_prompt(self, text: str, reading_level: str, target_language: str) -> str:
        level_instruction = READING_LEVEL_INSTRUCTIONS.get(reading_level, READING_LEVEL_INSTRUCTIONS["plain"])
        lang_instruction = (
            "" if target_language.lower() in ("en", "english", "en-us")
            else f" Then translate the simplified text into {target_language}."
        )
        return f"{level_instruction}{lang_instruction}\n\nText to simplify:\n{text}"

    async def simplify(
        self,
        text: str,
        reading_level: str = "plain",
        target_language: str = "en",
    ) -> str:
        """Return a simplified (and optionally translated) version of the given text."""
        if not self._client:
            return text

        client = self._client
        user_prompt = self._build_user_prompt(text, reading_level, target_language)

        for attempt in range(1, SIMPLIFY_RETRY_ATTEMPTS + 1):
            try:
                result = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model=config["model_deployment_name"],
                        messages=[
                            {"role": "system", "content": _SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                        max_tokens=512,
                        temperature=0.2,
                    ),
                )
                content = result.choices[0].message.content
                return content.strip() if content else text
            except Exception:
                if attempt >= SIMPLIFY_RETRY_ATTEMPTS:
                    logger.warning("TranscriptSimplifier failed after %s attempts; returning original", attempt)
                    return text
                logger.warning("TranscriptSimplifier attempt %s failed; retrying", attempt, exc_info=True)
                await asyncio.sleep(0.5 * attempt)

        return text
