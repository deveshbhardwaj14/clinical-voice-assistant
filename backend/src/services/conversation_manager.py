# ---------------------------------------------------------------------------------------------
#  Copyright (c) Microsoft Corporation. All rights reserved.
#  Licensed under the MIT License. See LICENSE in the project root for license information.
# --------------------------------------------------------------------------------------------

"""Manages conversation persistence and rubric loading for evaluation."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential

from src.config import config

logger = logging.getLogger(__name__)

# Constants
UUID_SHORT_LENGTH = 8

# Built-in rubric for the general patient-doctor visit, aligned with the
# Special Olympics MedBuddy IDD-focused clinician feedback guidance. Used when
# no rubric is seeded in Cosmos so the provider panel always has real criteria.
DEFAULT_MEDBUDDY_RUBRIC: Dict[str, Any] = {
    "rubricId": "medbuddy-default-idd",
    "appliesTo": {"scenarioIds": ["general-patient-visit"]},
    "scoring": {"scale": "1-5", "passThreshold": 3.5},
    "criteria": [
        {
            "criterionId": "empathy",
            "name": "Empathy & Compassion",
            "description": (
                "Warm, patient-centred tone; acknowledges emotions and lived experience without "
                "dismissing concerns."
            ),
        },
        {
            "criterionId": "plain_language",
            "name": "Plain Language & Health Literacy",
            "description": (
                "Avoids jargon; explains diagnoses, tests, and treatments in accessible language "
                "the patient can act on."
            ),
        },
        {
            "criterionId": "active_listening",
            "name": "Active Listening",
            "description": (
                "Lets the patient speak, reflects back what they said, and follows up on their "
                "own words instead of switching topics."
            ),
        },
        {
            "criterionId": "non_patronizing_tone",
            "name": "Respectful, Non-Patronizing Tone",
            "description": (
                "Addresses the patient directly (not only the caregiver), uses age-appropriate "
                "language, and does not talk down to the patient."
            ),
        },
        {
            "criterionId": "shared_decision_making",
            "name": "Shared Decision-Making",
            "description": (
                "Offers options, invites preferences, and reaches a plan together with the "
                "patient and any support person present."
            ),
        },
        {
            "criterionId": "check_for_understanding",
            "name": "Checking for Understanding",
            "description": (
                "Uses teach-back or open questions to confirm the patient understood the plan, "
                "medications, and follow-up."
            ),
        },
        {
            "criterionId": "clarity_of_next_steps",
            "name": "Clarity of Next Steps",
            "description": (
                "Concrete, memorable next steps for medications, appointments, and warning "
                "signs to watch for."
            ),
        },
    ],
}


class ConversationManager:
    """Loads evaluation rubrics from Cosmos DB and persists conversation records with evaluations."""

    def __init__(self):
        """Initialize the conversation manager."""
        self.cosmos_client = self._initialize_cosmos_client()
        self.rubrics: Dict[str, Any] = {}
        self._load_rubrics()

    def _initialize_cosmos_client(self) -> Optional[CosmosClient]:
        """Initialize Cosmos client using Entra ID (DefaultAzureCredential)."""
        endpoint = config.get("cosmos_endpoint", "")
        if not endpoint:
            logger.warning("COSMOS endpoint not configured; conversation persistence disabled")
            return None

        try:
            return CosmosClient(endpoint, credential=DefaultAzureCredential())
        except Exception as error:
            logger.error("Failed to initialize Cosmos client for conversations: %s", error)
            return None

    def _load_rubrics(self) -> None:
        """Load evaluation rubrics from Cosmos DB and index by scenarioId."""
        if not self.cosmos_client:
            return

        database_name = config.get("cosmos_database_name", "")
        container_name = config.get("cosmos_rubrics_container", "rubrics")
        if not database_name:
            logger.warning("COSMOS database name not configured; rubrics not loaded")
            return

        try:
            database = self.cosmos_client.get_database_client(database_name)
            container = database.get_container_client(container_name)

            for item in container.read_all_items():
                rubric_id = item.get("rubricId", "")
                applies_to = item.get("appliesTo", {})
                scenario_ids = applies_to.get("scenarioIds", [])

                for sid in scenario_ids:
                    self.rubrics[str(sid)] = item
                    logger.info("Loaded rubric '%s' for scenario '%s'", rubric_id, sid)

                if not scenario_ids:
                    self.rubrics[rubric_id] = item
                    logger.info("Loaded rubric '%s' (unbound)", rubric_id)

            logger.info("Total rubrics loaded: %s", len(self.rubrics))
        except Exception as error:
            logger.error("Failed to load rubrics from Cosmos: %s", error)

    def get_rubric_for_scenario(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        """Return the evaluation rubric applicable to a given scenario, if any."""
        seeded = self.rubrics.get(scenario_id)
        if seeded:
            return seeded
        if scenario_id in DEFAULT_MEDBUDDY_RUBRIC["appliesTo"]["scenarioIds"]:
            return DEFAULT_MEDBUDDY_RUBRIC
        return None

    def reload_rubrics(self) -> None:
        """Clear and reload all rubrics from Cosmos after an admin write.

        Reloading wholesale (rather than patching individual bindings) keeps the
        ``scenarioId -> rubric`` index consistent when a rubric's
        ``appliesTo.scenarioIds`` list changes, without requiring a pod restart.
        """
        self.rubrics = {}
        self._load_rubrics()

    def save_conversation(
        self,
        scenario_id: str,
        transcript: str,
        conversation_messages: Optional[List[Dict[str, Any]]] = None,
        evaluation: Optional[Dict[str, Any]] = None,
        pronunciation: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Persist a conversation record with its evaluation results to Cosmos DB.

        Returns:
            The conversationId of the saved record, or None on failure.
        """
        if not self.cosmos_client:
            logger.warning("Cosmos client unavailable; conversation not saved")
            return None

        database_name = config.get("cosmos_database_name", "")
        container_name = config.get("cosmos_conversations_container", "conversations")
        if not database_name:
            logger.warning("COSMOS database name not configured; conversation not saved")
            return None

        conversation_id = f"conv-{uuid.uuid4().hex[:UUID_SHORT_LENGTH]}"
        now = datetime.now(timezone.utc).isoformat()

        rubric = self.get_rubric_for_scenario(scenario_id)

        structured_transcript = self._normalize_transcript_messages(conversation_messages, transcript)

        record: Dict[str, Any] = {
            "id": conversation_id,
            "conversationId": conversation_id,
            "scenarioId": scenario_id,
            "transcript": structured_transcript,
            "transcriptText": transcript,
            "evaluation": evaluation,
            "pronunciationAssessment": pronunciation,
            "rubricId": rubric.get("rubricId") if rubric else None,
            "createdAt": now,
        }

        try:
            database = self.cosmos_client.get_database_client(database_name)
            container = database.get_container_client(container_name)
            container.create_item(record)
            logger.info("Saved conversation %s for scenario %s", conversation_id, scenario_id)
            return conversation_id
        except Exception as error:
            logger.error("Failed to save conversation: %s", error)
            return None

    def _normalize_transcript_messages(
        self,
        conversation_messages: Optional[List[Dict[str, Any]]],
        transcript: str,
    ) -> List[Dict[str, Any]]:
        """Return ordered transcript turns suitable for downstream processing.

        Preferred source is `conversation_messages` from the client payload. If unavailable,
        fallback to parsing the legacy transcript string.
        """
        normalized: List[Dict[str, Any]] = []

        if conversation_messages:
            for message in conversation_messages:
                if not isinstance(message, dict):
                    continue

                role_raw = str(message.get("role", "")).strip().lower()
                content = str(message.get("content", "")).strip()
                if not content:
                    continue

                role = "assistant" if role_raw == "agent" else role_raw
                if role not in {"user", "assistant", "system", "tool"}:
                    role = "unknown"

                normalized.append(
                    {
                        "order": len(normalized) + 1,
                        "role": role,
                        "content": content,
                    }
                )

            if normalized:
                return normalized

        for line in (transcript or "").splitlines():
            line = line.strip()
            if not line:
                continue

            prefix, separator, content = line.partition(":")
            if not separator:
                role = "unknown"
                message_content = line
            else:
                role_raw = prefix.strip().lower()
                role = "assistant" if role_raw == "agent" else role_raw
                if role not in {"user", "assistant", "system", "tool"}:
                    role = "unknown"
                message_content = content.strip()

            if not message_content:
                continue

            normalized.append(
                {
                    "order": len(normalized) + 1,
                    "role": role,
                    "content": message_content,
                }
            )

        return normalized

    def create_conversation_record(
        self,
        scenario_id: str,
        conversation_messages: Optional[List[Dict[str, Any]]] = None,
    ) -> Optional[str]:
        """Create an in-progress conversation record when a session starts.

        Returns:
            The conversationId, or None on failure.
        """
        if not self.cosmos_client:
            logger.warning("Cosmos client unavailable; conversation not created")
            return None

        database_name = config.get("cosmos_database_name", "")
        container_name = config.get("cosmos_conversations_container", "conversations")
        if not database_name:
            logger.warning("COSMOS database name not configured; conversation not created")
            return None

        conversation_id = f"conv-{uuid.uuid4().hex[:UUID_SHORT_LENGTH]}"
        now = datetime.now(timezone.utc).isoformat()

        rubric = self.get_rubric_for_scenario(scenario_id)
        structured_transcript = self._normalize_transcript_messages(conversation_messages, "")

        record: Dict[str, Any] = {
            "id": conversation_id,
            "conversationId": conversation_id,
            "scenarioId": scenario_id,
            "transcript": structured_transcript,
            "transcriptText": "",
            "status": "in_progress",
            "evaluation": None,
            "pronunciationAssessment": None,
            "rubricId": rubric.get("rubricId") if rubric else None,
            "createdAt": now,
            "updatedAt": now,
        }

        try:
            database = self.cosmos_client.get_database_client(database_name)
            container = database.get_container_client(container_name)
            container.create_item(record)
            logger.info("Created in-progress conversation %s for scenario %s", conversation_id, scenario_id)
            return conversation_id
        except Exception as error:
            logger.error("Failed to create conversation record: %s", error)
            return None

    def update_conversation_messages(
        self,
        conversation_id: str,
        conversation_messages: List[Dict[str, Any]],
        transcript_text: str = "",
    ) -> bool:
        """Update messages on an existing in-progress conversation.

        Returns:
            True on success, False on failure.
        """
        if not self.cosmos_client:
            return False

        database_name = config.get("cosmos_database_name", "")
        container_name = config.get("cosmos_conversations_container", "conversations")
        if not database_name:
            return False

        try:
            database = self.cosmos_client.get_database_client(database_name)
            container = database.get_container_client(container_name)
            item = container.read_item(item=conversation_id, partition_key=conversation_id)

            structured = self._normalize_transcript_messages(conversation_messages, transcript_text)
            item["transcript"] = structured
            item["transcriptText"] = transcript_text
            item["updatedAt"] = datetime.now(timezone.utc).isoformat()

            container.replace_item(item=conversation_id, body=item)
            logger.info("Updated messages for conversation %s", conversation_id)
            return True
        except Exception as error:
            logger.error("Failed to update conversation %s: %s", conversation_id, error)
            return False

    def update_conversation_with_assessment(
        self,
        conversation_id: str,
        transcript_text: str,
        conversation_messages: List[Dict[str, Any]],
        evaluation: Optional[Dict[str, Any]] = None,
        pronunciation: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Update an existing conversation with final assessment results.

        Returns:
            True on success, False on failure.
        """
        if not self.cosmos_client:
            return False

        database_name = config.get("cosmos_database_name", "")
        container_name = config.get("cosmos_conversations_container", "conversations")
        if not database_name:
            return False

        try:
            database = self.cosmos_client.get_database_client(database_name)
            container = database.get_container_client(container_name)
            item = container.read_item(item=conversation_id, partition_key=conversation_id)

            structured = self._normalize_transcript_messages(conversation_messages, transcript_text)
            item["transcript"] = structured
            item["transcriptText"] = transcript_text
            item["evaluation"] = evaluation
            item["pronunciationAssessment"] = pronunciation
            item["status"] = "analyzed"
            item["updatedAt"] = datetime.now(timezone.utc).isoformat()

            container.replace_item(item=conversation_id, body=item)
            logger.info("Updated conversation %s with assessment", conversation_id)
            return True
        except Exception as error:
            logger.error("Failed to update conversation %s with assessment: %s", conversation_id, error)
            return False

    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a single conversation by its ID."""
        if not self.cosmos_client:
            return None

        database_name = config.get("cosmos_database_name", "")
        container_name = config.get("cosmos_conversations_container", "conversations")
        if not database_name:
            return None

        try:
            database = self.cosmos_client.get_database_client(database_name)
            container = database.get_container_client(container_name)
            return container.read_item(item=conversation_id, partition_key=conversation_id)
        except Exception as error:
            logger.error("Failed to read conversation %s: %s", conversation_id, error)
            return None

    def list_conversations(self, scenario_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List conversations, optionally filtered by scenario ID.

        Returns lightweight summaries (no transcript body).
        """
        if not self.cosmos_client:
            return []

        database_name = config.get("cosmos_database_name", "")
        container_name = config.get("cosmos_conversations_container", "conversations")
        if not database_name:
            return []

        try:
            database = self.cosmos_client.get_database_client(database_name)
            container = database.get_container_client(container_name)

            if scenario_id:
                query = (
                    "SELECT c.id, c.conversationId, c.scenarioId, c.rubricId, c.createdAt, "
                    "c.evaluation.overall_score AS overallScore "
                    "FROM c WHERE c.scenarioId = @sid ORDER BY c.createdAt DESC"
                )
                params: List[Dict[str, Any]] = [{"name": "@sid", "value": scenario_id}]
                items = list(container.query_items(query=query, parameters=params, enable_cross_partition_query=False))
            else:
                query = (
                    "SELECT c.id, c.conversationId, c.scenarioId, c.rubricId, c.createdAt, "
                    "c.evaluation.overall_score AS overallScore "
                    "FROM c ORDER BY c.createdAt DESC"
                )
                items = list(container.query_items(query=query, enable_cross_partition_query=True))

            return items
        except Exception as error:
            logger.error("Failed to list conversations: %s", error)
            return []
