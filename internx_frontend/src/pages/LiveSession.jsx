import { useParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { Video, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../api/axios.js'
import toast from 'react-hot-toast'

export default function LiveSession() {
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/sessions/${id}/`)
      .then(r => setSession(r.data))
      .catch(() => toast.error('Session not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <Layout title="Live Session">
      <div className="flex items-center justify-center h-60">
        <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  )

  if (!session) return (
    <Layout title="Live Session">
      <p className="text-center text-gray-400 mt-20">Session not found.</p>
    </Layout>
  )

  return (
    <Layout title={session.title}>
      <div className="max-w-2xl mx-auto">
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-navy-500 to-navy-700 p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Video size={20} className="text-gold-400" />
              <span className={`badge text-xs ${
                session.status === 'live' ? 'bg-red-500 text-white animate-pulse' :
                session.status === 'completed' ? 'bg-white/20 text-white' :
                'bg-green-500 text-white'
              }`}>
                {session.status === 'live' ? '🔴 LIVE NOW' : session.status.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold">{session.title}</h2>
            {session.description && (
              <p className="text-navy-200 text-sm mt-2">{session.description}</p>
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Scheduled At</p>
                <p className="font-semibold text-gray-800 text-sm">
                  {new Date(session.scheduled_at).toLocaleString('en-IN', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Duration</p>
                <p className="font-semibold text-gray-800 text-sm">{session.duration_minutes} minutes</p>
              </div>
            </div>

            {/* Join button */}
            {session.meet_link ? (
              <a
                href={session.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold w-full flex items-center justify-center gap-2 py-4 text-base font-bold"
              >
                <ExternalLink size={18} />
                Join Google Meet →
              </a>
            ) : (
              <div className="text-center p-4 bg-gray-50 rounded-xl text-gray-400 text-sm">
                Meeting link not available yet
              </div>
            )}

            {/* Recording */}
            {session.recording_url && (
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">📹 Session Recording</p>
                <a
                  href={session.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy-500 hover:underline text-sm flex items-center gap-1"
                >
                  <ExternalLink size={14} />
                  Watch Recording
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
