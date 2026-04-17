import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import toast from 'react-hot-toast'
import { GraduationCap, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { getErrorMessages } from '../utils/apiErrors.js'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }


  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back! 🎓')
      navigate('/')
    } catch (err) {
      getErrorMessages(err, 'Invalid credentials.').forEach((message) => {
        toast.error(message)
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-500 flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-navy-400 rounded-full opacity-40" />
        <div className="absolute bottom-[-60px] right-[-60px] w-56 h-56 bg-gold-500 rounded-full opacity-30" />

        <div className="relative z-10 text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-6">
            <GraduationCap size={52} className="text-gold-400" />
            <span className="text-5xl font-extrabold tracking-tight">InternX</span>
          </div>
          <p className="text-navy-200 text-lg max-w-sm leading-relaxed">
            Your gateway to professional growth — courses, live sessions, and certified learning all in one place.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[['500+', 'Students'], ['50+', 'Courses'], ['100%', 'Certified']].map(([n, l]) => (
              <div key={l} className="bg-white/10 rounded-2xl p-4">
                <div className="text-gold-400 font-bold text-2xl">{n}</div>
                <div className="text-navy-200 text-sm mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <GraduationCap size={32} className="text-navy-500" />
            <span className="text-3xl font-extrabold text-navy-500">InternX</span>
          </div>

          <h1 className="text-3xl font-bold text-navy-500 mb-1">Welcome back</h1>
          <p className="text-gray-500 mb-8">Sign in to continue learning</p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email" name="email" required
                  value={form.email} onChange={handle}
                  placeholder="you@example.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type={show ? 'text' : 'password'} name="password" required
                  value={form.password} onChange={handle}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </span>
                : 'Sign In →'
              }
            </button>
          </form>

          <p className="text-center text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-gold-600 font-semibold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
