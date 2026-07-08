import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import { useSentinelStore } from '@/store'

export function StatusBar() {
  const connected = useSentinelStore((s) => s.connected)
  const lastHeartbeat = useSentinelStore((s) => s.lastHeartbeat)
  const cameras = useSentinelStore((s) => s.cameras)
  const events = useSentinelStore((s) => s.events)
  const detections = useSentinelStore((s) => s.detections)

  const highCount = events.filter(
    (e) => e.severity === 'high' && Date.now() - new Date(e.timestamp).getTime() < 300_000
  ).length

  return (
    <div className="h-8 bg-surface-raised border-b border-surface-border flex items-center px-4 gap-6 text-[11px] shrink-0">
      {/* Logo */}
      <span className="text-accent font-semibold tracking-widest uppercase text-xs">
        ◈ Sentinel
      </span>

      <div className="h-4 w-px bg-surface-border" />

      {/* WS status */}
      <div className="flex items-center gap-1.5">
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            connected ? 'bg-alert-low' : 'bg-alert-high animate-pulse'
          )}
        />
        <span className={connected ? 'text-gray-400' : 'text-alert-high'}>
          {connected ? 'Connected' : 'Reconnecting…'}
        </span>
      </div>

      {lastHeartbeat && (
        <span className="text-gray-600">
          last beat {formatDistanceToNow(new Date(lastHeartbeat), { addSuffix: true })}
        </span>
      )}

      <div className="h-4 w-px bg-surface-border" />

      <span className="text-gray-500">
        <span className="text-gray-300">{cameras.filter((c) => c.is_active).length}</span>{' '}
        cameras active
      </span>

      <span className="text-gray-500">
        <span className="text-gray-300">{detections.length}</span> detections in memory
      </span>

      {highCount > 0 && (
        <>
          <div className="h-4 w-px bg-surface-border" />
          <span className="text-alert-high font-semibold">
            ⚠ {highCount} high-severity event{highCount > 1 ? 's' : ''} (last 5 min)
          </span>
        </>
      )}

      <div className="flex-1" />

      <button
        onClick={() => window.dispatchEvent(new CustomEvent('sentinel:open-people'))}
        className="text-gray-500 hover:text-gray-200 text-[11px] transition-colors"
      >
        People
      </button>

      <div className="h-4 w-px bg-surface-border" />

      <span className="text-gray-600">
        {new Date().toLocaleTimeString('en-US', { hour12: false })}
      </span>
    </div>
  )
}
