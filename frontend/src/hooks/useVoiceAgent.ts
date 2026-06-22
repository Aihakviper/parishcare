import { useCallback, useRef } from 'react'
import { bayoRespond, transcribeVoice } from '../lib/mock-api/voice'
import { useVoiceStore } from '../store/voice'
import { campApi } from '../lib/mock-api/camp'
import { HERO_JOB_ID } from '../lib/types/camp'

export function useVoiceAgent(context = 'artisan-home') {
  const agentState = useVoiceStore((s) => s.agentState)
  const setAgentState = useVoiceStore((s) => s.setAgentState)
  const addLine = useVoiceStore((s) => s.addLine)
  const recordingRef = useRef(false)

  const sendUserMessage = useCallback(
    async (text: string) => {
      addLine({ role: 'user', text })
      setAgentState('processing')
      const reply = await bayoRespond(text, context)
      addLine({ role: 'bayo', text: reply.text })
      setAgentState('speaking')
      if (reply.suggestedAction === 'accept_hero_job') {
        await campApi.acceptJob(HERO_JOB_ID)
      }
      if (reply.suggestedAction === 'set_en_route') {
        await campApi.updateJobStatus(HERO_JOB_ID, 'en_route')
      }
      if (reply.suggestedAction === 'mark_complete') {
        await campApi.updateJobStatus(HERO_JOB_ID, 'completed')
      }
      setTimeout(() => setAgentState('idle'), 1500)
    },
    [addLine, context, setAgentState],
  )

  const startRecording = useCallback(async () => {
    if (recordingRef.current) return
    recordingRef.current = true
    setAgentState('recording')
  }, [setAgentState])

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return
    recordingRef.current = false
    setAgentState('processing')
    const text = await transcribeVoice(new Blob(), context)
    await sendUserMessage(text)
  }, [context, sendUserMessage, setAgentState])

  const quickAction = useCallback(
    (action: string) => {
      const map: Record<string, string> = {
        jobs: 'Read me new jobs.',
        balance: 'Wetin be my balance?',
        standing: 'How am I doing?',
        end: 'Thank you Bayo.',
      }
      void sendUserMessage(map[action] ?? action)
    },
    [sendUserMessage],
  )

  return { state: agentState, startRecording, stopRecording, sendUserMessage, quickAction }
}
