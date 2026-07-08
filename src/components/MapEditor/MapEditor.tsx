import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { useSentinelStore } from '@/store'
import { api } from '@/api/client'
import type { Camera } from '@/types'

type CameraPos = { x: number; y: number; facing?: number }

const FOV_DEG = 70   // field-of-view cone angle
const CONE_LEN = 56  // px length of the cone on screen

/** SVG cone showing camera field of view */
function FovCone({ facing = 0, isActive, isSelected }: { facing?: number; isActive: boolean; isSelected: boolean }) {
  const rad = (facing - 90) * (Math.PI / 180) // 0° = up
  const half = (FOV_DEG / 2) * (Math.PI / 180)
  const l1x = Math.cos(rad - half) * CONE_LEN
  const l1y = Math.sin(rad - half) * CONE_LEN
  const l2x = Math.cos(rad + half) * CONE_LEN
  const l2y = Math.sin(rad + half) * CONE_LEN

  const color = isSelected ? '#58a6ff' : isActive ? '#f85149' : '#4b5563'

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: '50%', top: '50%',
        width: CONE_LEN * 2 + 4, height: CONE_LEN * 2 + 4,
        transform: 'translate(-50%, -50%)',
        overflow: 'visible',
      }}
    >
      <path
        d={`M 0 0 L ${l1x} ${l1y} A ${CONE_LEN} ${CONE_LEN} 0 0 1 ${l2x} ${l2y} Z`}
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeOpacity={0.5}
        strokeWidth={1}
      />
    </svg>
  )
}

/** Drag handle at the tip of the cone for rotating */
function RotateHandle({ facing = 0, onMouseDown }: { facing?: number; onMouseDown: (e: React.MouseEvent) => void }) {
  const rad = (facing - 90) * (Math.PI / 180)
  const tx = Math.cos(rad) * (CONE_LEN + 6)
  const ty = Math.sin(rad) * (CONE_LEN + 6)

  return (
    <div
      className="absolute w-4 h-4 rounded-full bg-accent border-2 border-white cursor-grab active:cursor-grabbing z-10 hover:scale-125 transition-transform"
      style={{
        left: '50%', top: '50%',
        transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`,
      }}
      onMouseDown={onMouseDown}
    />
  )
}

interface CameraMarkerProps {
  camera: Camera
  position: CameraPos
  isActive: boolean
  isSelected: boolean
  editMode: boolean
  onPositionMouseDown: (e: React.MouseEvent, cameraId: string) => void
  onRotateMouseDown: (e: React.MouseEvent, cameraId: string) => void
  onClick: (cameraId: string) => void
}

function CameraMarker({ camera, position, isActive, isSelected, editMode, onPositionMouseDown, onRotateMouseDown, onClick }: CameraMarkerProps) {
  return (
    <div
      className="absolute"
      style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
    >
      {/* FOV cone — always visible */}
      <FovCone facing={position.facing} isActive={isActive} isSelected={isSelected} />

      {/* Rotation handle — edit mode only */}
      {editMode && (
        <RotateHandle
          facing={position.facing}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRotateMouseDown(e, camera.config_id ?? camera.id) }}
        />
      )}

      {/* Camera icon */}
      <div
        className={clsx(
          'absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5',
          editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        )}
        onMouseDown={(e) => editMode && onPositionMouseDown(e, camera.config_id ?? camera.id)}
        onClick={() => !editMode && onClick(camera.config_id ?? camera.id)}
      >
        {/* Pulse ring when active */}
        {isActive && (
          <div className="absolute w-10 h-10 rounded-full border-2 border-alert-high animate-ping opacity-60" />
        )}
        <div className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-lg transition-colors',
          isSelected ? 'bg-accent border-accent' : isActive ? 'bg-alert-high/20 border-alert-high' : 'bg-surface-raised border-surface-border'
        )}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isActive ? 'text-alert-high' : 'text-gray-400'}>
            <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <span className="text-[9px] text-gray-300 bg-black/70 px-1 rounded whitespace-nowrap max-w-[80px] truncate">
          {camera.name}
        </span>
      </div>
    </div>
  )
}

export function MapEditor() {
  const cameras = useSentinelStore(s => s.cameras)
  const detections = useSentinelStore(s => s.detections)
  const cameraPositions = useSentinelStore(s => s.cameraPositions)
  const setCameraPositions = useSentinelStore(s => s.setCameraPositions)
  const floorplanVersion = useSentinelStore(s => s.floorplanVersion)
  const bumpFloorplan = useSentinelStore(s => s.bumpFloorplan)
  const selectedCameraId = useSentinelStore(s => s.selectedCameraId)
  const setSelectedCameraId = useSentinelStore(s => s.setSelectedCameraId)

  const [editMode, setEditMode] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<string | null>(null)
  const [hasFloorplan, setHasFloorplan] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const positionsRef = useRef(cameraPositions)
  positionsRef.current = cameraPositions

  useEffect(() => {
    fetch('/api/v1/map/floorplan', { method: 'HEAD' })
      .then(r => setHasFloorplan(r.ok))
      .catch(() => setHasFloorplan(false))
  }, [floorplanVersion])

  useEffect(() => {
    api.map.getPositions().then(pos => {
      if (Object.keys(pos).length > 0) setCameraPositions(pos)
    }).catch(() => {})
  }, [])

  const activeCameraIds = useMemo(() => {
    const cutoff = Date.now() - 5000
    const uuidToConfigId: Record<string, string> = {}
    cameras.forEach(c => { if (c.config_id) uuidToConfigId[c.id] = c.config_id })
    return new Set(
      detections
        .filter(d => new Date(d.timestamp).getTime() > cutoff)
        .map(d => uuidToConfigId[d.camera_id] ?? d.camera_id)
    )
  }, [detections, cameras])

  const getPosition = useCallback((camera: Camera): CameraPos => {
    const key = camera.config_id ?? camera.id
    return cameraPositions[key] ?? { x: 0.1 + (cameras.indexOf(camera) * 0.13) % 0.8, y: 0.15, facing: 180 }
  }, [cameraPositions, cameras])

  const handlePositionMouseDown = useCallback((e: React.MouseEvent, cameraId: string) => {
    e.preventDefault()
    setDraggingId(cameraId)
  }, [])

  const handleRotateMouseDown = useCallback((e: React.MouseEvent, cameraId: string) => {
    e.preventDefault()
    setRotatingId(cameraId)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mapRef.current) return
    const rect = mapRef.current.getBoundingClientRect()

    if (draggingId) {
      const x = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width))
      const y = Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height))
      setCameraPositions({ ...positionsRef.current, [draggingId]: { ...positionsRef.current[draggingId], x, y } })
    }

    if (rotatingId) {
      const pos = positionsRef.current[rotatingId]
      if (!pos) return
      // Camera center in px
      const cx = rect.left + pos.x * rect.width
      const cy = rect.top + pos.y * rect.height
      // Angle from center to mouse (0=up, clockwise)
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const facing = Math.round((Math.atan2(dy, dx) * (180 / Math.PI) + 90 + 360) % 360)
      setCameraPositions({ ...positionsRef.current, [rotatingId]: { ...pos, facing } })
    }
  }, [draggingId, rotatingId, setCameraPositions])

  const handleMouseUp = useCallback(() => {
    if (draggingId || rotatingId) {
      api.map.savePositions(positionsRef.current).catch(() => {})
      setDraggingId(null)
      setRotatingId(null)
    }
  }, [draggingId, rotatingId])

  const handleFloorplanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await api.map.uploadFloorplan(file)
    bumpFloorplan()
    setHasFloorplan(true)
  }

  const floorplanUrl = hasFloorplan
    ? `/api/v1/map/floorplan?v=${floorplanVersion}`
    : null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border shrink-0">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Property Map</span>
        <div className="flex items-center gap-2">
          {editMode && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] px-2 py-1 rounded border border-surface-border text-gray-400 hover:text-gray-200 transition-colors"
            >
              Upload Floor Plan
            </button>
          )}
          <button
            onClick={() => setEditMode(e => !e)}
            className={clsx(
              'text-[10px] px-2 py-1 rounded border transition-colors',
              editMode
                ? 'border-accent text-accent'
                : 'border-surface-border text-gray-500 hover:text-gray-300'
            )}
          >
            {editMode ? 'Done Editing' : 'Edit Layout'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFloorplanUpload}
        />
      </div>

      <div
        ref={mapRef}
        className="flex-1 relative overflow-hidden select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {floorplanUrl ? (
          <img
            src={floorplanUrl}
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-700">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            <span className="text-gray-700 text-xs">
              {editMode ? 'Upload a floor plan to get started' : 'Click "Edit Layout" to add a floor plan'}
            </span>
          </div>
        )}

        {!floorplanUrl && (
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#30363d" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mapgrid)"/>
          </svg>
        )}

        {cameras.map(camera => {
          const key = camera.config_id ?? camera.id
          return (
            <CameraMarker
              key={camera.id}
              camera={camera}
              position={getPosition(camera)}
              isActive={activeCameraIds.has(key)}
              isSelected={selectedCameraId === key}
              editMode={editMode}
              onPositionMouseDown={handlePositionMouseDown}
              onRotateMouseDown={handleRotateMouseDown}
              onClick={setSelectedCameraId}
            />
          )
        })}

        {editMode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-600 bg-black/60 px-3 py-1 rounded-full pointer-events-none">
            Drag icon to move · Drag blue dot to rotate
          </div>
        )}
      </div>
    </div>
  )
}
