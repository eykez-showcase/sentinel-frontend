import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import clsx from 'clsx'

interface FaceStatus {
  available: boolean
  last_seen_name: string | null
  last_seen_role: string | null
  last_seen_confidence: number
  last_seen_at: string | null
}

const ROLE_LABELS: Record<string, string> = {
  family: 'Family',
  delivery: 'Delivery Driver',
  other: 'Other',
}

const ROLE_COLORS: Record<string, string> = {
  family: 'text-green-400',
  delivery: 'text-yellow-400',
  other: 'text-gray-400',
}

export function FaceCamera() {
  const [status, setStatus] = useState<FaceStatus | null>(null)
  const [streamError, setStreamError] = useState(false)

  // Poll status every 2 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const s = await api.faceCamera.getStatus()
        setStatus(s)
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [])

  const streamUrl = '/api/v1/face-camera/stream'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border shrink-0">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Front Door</span>
        <div className="flex items-center gap-1.5">
          <span className={clsx('w-1.5 h-1.5 rounded-full', status?.available ? 'bg-green-500 animate-pulse' : 'bg-gray-600')} />
          <span className="text-xs text-gray-500">
            {status?.available ? 'Face recognition active' : 'Face recognition offline'}
          </span>
        </div>
      </div>

      {/* Stream */}
      <div className="relative flex-1 bg-black overflow-hidden">
        {streamError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span className="text-xs">Camera unavailable</span>
          </div>
        ) : (
          <img
            src={streamUrl}
            className="w-full h-full object-contain"
            onError={() => setStreamError(true)}
          />
        )}

        {/* Live badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 px-2 py-1 rounded text-[10px] text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </div>
      </div>

      {/* Recognition status */}
      <div className="px-3 py-2 border-t border-surface-border shrink-0 min-h-[56px]">
        {status?.last_seen_name ? (
          <div className="flex items-center justify-between">
            <div>
              <div className={clsx('font-semibold text-sm', ROLE_COLORS[status.last_seen_role ?? ''] ?? 'text-gray-200')}>
                {status.last_seen_name}
              </div>
              <div className="text-gray-500 text-xs">
                {ROLE_LABELS[status.last_seen_role ?? ''] ?? 'Unknown'} · {Math.round(status.last_seen_confidence * 100)}% confidence
              </div>
            </div>
            {status.last_seen_at && (
              <div className="text-gray-600 text-[10px] text-right">
                {new Date(status.last_seen_at).toLocaleTimeString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-600 text-xs">No face detected yet</div>
        )}
      </div>
    </div>
  )
}
