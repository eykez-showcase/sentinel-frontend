import type { Camera, Detection, Person, PropertyConfig, SentinelEvent, AISummary } from '@/types'

const BASE = '/api/v1'

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  property: {
    get: () => get<PropertyConfig>('/property'),
  },
  cameras: {
    list: () => get<{ items: Camera[]; total: number }>('/cameras'),
    start: (id: string) => post<unknown>(`/cameras/${id}/start`),
    stop: (id: string) => post<unknown>(`/cameras/${id}/stop`),
  },
  events: {
    list: (params?: {
      camera_id?: string
      event_type?: string
      zone_id?: string
      severity?: string
      limit?: number
    }) => get<SentinelEvent[]>('/events', params as Record<string, string | number>),
    summarize: (id: string) => post<AISummary>(`/events/${id}/summarize`),
    stats: () => get<{ stats: { event_type: string; zone_id: string; count: number }[] }>('/events/stats'),
  },
  detections: {
    list: (params?: { camera_id?: string; limit?: number }) =>
      get<Detection[]>('/detections', params as Record<string, string | number>),
  },
  map: {
    getPositions: () => get<Record<string, { x: number; y: number }>>('/map/positions'),
    savePositions: (positions: Record<string, { x: number; y: number }>) =>
      post<{ saved: boolean }>('/map/positions', positions),
    uploadFloorplan: async (file: File): Promise<{ filename: string }> => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/v1/map/floorplan', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload failed')
      return res.json()
    },
    floorplanUrl: () => '/api/v1/map/floorplan',
  },
  faceCamera: {
    getStatus: () => get<{
      available: boolean
      last_seen_name: string | null
      last_seen_role: string | null
      last_seen_confidence: number
      last_seen_at: string | null
    }>('/face-camera/status'),
  },
  persons: {
    list: () => get<Person[]>('/persons'),
    create: (body: { name: string; role: string; notes?: string }) =>
      post<Person>('/persons', body),
    delete: (id: string) =>
      fetch(`${BASE}/persons/${id}`, { method: 'DELETE' }).then(() => undefined),
    uploadPhoto: async (personId: string, file: File): Promise<unknown> => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/persons/${personId}/photos`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
        throw new Error(err.detail ?? 'Upload failed')
      }
      return res.json()
    },
  },
}
