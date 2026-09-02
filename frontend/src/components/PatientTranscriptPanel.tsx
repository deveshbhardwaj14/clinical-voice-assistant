/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  Badge,
  Card,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { useEffect, useRef } from 'react'
import { SimplifiedTranscriptEntry } from '../types'

interface Props {
  entries: SimplifiedTranscriptEntry[]
  isListening: boolean
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: tokens.spacingVerticalS,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  listeningDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: tokens.colorPaletteRedBackground3,
    animation: 'pulse 1.5s infinite',
  },
  feed: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingRight: tokens.spacingHorizontalXS,
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    padding: tokens.spacingVerticalXL,
  },
  entryCard: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  doctorCard: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderLeft: `3px solid ${tokens.colorBrandBackground}`,
  },
  patientCard: {
    backgroundColor: tokens.colorBrandBackground2,
    borderLeft: `3px solid ${tokens.colorPaletteGreenBackground3}`,
  },
  speakerLabel: {
    fontWeight: 600,
    marginBottom: tokens.spacingVerticalXXS,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  simplifiedText: {
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    color: tokens.colorNeutralForeground1,
  },
  originalText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXXS,
    fontStyle: 'italic',
  },
})

export function PatientTranscriptPanel({ entries, isListening }: Props) {
  const styles = useStyles()
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [entries])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Text weight="semibold" size={400}>
            Live Transcript
          </Text>
          {isListening && (
            <Badge color="danger" shape="circular" size="small">
              LIVE
            </Badge>
          )}
        </div>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          Simplified for your understanding
        </Text>
      </div>

      <div ref={feedRef} className={styles.feed}>
        {entries.length === 0 ? (
          <div className={styles.empty}>
            <Text>
              {isListening
                ? 'Listening… transcript will appear here as the conversation progresses.'
                : 'Conversation transcript will appear here during your visit.'}
            </Text>
          </div>
        ) : (
          entries.map(entry => (
            <Card
              key={entry.id}
              className={`${styles.entryCard} ${
                entry.speaker === 'doctor' ? styles.doctorCard : styles.patientCard
              }`}
            >
              <Text className={styles.speakerLabel}>
                {entry.speaker === 'doctor' ? 'Clinician' : 'Patient'}
              </Text>
              <Text className={styles.simplifiedText}>{entry.simplifiedText}</Text>
              {entry.simplifiedText !== entry.originalText && (
                <Text className={styles.originalText}>
                  Original: {entry.originalText}
                </Text>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
