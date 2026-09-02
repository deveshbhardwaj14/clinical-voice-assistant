/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    Button,
    Dialog,
    DialogBody,
    DialogSurface,
    makeStyles,
    Spinner,
    Text,
    tokens,
} from '@fluentui/react-components'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AssessmentPanel } from '../components/AssessmentPanel'
import { ChatPanel } from '../components/ChatPanel'
import { ConversationDetail } from '../components/ConversationDetail'
import { ConversationList } from '../components/ConversationList'
import { PatientSummaryPanel } from '../components/PatientSummaryPanel'
import { PatientTranscriptPanel } from '../components/PatientTranscriptPanel'
import { ProviderRubricPanel } from '../components/ProviderRubricPanel'
import { ScenarioList } from '../components/ScenarioList'
import { UserHeader } from '../components/UserHeader'
import {
    AvatarConnectionDiagnostics,
    ConnectionStage,
    VideoPanel,
} from '../components/VideoPanel'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useAuth } from '../hooks/useAuth'
import { useRealtime } from '../hooks/useRealtime'
import { useRecorder } from '../hooks/useRecorder'
import { useScenarios } from '../hooks/useScenarios'
import { useWebRTC } from '../hooks/useWebRTC'
import { api, AvatarConfig, parseAvatarValue } from '../services/api'
import { Assessment, PatientSummary, SimplifiedTranscriptEntry } from '../types'

type AppView = 'setup' | 'practice' | 'results' | 'conversations' | 'conversationDetail'
const RELEASE_VERSION = 'v0.0.2'

const useStyles = makeStyles({
  container: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #f4f9ff 0%, #edf5ff 100%)',
    padding: tokens.spacingVerticalL,
  },
  brandingBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    zIndex: 1000,
  },
  brandingLogo: {
    width: '32px',
    height: '32px',
  },
  mainLayout: {
    width: '95%',
    maxWidth: '1400px',
    height: '90vh',
    display: 'flex',
    gap: tokens.spacingHorizontalL,
  },
  hiddenAvatarPanel: {
    display: 'none',
  },
  setupDialog: {
    maxWidth: '600px',
    width: '90vw',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow64,
    padding: tokens.spacingVerticalXL,
  },
  loadingContent: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
  },
  releaseBadge: {
    position: 'fixed',
    right: tokens.spacingHorizontalM,
    bottom: tokens.spacingVerticalS,
    color: tokens.colorNeutralForeground4,
    zIndex: 1000,
    userSelect: 'none',
  },
  resultsLayout: {
    width: '95%',
    maxWidth: '1400px',
    height: '90vh',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalL,
  },
  resultsPanel: {
    height: '100%',
    overflowY: 'auto',
    padding: tokens.spacingVerticalM,
  },
  transcriptPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'hidden',
  },
})

export default function App() {
  const styles = useStyles()
  const [currentView, setCurrentView] = useState<AppView>('setup')
  const [previousView, setPreviousView] = useState<AppView>('setup')
  const [showLoading, setShowLoading] = useState(false)
  const [showAssessment, setShowAssessment] = useState(false)
  const [selectedVisitType, setSelectedVisitType] = useState('new-visit')
  const [currentAgent, setCurrentAgent] = useState<string | null>(null)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [connectionStage, setConnectionStage] =
    useState<ConnectionStage>('creating')
  const [avatarDiagnostics, setAvatarDiagnostics] =
    useState<AvatarConnectionDiagnostics>({})
  const [avatarEnabled, setAvatarEnabled] = useState(true)
  const [showAvatar, setShowAvatar] = useState(true)
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [showAllPractices, setShowAllPractices] = useState(false)
  const [appName, setAppName] = useState<string>('Special Olympics MedBuddy')
  const [visitTimestamp, setVisitTimestamp] = useState<Date>(new Date())
  const [patientName, setPatientName] = useState<string>('')
  const [patientId, setPatientId] = useState<string>('')
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [startingMicrophone, setStartingMicrophone] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  // Clinical session state
  const [patientLanguage, setPatientLanguage] = useState<string>('en')
  const [simplifiedEntries, setSimplifiedEntries] = useState<SimplifiedTranscriptEntry[]>([])
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null)
  const [providerAssessment, setProviderAssessment] = useState<Assessment | null>(null)

  const { authenticated, user, isTrainer } = useAuth()

  const { scenarios, selectedScenario, setSelectedScenario, loading } =
    useScenarios()
  const { playAudio } = useAudioPlayer()
  const activeScenario = scenarios.find(s => s.id === selectedScenario) || null

  // Fetch app name from config
  useEffect(() => {
    api
      .getConfig()
      .then((cfg: { app_name?: string }) => {
        if (cfg.app_name) setAppName(cfg.app_name)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setVisitTimestamp(new Date())
    }, 60000)

    return () => window.clearInterval(intervalId)
  }, [])

  const visitDateTimeLabel = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(visitTimestamp)

  const navigateToConversations = useCallback(() => {
    setPreviousView(currentView)
    setShowAllPractices(false)
    setCurrentView('conversations')
  }, [currentView])

  const navigateToAllPractices = useCallback(() => {
    setPreviousView(currentView)
    setShowAllPractices(true)
    setCurrentView('conversations')
  }, [currentView])

  const navigateToDetail = useCallback((id: string) => {
    setSelectedConversationId(id)
    setCurrentView('conversationDetail')
  }, [])

  const navigateBack = useCallback(() => {
    if (currentView === 'conversationDetail') {
      setCurrentView('conversations')
      setSelectedConversationId(null)
    } else if (currentView === 'conversations') {
      setCurrentView(previousView)
    }
  }, [currentView, previousView])

  const updateAvatarDiagnostics = useCallback(
    (update: Omit<AvatarConnectionDiagnostics, 'lastUpdatedAt'>) => {
      if (update.voiceSocket === 'reconnecting') {
        setConnectionStage('connecting')
        setAvatarDiagnostics(prev => ({
          ...prev,
          ...update,
          startedAt: Date.now(),
          media: { audio: false, video: false },
          lastUpdatedAt: Date.now(),
        }))
        return
      }
      setAvatarDiagnostics(prev => ({
        ...prev,
        ...update,
        media: {
          ...prev.media,
          ...update.media,
        },
        lastUpdatedAt: Date.now(),
      }))
    },
    []
  )

  const voiceSendRef = useRef<(data: unknown) => void>(() => {})
  const sendOffer = useCallback((sdp: string) => {
    voiceSendRef.current({ type: 'session.avatar.connect', client_sdp: sdp })
  }, [])

  const { setupWebRTC, handleAnswer, videoRef } = useWebRTC(
    sendOffer,
    updateAvatarDiagnostics
  )

  const handleWebRTCMessage = useCallback(
    (msg: any) => {
      if (!avatarConfig) return

      api.clientLog('debug', 'app.webrtc_msg_received', {
        type: msg?.type,
        hasServerSdp: !!msg?.server_sdp,
        hasSdp: !!msg?.sdp,
        hasAnswer: !!msg?.answer,
      })

      if (msg.type === 'proxy.connected') {
        api.clientLog('info', 'app.stage.connecting', {
          trigger: 'proxy.connected',
        })
        setConnectionStage('connecting')
        updateAvatarDiagnostics({
          message: 'Connected to the voice service',
        })
      } else if (msg.type === 'session.created') {
        api.clientLog('info', 'app.stage.configuring', {
          trigger: 'session.created',
        })
        setConnectionStage('configuring')
        updateAvatarDiagnostics({
          message: 'Voice session created',
        })
      } else if (msg.type === 'session.updated') {
        api.clientLog('info', 'app.stage.rendering', {
          trigger: 'session.updated',
        })
        setConnectionStage('rendering')
        updateAvatarDiagnostics({
          message: 'Live Voice Agent configuration received',
        })
        const session = msg.session
        const servers =
          session?.avatar?.ice_servers ||
          session?.rtc?.ice_servers ||
          session?.ice_servers
        const username =
          session?.avatar?.username ||
          session?.avatar?.ice_username ||
          session?.rtc?.ice_username ||
          session?.ice_username
        const credential =
          session?.avatar?.credential ||
          session?.avatar?.ice_credential ||
          session?.rtc?.ice_credential ||
          session?.ice_credential

        api.clientLog('info', 'app.session_updated_ice', {
          hasServers: !!servers,
          hasCredentials: !!(username && credential),
        })

        if (servers) {
          setupWebRTC(servers, username, credential)
        } else {
          api.clientLog('warning', 'app.session_updated_no_ice_servers')
          updateAvatarDiagnostics({
            message:
              'Live Voice Agent configuration did not include media connection details',
            warning:
              'The Live Voice Agent service did not return ICE server details.',
          })
        }
      } else if (
        (msg.server_sdp || msg.sdp || msg.answer) &&
        msg.type !== 'session.update'
      ) {
        api.clientLog('info', 'app.received_sdp_answer', { type: msg?.type })
        handleAnswer(msg)
      } else if (msg.type === 'error') {
        updateAvatarDiagnostics({
          message: 'Voice service returned an error',
          warning:
            msg?.error?.message ?? 'The voice service returned an error.',
        })
      }
    },
    [avatarConfig, handleAnswer, setupWebRTC, updateAvatarDiagnostics]
  )

  const {
    connected,
    messages,
    send,
    clearMessages,
    getRecordings,
    getConversationId,
    saveConversationNow,
  } = useRealtime({
    agentId: currentAgent,
    scenarioId: selectedScenario,
    onMessage: handleWebRTCMessage,
    onAudioDelta: playAudio,
    onTranscript: useCallback(
      (role: 'user' | 'assistant', text: string) => {
        const speaker = role === 'assistant' ? 'doctor' : 'patient'
        const entry: SimplifiedTranscriptEntry = {
          id: `${Date.now()}-${Math.random()}`,
          speaker,
          originalText: text,
          simplifiedText: text,
          timestamp: new Date(),
        }
        setSimplifiedEntries(prev => [...prev, entry])

        if (text.trim()) {
          api
            .simplifyTranscript(text, 'plain', patientLanguage)
            .then(simplified => {
              setSimplifiedEntries(prev =>
                prev.map(e => (e.id === entry.id ? { ...e, simplifiedText: simplified } : e))
              )
            })
            .catch(() => {
              // simplification is best-effort; keep original text if it fails
            })
        }
      },
      [patientLanguage]
    ),
    onConnectionStatus: updateAvatarDiagnostics,
  })

  useEffect(() => {
    voiceSendRef.current = send
  }, [send])

  const sendAudioChunk = useCallback(
    (base64: string) => {
      send({ type: 'input_audio_buffer.append', audio: base64 })
    },
    [send]
  )

  const {
    recording,
    recordingError,
    clearRecordingError,
    toggleRecording,
    stopRecording,
    getAudioRecording,
  } = useRecorder(sendAudioChunk)

  const handleStart = async (visitType: string) => {
    if (!selectedScenario) return
    if (!consentConfirmed) return

    const parsedAvatar = parseAvatarValue('audio-only')
    const isAudioOnly = true
    setAvatarConfig(parsedAvatar)
    setAvatarEnabled(false)
    setShowAvatar(false)

    setConnectionStage('creating')
    setAvatarDiagnostics({
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      message: 'Creating visit session',
      voiceSocket: 'waiting',
      browserConnection: 'waiting',
      networkRelay: 'waiting',
      gathering: 'waiting',
      media: { audio: false, video: false },
      candidateTypes: [],
    })
    setCurrentAgent(null)
    setSelectedVisitType(visitType)
    setCurrentView('practice')

    setStartingMicrophone(true)
    try {
      const { agent_id } = await api.createAgent(selectedScenario, parsedAvatar)

      if (!isAudioOnly) {
        setConnectionStage('connecting')
        updateAvatarDiagnostics({
          message: 'Visit session created; opening voice connection',
        })
      }
      setCurrentAgent(agent_id)
      if (!recording) {
        await toggleRecording()
      }
    } catch (error) {
      console.error('Failed to create agent:', error)
      updateAvatarDiagnostics({
        message: 'Could not create the visit session',
        warning:
          error instanceof Error ? error.message : 'Failed to create agent.',
      })
    } finally {
      setStartingMicrophone(false)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedScenario) return
    if (recording) {
      stopRecording()
      setAnalysisError(
        'Recording was still running, so the microphone was stopped. Click Analyze Performance again after recording stops.'
      )
      return
    }

    const recordings = getRecordings()
    const audioData = getAudioRecording()

    if (!recordings.conversation.length) return

    setShowLoading(true)
    setAnalysisError(null)

    try {
      const transcript = recordings.conversation
        .map((m: any) => `${m.role}: ${m.content}`)
        .join('\n')
      const conversationId = currentAgent
        ? getConversationId()
        : await saveConversationNow()

      const result = await api.analyzeConversation(
        selectedScenario,
        transcript,
        [...audioData, ...recordings.audio],
        recordings.conversation,
        conversationId,
        currentAgent
      )

      setAssessment(result)
      setShowAssessment(true)
    } catch (error) {
      console.error('Analysis failed:', error)
      const detail = error instanceof Error ? error.message : 'Unknown error'
      const message =
        detail.includes('403') || detail.includes('Forbidden')
          ? 'Performance analysis was blocked before it reached the app. This usually means the gateway/WAF rejected the request size or content. Client logs include request diagnostics.'
          : `Performance analysis failed. ${detail}`
      setAnalysisError(message)
    } finally {
      setShowLoading(false)
    }
  }

  const handleViewAssessment = useCallback((a: Assessment) => {
    setAssessment(a)
    setShowAssessment(true)
  }, [])

  const handleEndVisit = useCallback(async () => {
    if (recording) {
      stopRecording()
    }

    const recordings = getRecordings()
    if (!recordings.conversation.length || !selectedScenario) return

    setShowLoading(true)
    setAnalysisError(null)
    setIsGeneratingSummary(true)

    try {
      const transcript = recordings.conversation
        .map((m: any) => `${m.role}: ${m.content}`)
        .join('\n')
      const visitTypeName =
        scenarios.find(s => s.id === selectedScenario)?.name ?? 'General Consultation'
      const conversationId = currentAgent
        ? getConversationId()
        : await saveConversationNow()

      const [summaryResult, rubricResult] = await Promise.allSettled([
        api.generatePatientSummary(transcript, patientLanguage, visitTypeName),
        api.analyzeConversation(
          selectedScenario,
          transcript,
          [],
          recordings.conversation,
          conversationId,
          currentAgent
        ),
      ])

      if (summaryResult.status === 'fulfilled') {
        setPatientSummary(summaryResult.value)
      }
      if (rubricResult.status === 'fulfilled') {
        setProviderAssessment(rubricResult.value)
      }

      setCurrentView('results')
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error'
      setAnalysisError(`Post-visit analysis failed. ${detail}`)
    } finally {
      setShowLoading(false)
      setIsGeneratingSummary(false)
    }
  }, [
    currentAgent,
    getConversationId,
    getRecordings,
    patientLanguage,
    recording,
    saveConversationNow,
    scenarios,
    selectedScenario,
    stopRecording,
  ])

  return (
    <div className={styles.container}>
      <UserHeader
        userName={user?.name}
        authenticated={authenticated}
        role={user?.role}
        isTrainer={isTrainer}
      />

      {/* Branding bar - top left on non-setup views */}
      {currentView !== 'setup' && (
        <div className={styles.brandingBar}>
          <img
            src="/images/special-olympics-logo.svg"
            alt={appName}
            className={styles.brandingLogo}
          />
          <Text size={300} weight="semibold">
            {appName}
          </Text>
        </div>
      )}

      {/* Setup home screen */}
      {currentView === 'setup' && (
        <div className={styles.setupDialog}>
          {loading ? (
            <Spinner label="Loading scenarios..." />
          ) : (
            <ScenarioList
              scenarios={scenarios}
              selectedScenario={selectedScenario}
              onSelect={setSelectedScenario}
              onStart={handleStart}
              selectedVisitType={selectedVisitType}
              onVisitTypeChange={setSelectedVisitType}
              isAuthenticated={authenticated}
              onNavigateToConversations={navigateToConversations}
              isTrainer={isTrainer}
              onNavigateToAllPractices={navigateToAllPractices}
              appName={appName}
              visitDateTime={visitDateTimeLabel}
              patientName={patientName}
              patientId={patientId}
              consentConfirmed={consentConfirmed}
              onPatientNameChange={setPatientName}
              onPatientIdChange={setPatientId}
              onConsentChange={setConsentConfirmed}
            />
          )}
        </div>
      )}

      {/* Loading overlay */}
      <Dialog open={showLoading}>
        <DialogSurface>
          <DialogBody>
            <div className={styles.loadingContent}>
              <Spinner size="large" />
              <Text
                size={400}
                weight="semibold"
                block
                style={{ marginTop: tokens.spacingVerticalL }}
              >
                Generating Visit Artifacts...
              </Text>
              <Text
                size={200}
                block
                style={{ marginTop: tokens.spacingVerticalS }}
              >
                Preparing patient summary and provider rubric — this may take a moment
              </Text>
            </div>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Assessment panel overlay */}
      <AssessmentPanel
        open={showAssessment}
        assessment={assessment}
        onClose={() => setShowAssessment(false)}
      />

      {/* Error dialog */}
      <Dialog
        open={!!analysisError}
        onOpenChange={() => setAnalysisError(null)}
      >
        <DialogSurface>
          <DialogBody>
            <Text size={400} weight="semibold" block>
              Analysis Error
            </Text>
            <Text
              size={300}
              block
              style={{ marginTop: tokens.spacingVerticalM }}
            >
              {analysisError}
            </Text>
            <div
              style={{
                marginTop: tokens.spacingVerticalL,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                appearance="primary"
                onClick={() => setAnalysisError(null)}
              >
                OK
              </Button>
            </div>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Practice view — ambient session with live patient transcript */}
      {currentView === 'practice' && (
        <div className={styles.mainLayout}>
          {avatarEnabled && (
            <div className={showAvatar ? undefined : styles.hiddenAvatarPanel}>
              <VideoPanel
                videoRef={videoRef}
                connectionStage={connectionStage}
                diagnostics={avatarDiagnostics}
              />
            </div>
          )}
          <div className={styles.transcriptPanel}>
            <PatientTranscriptPanel
              entries={simplifiedEntries}
              isListening={recording}
            />
          </div>
          <ChatPanel
            messages={messages}
            recording={recording}
            recordingError={recordingError}
            onDismissRecordingError={clearRecordingError}
            connected={connected}
            canAnalyze={messages.length > 0 && !recording}
            onToggleRecording={toggleRecording}
            onClear={clearMessages}
            onAnalyze={handleEndVisit}
            scenario={activeScenario}
            avatarEnabled={showAvatar}
            onToggleAvatar={() => setShowAvatar(prev => !prev)}
            hasAvatarConfig={avatarEnabled}
            isAuthenticated={authenticated}
            onNavigateToConversations={navigateToConversations}
            isTrainer={isTrainer}
            onNavigateToAllPractices={navigateToAllPractices}
            startingMicrophone={startingMicrophone}
            isGeneratingSummary={isGeneratingSummary}
          />
        </div>
      )}

      {/* Results view — post-visit patient summary + provider rubric */}
      {currentView === 'results' && (
        <div className={styles.resultsLayout}>
          <div className={styles.resultsPanel}>
            {isGeneratingSummary ? (
              <Text style={{ color: tokens.colorNeutralForeground3 }}>
                Generating patient summary and provider review...
              </Text>
            ) : patientSummary ? (
              <PatientSummaryPanel
                summary={patientSummary}
                visitType={
                  scenarios.find(s => s.id === selectedScenario)?.name ??
                  'General Consultation'
                }
              />
            ) : (
              <Text style={{ color: tokens.colorNeutralForeground3 }}>
                Patient summary not available.
              </Text>
            )}
          </div>
          <div className={styles.resultsPanel}>
            {providerAssessment ? (
              <ProviderRubricPanel assessment={providerAssessment} />
            ) : (
              <Text style={{ color: tokens.colorNeutralForeground3 }}>
                Provider rubric not available.
              </Text>
            )}
          </div>
        </div>
      )}

      {/* Conversation list view */}
      {currentView === 'conversations' && (
        <ConversationList
          onSelectConversation={navigateToDetail}
          onViewAssessment={handleViewAssessment}
          onBack={navigateBack}
          showAll={showAllPractices}
        />
      )}

      {/* Conversation detail view */}
      {currentView === 'conversationDetail' && selectedConversationId && (
        <ConversationDetail
          conversationId={selectedConversationId}
          scenarios={scenarios}
          onBack={navigateBack}
          onShowAssessment={handleViewAssessment}
        />
      )}
      <Text size={100} className={styles.releaseBadge}>
        {RELEASE_VERSION}
      </Text>
    </div>
  )
}
