/**
 * PropertyMap — SVG canvas showing zones, camera positions, and live detections.
 *
 * Coordinate system: the SVG viewBox is 1000×700 (arbitrary units).
 * Zone polygons come from the backend in normalized [0,1] coords and are
 * scaled to this viewBox. Detection centroids are computed from normalized
 * bbox coords and animated as pulsing dots.
 */

import { useMemo } from 'react'
import { useSentinelStore } from '@/store'
import type { ZoneConfig, Detection } from '@/types'

const VW = 1000
const VH = 700


const CLASS_COLORS: Record<string, string> = {
  person: '#58a6ff',
  car: '#bc8cff',
  truck: '#bc8cff',
  motorcycle: '#bc8cff',
  dog: '#79c0ff',
  cat: '#79c0ff',
}

function toSvg(nx: number, ny: number): [number, number] {
  return [nx * VW, ny * VH]
}

function zonePolygonPoints(polygon: [number, number][]): string {
  return polygon.map(([x, y]) => toSvg(x, y).join(',')).join(' ')
}


interface ZoneOverlayProps {
  zone: ZoneConfig
  isSelected: boolean
  hasActivity: boolean
  onClick: () => void
}

function ZoneOverlay({ zone, isSelected, hasActivity, onClick }: ZoneOverlayProps) {
  const points = zonePolygonPoints(zone.polygon)

  return (
    <g onClick={onClick} className="cursor-pointer" role="button" aria-label={zone.name}>
      <polygon
        points={points}
        fill={hasActivity ? 'rgba(88,166,255,0.12)' : 'rgba(255,255,255,0.03)'}
        stroke={isSelected ? '#58a6ff' : hasActivity ? '#58a6ff66' : '#30363d'}
        strokeWidth={isSelected ? 2 : 1}
        className="transition-all duration-300"
      />
      {/* Zone label at centroid */}
      <ZoneLabel zone={zone} />
    </g>
  )
}

function ZoneLabel({ zone }: { zone: ZoneConfig }) {
  const cx = zone.polygon.reduce((s, [x]) => s + x, 0) / zone.polygon.length
  const cy = zone.polygon.reduce((s, [, y]) => s + y, 0) / zone.polygon.length
  const [sx, sy] = toSvg(cx, cy)

  return (
    <text
      x={sx}
      y={sy}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={11}
      fill="#8b949e"
      className="pointer-events-none select-none"
    >
      {zone.name}
    </text>
  )
}

interface DetectionDotProps {
  detection: Detection
  zones: ZoneConfig[]
}

function DetectionDot({ detection, zones }: DetectionDotProps) {
  // Position the dot at the centroid of the matched zone (best approximation
  // without frame resolution data). If no zone, skip rendering.
  const zone = zones.find((z) => z.id === detection.zone_id)
  if (!zone) return null

  const cx = zone.polygon.reduce((s, [x]) => s + x, 0) / zone.polygon.length
  const cy = zone.polygon.reduce((s, [, y]) => s + y, 0) / zone.polygon.length
  // Offset slightly so multiple detections in same zone don't perfectly overlap.
  const jitterX = ((detection.tracker_id ?? 0) % 5) * 0.015 - 0.03
  const jitterY = ((detection.tracker_id ?? 0) % 3) * 0.02 - 0.02
  const [sx, sy] = toSvg(cx + jitterX, cy + jitterY)

  const color = CLASS_COLORS[detection.class_name] ?? '#58a6ff'

  return (
    <g>
      {/* Pulse ring */}
      <circle cx={sx} cy={sy} r={10} fill="none" stroke={color} strokeOpacity={0.4} strokeWidth={1}>
        <animate attributeName="r" from="6" to="18" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Core dot */}
      <circle cx={sx} cy={sy} r={5} fill={color} fillOpacity={0.9} />
      {/* Class label */}
      <text x={sx + 8} y={sy - 6} fontSize={9} fill={color} className="select-none">
        {detection.class_name}
        {detection.tracker_id != null ? ` #${detection.tracker_id}` : ''}
      </text>
    </g>
  )
}

function CameraIcon({ x, y, name }: { x: number; y: number; name: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={7} fill="#1f6feb" stroke="#58a6ff" strokeWidth={1.5} />
      <text textAnchor="middle" y={18} fontSize={9} fill="#8b949e" className="select-none">
        {name}
      </text>
    </g>
  )
}

export function PropertyMap() {
  const property = useSentinelStore((s) => s.property)
  const detections = useSentinelStore((s) => s.detections)
  const selectedZoneId = useSentinelStore((s) => s.selectedZoneId)
  const setSelectedZoneId = useSentinelStore((s) => s.setSelectedZoneId)
  const events = useSentinelStore((s) => s.events)

  // Zones that have activity in the last 30 seconds
  const activeZoneIds = useMemo(() => {
    const cutoff = Date.now() - 30_000
    return new Set(
      events
        .filter((e) => e.zone_id && new Date(e.timestamp).getTime() > cutoff)
        .map((e) => e.zone_id!)
    )
  }, [events])

  // Only show detections from the last 5 seconds
  const liveDetections = useMemo(() => {
    const cutoff = Date.now() - 5_000
    return detections.filter((d) => new Date(d.timestamp).getTime() > cutoff)
  }, [detections])

  if (!property) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Loading property map…
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-full"
        style={{ background: '#0d1117' }}
      >
        {/* Grid */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#161b22" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={VW} height={VH} fill="url(#grid)" />

        {/* Property boundary */}
        <rect
          x={20} y={20} width={VW - 40} height={VH - 40}
          fill="none" stroke="#30363d" strokeWidth={2} strokeDasharray="8 4"
          rx={4}
        />
        <text x={30} y={14} fontSize={10} fill="#30363d" className="select-none">
          {property.name}
        </text>

        {/* Zones */}
        {property.zones.map((zone) => (
          <ZoneOverlay
            key={zone.id}
            zone={zone}
            isSelected={selectedZoneId === zone.id}
            hasActivity={activeZoneIds.has(zone.id)}
            onClick={() =>
              setSelectedZoneId(selectedZoneId === zone.id ? null : zone.id)
            }
          />
        ))}

        {/* Camera positions (evenly spread if no real coords) */}
        {property.cameras.map((cam, i) => {
          const x = cam.position?.x_meters != null
            ? 40 + (cam.position.x_meters / 30) * (VW - 80)
            : 80 + i * 300
          const y = cam.position?.y_meters != null
            ? 40 + (cam.position.y_meters / 20) * (VH - 80)
            : 40
          return <CameraIcon key={cam.id} x={x} y={y} name={cam.name} />
        })}

        {/* Live detection dots */}
        {liveDetections.map((d) => (
          <DetectionDot key={d.id} detection={d} zones={property.zones} />
        ))}
      </svg>

      {/* Selected zone info overlay */}
      {selectedZoneId && (() => {
        const zone = property.zones.find((z) => z.id === selectedZoneId)
        if (!zone) return null
        const zoneEvents = events.filter((e) => e.zone_id === selectedZoneId).slice(0, 5)
        return (
          <div className="absolute top-3 right-3 bg-surface-raised border border-surface-border rounded-lg p-3 w-56 text-xs">
            <div className="font-semibold text-accent mb-1">{zone.name}</div>
            <div className="text-gray-500 mb-2">
              Watching: {zone.alert_classes.join(', ') || 'all'}
            </div>
            {zoneEvents.length === 0 ? (
              <div className="text-gray-600">No recent activity</div>
            ) : (
              zoneEvents.map((e) => (
                <div key={e.id} className="text-gray-400 truncate">
                  {e.event_type.replace(/_/g, ' ')} · {e.class_name}
                </div>
              ))
            )}
          </div>
        )
      })()}
    </div>
  )
}
