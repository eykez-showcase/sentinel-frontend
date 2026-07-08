import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import { useSentinelStore } from '@/store'
import { api } from '@/api/client'
import type { SentinelEvent } from '@/types'

const SEVERITY_CLASSES: Record<string, string> = {
  low: 'text-alert-low border-alert-low/30',
  medium: 'text-alert-medium border-alert-medium/30',
  high: 'text-alert-high border-alert-high/30',
}


const EVENT_ICONS: Record<string, string> = {
  zone_entry: '→',
  zone_exit: '←',
  loitering: '⏱',
  perimeter_breach: '⚠',
  unknown_vehicle: '🚗',
  package_detected: '📦',
  camera_offline: '✗',
  camera_online: '✓',
}

function EventRow({ event }: { event: SentinelEvent }) {
  const [summarizing, setSummarizing] = useState(false)
  const updateEventSummary = useSentinelStore((s) => s.updateEventSummary)
  const selectedEventId = useSentinelStore((s) => s.selectedEventId)
  const setSelectedEventId = useSentinelStore((s) => s.setSelectedEventId)
  const isSelected = selectedEventId === event.id

  const handleSummarize = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setSummarizing(true)
    try {
      const summary = await api.events.summarize(event.id)
      updateEventSummary(event.id, summary as SentinelEvent['ai_summary'])
    } catch {
      // silently fail — summary unavailable
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <div
      className={clsx(
        'border-l-2 pl-3 py-2 cursor-pointer transition-colors',
        SEVERITY_CLASSES[event.severity],
        isSelected ? 'bg-surface-raised' : 'hover:bg-surface-raised/50'
      )}
      onClick={() => setSelectedEventId(isSelected ? null : event.id)}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{EVENT_ICONS[event.event_type] ?? '•'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-200 text-xs uppercase tracking-wide">
              {event.event_type.replace(/_/g, ' ')}
            </span>
            <span
              className={clsx(
                'text-[10px] px-1.5 py-0.5 rounded-full border',
                SEVERITY_CLASSES[event.severity]
              )}
            >
              {event.severity}
            </span>
          </div>
          <div className="text-gray-400 text-xs mt-0.5">
            {event.class_name && <span className="text-gray-300">{event.class_name}</span>}
            {event.zone_id && (
              <span className="text-gray-500"> · {event.zone_id.replace(/_/g, ' ')}</span>
            )}
          </div>
          <div className="text-gray-600 text-[10px] mt-1">
            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
          </div>

          {/* AI Summary */}
          {event.ai_summary ? (
            <div className="mt-2 text-[11px] text-gray-400 bg-surface border border-surface-border rounded p-2 leading-relaxed">
              {event.ai_summary.summary_text}
            </div>
          ) : isSelected ? (
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="mt-2 text-[10px] text-accent hover:text-accent-dim disabled:text-gray-600 transition-colors"
            >
              {summarizing ? 'Generating summary…' : '+ Generate AI summary'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function EventFeed() {
  const events = useSentinelStore((s) => s.events)
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all'
    ? events
    : events.filter((e) => e.severity === filter || e.event_type === filter)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border shrink-0">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">
          Event Feed
        </span>
        <span className="text-xs text-gray-600">{events.length} events</span>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-3 py-2 border-b border-surface-border shrink-0">
        {['all', 'high', 'medium', 'loitering', 'zone_entry'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'text-[10px] px-2 py-0.5 rounded transition-colors',
              filter === f
                ? 'bg-accent/20 text-accent'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-border/50">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">
            No events yet
          </div>
        ) : (
          filtered.map((e) => <EventRow key={e.id} event={e} />)
        )}
      </div>
    </div>
  )
}
