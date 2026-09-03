/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  Button,
  Text,
  makeStyles,
  tokens
} from '@fluentui/react-components'
import { History24Regular, People24Regular } from '@fluentui/react-icons'
import { Scenario } from '../types'

const useStyles = makeStyles({
  header: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXS,
    textAlign: 'center',
    paddingTop: tokens.spacingVerticalXS,
  },
  logo: {
    width: '72px',
    height: 'auto',
    filter: 'drop-shadow(0 8px 24px rgba(29, 91, 159, 0.12))',
  },
  title: {
    color: '#1d5b9f',
  },
  subtitle: {
    color: '#4b5d6f',
    maxWidth: '420px',
    textAlign: 'center',
  },
  visitDateTime: {
    marginTop: tokens.spacingVerticalXS,
    color: '#1d5b9f',
    fontWeight: 600,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalM,
    width: '100%',
    marginTop: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalM,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    textAlign: 'left',
  },
  input: {
    width: '100%',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    fontSize: '14px',
    lineHeight: '20px',
    color: tokens.colorNeutralForeground1,
    outline: 'none',
    boxSizing: 'border-box',
  },
  consentRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
    textAlign: 'left',
    marginTop: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalM,
    color: '#3b4a5d',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    marginTop: '2px',
    accentColor: '#1d5b9f',
  },
  scenarioCard: {
    width: '100%',
    padding: tokens.spacingVerticalL,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    boxShadow: tokens.shadow8,
  },
  actions: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: tokens.spacingVerticalM,
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  practiceActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  visitTypeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalM,
    width: '100%',
    marginTop: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalM,
  },
  visitTypeCard: {
    cursor: 'pointer',
    width: '100%',
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    textAlign: 'center',
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: tokens.shadow8,
    },
  },
  selectedVisitType: {
    backgroundColor: '#e8f1ff',
    boxShadow: '0 0 0 1px #1d5b9f inset',
  },
})

interface Props {
  scenarios: Scenario[]
  selectedScenario: string | null
  onSelect: (id: string) => void
  onStart: (visitType: string) => void
  isAuthenticated?: boolean
  onNavigateToConversations?: () => void
  isTrainer?: boolean
  onNavigateToAllPractices?: () => void
  appName?: string
  selectedVisitType?: string
  onVisitTypeChange?: (visitType: string) => void
  visitDateTime?: string
  patientName?: string
  patientId?: string
  consentConfirmed?: boolean
  onPatientNameChange?: (value: string) => void
  onPatientIdChange?: (value: string) => void
  onConsentChange?: (checked: boolean) => void
  startVisitError?: string | null
}

export function ScenarioList({
  scenarios,
  selectedScenario,
  onSelect,
  onStart,
  isAuthenticated,
  onNavigateToConversations,
  isTrainer,
  onNavigateToAllPractices,
  appName,
  selectedVisitType = 'new-visit',
  onVisitTypeChange,
  visitDateTime,
  patientName = '',
  patientId = '',
  consentConfirmed = false,
  onPatientNameChange,
  onPatientIdChange,
  onConsentChange,
  startVisitError,
}: Props) {
  const styles = useStyles()

  const visitTypes = [
    { id: 'new-visit', label: 'New Visit' },
    { id: 'follow-up-visit', label: 'Follow-Up Visit' },
  ]

  return (
    <>
      <div className={styles.header}>
        <img
          src="/images/special-olympics-logo.svg"
          alt={appName || 'Special Olympics MedBuddy'}
          className={styles.logo}
        />
        <Text size={500} weight="semibold" className={styles.title}>
          {appName || 'MedBuddy Visit'}
        </Text>
        <Text size={200} className={styles.subtitle}>
          Doctor-approved patient visit capture for inclusive care and follow-up support.
        </Text>
        {visitDateTime && (
          <Text size={200} className={styles.visitDateTime}>
            Visit date & time: {visitDateTime}
          </Text>
        )}
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <Text size={200} weight="semibold">
            Patient name
          </Text>
          <input
            type="text"
            value={patientName}
            onChange={event => onPatientNameChange?.(event.target.value)}
            className={styles.input}
            placeholder="Enter patient name"
          />
        </label>

        <label className={styles.field}>
          <Text size={200} weight="semibold">
            Patient ID / Visit ID
          </Text>
          <input
            type="text"
            value={patientId}
            onChange={event => onPatientIdChange?.(event.target.value)}
            className={styles.input}
            placeholder="Optional"
          />
        </label>
      </div>

      <label className={styles.consentRow}>
        <input
          type="checkbox"
          checked={consentConfirmed}
          onChange={event => onConsentChange?.(event.target.checked)}
          className={styles.checkbox}
        />
        <Text size={200}>
          Patient or guardian has provided consent to record and summarize this visit.
        </Text>
      </label>

      {startVisitError && (
        <Text size={200} style={{ color: '#b42318', marginBottom: tokens.spacingVerticalS }}>
          {startVisitError}
        </Text>
      )}

      <div className={styles.visitTypeGrid}>
        {visitTypes.map(visitType => {
          const isSelected = selectedVisitType === visitType.id
          return (
            <div
              key={visitType.id}
              className={`${styles.visitTypeCard} ${isSelected ? styles.selectedVisitType : ''}`}
              onClick={() => onVisitTypeChange?.(visitType.id)}
              role="button"
              tabIndex={0}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onVisitTypeChange?.(visitType.id)
                }
              }}
            >
              <Text weight="semibold" size={400}>
                {visitType.label}
              </Text>
            </div>
          )
        })}
      </div>

      <div className={styles.actions}>
        <div className={styles.practiceActions}>
          {isAuthenticated && onNavigateToConversations && (
            <Button
              appearance="secondary"
              icon={<History24Regular />}
              onClick={onNavigateToConversations}
            >
              My Practices
            </Button>
          )}
          {isTrainer && onNavigateToAllPractices && (
            <Button
              appearance="secondary"
              icon={<People24Regular />}
              onClick={onNavigateToAllPractices}
            >
              All Practices
            </Button>
          )}
        </div>
        <Button
          appearance="primary"
          onClick={() => {
            console.info('Start Visit & Record button clicked', {
              selectedVisitType,
              consentConfirmed,
              time: new Date().toISOString(),
            })
            onStart(selectedVisitType)
          }}
          size="large"
          disabled={!consentConfirmed}
        >
          Start Visit & Record
        </Button>
      </div>
    </>
  )
}
