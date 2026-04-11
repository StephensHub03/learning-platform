/**
 * Shared Navbar + Sidebar layout component used across all protected pages.
 */
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import toast from 'react-hot-toast'
import {
  GraduationCap, LayoutDashboard, BookOpen, Video,
  ClipboardList, Award, BarChart2, Users, Menu, X, LogOut,
  ChevronRight
} from 'lucide-react'

const navItems = {
  student: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/results', icon: ClipboardList, label: 'My Results' },
    { to: '/certificates', icon: Award, label: 'Certificates' },
  ],
  faculty: [
    { to: '/faculty', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/courses', icon: BookOpen, label: 'My Courses' },
    { to: '/results', icon: ClipboardList, label: 'Submissions' },
  ],
  admin: [
    { to: '/admin', icon: BarChart2, label: 'Analytics' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/results', icon: ClipboardList, label: 'Results' },
    { to: '/certificates', icon: Award, label: 'Certificates' },
  ],
}

export default function Layout({ children, title }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const items = navItems[user?.role] || navItems.student

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 p-6 border-b border-navy-400/30">
        <GraduationCap size={28} className="text-gold-400" />
        <span className="text-white text-xl font-extrabold tracking-tight">InternX</span>
      </div>

      {/* User card */}
      <div className="p-4 mx-3 mt-4 bg-navy-400/30 rounded-xl">
        <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
        <p className="text-white font-semibold mt-2 text-sm leading-tight">
          {user?.first_name} {user?.last_name}
        </p>
        <p className="text-navy-200 text-xs capitalize">{user?.role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-4 space-y-0.5">
        {items.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to} to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-gold-500 text-white shadow-md'
                  : 'text-navy-200 hover:bg-navy-400/40 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-navy-200 hover:bg-red-500/20 hover:text-red-300 rounded-xl text-sm font-medium transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-navy-500 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 bg-navy-500 flex flex-col animate-slide-up">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gold-400 transition"
            >
              <X size={24} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-navy-500 transition"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-bold text-navy-500">{title}</h1>
        </header>

        <main className="flex-1 p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
