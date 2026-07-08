import { useEffect, useRef, useCallback } from 'react'
import type { WsMessage } from '@/types'

type Handler = (msg: WsMessage) => void

export function useWebSocket(onMessage: Handler) {
  const wsRef = useRef<WebSocket | null>(null)
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws`)

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage
        handlerRef.current(msg)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      // Reconnect after 3 seconds on unexpected close.
      setTimeout(connect, 3000)
    }

    wsRef.current = ws
    return ws
  }, [])

  useEffect(() => {
    const ws = connect()
    return () => {
      ws.onclose = null  // prevent reconnect on intentional unmount
      ws.close()
    }
  }, [connect])
}
