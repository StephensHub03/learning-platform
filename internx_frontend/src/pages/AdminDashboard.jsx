import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Layout from '../components/Layout.jsx'
import api from '../api/axios.js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Users, BookOpen, Award, TrendingUp, ClipboardList, ShieldCheck, Circle } from 'lucide-react'
import { Link } from 'react-router-dom'
import CourseForm from '../components/CourseForm.jsx'

const COLORS = ['#1e3a5f', '#c9a84c', '#3b82f6', '#10b981', '#8b5cf6']

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-navy-500">{value}</p>
        <p className="text-gray-500 text-sm">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const ROLE_BADGE = {
  admin: 'bg-purple-100 text-purple-700',
  faculty: 'bg-blue-100 text-blue-700',
  student: 'bg-green-100 text-green-700',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [managingCourse, setManagingCourse] = useState(null) // { id, title, faculty }
  const [facultyList, setFacultyList] = useState([])
  const [selectedFaculty, setSelectedFaculty] = useState('')
  const [assigning, setAssigning] = useState(false)

  const loadData = () => {
    api.get('/admin-panel/analytics/')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const openManage = (course) => {
    setManagingCourse(course)
    setSelectedFaculty(course.faculty || '')
    // Use faculty list already loaded from analytics
    setFacultyList((stats?.all_users || []).filter(u => u.role === 'faculty'))
  }

  const assignFaculty = async () => {
    if (!selectedFaculty || !managingCourse) return
    setAssigning(true)
    try {
      await api.patch(`/courses/${managingCourse.id}/`, { faculty: parseInt(selectedFaculty) })
      toast.success('Faculty assigned successfully! ✅')
      setManagingCourse(null)
      loadData()
    } catch (err) {
      toast.error('Failed to assign faculty')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) return (
    <Layout title="Admin Dashboard">
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  )

  const enrollmentData = (stats?.enrollments_by_month || []).reverse().map(m => ({
    month: m.month, enrollments: m.count
  }))

  const roleData = [
    { name: 'Students', value: stats?.total_students || 0 },
    { name: 'Faculty', value: stats?.total_faculty || 0 },
    { name: 'Admin', value: Math.max(0, (stats?.total_users || 0) - (stats?.total_students || 0) - (stats?.total_faculty || 0)) },
  ]

  const filteredUsers = (stats?.all_users || []).filter(u => {
    const q = search.toLowerCase()
    return !q || `${u.first_name} ${u.last_name} ${u.email} ${u.role}`.toLowerCase().includes(q)
  })

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: `Users (${stats?.total_users || 0})` },
    { id: 'enrollments', label: `Enrollments (${stats?.total_enrollments || 0})` },
    { id: 'courses', label: `Courses (${stats?.total_courses || 0})` },
  ]

  const deleteCourse = async (id) => {
    if (!confirm('Delete this course?')) return
    try {
      await api.delete(`/courses/${id}/`)
      loadData()
    } catch {}
  }

  return (
    <Layout title="Admin Dashboard">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Users} label="Total Users" value={stats?.total_users || 0} color="bg-navy-500" />
        <StatCard icon={BookOpen} label="Courses" value={stats?.total_courses || 0}
          sub={`${stats?.published_courses || 0} published`} color="bg-blue-500" />
        <StatCard icon={ClipboardList} label="Enrollments" value={stats?.total_enrollments || 0} color="bg-purple-500" />
        <StatCard icon={TrendingUp} label="Pass Rate"
          value={`${(stats?.pass_rate || 0).toFixed(1)}%`} color="bg-green-500" />
        <StatCard icon={Award} label="Certificates" value={stats?.total_certificates || 0} color="bg-gold-500" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-100/40 p-1.5 rounded-2xl w-fit mb-6 border border-navy-100">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === t.id
                ? 'bg-white text-navy-500 shadow-sm border border-navy-100'
                : 'text-navy-300 hover:text-navy-500 hover:bg-white/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="card p-5 xl:col-span-2">
              <h3 className="font-bold text-navy-500 mb-4">Monthly Enrollments</h3>
              {enrollmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={enrollmentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="enrollments" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-gray-400">No enrollment data yet</div>
              )}
            </div>
            <div className="card p-5">
              <h3 className="font-bold text-navy-500 mb-4">User Role Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={roleData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}>
                    {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={10} />
                  <Tooltip formatter={(v) => [v, 'Users']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Enrollments */}
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-navy-500">Recent Enrollments</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {(stats?.recent_enrollments || []).map((e, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-navy-500">{e.student__first_name} {e.student__last_name}</div>
                      <div className="text-xs text-gray-400">{e.student__email}</div>
                    </td>
                    <td className="p-4 font-medium text-gray-700">{e.course__title}</td>
                    <td className="p-4 text-gray-500">{new Date(e.enrolled_at).toLocaleDateString()}</td>
                    <td className="p-4"><span className="badge badge-green">{e.status}</span></td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => openManage({ id: e.course_id || e.id, title: e.course__title })}
                        className="text-gold-600 text-xs font-bold hover:underline"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {!stats?.recent_enrollments?.length && (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400">No enrollments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="animate-fade-in space-y-4">
          <input
            placeholder="Search by name, email or role..."
            className="input max-w-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-navy-500 text-white text-sm">
                <tr>
                  <th className="p-4 rounded-tl-xl">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-center">Enrollments</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 rounded-tr-xl">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-navy-100 rounded-full flex items-center justify-center font-bold text-navy-600 text-sm flex-shrink-0">
                          {u.first_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="font-bold text-navy-500">{u.first_name} {u.last_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-navy-500">{u.enrollment_count}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${u.is_active ? 'text-green-600' : 'text-red-400'}`}>
                        <Circle size={8} fill="currentColor" />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enrollments Tab */}
      {activeTab === 'enrollments' && (
        <div className="animate-fade-in card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-navy-500 text-white text-sm">
              <tr>
                <th className="p-4 rounded-tl-xl">Student</th>
                <th className="p-4">Email</th>
                <th className="p-4">Course</th>
                <th className="p-4">Date</th>
                <th className="p-4 rounded-tr-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {(stats?.recent_enrollments || []).map((e, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition">
                  <td className="p-4 font-bold text-navy-500">{e.student__first_name} {e.student__last_name}</td>
                  <td className="p-4 text-gray-500">{e.student__email}</td>
                  <td className="p-4 font-medium">{e.course__title}</td>
                  <td className="p-4 text-gray-400">{new Date(e.enrolled_at).toLocaleString()}</td>
                  <td className="p-4"><span className="badge badge-green">{e.status}</span></td>
                </tr>
              ))}
              {!stats?.recent_enrollments?.length && (
                <tr><td colSpan="5" className="p-8 text-center text-gray-400">No enrollments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreate(true)} className="btn-gold flex items-center gap-2">
              + New Course
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-navy-500 text-white text-sm">
                <tr>
                  <th className="p-4 rounded-tl-xl">Course</th>
                  <th className="p-4">Level</th>
                  <th className="p-4 text-center">Enrolled</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {(stats?.course_enrollments || []).map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 font-bold text-navy-500">{c.title}</td>
                    <td className="p-4"><span className="badge-navy capitalize">{c.level}</span></td>
                    <td className="p-4 text-center font-bold text-navy-500">{c.enrollment_count}</td>
                    <td className="p-4 text-center">
                      <span className={`badge ${c.status === 'published' ? 'badge-green' : c.status === 'draft' ? 'badge-gray' : 'badge-red'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 flex gap-3">
                      <Link to={`/courses/${c.id}`} className="text-navy-500 text-xs font-bold hover:underline">View</Link>
                      <button onClick={() => openManage(c)} className="text-gold-600 text-xs font-bold hover:underline">Manage</button>
                      <button onClick={() => deleteCourse(c.id)} className="text-red-400 text-xs font-bold hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {showCreate && (
        <CourseForm
          onSuccess={() => { setShowCreate(false); loadData() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Assign Faculty Modal */}
      {managingCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-xl">
            <h3 className="text-xl font-bold text-navy-500 mb-1">Assign Faculty</h3>
            <p className="text-sm text-gray-400 mb-6">Course: <span className="font-bold text-navy-400">{managingCourse.title}</span></p>

            <label className="block text-sm font-medium text-gray-700 mb-2">Select Faculty Member</label>
            <select
              className="input mb-6"
              value={selectedFaculty}
              onChange={e => setSelectedFaculty(e.target.value)}
            >
              <option value="">-- Select a faculty member --</option>
              {((facultyList.length > 0 ? facultyList : (stats?.all_users || []).filter(u => u.role === 'faculty'))).map(f => (
                <option key={f.id} value={f.id}>
                  {f.first_name} {f.last_name} ({f.email})
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
