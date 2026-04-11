import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import toast from 'react-hot-toast'
import { GraduationCap, User, Mail, Lock, Phone } from 'lucide-react'

// ✅ Defined OUTSIDE Register so it's a stable component reference across renders
function Field({ label, name, type = 'text', icon: Icon, placeholder, form, handle }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
        <input
          type={type} name={name} required
          value={form[name]} onChange={handle}
          placeholder={placeholder}
          className={`input ${Icon ? 'pl-10' : ''}`}
        />
      </div>
    </div>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: '', last_name: '', username: '',
    email: '', phone: '', password: '', password2: '', role: 'student'
  })
  const [loading, setLoading] = useState(false)

  const handle = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password2) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Please log in.')
      navigate('/login')
    } catch (err) {
      const errors = err.response?.data
      if (errors) {
        Object.values(errors).flat().forEach(msg => toast.error(msg))
      } else {
        toast.error('Registration failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <GraduationCap size={36} className="text-navy-500" />
            <span className="text-4xl font-extrabold text-navy-500">InternX</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Create your account</h1>
          <p className="text-gray-500 mt-1">Join thousands of learners on InternX</p>
        </div>

        <div className="card p-8">
          <form onSubmit={submit} className="space-y-5">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a…</label>
              <div className="flex gap-3">
                {[['student', '👨‍🎓 Student'], ['faculty', '👨‍🏫 Faculty']].map(([val, label]) => (
                  <button
                    key={val} type="button"
                    onClick={() => setForm(prev => ({ ...prev, role: val }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                      form.role === val
                        ? 'border-navy-500 bg-navy-50 text-navy-600'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" name="first_name" icon={User} placeholder="John" form={form} handle={handle} />
              <Field label="Last Name" name="last_name" placeholder="Doe" form={form} handle={handle} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Username" name="username" placeholder="john_doe" form={form} handle={handle} />
              <Field label="Phone" name="phone" icon={Phone} placeholder="+91 9876543210" form={form} handle={handle} />
            </div>

            <Field label="Email Address" name="email" type="email" icon={Mail} placeholder="john@example.com" form={form} handle={handle} />

            <div className="grid grid-cols-2 gap-4">
              <Field label="Password" name="password" type="password" icon={Lock} placeholder="••••••••" form={form} handle={handle} />
              <Field label="Confirm Password" name="password2" type="password" placeholder="••••••••" form={form} handle={handle} />
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account…
                  </span>
                : 'Create Account →'
              }
            </button>
          </form>

          <p className="text-center text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-gold-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

