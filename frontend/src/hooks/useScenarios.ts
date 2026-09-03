/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useState } from 'react'
import { Scenario } from '../types'

const DEFAULT_GENERAL_SCENARIO: Scenario = {
  id: 'general-patient-visit',
  name: 'General Consultation',
  description:
    'Conversation between a patient and doctor about the visit, symptoms, concerns, and the follow-up plan.',
}

export function useScenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([DEFAULT_GENERAL_SCENARIO])
  const [selectedScenario, setSelectedScenario] = useState<string | null>(DEFAULT_GENERAL_SCENARIO.id)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load scenarios on mount.
  // The product is intentionally simplified to a single general patient-doctor visit flow.
  useEffect(() => {
    const nextScenarios = [DEFAULT_GENERAL_SCENARIO]
    setScenarios(nextScenarios)
    setSelectedScenario(DEFAULT_GENERAL_SCENARIO.id)
    setError(null)
    setLoading(false)
  }, [])

  const refreshScenarios = useCallback(async () => {
    setLoading(true)
    try {
      const nextScenarios = [DEFAULT_GENERAL_SCENARIO]
      setScenarios(nextScenarios)
      setSelectedScenario(DEFAULT_GENERAL_SCENARIO.id)
      setError(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to refresh scenarios'
      console.error('Failed to refresh scenarios:', err)
      setError(message)
      setScenarios([DEFAULT_GENERAL_SCENARIO])
      setSelectedScenario(DEFAULT_GENERAL_SCENARIO.id)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    scenarios,
    selectedScenario,
    setSelectedScenario,
    loading,
    error,
    refreshScenarios,
  }
}
