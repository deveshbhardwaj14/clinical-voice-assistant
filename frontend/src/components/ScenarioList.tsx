/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    Button,
    Card,
    CardHeader,
    Text,
    makeStyles,
    tokens,
} from '@fluentui/react-components'
import { History24Regular, People24Regular } from '@fluentui/react-icons'
import { Scenario } from '../types'

const useStyles = makeStyles({
  header: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalS,
    textAlign: 'center',
  },
  logo: {
    width: '88px',
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
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingVerticalM,
    gridColumn: '1 / span 2',
    width: '100%',
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr',
    },
  },
  card: {
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow16,
    },
  },
  selected: {
    backgroundColor: tokens.colorBrandBackground2,
  },
  actions: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: tokens.spacingVerticalL,
    paddingRight: tokens.spacingHorizontalM,
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
    marginTop: tokens.spacingVerticalM,
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
      </div>

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

      {/* Server-side scenarios */}
      <div className={styles.cardsGrid}>
        {scenarios.map(scenario => {
          const isSelected = selectedScenario === scenario.id

          return (
            <Card
              key={scenario.id}
              className={`${styles.card} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSelect(scenario.id)}
            >
              <CardHeader
                header={<Text weight="semibold">{scenario.name}</Text>}
                description={<Text size={200}>{scenario.description}</Text>}
              />
            </Card>
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
          disabled={!selectedScenario}
          onClick={() => onStart(selectedVisitType)}
          size="large"
        >
          Start Visit
        </Button>
      </div>
    </>
  )
}
