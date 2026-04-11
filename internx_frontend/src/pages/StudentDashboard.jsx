import { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { Link } from 'react-router-dom'
import api from '../api/axios.js'
import { BookOpen, Award, ClipboardCheck, TrendingUp } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-6 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-navy-500">{value}</p>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [results, setResults] = useState([])
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [e, r, c] = await Promise.all([
          api.get('/courses/enrollments/'),
          api.get('/results/'),
          api.get('/certificates/'),
        ])
        setEnrollments(e.data.results || e.data)
        setResults(r.data.results || r.data)
        setCertificates(c.data.results || c.data)
      } catch { /* handled by interceptor */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const passed = results.filter(r => r.status === 'passed').length

  return (
    <Layout title="My Dashboard">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-navy-500 to-navy-700 rounded-2xl p-6 text-white mb-6">
        <p className="text-navy-200 text-sm mb-1">Welcome back 👋</p>
        <h2 className="text-2xl font-bold">{user?.first_name} {user?.last_name}</h2>
        <p className="text-navy-200 mt-1">Keep up the great work!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Enrolled" value={enrollments.length} color="bg-navy-500" />
        <StatCard icon={ClipboardCheck} label="Passed" value={passed} color="bg-green-500" />
        <StatCard icon={Award} label="Certificates" value={certificates.length} color="bg-gold-500" />
        <StatCard icon={TrendingUp} label="Submissions" value={results.length} color="bg-purple-500" />
      </div>

      {/* Enrollments */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">My Courses</h3>
          <Link to="/courses" className="text-gold-600 text-sm font-semibold hover:underline">
            Browse all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No enrollments yet</p>
            <Link to="/courses" className="btn-primary inline-block mt-4">
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.map(en => (
              <div key={en.id} className="card p-5">
                <h4 className="font-semibold text-navy-500 mb-1 leading-tight">{en.course_title}</h4>
                <p className="text-xs text-gray-400 mb-3">
                  Enrolled {new Date(en.enrolled_at).toLocaleDateString()}
                </p>
                <span className={`badge ${en.status === 'completed' ? 'badge-green' : 'badge-navy'}`}>
                  {en.status}
                </span>
                <Link
                  to={`/courses/${en.course}`}
                  className="btn-outline w-full text-center text-sm mt-3 block py-2"
                >
                  Go to Course →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Results */}
      {results.length > 0 && (
        <div>
          <h3 className="section-title mb-4">Recent Results</h3>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Assignment', 'Course', 'Score', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 5).map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium">{r.assignment_title}</td>
                    <td className="px-5 py-3 text-gray-500">{r.course_title}</td>
                    <td className="px-5 py-3 font-semibold">{parseFloat(r.percentage).toFixed(1)}%</td>
                    <td className="px-5 py-3">
                      <span className={r.status === 'passed' ? 'badge-green' : 'badge-red'}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {new Date(r.submitted_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}
