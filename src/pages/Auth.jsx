import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../lib/apiClient'
import { useToast } from '../context/ToastContext'
import { ADMIN_EMAIL, ROLE_ACCESS, getAdminPassword } from '../utils/roleChecker'

export default function Auth() {
  const navigate = useNavigate()
  const toast = useToast()
  const [mode, setMode] = useState('Admin')
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address'
    if (!form.password.trim()) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'Admin') {
        await new Promise(r => setTimeout(r, 400))
        if (
          form.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
          form.password === getAdminPassword()
        ) {
          localStorage.setItem('x1_user', JSON.stringify({
            id: 'admin_001', name: 'Admin', email: ADMIN_EMAIL,
            role: 'Admin', accessibleSections: ROLE_ACCESS['Admin'],
          }))
          toast('Welcome back, Admin!', 'success')
          navigate('/home')
        } else {
          setErrors({ password: 'Invalid admin credentials' })
        }
      } else {
        const res = await axios.post('/api/employees/login', {
          email: form.email.trim(), password: form.password,
        })
        const emp = res.data
        localStorage.setItem('x1_user', JSON.stringify({
          id: emp.id, name: emp.name, email: emp.email,
          role: emp.role, department: emp.department,
          accessibleSections: ROLE_ACCESS[emp.role] || [],
        }))
        toast(`Welcome, ${emp.name}!`, 'success')
        navigate('/home')
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong'
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('found'))
        setErrors({ email: msg })
      else setErrors({ password: msg })
    } finally {
      setLoading(false)
    }
  }

  const setField = (key, val) => {
    setForm(p => ({ ...p, [key]: val }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #2D1B69 0%, #4C1D95 55%, #6D28D9 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-48 opacity-20"
        style={{ background: 'white', borderRadius: '0 0 50% 50%', filter: 'blur(1px)' }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-32 opacity-10"
        style={{ background: 'white', borderRadius: '0 0 60% 60%' }} />
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #A78BFA, transparent)', transform: 'translate(30%, 30%)' }} />
      <div className="absolute top-1/4 left-0 w-40 h-40 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #C4B5FD, transparent)', transform: 'translateX(-50%)' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <span className="font-heading font-black text-white text-3xl tracking-tight">X1</span>
          </div>
          <h1 className="font-heading font-black text-3xl text-white tracking-tight">Welcome</h1>
          <p className="text-violet-300 font-medium mt-1 text-sm">to the world of business</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-7 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>

          <h2 className="font-heading font-bold text-xl text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-400 mb-5">Access your workspace</p>

          {/* Mode toggle */}
          <div className="flex gap-1.5 p-1 rounded-xl mb-5"
            style={{ background: '#F3F0FF' }}>
            {['Admin', 'Employee'].map(m => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setErrors({}); setForm({ email: '', password: '' }) }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === m
                    ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md shadow-violet-300'
                    : 'text-violet-400 hover:text-violet-600'
                }`}>
                {m === 'Admin' ? '🔐 Admin' : '👤 Employee'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="E-mail"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none
                  ${errors.email
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-violet-100 bg-violet-50/50 text-gray-700 focus:border-violet-400 focus:bg-white'}`}
                style={{ fontSize: '16px' }}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1 font-medium pl-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={e => setField('password', e.target.value)}
                className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none
                  ${errors.password
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-violet-100 bg-violet-50/50 text-gray-700 focus:border-violet-400 focus:bg-white'}`}
                style={{ fontSize: '16px' }}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1 font-medium pl-1">{errors.password}</p>}
            </div>

            {mode === 'Admin' && (
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <div className="w-4 h-4 rounded border-2 border-violet-400 bg-violet-400 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Remember
                </label>
                <span className="text-xs text-violet-500 font-medium">admin@x1.com / admin123</span>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-lg shadow-violet-400/40 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)', fontSize: '16px' }}
            >
              {loading ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>Signing in...</>
              ) : 'SIGN IN'}
            </button>
          </form>

          {mode === 'Employee' && (
            <p className="text-center text-xs text-gray-400 mt-4">
              Don't have an account?{' '}
              <span className="text-violet-600 font-semibold">Contact Admin</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
