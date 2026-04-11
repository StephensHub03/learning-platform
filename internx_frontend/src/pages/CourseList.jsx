import { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import { Link } from 'react-router-dom'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import { Search, BookOpen, Users, Plus, Trash2, Edit } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import CourseForm from '../components/CourseForm.jsx'

export default function CourseList() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [enrolling, setEnrolling] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  
  // Faculty assignment modal state
  const [managingCourse, setManagingCourse] = useState(null)
  const [facultyList, setFacultyList] = useState([])
  const [selectedFaculty, setSelectedFaculty] = useState('')
  const [assigning, setAssigning] = useState(false)

  const load = async () => {
    try {
      const { data } = await api.get('/courses/', {
        params: { 
          search, 
          level: level || undefined, 
          status: user?.role === 'admin' ? undefined : 'published' 
        }
      })
      setCourses(data.results || data)
    } catch { toast.error('Failed to load courses') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, level, user?.role])

  const openManageModal = async (course) => {
    setManagingCourse(course)
    setSelectedFaculty(course.faculty || '')
    if (facultyList.length === 0) {
      try {
        const { data } = await api.get('/auth/users/?role=faculty')
        setFacultyList(data.results || data)
      } catch {
        // Fallback: try to fetch all users if the above doesn't work
        const { data } = await api.get('/admin-panel/analytics/')
        setFacultyList((data.all_users || []).filter(u => u.role === 'faculty'))
      }
    }
  }

  const assignFaculty = async () => {
    if (!selectedFaculty || !managingCourse) return
    setAssigning(true)
    try {
      await api.patch(`/courses/${managingCourse.id}/`, { faculty: parseInt(selectedFaculty) })
      toast.success('Faculty assigned successfully! ✅')
      setManagingCourse(null)
      load()
    } catch {
      toast.error('Failed to assign faculty')
    } finally {
      setAssigning(false)
    }
  }

  const deleteCourse = async (id) => {
    if (!confirm('Delete this course?')) return
    try {
      await api.delete(`/courses/${id}/`)
      setCourses(c => c.filter(x => x.id !== id))
      toast.success('Course deleted')
    } catch { toast.error('Failed to delete') }
  }

  const enroll = async (courseId) => {
    setEnrolling(courseId)
    try {
      await api.post(`/courses/${courseId}/enroll/`)
      toast.success('Enrolled successfully! Check your email. 🎉')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Enrollment failed')
    } finally { setEnrolling(null) }
  }

  const levelColors = { beginner: 'badge-green', intermediate: 'badge-gold', advanced: 'badge-red' }

  return (
    <Layout title="Browse Courses">
      {/* Admin controls */}
      {user.role === 'admin' && (
        <div className="flex justify-end mb-6">
          <button onClick={() => setShowCreate(true)} className="btn-gold flex items-center gap-2">
            <Plus size={18} /> New Course
          </button>
        </div>
      )}

      {showCreate && (
        <CourseForm 
          onSuccess={() => { setShowCreate(false); load() }} 
          onCancel={() => setShowCreate(false)} 
        />
      )}
      {editingCourse && (
        <CourseForm 
          initialData={editingCourse}
          onSuccess={() => { setEditingCourse(null); load() }} 
          onCancel={() => setEditingCourse(null)} 
        />
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search courses…"
            className="input pl-10" value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={level} onChange={e => setLevel(e.target.value)}
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-36 bg-gray-200 rounded-xl mb-4" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full mb-1" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-lg">No courses found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map(course => (
            <div key={course.id} className="card p-0 overflow-hidden flex flex-col">
              {/* Thumbnail */}
              <div className="h-36 bg-gradient-to-br from-navy-400 to-navy-600 flex items-center justify-center">
                {course.thumbnail
                  ? <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  : <BookOpen size={40} className="text-white/40" />
                }
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-navy-500 leading-tight line-clamp-2 flex-1">
                    {course.title}
                  </h3>
                  <span className={`badge flex-shrink-0 ${levelColors[course.level] || 'badge-gray'}`}>
                    {course.level}
                  </span>
                </div>
                <p className="text-gray-500 text-sm line-clamp-2 mb-3 flex-1">
                  {course.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Users size={11} /> {course.enrolled_count} enrolled
                  </span>
                  <span>{course.duration_weeks}w</span>
                  <span className="font-medium text-gray-500">
                    by {course.faculty_name}
                  </span>
                </div>
                <div className="flex gap-2 mt-auto">
                  {user?.role === 'admin' ? (
                    <button 
                      onClick={() => openManageModal(course)}
                      className="btn-outline flex-1 text-center text-sm py-2"
                    >
                      Manage
                    </button>
                  ) : (
                    <Link 
                      to={user?.role === 'faculty' && course.faculty === user?.id ? `/faculty/courses/${course.id}` : `/courses/${course.id}`} 
                      className="btn-outline flex-1 text-center text-sm py-2"
                    >
                      { (user?.role === 'faculty' && course.faculty === user?.id) ? 'Manage' : 'View →'}
                    </Link>
                  )}
                  {user?.role === 'admin' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingCourse(course)}
                        className="p-2 text-navy-400 hover:bg-navy-50 rounded-xl transition"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                  {user?.role === 'student' && (
                    !course.is_enrolled ? (
                      <button
                        onClick={() => enroll(course.id)}
                        disabled={enrolling === course.id}
                        className="btn-primary flex-1 text-sm py-2"
                      >
                        {enrolling === course.id ? 'Enrolling…' : 'Enroll'}
                      </button>
                    ) : (
                      <span className="badge-green flex-1 flex items-center justify-center text-sm font-medium">
                        ✓ Enrolled
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Faculty Modal */}
      {managingCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-xl border border-gray-100">
            <h3 className="text-xl font-bold text-navy-500 mb-1">Assign Faculty</h3>
            <p className="text-sm text-gray-400 mb-6">Course: <span className="font-bold text-navy-400">{managingCourse.title}</span></p>

            <label className="block text-sm font-medium text-gray-700 mb-2">Select Faculty Member</label>
            <select
              className="input mb-6"
              value={selectedFaculty}
              onChange={e => setSelectedFaculty(e.target.value)}
            >
              <option value="">-- Select a faculty member --</option>
              {facultyList.map(f => (
                <option key={f.id} value={f.id}>
                  {f.first_name || f.full_name} {f.last_name || ''} ({f.email})
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={assignFaculty}
                disabled={!selectedFaculty || assigning}
                className="btn-primary flex-1 py-3"
              >
                {assigning ? 'Saving…' : 'Assign Faculty ✓'}
              </button>
              <button onClick={() => setManagingCourse(null)} className="btn-outline flex-1 py-3">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
