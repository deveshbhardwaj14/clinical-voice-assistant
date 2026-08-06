/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    Badge,
    Card,
    CardHeader,
    ProgressBar,
    Tab,
    TabList,
    Text,
    makeStyles,
    tokens,
} from '@fluentui/react-components'
import { useState } from 'react'
import { Assessment, CriterionScore, Improvement, ImprovementEntry } from '../types'

interface Props {
  assessment: Assessment
}

const CRITERION_LABELS: Record<string, string> = {
  empathy: 'Empathy & Patient-Centred Tone',
  plain_language: 'Plain Language',
  active_listening: 'Active Listening',
  shared_decision_making: 'Shared Decision-Making',
  clarity_of_next_steps: 'Clarity of Next Steps',
  patient_education: 'Patient Education',
  check_for_understanding: 'Checking for Understanding',
  pronunciation_and_pacing: 'Pronunciation & Pacing',
}

function scoreColor(score: number, max: number): 'success' | 'warning' | 'danger' {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.8) return 'success'
  if (pct >= 0.5) return 'warning'
  return 'danger'
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    overflowY: 'auto',
  },
  scoreHeader: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusLarge,
    padding: tokens.spacingVerticalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: tokens.spacingHorizontalM,
  },
  scoreValue: {
    fontSize: '48px',
    fontWeight: 700,
    lineHeight: 1,
  },
  criterionRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    ':last-child': {
      borderBottom: 'none',
    },
  },
  criterionNameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  explanation: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
  },
  improvementCard: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalS,
  },
  strengthsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  strengthItem: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
  },
})

function isStructuredImprovement(entry: ImprovementEntry): entry is Improvement {
  return typeof entry === 'object' && 'recommendation' in entry
}

export function ProviderRubricPanel({ assessment }: Props) {
  const styles = useStyles()
  const [tab, setTab] = useState<'scores' | 'strengths' | 'improvements'>('scores')

  const ai = assessment.ai_assessment
  if (!ai) {
    return (
      <Text style={{ color: tokens.colorNeutralForeground3 }}>
        Provider rubric not available.
      </Text>
    )
  }

  const overallScore = ai.overall_score ?? 0
  const scaleMax = ai.scale_max ?? 100

  const criteriaScores = ai.criteria_scores ?? {}
  const criteriaMetadata = ai.criteria_metadata ?? {}

  return (
    <div className={styles.root}>
      <div className={styles.scoreHeader}>
        <Text size={300} weight="semibold" style={{ color: tokens.colorNeutralForeground2 }}>
          Provider Communication Score
        </Text>
        <div className={styles.scoreRow}>
          <Text className={styles.scoreValue}>{overallScore}</Text>
          <Text size={400} style={{ color: tokens.colorNeutralForeground3 }}>
            / {scaleMax}
          </Text>
          {ai.passed !== undefined && (
            <Badge color={ai.passed ? 'success' : 'danger'} appearance="filled">
              {ai.passed ? 'Meets Standard' : 'Needs Improvement'}
            </Badge>
          )}
        </div>
        <ProgressBar
          value={scaleMax > 0 ? overallScore / scaleMax : 0}
          color={scoreColor(overallScore, scaleMax)}
          thickness="large"
        />
      </div>

      <TabList
        selectedValue={tab}
        onTabSelect={(_, d) => setTab(d.value as typeof tab)}
      >
        <Tab value="scores">Rubric Scores</Tab>
        <Tab value="strengths">Strengths</Tab>
        <Tab value="improvements">Coaching Tips</Tab>
      </TabList>

      {tab === 'scores' && (
        <Card>
          {Object.entries(criteriaScores).length > 0 ? (
            Object.entries(criteriaScores).map(([key, criterion]) => {
              const label =
                criteriaMetadata[key]?.name ??
                CRITERION_LABELS[key] ??
                key.replace(/_/g, ' ')
              const c = criterion as CriterionScore
              const max = 5
              return (
                <div key={key} className={styles.criterionRow}>
                  <div className={styles.criterionNameRow}>
                    <Text weight="semibold">{label}</Text>
                    <Badge
                      color={scoreColor(c.score, max)}
                      appearance="filled"
                      size="medium"
                    >
                      {c.score} / {max}
                    </Badge>
                  </div>
                  <ProgressBar value={c.score / max} color={scoreColor(c.score, max)} />
                  {c.justification && (
                    <Text className={styles.explanation}>{c.justification}</Text>
                  )}
                </div>
              )
            })
          ) : (
            <Text style={{ color: tokens.colorNeutralForeground3 }}>
              No detailed criterion scores available.
            </Text>
          )}
        </Card>
      )}

      {tab === 'strengths' && (
        <Card>
          <CardHeader header={<Text weight="semibold">Communication Strengths</Text>} />
          {ai.strengths && ai.strengths.length > 0 ? (
            <div className={styles.strengthsList}>
              {ai.strengths.map((s, i) => (
                <div key={i} className={styles.strengthItem}>
                  <Badge color="success" shape="circular" size="small">
                    ✓
                  </Badge>
                  <Text>{s}</Text>
                </div>
              ))}
            </div>
          ) : (
            <Text style={{ color: tokens.colorNeutralForeground3 }}>
              No strengths recorded.
            </Text>
          )}
        </Card>
      )}

      {tab === 'improvements' && (
        <div>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalS, display: 'block' }}>
            Sorted by lowest score — highest coaching priority first.
          </Text>
          {ai.improvements && ai.improvements.length > 0 ? (
            ai.improvements.map((entry, i) => (
              <div key={i} className={styles.improvementCard}>
                {isStructuredImprovement(entry) ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
                      <Text weight="semibold">
                        {CRITERION_LABELS[entry.criterion_id ?? entry.criterion] ?? entry.criterion}
                      </Text>
                      <Badge color={scoreColor(entry.score, entry.max_score)} appearance="outline" size="small">
                        {entry.score} / {entry.max_score}
                      </Badge>
                    </div>
                    <Text>{entry.recommendation}</Text>
                  </>
                ) : (
                  <Text>{String(entry)}</Text>
                )}
              </div>
            ))
          ) : (
            <Text style={{ color: tokens.colorNeutralForeground3 }}>
              No coaching recommendations available.
            </Text>
          )}
        </div>
      )}
    </div>
  )
}
