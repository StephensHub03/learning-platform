import { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import { Link } from 'react-router-dom'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import { BookOpen, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function FacultyDashboard() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  const loadCourses = async () => {
    try {
      const { data } = await api.get('/courses/', { params: { faculty: user?.id } })
      setCourses(data.results || data)
    } catch { toast.error('Failed to load courses') }
    finally { setLoading(false) }
  }

  useEffect(() => { if (user?.id) loadCourses() }, [user?.id])

  return (
    <Layout title="Faculty Dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title">My Courses</h2>
          <p className="section-sub">Manage your courses and sessions</p>
        </div>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-lg">No courses assigned yet</p>
          <p className="text-sm mt-1">Please contact your administrator to be assigned to a course.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map(course => (
            <div key={course.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-bold text-navy-500 leading-tight">{course.title}</h4>
                <span className={`badge flex-shrink-0 ${
                  course.status === 'published' ? 'badge-green' :
                  course.status === 'draft' ? 'badge-gray' : 'badge-red'
                }`}>
                  {course.status}
                </span>
              </div>
              <p className="text-gray-500 text-sm line-clamp-2 flex-1 mb-3">
                {course.description || 'No description'}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {course.enrolled_count} students
                </span>
                <span className="capitalize badge-navy">{course.level}</span>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/faculty/courses/${course.id}`}
                  className="flex-1 btn-outline text-center text-sm py-2"
                >
                  Manage →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
