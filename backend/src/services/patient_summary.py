# ---------------------------------------------------------------------------------------------
#  Copyright (c) Microsoft Corporation. All rights reserved.
#  Licensed under the MIT License. See LICENSE in the project root for license information.
# --------------------------------------------------------------------------------------------

"""Post-visit patient summary generation for the Clinical Voice Assistant."""

import asyncio
import json
import logging
from typing import Any, Dict, Optional

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI

from src.config import config

logger = logging.getLogger(__name__)

SUMMARY_RETRY_ATTEMPTS = 3

_SYSTEM_PROMPT = (
    "You are a compassionate medical communication assistant. "
    "Your job is to read a doctor-patient conversation and produce a patient-friendly visit summary. "
    "Use plain language (grade 5–6 reading level). Avoid medical jargon; explain any term you must use. "
    "Be warm, clear, and reassuring. Do not invent or infer facts not present in the transcript."
)

_RESPONSE_FORMAT: Dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "patient_visit_summary",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "visit_reason": {
                    "type": "string",
                    "description": "One sentence describing what the visit was about.",
                },
                "what_was_discussed": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Key topics the doctor and patient talked about.",
                },
                "diagnosis_or_findings": {
                    "type": "string",
                    "description": "What the doctor found or thinks is going on, in plain language.",
                },
                "medications": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "purpose": {"type": "string"},
                            "instructions": {"type": "string"},
                        },
                        "required": ["name", "purpose", "instructions"],
                        "additionalProperties": False,
                    },
                    "description": "Medications prescribed or changed, with plain-language instructions.",
                },
                "next_steps": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Actions the patient should take after the visit.",
                },
                "follow_up": {
                    "type": "string",
                    "description": "When and why the patient should return or contact the clinic.",
                },
                "questions_to_ask_next_time": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Suggested questions the patient could ask at the next visit.",
                },
            },
            "required": [
                "visit_reason",
                "what_was_discussed",
                "diagnosis_or_findings",
                "medications",
                "next_steps",
                "follow_up",
                "questions_to_ask_next_time",
            ],
            "additionalProperties": False,
        },
    },
}


class PatientSummaryGenerator:
    """Generates a structured, patient-friendly post-visit summary from a transcript."""

    def __init__(self) -> None:
        self._client: Optional[AzureOpenAI] = self._build_client()

    def _build_client(self) -> Optional[AzureOpenAI]:
        endpoint = config.get("azure_openai_endpoint", "")
        if not endpoint:
            logger.warning("azure_openai_endpoint not configured; PatientSummaryGenerator disabled")
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

    def _build_user_prompt(self, transcript: str, patient_language: str, visit_type: str) -> str:
        lang_note = (
            ""
            if patient_language.lower() in ("en", "english", "en-us")
            else f" Write the summary in {patient_language}."
        )
        return (
            f"Visit type: {visit_type}\n"
            f"Please create a patient-friendly visit summary.{lang_note}\n\n"
            f"TRANSCRIPT:\n{transcript}"
        )

    async def generate(
        self,
        transcript: str,
        patient_language: str = "en",
        visit_type: str = "General Consultation",
    ) -> Optional[Dict[str, Any]]:
        """Generate a structured patient summary from the full visit transcript."""
        if not self._client:
            logger.error("PatientSummaryGenerator: OpenAI client not configured")
            return None

        client = self._client
        user_prompt = self._build_user_prompt(transcript, patient_language, visit_type)

        for attempt in range(1, SUMMARY_RETRY_ATTEMPTS + 1):
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
                        temperature=0.3,
                    ),
                )
                content = result.choices[0].message.content
                if content:
                    return json.loads(content)
                raise ValueError("Empty response from model")
            except Exception:
                if attempt >= SUMMARY_RETRY_ATTEMPTS:
                    logger.exception("PatientSummaryGenerator failed after %s attempts", attempt)
                    return None
                logger.warning("PatientSummaryGenerator attempt %s failed; retrying", attempt, exc_info=True)
                await asyncio.sleep(0.75 * attempt)

        return None
