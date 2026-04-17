import { useMemo, useState } from 'react'
import api from '../api/axios.js'
import toast from 'react-hot-toast'

/**
 * Modal form for scheduling a Live Session.
 */
export default function SessionForm({ courseId, initialData, onSuccess, onCancel }) {
  const initialForm = useMemo(() => ({
    title: initialData?.title || '',
    description: initialData?.description || '',
    scheduled_at: formatDateTimeLocal(initialData?.scheduled_at || ''),
    duration_minutes: String(initialData?.duration_minutes || 60),
    status: initialData?.status || 'scheduled',
  }), [initialData])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)

  const isEdit = !!initialData?.id

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        course: Number(courseId),
        scheduled_at: toApiDateTime(form.scheduled_at),
        duration_minutes: normalizeDuration(form.duration_minutes),
      }
      if (isEdit) {
        await api.put(`/sessions/${initialData.id}/`, payload)
        toast.success('Session updated!')
      } else {
        await api.post('/sessions/', payload)
        toast.success('Timetable saved. Meet link will be generated automatically.')
      }
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-slide-up shadow-xl">
        <h3 className="text-xl font-bold text-navy-500 mb-5">
          {isEdit ? 'Edit Session' : 'Schedule Live Class'}
        </h3>
        
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Title</label>
            <input
              placeholder="e.g. Q&A Session - Module 1" required
              className="input" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule At</label>
            <input
              type="datetime-local" required
              className="input" value={form.scheduled_at}
              onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows="3"
              placeholder="Add agenda or class notes for students"
              className="input min-h-24 py-3"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Min)</label>
              <input
                type="number" min="15" step="15" required
                className="input" value={form.duration_minutes}
                onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                onBlur={e => setForm({
                  ...form,
                  duration_minutes: String(normalizeDuration(e.target.value)),
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="input" value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <option value="scheduled">Scheduled</option>
                {isEdit && <option value="live">Live Now</option>}
                {isEdit && <option value="completed">Completed</option>}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Meet Link</label>
            <input
              type="text"
              placeholder="Generated automatically 10 minutes before class"
              className="input bg-gray-50 text-gray-400"
              value={initialData?.meet_link || ''}
              readOnly
            />
            <p className="text-xs text-gray-400 mt-1">
              Faculty only needs to save the timetable. The backend will create and send the Meet invite automatically.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1 py-3" disabled={loading}>
              {loading ? 'Saving…' : (isEdit ? 'Update Session' : 'Schedule Session')}
            </button>
            <button
              type="button" onClick={onCancel}
              className="btn-outline flex-1 py-3"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function toApiDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toISOString()
}

function getErrorMessage(err) {
  const data = err?.response?.data
  if (!data) return 'Failed to save session'
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error
  if (typeof data === 'string') return data

  const firstEntry = Object.entries(data).find(([, value]) => value)
  if (!firstEntry) return 'Failed to save session'

  const [field, value] = firstEntry
  if (Array.isArray(value)) return `${field.replaceAll('_', ' ')}: ${value[0]}`
  if (typeof value === 'string') return `${field.replaceAll('_', ' ')}: ${value}`
  return 'Failed to save session'
}

function normalizeDuration(value) {
  const parsed = parseInt(value, 10)
  if (Number.isNaN(parsed)) return 60
  if (parsed < 15) return 15
  return parsed
}
