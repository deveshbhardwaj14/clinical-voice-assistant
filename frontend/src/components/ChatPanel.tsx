/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  Button,
  Card,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Switch,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import {
  ChartMultipleRegular,
  DeleteRegular,
  DismissRegular,
  History20Regular,
  MicOffRegular,
  MicRegular,
  People20Regular,
} from '@fluentui/react-icons'
import { Message, Scenario } from '../types'

const useStyles = makeStyles({
  card: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 14px 14px',
    backgroundColor: '#f7f9fb',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  header: {
    marginBottom: tokens.spacingVerticalXS,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  headerDescription: {
    color: tokens.colorNeutralForeground3,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#edf3f8',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    marginBottom: tokens.spacingVerticalM,
  },
  placeholder: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
  },
  message: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    marginBottom: tokens.spacingVerticalXS,
    borderRadius: tokens.borderRadiusMedium,
    lineHeight: '1.4',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.02)',
    border: '1px solid rgba(0,0,0,0.03)',
  },
  userMessage: {
    backgroundColor: '#eef5ff',
    marginLeft: '4%',
    marginRight: '4%',
  },
  assistantMessage: {
    backgroundColor: '#f1f3f5',
    marginLeft: '4%',
    marginRight: '4%',
  },
  label: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: tokens.colorNeutralForeground3,
  },
  controls: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
})

interface Props {
  messages: Message[]
  recording: boolean
  recordingError?: string | null
  onDismissRecordingError?: () => void
  connected: boolean
  canAnalyze: boolean
  onToggleRecording: () => void
  onClear: () => void
  onAnalyze: () => void
  scenario?: Scenario | null
  avatarEnabled?: boolean
  onToggleAvatar?: () => void
  hasAvatarConfig?: boolean
  isAuthenticated?: boolean
  onNavigateToConversations?: () => void
  isTrainer?: boolean
  onNavigateToAllPractices?: () => void
  startingMicrophone?: boolean
  isGeneratingSummary?: boolean
}

export function ChatPanel({
  messages,
  recording,
  recordingError,
  onDismissRecordingError,
  connected: _connected,
  canAnalyze,
  onToggleRecording,
  onClear,
  onAnalyze,
  scenario,
  avatarEnabled,
  onToggleAvatar,
  hasAvatarConfig,
  isAuthenticated,
  onNavigateToConversations,
  isTrainer,
  onNavigateToAllPractices,
  startingMicrophone,
  isGeneratingSummary,
}: Props) {
  const styles = useStyles()

  return (
    <Card className={styles.card}>
      {scenario && (
        <div className={styles.header}>
          <Text size={500} weight="semibold" block>
            {scenario.name}
          </Text>
        </div>
      )}

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.placeholder}>
            <Text size={300} weight="semibold">
              Get started
            </Text>
            <Text size={200}>
              Click "Start Recording" to begin the conversation.
            </Text>
          </div>
        ) : (
          <>
            {messages
              .slice()
              .reverse()
              .map(msg => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${
                    msg.role === 'user'
                      ? styles.userMessage
                      : styles.assistantMessage
                  }`}
                >
                  <Text className={styles.label}>
                    {msg.role === 'user' ? 'Patient' : 'Clinician'}
                  </Text>
                  <Text size={300}>{msg.content}</Text>
                </div>
              ))}
          </>
        )}
      </div>

      <div className={styles.controls}>
        {startingMicrophone && (
          <MessageBar
            intent="info"
            style={{ marginBottom: tokens.spacingVerticalS, width: '100%' }}
          >
            <MessageBarBody>
              <MessageBarTitle>Starting microphone…</MessageBarTitle>
              Please allow microphone access when the browser prompt appears.
            </MessageBarBody>
          </MessageBar>
        )}

        {isGeneratingSummary && (
          <MessageBar
            intent="info"
            style={{ marginBottom: tokens.spacingVerticalS, width: '100%' }}
          >
            <MessageBarBody>
              <MessageBarTitle>Generating summary…</MessageBarTitle>
              Preparing the patient-friendly summary and clinician review.
            </MessageBarBody>
          </MessageBar>
        )}

        {recordingError && (
          <MessageBar
            intent="error"
            style={{ marginBottom: tokens.spacingVerticalS, width: '100%' }}
          >
            <MessageBarBody>
              <MessageBarTitle>Microphone unavailable</MessageBarTitle>
              {recordingError}
            </MessageBarBody>
            {onDismissRecordingError && (
              <MessageBarActions
                containerAction={
                  <Button
                    appearance="transparent"
                    icon={<DismissRegular />}
                    onClick={onDismissRecordingError}
                    aria-label="Dismiss"
                  />
                }
              />
            )}
          </MessageBar>
        )}
        <Button
          appearance={recording ? 'primary' : 'secondary'}
          icon={recording ? <MicOffRegular /> : <MicRegular />}
          onClick={onToggleRecording}
        >
          {recording ? 'Stop Recording' : 'Start Recording'}
        </Button>

        <Button appearance="subtle" icon={<DeleteRegular />} onClick={onClear}>
          Clear
        </Button>

        <Button
          appearance="primary"
          icon={<ChartMultipleRegular />}
          onClick={onAnalyze}
          disabled={!canAnalyze}
        >
          {recording ? 'Stop recording to analyze' : 'Analyze Performance'}
        </Button>

        {isAuthenticated && onNavigateToConversations && (
          <Button
            appearance="subtle"
            icon={<History20Regular />}
            onClick={onNavigateToConversations}
          >
            Past Practices
          </Button>
        )}

        {isTrainer && onNavigateToAllPractices && (
          <Button
            appearance="subtle"
            icon={<People20Regular />}
            onClick={onNavigateToAllPractices}
          >
            All Practices
          </Button>
        )}

        {hasAvatarConfig && onToggleAvatar && (
          <Switch
            checked={avatarEnabled}
            onChange={onToggleAvatar}
            label="Show Live Voice Agent"
          />
        )}
      </div>
    </Card>
  )
}
