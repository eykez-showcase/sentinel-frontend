import { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'
import { api } from '@/api/client'
import type { Person } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  family: 'Family',
  delivery: 'Delivery Driver',
  other: 'Other',
}

const ROLE_COLORS: Record<string, string> = {
  family: 'text-accent border-accent/40 bg-accent/10',
  delivery: 'text-alert-medium border-alert-medium/40 bg-alert-medium/10',
  other: 'text-gray-400 border-gray-700 bg-gray-800',
}

function PersonCard({
  person,
  onDeleted,
}: {
  person: Person
  onDeleted: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoCount, setPhotoCount] = useState(person.photo_count)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await api.persons.uploadPhoto(person.id, file)
      setPhotoCount(c => c + 1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Remove ${person.name}?`)) return
    await api.persons.delete(person.id)
    onDeleted()
  }

  return (
    <div className="border border-surface-border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-gray-100 text-sm">{person.name}</div>
          <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border', ROLE_COLORS[person.role] ?? ROLE_COLORS.other)}>
            {ROLE_LABELS[person.role] ?? person.role}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className="text-gray-700 hover:text-alert-high text-xs transition-colors shrink-0"
        >
          Remove
        </button>
      </div>

      {person.notes && (
        <p className="text-gray-500 text-xs">{person.notes}</p>
      )}

      <div className="flex items-center gap-2">
        <span className="text-gray-600 text-xs">{photoCount} photo{photoCount !== 1 ? 's' : ''} enrolled</span>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-[10px] px-2 py-0.5 rounded border border-surface-border text-gray-400 hover:text-gray-200 disabled:opacity-50 transition-colors"
        >
          {uploading ? 'Processing…' : '+ Add Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
      </div>
      {error && <p className="text-alert-high text-[10px]">{error}</p>}
    </div>
  )
}

export function PersonManager({ onClose }: { onClose: () => void }) {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('family')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.persons.list()
      setPersons(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await api.persons.create({ name: newName.trim(), role: newRole, notes: newNotes.trim() || undefined })
      setNewName('')
      setNewRole('family')
      setNewNotes('')
      setShowAdd(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-surface-border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
          <span className="font-semibold text-gray-200 text-sm">Known People</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-lg leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-gray-500 text-xs text-center py-8">Loading…</div>
          ) : persons.length === 0 && !showAdd ? (
            <div className="text-gray-600 text-xs text-center py-8">
              No people enrolled yet.<br />Add family members and delivery drivers so Sentinel can recognize them.
            </div>
          ) : (
            persons.map(p => (
              <PersonCard key={p.id} person={p} onDeleted={load} />
            ))
          )}

          {/* Add person form */}
          {showAdd && (
            <div className="border border-accent/30 rounded-lg p-3 space-y-2">
              <input
                autoFocus
                className="w-full bg-surface-raised border border-surface-border rounded px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-accent"
                placeholder="Name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <select
                className="w-full bg-surface-raised border border-surface-border rounded px-2 py-1.5 text-sm text-gray-100 outline-none"
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
              >
                <option value="family">Family</option>
                <option value="delivery">Delivery Driver</option>
                <option value="other">Other</option>
              </select>
              <input
                className="w-full bg-surface-raised border border-surface-border rounded px-2 py-1.5 text-sm text-gray-400 outline-none"
                placeholder="Notes (optional)"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={saving || !newName.trim()}
                  className="flex-1 py-1.5 rounded bg-accent/20 border border-accent/40 text-accent text-xs hover:bg-accent/30 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 rounded border border-surface-border text-gray-500 text-xs hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showAdd && (
          <div className="px-4 py-3 border-t border-surface-border shrink-0">
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-2 rounded border border-surface-border text-gray-400 hover:text-gray-200 hover:border-accent/50 text-xs transition-colors"
            >
              + Add Person
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
