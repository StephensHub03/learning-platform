import { useState } from 'react'
import api from '../api/axios.js'
import toast from 'react-hot-toast'

/**
 * Modal form for scheduling a Live Session.
 */
export default function SessionForm({ courseId, initialData, onSuccess, onCancel }) {
  const [form, setForm] = useState(initialData || {
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    meet_link: '',
    status: 'scheduled'
  })
  const [loading, setLoading] = useState(false)

  const isEdit = !!initialData?.id

  // Format date for datetime-local input
  if (form.scheduled_at && !form.scheduled_at.endsWith('Z')) {
    // Already formatted or needs formatting
  } else if (form.scheduled_at) {
    const d = new Date(form.scheduled_at)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    form.scheduled_at = d.toISOString().slice(0, 16)
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, course: courseId }
      if (isEdit) {
        await api.put(`/sessions/${initialData.id}/`, payload)
        toast.success('Session updated!')
      } else {
        await api.post('/sessions/', payload)
        toast.success('Live class scheduled!')
      }
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save session')
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Min)</label>
              <input
                type="number" min="15" step="15" required
                className="input" value={form.duration_minutes}
                onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="input" value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <option value="scheduled">Scheduled</option>
                <option value="live">Live Now</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Meet Link</label>
            <input
              type="url" placeholder="https://meet.google.com/..."
              className="input" value={form.meet_link}
              onChange={e => setForm({ ...form, meet_link: e.target.value })}
            />
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
