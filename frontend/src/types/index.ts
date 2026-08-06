/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface Scenario {
  id: string
  name: string
  description: string
}

export interface CustomScenarioData {
  systemPrompt: string
}

export interface CustomScenario extends Scenario {
  is_custom: true
  scenarioData: CustomScenarioData
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface CriterionScore {
  score: number
  justification: string
  evidence?: string[]
}

/** Scored criterion with explanation (new format) or plain number (legacy stored data). */
export type ScoredCriterion = { score: number; explanation: string } | number

/** Structured improvement recommendation tied to a specific criterion. */
export interface Improvement {
  criterion: string
  criterion_id?: string
  score: number
  max_score: number
  recommendation: string
}

/** An improvement entry can be the new structured format or a legacy plain string. */
export type ImprovementEntry = Improvement | string

export interface Assessment {
  ai_assessment?: {
    speaking_tone_style?: {
      professional_tone: ScoredCriterion
      active_listening: ScoredCriterion
      engagement_quality: ScoredCriterion
      total: number
    }
    conversation_content?: {
      needs_assessment: ScoredCriterion
      value_proposition: ScoredCriterion
      objection_handling: ScoredCriterion
      total: number
    }
    criteria_scores?: Record<string, CriterionScore>
    overall_score: number
    passed?: boolean
    pass_threshold?: number
    scale_min?: number
    scale_max?: number
    criteria_metadata?: Record<
      string,
      {
        name: string
        description?: string
      }
    >
    strengths: string[]
    improvements: ImprovementEntry[]
    specific_feedback?: string
  }
  pronunciation_assessment?: {
    accuracy_score: number
    fluency_score: number
    completeness_score: number
    prosody_score?: number
    pronunciation_score: number
    words?: Array<{
      word: string
      accuracy: number
      error_type: string
    }>
  }
  diagnostics?: {
    audio_source?: string
    session_audio_bytes?: number
    request_audio_chunks?: number
    ai_assessment_available?: boolean
    pronunciation_assessment_available?: boolean
    scoring_error?: string | null
  }
}

export interface AvatarOption {
  value: string
  label: string
  isPhotoAvatar: boolean
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    value: 'audio-only',
    label: 'Audio only, no Live Voice Agent video',
    isPhotoAvatar: false,
  },
  {
    value: 'lisa-casual-sitting',
    label: 'Lisa (Casual Sitting)',
    isPhotoAvatar: false,
  },
  { value: 'riya', label: 'Riya (Photo)', isPhotoAvatar: true },
  { value: 'simone', label: 'Simone (Photo)', isPhotoAvatar: true },
]

export const DEFAULT_AVATAR = 'lisa-casual-sitting'

export interface ConversationSummary {
  id: string
  user_id: string
  scenario_id: string
  scenario_name?: string
  assessment?: Assessment | null
  metadata?: { user_name?: string; user_email?: string }
  status?: string
  created_at: string
  updated_at: string
}

export interface ConversationListResponse {
  conversations: ConversationSummary[]
  total: number
  limit: number
  offset: number
}

export interface ConversationDetailData {
  id: string
  user_id: string
  scenario_id: string
  transcript?: string
  messages: Array<{ role: string; content: string }>
  assessment?: Assessment | null
  status?: string
  metadata?: { user_name?: string; user_email?: string }
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Clinical Voice Assistant types
// ---------------------------------------------------------------------------

/** Supported reading levels for live transcript simplification. */
export type ReadingLevel = 'plain' | 'grade_5' | 'grade_8'

/** A single entry in the live patient-facing transcript. */
export interface SimplifiedTranscriptEntry {
  id: string
  speaker: 'doctor' | 'patient'
  /** Original text as captured from audio. */
  originalText: string
  /** Simplified (and optionally translated) text shown to the patient. */
  simplifiedText: string
  timestamp: Date
}

/** Post-visit patient summary returned by POST /api/analyze/patient-summary. */
export interface PatientSummary {
  visit_reason: string
  what_was_discussed: string[]
  diagnosis_or_findings: string
  medications: Array<{
    name: string
    purpose: string
    instructions: string
  }>
  next_steps: string[]
  follow_up: string
  questions_to_ask_next_time: string[]
}

/** Visit type options used in session setup. */
export interface VisitType {
  id: string
  name: string
  description: string
}

export const VISIT_TYPES: VisitType[] = [
  {
    id: 'general-consultation',
    name: 'General Consultation',
    description: 'Routine visit for general health concerns',
  },
  {
    id: 'follow-up',
    name: 'Follow-Up Visit',
    description: 'Post-treatment or post-surgery check-in',
  },
  {
    id: 'new-patient',
    name: 'New Patient Intake',
    description: 'First appointment with a new patient',
  },
  {
    id: 'specialist',
    name: 'Specialist Consultation',
    description: 'Referred specialist assessment',
  },
  {
    id: 'urgent-care',
    name: 'Urgent Care Visit',
    description: 'Unscheduled visit for an acute concern',
  },
]

/** Languages available for patient transcript and summary. */
export interface PatientLanguageOption {
  code: string
  label: string
}

export const PATIENT_LANGUAGES: PatientLanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'ko', label: 'Korean' },
  { code: 'ja', label: 'Japanese' },
]
