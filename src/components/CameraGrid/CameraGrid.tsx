import { useMemo } from 'react'
import { useSentinelStore } from '@/store'
import { CameraFeed } from '@/components/CameraFeed/CameraFeed'

export function CameraGrid() {
  const cameras = useSentinelStore(s => s.cameras)
  const detections = useSentinelStore(s => s.detections)
  const selectedCameraId = useSentinelStore(s => s.selectedCameraId)
  const setSelectedCameraId = useSentinelStore(s => s.setSelectedCameraId)

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

  const selectedCamera = cameras.find(
    c => (c.config_id ?? c.id) === selectedCameraId
  )
  const otherCameras = selectedCamera
    ? cameras.filter(c => c.id !== selectedCamera.id)
    : cameras

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border shrink-0">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Cameras</span>
        <span className="text-xs text-gray-600">
          {cameras.filter(c => c.is_active).length}/{cameras.length} active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Selected camera shown larger */}
        {selectedCamera && (
          <div className="mb-2">
            <CameraFeed
              camera={selectedCamera}
              hasDetection={activeCameraIds.has(selectedCamera.config_id ?? selectedCamera.id)}
              isSelected={true}
              onClick={() => setSelectedCameraId(null)}
            />
          </div>
        )}

        {/* Rest in 2-column grid */}
        <div className="grid grid-cols-2 gap-2">
          {otherCameras.map(camera => (
            <CameraFeed
              key={camera.id}
              camera={camera}
              hasDetection={activeCameraIds.has(camera.config_id ?? camera.id)}
              isSelected={false}
              onClick={() => setSelectedCameraId(camera.config_id ?? camera.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
