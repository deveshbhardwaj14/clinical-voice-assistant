/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    Badge,
    Button,
    Card,
    CardHeader,
    Text,
    makeStyles,
    tokens,
} from '@fluentui/react-components'
import {
    ArrowDownloadRegular,
    CalendarRegular,
    ClipboardRegular,
    NoteRegular,
    PillRegular,
} from '@fluentui/react-icons'
import { PatientSummary } from '../types'

interface Props {
  summary: PatientSummary
  visitType: string
  onDownload?: () => void
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    overflowY: 'auto',
    paddingRight: tokens.spacingHorizontalXS,
  },
  headerCard: {
    backgroundColor: tokens.colorBrandBackground2,
    padding: tokens.spacingVerticalL,
    borderRadius: tokens.borderRadiusLarge,
  },
  headerTitle: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
    marginBottom: tokens.spacingVerticalXS,
  },
  headerSubtitle: {
    color: tokens.colorNeutralForeground2,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  bulletList: {
    margin: 0,
    padding: `0 0 0 ${tokens.spacingHorizontalL}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  medicationCard: {
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  medicationName: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  medicationDetail: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: tokens.spacingVerticalM,
  },
})

export function PatientSummaryPanel({ summary, visitType, onDownload }: Props) {
  const styles = useStyles()

  return (
    <div className={styles.root}>
      <div className={styles.headerCard}>
        <Text className={styles.headerTitle}>Your Visit Summary</Text>
        <Text className={styles.headerSubtitle}>
          {visitType} &nbsp;·&nbsp; {new Date().toLocaleDateString()}
        </Text>
      </div>

      <Card>
        <CardHeader
          header={
            <Text className={styles.sectionTitle}>
              <ClipboardRegular />
              &nbsp;About Today&apos;s Visit
            </Text>
          }
        />
        <Text>{summary.visit_reason}</Text>

        {summary.diagnosis_or_findings && (
          <div className={styles.section} style={{ marginTop: tokens.spacingVerticalM }}>
            <Text weight="semibold">What the doctor found:</Text>
            <Text>{summary.diagnosis_or_findings}</Text>
          </div>
        )}

        {summary.what_was_discussed.length > 0 && (
          <div className={styles.section} style={{ marginTop: tokens.spacingVerticalM }}>
            <Text weight="semibold">Topics discussed:</Text>
            <ul className={styles.bulletList}>
              {summary.what_was_discussed.map((item, i) => (
                <li key={i}>
                  <Text>{item}</Text>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {summary.medications.length > 0 && (
        <Card>
          <CardHeader
            header={
              <Text className={styles.sectionTitle}>
                <PillRegular />
                &nbsp;Your Medications
              </Text>
            }
          />
          {summary.medications.map((med, i) => (
            <div key={i} className={styles.medicationCard}>
              <Text className={styles.medicationName}>
                {med.name}&nbsp;
                <Badge appearance="outline" color="informative" size="small">
                  {med.purpose}
                </Badge>
              </Text>
              <Text className={styles.medicationDetail}>{med.instructions}</Text>
            </div>
          ))}
        </Card>
      )}

      {summary.next_steps.length > 0 && (
        <Card>
          <CardHeader
            header={
              <Text className={styles.sectionTitle}>
                <NoteRegular />
                &nbsp;What To Do Next
              </Text>
            }
          />
          <ul className={styles.bulletList}>
            {summary.next_steps.map((step, i) => (
              <li key={i}>
                <Text>{step}</Text>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {summary.follow_up && (
        <Card>
          <CardHeader
            header={
              <Text className={styles.sectionTitle}>
                <CalendarRegular />
                &nbsp;Follow-Up
              </Text>
            }
          />
          <Text>{summary.follow_up}</Text>
        </Card>
      )}

      {summary.questions_to_ask_next_time.length > 0 && (
        <Card>
          <CardHeader
            header={<Text weight="semibold">Questions to ask next time:</Text>}
          />
          <ul className={styles.bulletList}>
            {summary.questions_to_ask_next_time.map((q, i) => (
              <li key={i}>
                <Text>{q}</Text>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {onDownload && (
        <div className={styles.actions}>
          <Button icon={<ArrowDownloadRegular />} onClick={onDownload}>
            Download Summary
          </Button>
        </div>
      )}
    </div>
  )
}
