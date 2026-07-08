import { create } from 'zustand'
import type { Camera, Detection, SentinelEvent, PropertyConfig } from '@/types'

const MAX_DETECTIONS = 200
const MAX_EVENTS = 100

interface SentinelStore {
  // Property / zone map
  property: PropertyConfig | null
  setProperty: (p: PropertyConfig) => void

  // Cameras
  cameras: Camera[]
  setCameras: (cameras: Camera[]) => void

  // Live detections (rolling window)
  detections: Detection[]
  addDetection: (d: Detection) => void

  // Events timeline
  events: SentinelEvent[]
  addEvent: (e: SentinelEvent) => void
  updateEventSummary: (eventId: string, summary: SentinelEvent['ai_summary']) => void

  // UI state
  selectedZoneId: string | null
  setSelectedZoneId: (id: string | null) => void
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void

  // Camera map positions (keyed by config_id, values are fractions 0-1)
  cameraPositions: Record<string, { x: number; y: number; facing?: number }>
  setCameraPositions: (positions: Record<string, { x: number; y: number; facing?: number }>) => void

  // Floor plan version — bump to force re-fetch after upload
  floorplanVersion: number
  bumpFloorplan: () => void

  // Which camera feed is "focused" (by config_id or id)
  selectedCameraId: string | null
  setSelectedCameraId: (id: string | null) => void

  // Connection status
  connected: boolean
  setConnected: (v: boolean) => void
  lastHeartbeat: string | null
  setLastHeartbeat: (ts: string) => void
}

export const useSentinelStore = create<SentinelStore>((set) => ({
  property: null,
  setProperty: (property) => set({ property }),

  cameras: [],
  setCameras: (cameras) => set({ cameras }),

  detections: [],
  addDetection: (d) =>
    set((s) => ({
      detections: [d, ...s.detections].slice(0, MAX_DETECTIONS),
    })),

  events: [],
  addEvent: (e) =>
    set((s) => ({
      events: [e, ...s.events].slice(0, MAX_EVENTS),
    })),
  updateEventSummary: (eventId, summary) =>
    set((s) => ({
      events: s.events.map((e) =>
        e.id === eventId ? { ...e, ai_summary: summary } : e
      ),
    })),

  selectedZoneId: null,
  setSelectedZoneId: (selectedZoneId) => set({ selectedZoneId }),

  selectedEventId: null,
  setSelectedEventId: (selectedEventId) => set({ selectedEventId }),

  cameraPositions: {},
  setCameraPositions: (cameraPositions) => set({ cameraPositions }),

  floorplanVersion: 0,
  bumpFloorplan: () => set((s) => ({ floorplanVersion: s.floorplanVersion + 1 })),

  selectedCameraId: null,
  setSelectedCameraId: (selectedCameraId) => set({ selectedCameraId }),

  connected: false,
  setConnected: (connected) => set({ connected }),

  lastHeartbeat: null,
  setLastHeartbeat: (lastHeartbeat) => set({ lastHeartbeat }),
}))
