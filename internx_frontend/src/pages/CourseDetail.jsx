import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import { Video, ClipboardList, Calendar, Clock, Users, Play } from 'lucide-react'

export default function CourseDetail() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [sessions, setSessions] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [c, s, a] = await Promise.all([
          api.get(`/courses/${id}/`),
          api.get('/sessions/', { params: { course: id } }),
          api.get('/assignments/', { params: { course: id } }),
        ])
        setCourse(c.data)
        setSessions(s.data.results || s.data)
        setAssignments(a.data.results || a.data)
      } catch { toast.error('Failed to load course') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  if (loading) return (
    <Layout title="Course">
      <div className="flex items-center justify-center h-60">
        <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  )

  if (!course) return (
    <Layout title="Course">
      <p className="text-gray-400 text-center mt-20">Course not found.</p>
    </Layout>
  )

  return (
    <Layout title={course.title}>
      {/* Hero */}
      <div className="bg-gradient-to-br from-navy-500 to-navy-700 rounded-2xl p-6 text-white mb-6">
        <div className="flex flex-wrap gap-3 mb-3">
          <span className="badge bg-white/20 text-white capitalize">{course.level}</span>
          <span className="badge bg-white/20 text-white">{course.duration_weeks} weeks</span>
          <span className="badge bg-white/20 text-white flex items-center gap-1">
            <Users size={11} /> {course.enrolled_count} students
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-2">{course.title}</h2>
        <p className="text-navy-200 text-sm">{course.description}</p>
        <p className="text-navy-300 text-xs mt-2">Faculty: {course.faculty_name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Sessions */}
        <div>
          <h3 className="section-title flex items-center gap-2">
            <Video size={20} className="text-gold-500" /> Live Sessions
          </h3>
          {sessions.length === 0 ? (
            <div className="card p-6 text-center text-gray-400 text-sm">
              No sessions scheduled yet
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-navy-500 text-sm">{s.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(s.scheduled_at).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {s.duration_minutes}min
                        </span>
                      </div>
                    </div>
                    <span className={`badge flex-shrink-0 ${
                      s.status === 'live' ? 'bg-red-100 text-red-700 animate-pulse' :
                      s.status === 'completed' ? 'badge-gray' : 'badge-green'
                    }`}>
                      {s.status === 'live' ? '🔴 LIVE' : s.status}
                    </span>
                  </div>
                  {s.meet_link && (
                    <a
                      href={s.meet_link} target="_blank" rel="noopener noreferrer"
                      className="btn-gold w-full text-center text-sm mt-3 block py-2 flex items-center justify-center gap-2"
                    >
                      <Play size={14} /> Join Meeting
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignments */}
        <div>
          <h3 className="section-title flex items-center gap-2">
            <ClipboardList size={20} className="text-gold-500" /> Assignments
          </h3>
          {assignments.length === 0 ? (
            <div className="card p-6 text-center text-gray-400 text-sm">
              No assignments posted yet
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map(a => (
                <div key={a.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-navy-500 text-sm">{a.title}</h4>
                    <span className={`badge flex-shrink-0 ${a.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {a.is_active ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                    <span>{a.total_questions} questions</span>
                    <span>{a.total_marks} marks</span>
                    <span>Pass: {a.pass_percentage}%</span>
                    {a.time_limit_minutes > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {a.time_limit_minutes}min
                      </span>
                    )}
                  </div>
                  {a.is_active && (
                    <Link
                      to={`/assignments/${a.id}`}
                      className="btn-primary w-full text-center text-sm py-2 block"
                    >
                      Start Assignment →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
