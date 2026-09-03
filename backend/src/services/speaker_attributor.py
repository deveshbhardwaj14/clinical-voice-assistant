# ---------------------------------------------------------------------------------------------
#  Copyright (c) Microsoft Corporation. All rights reserved.
#  Licensed under the MIT License. See LICENSE in the project root for license information.
# --------------------------------------------------------------------------------------------

"""Speaker attribution for a live doctor-patient recording.

Azure Voice Live's realtime transcription does not perform speaker diarization,
so each segment arrives with a generic ``user`` role. This service classifies a
segment as either the patient or the clinician using the prior turns as context.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI

from src.config import config

logger = logging.getLogger(__name__)

SPEAKER_ATTRIBUTION_RETRY_ATTEMPTS = 2
MAX_CONTEXT_TURNS = 8

_SYSTEM_PROMPT = (
    "You classify one utterance from a live clinical visit as either the patient "
    "or the clinician (doctor, nurse, or other provider). Use the prior turns as "
    "context. Cues for the clinician: medical terminology, ordering tests, giving "
    "instructions, asking clinical history questions. Cues for the patient: "
    "describing symptoms, personal history, feelings, or answering questions. "
    "Return only the JSON response requested."
)

_RESPONSE_FORMAT: Dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "speaker_attribution",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "speaker": {"type": "string", "enum": ["patient", "doctor"]},
                "confidence": {"type": "number"},
            },
            "required": ["speaker", "confidence"],
            "additionalProperties": False,
        },
    },
}


class SpeakerAttributor:
    """Classifies a live transcript segment as patient or clinician."""

    def __init__(self) -> None:
        self._client: Optional[AzureOpenAI] = self._build_client()

    def _build_client(self) -> Optional[AzureOpenAI]:
        endpoint = config.get("azure_openai_endpoint", "")
        if not endpoint:
            logger.warning("azure_openai_endpoint not configured; SpeakerAttributor disabled")
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

    def _build_user_prompt(self, text: str, context: List[Dict[str, str]]) -> str:
        recent = context[-MAX_CONTEXT_TURNS:]
        context_lines = "\n".join(f"- {turn.get('speaker', 'unknown')}: {turn.get('text', '')}" for turn in recent)
        return (
            "Prior turns (most recent last):\n"
            f"{context_lines or '(none)'}\n\n"
            "Classify the following new utterance:\n"
            f"{text}"
        )

    async def attribute(
        self, text: str, context: Optional[List[Dict[str, str]]] = None
    ) -> Optional[Dict[str, Any]]:
        """Return ``{speaker, confidence}`` for a single utterance, or ``None`` on failure."""
        if not text.strip():
            return None
        if not self._client:
            logger.error("SpeakerAttributor: OpenAI client not configured")
            return None

        client = self._client
        user_prompt = self._build_user_prompt(text, context or [])

        for attempt in range(1, SPEAKER_ATTRIBUTION_RETRY_ATTEMPTS + 1):
            try:
                result = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model=config["model_deployment_name"],
                        messages=[
                            {"role": "system", "content": _SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format=_RESPONSE_FORMAT,  # type: ignore[arg-type]
                        temperature=0.0,
                    ),
                )
                content = result.choices[0].message.content
                if content:
                    return json.loads(content)
                raise ValueError("Empty response from model")
            except Exception:
                if attempt >= SPEAKER_ATTRIBUTION_RETRY_ATTEMPTS:
                    logger.warning("SpeakerAttributor failed after %s attempts", attempt, exc_info=True)
                    return None
                logger.warning("SpeakerAttributor attempt %s failed; retrying", attempt, exc_info=True)
                await asyncio.sleep(0.5 * attempt)

        return None
