import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { Video, ExternalLink, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext.jsx'

export default function LiveSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const loadSession = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    if (silent) setRefreshing(true)
    try {
      const r = await api.get(`/sessions/${id}/`)
      setSession(r.data)
    } catch {
      toast.error('Session not found')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadSession()
  }, [id])

  useEffect(() => {
    if (searchParams.get('calendar') === 'connected') {
      toast.success('Google Calendar connected')
      loadSession({ silent: true })
      navigate(`/sessions/${id}`, { replace: true })
    }
  }, [id, navigate, searchParams])

  useEffect(() => {
    if (!session?.meet_link && isSessionActiveWindow(session)) {
      const intervalId = window.setInterval(() => {
        loadSession({ silent: true })
      }, 15000)
      return () => window.clearInterval(intervalId)
    }
  }, [session?.id, session?.meet_link, session?.scheduled_at, session?.duration_minutes])

  const connectGoogleCalendar = async () => {
    setConnecting(true)
    try {
      const { data } = await api.get('/sessions/google-calendar/connect/', {
        params: { next: `/sessions/${id}` },
      })
      if (data.connected) {
        toast.success('Google Calendar is already connected')
        await loadSession({ silent: true })
        return
      }
      if (data.authorization_url) {
        window.location.href = data.authorization_url
        return
      }
      toast.error(data.error || 'Could not start Google Calendar connection')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not start Google Calendar connection')
    } finally {
      setConnecting(false)
    }
  }

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
                session.session_state === 'live' ? 'bg-red-500 text-white animate-pulse' :
                session.session_state === 'ended' ? 'bg-white/20 text-white' :
                'bg-green-500 text-white'
              }`}>
                {getSessionBannerLabel(session)}
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
            {session.can_join ? (
              <a
                href={session.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold w-full flex items-center justify-center gap-2 py-4 text-base font-bold"
              >
                <ExternalLink size={18} />
                Join Now →
              </a>
            ) : session.session_state === 'ended' ? (
              <div className="text-center p-4 bg-gray-50 rounded-xl text-gray-400 text-sm">
                Session Ended
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl text-sm text-center">
                <p className="text-gray-500">
                  {session.session_state === 'upcoming'
                    ? 'Starts Soon. The join button will appear automatically when the session goes live.'
                    : session.google_calendar_connected
                    ? 'Meeting link is still being generated. This page will keep checking automatically.'
                    : getCalendarHelpMessage(user?.role)}
                </p>
                <div className="mt-3 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => loadSession({ silent: true })}
                    className="inline-flex items-center gap-2 text-navy-500 font-semibold hover:underline"
                    disabled={refreshing}
                  >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh Link'}
                  </button>
                  {!session.google_calendar_connected && ['faculty', 'admin'].includes(user?.role) && (
                    <button
                      type="button"
                      onClick={connectGoogleCalendar}
                      className="inline-flex items-center gap-2 text-gold-700 font-semibold hover:underline"
                      disabled={connecting}
                    >
                      {connecting ? 'Connecting...' : 'Connect Calendar'}
                    </button>
                  )}
                </div>
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

function isSessionActiveWindow(session) {
  if (!session?.scheduled_at) return false
  const start = new Date(session.scheduled_at).getTime()
  const end = start + (session.duration_minutes || 0) * 60 * 1000
  const earlyJoin = start - 10 * 60 * 1000
  const now = Date.now()
  return now >= earlyJoin && now <= end
}

function getCalendarHelpMessage(role) {
  if (role === 'student') {
    return 'The faculty or admin account must connect Google Calendar once. After that, this page will automatically pick up the Meet link for students.'
  }
  return 'Google Calendar is not connected yet, so the Meet link cannot be generated.'
}

function getSessionBannerLabel(session) {
  if (session.session_state === 'live') return 'Join Now'
  if (session.session_state === 'ended') return 'Session Ended'
  return 'Starts Soon'
}
