import { useSentinelStore } from '@/store'
import { formatDistanceToNow } from 'date-fns'

export function SummaryPanel() {
  const events = useSentinelStore((s) => s.events)

  const summaries = events
    .filter((e) => e.ai_summary != null)
    .sort((a, b) => new Date(b.ai_summary!.created_at).getTime() - new Date(a.ai_summary!.created_at).getTime())
    .slice(0, 10)

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-surface-border shrink-0">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">
          AI Summaries
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-surface-border/50">
        {summaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="text-gray-600 text-xs mb-1">No summaries yet</div>
            <div className="text-gray-700 text-[10px]">
              Click an event in the feed and select "Generate AI summary"
            </div>
          </div>
        ) : (
          summaries.map((e) => (
            <div key={e.ai_summary!.id} className="px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-accent uppercase tracking-wide">
                  {e.event_type.replace(/_/g, ' ')}
                </span>
                {e.zone_id && (
                  <span className="text-[10px] text-gray-600">
                    · {e.zone_id.replace(/_/g, ' ')}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-gray-600">
                  {formatDistanceToNow(new Date(e.ai_summary!.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                {e.ai_summary!.summary_text}
              </p>
              <div className="text-[10px] text-gray-600 mt-1">
                {e.ai_summary!.model_used}
                {e.ai_summary!.tokens_used != null && ` · ${e.ai_summary!.tokens_used} tokens`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
