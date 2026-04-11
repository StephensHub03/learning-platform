import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import { 
  Users, Video, ClipboardList, Plus, Trash2, 
  ChevronRight, Calendar, Clock, CheckCircle, XCircle 
} from 'lucide-react'
import SessionForm from '../components/SessionForm.jsx'
import AssignmentForm from '../components/AssignmentForm.jsx'

export default function FacultyCourseManage() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [activeTab, setActiveTab] = useState('sessions')
  const [sessions, setSessions] = useState([])
  const [assignments, setAssignments] = useState([])
  const [results, setResults] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)

  const loadAll = async () => {
    try {
      const [c, s, a, r, st] = await Promise.all([
        api.get(`/courses/${id}/`),
        api.get('/sessions/', { params: { course: id } }),
        api.get('/assignments/', { params: { course: id } }),
        api.get('/results/', { params: { assignment__course: id } }),
        api.get(`/courses/${id}/students/`)
      ])
      setCourse(c.data)
      setSessions(s.data.results || s.data)
      setAssignments(a.data.results || a.data)
      setResults(r.data.results || r.data)
      setStudents(st.data)
    } catch (err) {
      toast.error('Failed to load management data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [id])

  const deleteSession = async (sid) => {
    if (!confirm('Delete this session?')) return
    try {
      await api.delete(`/sessions/${sid}/`)
      setSessions(s => s.filter(x => x.id !== sid))
      toast.success('Session deleted')
    } catch { toast.error('Failed to delete') }
  }

  const deleteAssignment = async (aid) => {
    if (!confirm('Delete this assignment?')) return
    try {
      await api.delete(`/assignments/${aid}/`)
      setAssignments(a => a.filter(x => x.id !== aid))
      toast.success('Assignment deleted')
    } catch { toast.error('Failed to delete') }
  }

  if (loading) return <Layout title="Loading..."><div className="h-64 flex items-center justify-center animate-pulse text-navy-200">Loading Management Hub...</div></Layout>

  return (
    <Layout title={`Manage: ${course?.title}`}>
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-navy-100/50 p-1.5 rounded-2xl w-fit mb-8 border border-navy-100">
        {[
          { id: 'sessions', label: 'Live Sessions', icon: Video },
          { id: 'assignments', label: 'Assignments', icon: ClipboardList },
          { id: 'submissions', label: 'Evaluations', icon: CheckCircle },
          { id: 'students', label: 'Students', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-navy-500 shadow-sm border border-navy-100' 
                : 'text-navy-300 hover:text-navy-500 hover:bg-white/50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-navy-500">Live Class Schedule</h3>
            <button onClick={() => setShowSessionForm(true)} className="btn-gold flex items-center gap-2">
              <Plus size={18} /> Schedule Session
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map(s => (
              <div key={s.id} className="card p-5 border-l-4 border-gold-500">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-navy-500">{s.title}</h4>
                    <div className="flex flex-col gap-1 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-2"><Calendar size={14} /> {new Date(s.scheduled_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-2"><Clock size={14} /> {new Date(s.scheduled_at).toLocaleTimeString()} ({s.duration_minutes}m)</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`badge ${s.status === 'live' ? 'bg-red-500 text-white animate-pulse' : 'badge-navy'}`}>{s.status}</span>
                    <button onClick={() => deleteSession(s.id)} className="p-2 text-red-300 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
                {s.meet_link && (
                  <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 -mx-5 px-5 -mb-5 rounded-b-2xl">
                    <p className="text-xs font-bold text-gray-400 mb-1">GOOGLE MEET LINK</p>
                    <a href={s.meet_link} target="_blank" className="text-navy-500 font-medium hover:underline text-sm truncate block">{s.meet_link}</a>
                  </div>
                )}
              </div>
            ))}
            {sessions.length === 0 && <div className="col-span-full card p-12 text-center text-gray-400">No sessions scheduled yet.</div>}
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-navy-500">Course Assignments</h3>
            <button onClick={() => setShowAssignmentForm(true)} className="btn-gold flex items-center gap-2">
              <Plus size={18} /> Create MCQ Assignment
            </button>
          </div>
          
          <div className="space-y-3">
            {assignments.map(a => (
              <div key={a.id} className="card p-5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-navy-500">{a.title}</h4>
                  <div className="flex gap-4 mt-1 text-sm text-gray-400">
                    <span>{a.total_questions} Questions</span>
                    <span>{a.total_marks} Marks</span>
                    <span>Pass: {a.pass_percentage}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${a.is_active ? 'badge-green' : 'badge-gray'}`}>{a.is_active ? 'Active' : 'Closed'}</span>
                  <button onClick={() => deleteAssignment(a.id)} className="p-2 text-red-300 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
            {assignments.length === 0 && <div className="card p-12 text-center text-gray-400">No assignments created yet.</div>}
          </div>
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="animate-fade-in card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-navy-500 text-white text-sm">
              <tr>
                <th className="p-4 rounded-tl-xl">Student</th>
                <th className="p-4">Assignment</th>
                <th className="p-4 text-center">Score</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 rounded-tr-xl">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {results.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition">
                  <td className="p-4 font-bold text-navy-500">{r.student_name}</td>
                  <td className="p-4">{r.assignment_title}</td>
                  <td className="p-4 text-center font-mono font-bold text-navy-500">{r.score}/{r.total_marks} ({r.percentage}%)</td>
                  <td className="p-4 text-center">
                    <span className={`badge ${r.status === 'passed' ? 'badge-green' : 'badge-red'}`}>{r.status}</span>
                  </td>
                  <td className="p-4 text-gray-500">{new Date(r.submitted_at).toLocaleString()}</td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-gray-400">No submissions to evaluate yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(s => (
            <div key={s.id} className="card p-4 flex items-center gap-4">
               <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center font-bold text-navy-600">
                  {s.student_name[0]}
               </div>
               <div>
                  <h4 className="font-bold text-sm text-navy-500">{s.student_name}</h4>
                  <p className="text-xs text-gray-400">Enrolled: {new Date(s.enrolled_at).toLocaleDateString()}</p>
               </div>
               <span className="ml-auto badge-navy text-[10px]">{s.status}</span>
            </div>
          ))}
          {students.length === 0 && <div className="col-span-full card p-12 text-center text-gray-400">No students enrolled yet.</div>}
        </div>
      )}

      {/* Modals */}
      {showSessionForm && (
        <SessionForm 
          courseId={id} 
          onSuccess={() => { setShowSessionForm(false); loadAll() }} 
          onCancel={() => setShowSessionForm(false)} 
        />
      )}
      {showAssignmentForm && (
        <AssignmentForm 
          courseId={id} 
          onSuccess={() => { setShowAssignmentForm(false); loadAll() }} 
          onCancel={() => setShowAssignmentForm(false)} 
        />
      )}
    </Layout>
  )
}
