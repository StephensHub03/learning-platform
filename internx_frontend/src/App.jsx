import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'

// Pages
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import FacultyDashboard from './pages/FacultyDashboard.jsx'
import FacultyCourseManage from './pages/FacultyCourseManage.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import CourseList from './pages/CourseList.jsx'
import CourseDetail from './pages/CourseDetail.jsx'
import LiveSession from './pages/LiveSession.jsx'
import AssignmentPage from './pages/AssignmentPage.jsx'
import Results from './pages/Results.jsx'
import Certificate from './pages/Certificate.jsx'
import VerifyCertificate from './pages/VerifyCertificate.jsx'

/** Redirect after login based on user role */
function DashboardRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.role === 'faculty') return <Navigate to="/faculty" replace />
  return <Navigate to="/dashboard" replace />
}

/** Guard: require authentication */
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-navy-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-navy-500 font-medium">Loading InternX…</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-certificate/:id" element={<VerifyCertificate />} />

      {/* Role redirect */}
      <Route path="/" element={<DashboardRedirect />} />

      {/* Student routes */}
      <Route path="/dashboard" element={
        <PrivateRoute roles={['student']}>
          <StudentDashboard />
        </PrivateRoute>
      } />
      <Route path="/courses" element={
        <PrivateRoute>
          <CourseList />
        </PrivateRoute>
      } />
      <Route path="/courses/:id" element={
        <PrivateRoute>
          <CourseDetail />
        </PrivateRoute>
      } />
      <Route path="/sessions/:id" element={
        <PrivateRoute>
          <LiveSession />
        </PrivateRoute>
      } />
      <Route path="/assignments/:id" element={
        <PrivateRoute roles={['student']}>
          <AssignmentPage />
        </PrivateRoute>
      } />
      <Route path="/results" element={
        <PrivateRoute>
          <Results />
        </PrivateRoute>
      } />
      <Route path="/certificates" element={
        <PrivateRoute>
          <Certificate />
        </PrivateRoute>
      } />

      {/* Faculty routes */}
      <Route path="/faculty" element={
        <PrivateRoute roles={['faculty']}>
          <FacultyDashboard />
        </PrivateRoute>
      } />
      <Route path="/faculty/courses/:id" element={
        <PrivateRoute roles={['faculty']}>
          <FacultyCourseManage />
        </PrivateRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <PrivateRoute roles={['admin']}>
          <AdminDashboard />
        </PrivateRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
