import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { useSentinelStore } from '@/store'
import { useWebSocket } from '@/hooks/useWebSocket'
import { FaceCamera } from '@/components/FaceCamera/FaceCamera'
import { EventFeed } from '@/components/EventFeed/EventFeed'
import { CameraGrid } from '@/components/CameraGrid/CameraGrid'
import { SummaryPanel } from '@/components/SummaryPanel/SummaryPanel'
import { StatusBar } from '@/components/StatusBar/StatusBar'
import { PersonManager } from '@/components/PersonManager/PersonManager'
import type { WsMessage, Detection, SentinelEvent, AISummary } from '@/types'

export default function App() {
  const [showPeople, setShowPeople] = useState(false)

  useEffect(() => {
    const handler = () => setShowPeople(true)
    window.addEventListener('sentinel:open-people', handler)
    return () => window.removeEventListener('sentinel:open-people', handler)
  }, [])

  const setProperty = useSentinelStore((s) => s.setProperty)
  const setCameras = useSentinelStore((s) => s.setCameras)
  const addDetection = useSentinelStore((s) => s.addDetection)
  const addEvent = useSentinelStore((s) => s.addEvent)
  const updateEventSummary = useSentinelStore((s) => s.updateEventSummary)
  const setConnected = useSentinelStore((s) => s.setConnected)
  const setLastHeartbeat = useSentinelStore((s) => s.setLastHeartbeat)

  // Bootstrap: load property config and cameras on mount
  useEffect(() => {
    api.property.get().then(setProperty).catch(console.error)
    api.cameras.list().then((r) => setCameras(r.items)).catch(console.error)
    api.events.list({ limit: 50 }).then((events) => {
      // Load initial events in reverse-chronological order so addEvent prepends correctly
      ;[...events].reverse().forEach(addEvent)
    }).catch(console.error)
  }, [])

  // Live WebSocket updates
  useWebSocket((msg: WsMessage) => {
    switch (msg.topic) {
      case 'detection.new':
        addDetection(msg.payload as Detection)
        break
      case 'event.created':
        addEvent(msg.payload as SentinelEvent)
        break
      case 'ai_summary.created': {
        const summary = msg.payload as AISummary
        updateEventSummary(summary.event_id, summary)
        break
      }
      case 'heartbeat':
        setConnected(true)
        setLastHeartbeat(msg.ts)
        break
    }
  })

  // Track connection state via WebSocket open/close events
  useEffect(() => {
    // The WS hook handles reconnection; we optimistically set connected=true
    // on first mount and rely on heartbeat to confirm.
    const timeout = setTimeout(() => setConnected(true), 1000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface text-gray-100">
      <StatusBar />
      {showPeople && <PersonManager onClose={() => setShowPeople(false)} />}

      {/* Main layout: map left (55%), cameras + events right (45%) */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel: face camera with live recognition (55%) */}
        <div className="w-[55%] shrink-0 border-r border-surface-border overflow-hidden flex flex-col">
          <FaceCamera />
        </div>

        {/* Right panel: cameras top (60%) + events/summaries bottom (40%) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-[3] overflow-hidden border-b border-surface-border">
            <CameraGrid />
          </div>
          <div className="flex-[2] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden border-b border-surface-border">
              <EventFeed />
            </div>
            <div className="h-48 overflow-hidden shrink-0">
              <SummaryPanel />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
