export type Severity = 'low' | 'medium' | 'high'

export type EventType =
  | 'zone_entry'
  | 'zone_exit'
  | 'loitering'
  | 'perimeter_breach'
  | 'unknown_vehicle'
  | 'package_detected'
  | 'camera_offline'
  | 'camera_online'
  | 'face_recognized'
  | 'unknown_face'

export interface Camera {
  id: string
  name: string
  stream_url: string
  config_id: string | null
  is_active: boolean
  frame_width: number | null
  frame_height: number | null
  created_at: string
  updated_at: string
}

export interface Detection {
  id: string
  camera_id: string
  frame_number: number
  timestamp: string
  class_name: string
  confidence: number
  bbox_x1: number
  bbox_y1: number
  bbox_x2: number
  bbox_y2: number
  tracker_id: number | null
  zone_id: string | null
  created_at: string
}

export interface AISummary {
  id: string
  event_id: string
  summary_text: string
  model_used: string
  tokens_used: number | null
  created_at: string
}

export interface SentinelEvent {
  id: string
  camera_id: string
  track_id: string | null
  event_type: EventType
  zone_id: string | null
  class_name: string | null
  severity: Severity
  timestamp: string
  metadata_json: Record<string, unknown> | null
  created_at: string
  ai_summary: AISummary | null
}

// Property config from /api/v1/property
export interface ZoneConfig {
  id: string
  name: string
  camera_id: string
  polygon: [number, number][]  // normalized [0,1] coords
  alert_classes: string[]
}

export interface CameraConfig {
  id: string
  name: string
  position: { x_meters?: number; y_meters?: number }
  fov_degrees: number
}

export interface PropertyConfig {
  name: string
  cameras: CameraConfig[]
  zones: ZoneConfig[]
}

export interface Person {
  id: string
  name: string
  role: string
  notes: string | null
  created_at: string
  photo_count: number
}

// WebSocket message envelope
export interface WsMessage {
  topic: 'detection.new' | 'event.created' | 'ai_summary.created' | 'heartbeat'
  payload?: unknown
  ts: string
}
