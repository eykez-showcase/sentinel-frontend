import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import clsx from 'clsx'
import type { Camera } from '@/types'

const WB_HOST = (() => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined
  if (backendUrl) {
    try { return new URL(backendUrl).hostname } catch {}
  }
  return window.location.hostname
})()

function getHlsUrl(streamUrl: string): string {
  try {
    const segment = new URL(streamUrl).pathname.replace(/^\//, '')
    return `http://${WB_HOST}:8888/${segment}/index.m3u8`
  } catch {
    return ''
  }
}

interface Props {
  camera: Camera
  hasDetection: boolean
  isSelected: boolean
  onClick: () => void
}

export function CameraFeed({ camera, hasDetection, isSelected, onClick }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [error, setError] = useState(false)
  const hlsUrl = getHlsUrl(camera.stream_url)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hlsUrl) return
    setError(false)

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false })
      hlsRef.current = hls
      hls.loadSource(hlsUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setError(true)
      })
      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl
      video.onerror = () => setError(true)
    }
  }, [hlsUrl])

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative rounded overflow-hidden cursor-pointer transition-all',
        isSelected && 'ring-2 ring-accent',
        hasDetection && !isSelected && 'ring-2 ring-alert-high',
        !hasDetection && !isSelected && 'ring-1 ring-surface-border'
      )}
    >
      {error ? (
        <div className="aspect-video bg-surface-raised flex flex-col items-center justify-center gap-1">
          <span className="text-gray-600 text-xs">Stream unavailable</span>
          <span className="text-gray-700 text-[10px]">{camera.name}</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full aspect-video bg-black"
        />
      )}

      {/* LIVE badge */}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded">
        <span className={clsx('w-1.5 h-1.5 rounded-full', camera.is_active ? 'bg-alert-high animate-pulse' : 'bg-gray-600')} />
        <span className="text-[10px] text-white font-semibold">{camera.is_active ? 'LIVE' : 'OFF'}</span>
      </div>

      {/* Detection badge */}
      {hasDetection && (
        <div className="absolute top-1.5 right-1.5 bg-alert-high/90 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold animate-pulse">
          MOTION
        </div>
      )}

      {/* Camera name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
        <span className="text-xs text-white">{camera.name}</span>
      </div>
    </div>
  )
}
