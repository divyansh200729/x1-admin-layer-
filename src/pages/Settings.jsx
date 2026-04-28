import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, User, Lock, Eye, EyeOff, Shield,
  LogOut, ChevronLeft, Check, Smartphone, Clock
} from 'lucide-react'
import { getCurrentUser, getAdminPassword } from '../utils/roleChecker'
import { changeEmployeePassword } from '../lib/db'

function getInitials(name) {
  if (!name) return 'U'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function MainMenu({ user, onNavigate, onLogout }) {
  return (
    <div className="max-w-lg mx-auto">
      {/* Profile card */}
      <div
        className="mx-4 mt-6 mb-4 rounded-3xl p-5 flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={() => onNavigate('profile')}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))', border: '2px solid rgba(255,255,255,0.3)' }}
        >
          <span className="font-bold text-white text-xl">{getInitials(user?.name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-base leading-tight truncate">{user?.name || 'User'}</p>
          <p className="text-violet-300 text-sm truncate mt-0.5">{user?.email || ''}</p>
          <p className="text-violet-400 text-xs mt-0.5">{user?.role || ''}</p>
        </div>
        <ChevronRight size={18} className="text-violet-400 flex-shrink-0" />
      </div>

      {/* Settings sections */}
      <div className="mx-4 space-y-3">
        {/* Account section */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest px-4 pt-4 pb-2">Account</p>

          <button
            onClick={() => onNavigate('profile')}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.3)' }}>
              <User size={17} className="text-violet-300" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white text-sm font-semibold">Profile and Personal Details</p>
              <p className="text-violet-400 text-xs mt-0.5">Name, email, role, department</p>
            </div>
            <ChevronRight size={16} className="text-violet-500" />
          </button>

          <button
            onClick={() => onNavigate('password')}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.3)' }}>
              <Lock size={17} className="text-indigo-300" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white text-sm font-semibold">Password and Security</p>
              <p className="text-violet-400 text-xs mt-0.5">Change password, saved logins</p>
            </div>
            <ChevronRight size={16} className="text-violet-500" />
          </button>
        </div>

        {/* Activity section */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest px-4 pt-4 pb-2">Activity</p>

          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.2)' }}>
              <Clock size={17} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Login Activity</p>
              <p className="text-violet-400 text-xs mt-0.5">Last login: just now</p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Active</span>
          </div>

          <div className="px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.2)' }}>
              <Smartphone size={17} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Active Sessions</p>
              <p className="text-violet-400 text-xs mt-0.5">This device</p>
            </div>
            <span className="text-[10px] font-semibold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">1 device</span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-red-500/10 transition-colors"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.15)' }}>
            <LogOut size={17} className="text-red-400" />
          </div>
          <p className="flex-1 text-left text-red-400 text-sm font-semibold">Log Out</p>
        </button>

        <div className="pb-6" />
      </div>
    </div>
  )
}

function ProfileView({ user, onBack }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const stored = JSON.parse(localStorage.getItem('x1_user') || '{}')
    stored.name = name
    localStorage.setItem('x1_user', JSON.stringify(stored))
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mx-4 mt-6 space-y-4">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))', border: '3px solid rgba(255,255,255,0.3)' }}
          >
            <span className="font-bold text-white text-3xl">{getInitials(user?.name)}</span>
          </div>
          <p className="text-violet-300 text-xs">Profile photo cannot be changed</p>
        </div>

        {/* Fields */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest px-4 pt-4 pb-2">Personal Info</p>

          {/* Name field */}
          <div className="px-4 py-3.5 border-b border-white/5">
            <p className="text-violet-400 text-xs mb-1">Full Name</p>
            {editing ? (
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white/10 text-white text-sm font-medium px-3 py-2 rounded-xl outline-none border border-violet-400/40 focus:border-violet-400"
                placeholder="Enter your name"
                autoFocus
              />
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium">{user?.name || '—'}</p>
                <button onClick={() => setEditing(true)}
                  className="text-violet-400 text-xs hover:text-white transition-colors">Edit</button>
              </div>
            )}
          </div>

          {editing && (
            <div className="px-4 py-3 flex gap-2 border-b border-white/5">
              <button onClick={handleSave}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #4C1D95)' }}>
                Save
              </button>
              <button onClick={() => { setEditing(false); setName(user?.name || '') }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-violet-300 hover:text-white bg-white/5 transition-all">
                Cancel
              </button>
            </div>
          )}

          {saved && (
            <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5">
              <Check size={14} className="text-emerald-400" />
              <p className="text-emerald-400 text-xs font-medium">Name updated successfully</p>
            </div>
          )}

          <div className="px-4 py-3.5 border-b border-white/5">
            <p className="text-violet-400 text-xs mb-1">Email</p>
            <p className="text-white text-sm font-medium">{user?.email || '—'}</p>
          </div>

          <div className="px-4 py-3.5 border-b border-white/5">
            <p className="text-violet-400 text-xs mb-1">Role</p>
            <p className="text-white text-sm font-medium">{user?.role || '—'}</p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-violet-400 text-xs mb-1">Department</p>
            <p className="text-white text-sm font-medium">{user?.department || '—'}</p>
          </div>
        </div>

        <p className="text-violet-500 text-xs text-center px-4">
          Contact your administrator to update your email, role, or department.
        </p>
        <div className="pb-6" />
      </div>
    </div>
  )
}

function PasswordView({ user, onBack }) {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const savedLogins = (() => {
    try {
      const s = localStorage.getItem('x1_saved_logins')
      return s ? JSON.parse(s) : []
    } catch { return [] }
  })()

  const handleChangePassword = async () => {
    setStatus(null)
    setErrorMsg('')
    if (!current || !newPass || !confirm) {
      setStatus('error'); setErrorMsg('Please fill in all fields.'); return
    }
    if (newPass !== confirm) {
      setStatus('error'); setErrorMsg('New passwords do not match.'); return
    }
    if (newPass.length < 6) {
      setStatus('error'); setErrorMsg('Password must be at least 6 characters.'); return
    }
    setLoading(true)
    try {
      if (user?.role === 'Admin') {
        if (current !== getAdminPassword()) {
          setStatus('error'); setErrorMsg('Current password is incorrect.'); return
        }
        localStorage.setItem('x1_admin_pass', newPass)
      } else {
        await changeEmployeePassword(user.id, current, newPass)
      }
      setStatus('success')
      setCurrent(''); setNewPass(''); setConfirm('')
    } catch (e) {
      setStatus('error'); setErrorMsg(e.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mx-4 mt-6 space-y-4">
        {/* Change Password */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest px-4 pt-4 pb-2">Change Password</p>

          {status === 'success' && (
            <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Check size={14} className="text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-400 text-xs font-medium">Password changed successfully</p>
            </div>
          )}
          {status === 'error' && (
            <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-xs font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Current password */}
          <div className="px-4 pb-3.5">
            <p className="text-violet-400 text-xs mb-1.5">Current Password</p>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-white/10 text-white text-sm px-3 py-2.5 pr-10 rounded-xl outline-none border border-white/10 focus:border-violet-400/60 placeholder-violet-500"
              />
              <button onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="px-4 pb-3.5">
            <p className="text-violet-400 text-xs mb-1.5">New Password</p>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-white/10 text-white text-sm px-3 py-2.5 pr-10 rounded-xl outline-none border border-white/10 focus:border-violet-400/60 placeholder-violet-500"
              />
              <button onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="px-4 pb-4">
            <p className="text-violet-400 text-xs mb-1.5">Confirm New Password</p>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-white/10 text-white text-sm px-3 py-2.5 pr-10 rounded-xl outline-none border border-white/10 focus:border-violet-400/60 placeholder-violet-500"
              />
              <button onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={handleChangePassword}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #4C1D95)' }}
            >
              Update Password
            </button>
          </div>
        </div>

        {/* Security info */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest px-4 pt-4 pb-2">Security</p>
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.2)' }}>
              <Shield size={17} className="text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Two-Factor Authentication</p>
              <p className="text-violet-400 text-xs mt-0.5">Not available in this version</p>
            </div>
            <span className="text-[10px] font-semibold text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full">Soon</span>
          </div>

          {/* Saved logins */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest mb-3">Saved Logins</p>
            {savedLogins.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-violet-500 text-xs">No saved logins found</p>
                <p className="text-violet-600 text-[10px] mt-0.5">Login sessions are stored in this browser</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedLogins.map((login, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {(login.name || login.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{login.name || login.email}</p>
                      <p className="text-violet-400 text-[10px] truncate">{login.role || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pb-3" />
        </div>

        <div className="pb-6" />
      </div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [view, setView] = useState('main') // 'main' | 'profile' | 'password'

  const handleLogout = () => {
    localStorage.removeItem('x1_user')
    navigate('/')
  }

  const titles = { main: 'Settings & Activity', profile: 'Profile & Personal Details', password: 'Password & Security' }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #2D1B69 0%, #4C1D95 50%, #6D28D9 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 h-14 flex items-center gap-3"
        style={{ background: 'rgba(45,27,105,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {view !== 'main' && (
          <button onClick={() => setView('main')}
            className="p-1.5 rounded-xl text-violet-300 hover:text-white hover:bg-white/10 transition-all">
            <ChevronLeft size={20} />
          </button>
        )}
        <h1 className="font-bold text-white text-base flex-1">{titles[view]}</h1>
      </div>

      {view === 'main' && <MainMenu user={user} onNavigate={setView} onLogout={handleLogout} />}
      {view === 'profile' && <ProfileView user={user} onBack={() => setView('main')} />}
      {view === 'password' && <PasswordView onBack={() => setView('main')} />}
    </div>
  )
}
