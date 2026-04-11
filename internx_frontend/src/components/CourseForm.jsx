import { useState } from 'react'
import api from '../api/axios.js'
import toast from 'react-hot-toast'

/**
 * Reusable Course Form for Create and Edit.
 * @param {object} initialData - Optional course data for editing
 * @param {function} onSuccess - Callback after success
 * @param {function} onCancel - Callback to close the form
 */
export default function CourseForm({ initialData, onSuccess, onCancel }) {
  const [form, setForm] = useState(initialData || {
    title: '',
    description: '',
    level: 'beginner',
    duration_weeks: 4,
    status: 'published',
    price: 0,
    is_free: true,
  })
  const [loading, setLoading] = useState(false)

  const isEdit = !!initialData?.id

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/courses/${initialData.id}/`, form)
        toast.success('Course updated! 🎉')
      } else {
        await api.post('/courses/', form)
        toast.success('Course created! 🎉')
      }
      onSuccess()
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || 'Operation failed'
      // If error is an object (common in DRF validation), show the first message
      const firstError = typeof errorMsg === 'object' ? Object.values(errorMsg)[0] : errorMsg
      toast.error(typeof firstError === 'string' ? firstError : 'Failed to save course')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-slide-up shadow-xl border border-gray-100">
        <h3 className="text-xl font-bold text-navy-500 mb-5">
          {isEdit ? 'Edit Course' : 'Create New Course'}
        </h3>
        
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
            <input
              placeholder="e.g. Full-Stack React Mastery" required
              className="input" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              placeholder="What will students learn?" rows={3} required
              className="input resize-none" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
              <select
                className="input" value={form.level}
                onChange={e => setForm({ ...form, level: e.target.value })}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Weeks)</label>
              <input
                type="number" min="1" max="52" required
                placeholder="Duration" className="input"
                value={form.duration_weeks}
                onChange={e => setForm({ ...form, duration_weeks: parseInt(e.target.value) || 4 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="input" value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Price (optional)</label>
               <input
                type="number" min="0" step="0.01"
                placeholder="0.00" className="input"
                value={form.price}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0
                  setForm({ ...form, price: val, is_free: val === 0 })
                }}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit" 
              className="btn-primary flex-1 py-3" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              ) : isEdit ? 'Update Course' : 'Create Course'}
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
