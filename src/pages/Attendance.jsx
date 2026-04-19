import { useState, useEffect, useRef } from 'react'
import {
  UserCheck, Plus, Search, Eye, Trash2, X, Camera,
  Upload, ChevronLeft, ChevronRight, Calendar,
  Clock, CheckCircle, XCircle, Minus, Coffee, AlertTriangle,
  TrendingUp, Pencil
} from 'lucide-react'
import axios from '../lib/apiClient'
import Topbar from '../components/Topbar'
import { useToast } from '../context/ToastContext'
import { getEmployees } from '../lib/db'
import { getCurrentUser, isAdmin } from '../utils/roleChecker'

const STATUS_OPTIONS = ['Present', 'Absent', 'Half Day', 'Weekly Off']

const STATUS_CONFIG = {
  'Present':    { color: 'bg-green-100 text-green-700',   dot: 'bg-green-500',   icon: CheckCircle },
  'Absent':     { color: 'bg-red-100 text-red-700',       dot: 'bg-red-500',     icon: XCircle },
  'Half Day':   { color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400',  icon: Minus },
  'Weekly Off': { color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400',    icon: Coffee },
}

const EMPTY_FORM = {
  employee_name: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'Present',
  check_in_time: '09:00',
  check_out_time: '18:00',
  fine: '',
  overtime: '',
  photo_data: '',
  notes: '',
}

function compressImage(file, maxWidth = 800, quality = 0.72) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function StatCard({ label, value, bgColor, textColor, icon: Icon }) {
  return (
    <div className={`rounded-2xl p-4 ${bgColor} flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/50 flex-shrink-0`}>
        <Icon size={18} className={textColor} />
      </div>
      <div>
        <p className={`text-2xl font-black font-heading ${textColor} leading-none`}>{value}</p>
        <p className={`text-xs font-semibold mt-0.5 ${textColor} opacity-70`}>{label}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      {status}
    </span>
  )
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function Attendance() {
  const toast = useToast()
  const admin = isAdmin()
  const currentUser = getCurrentUser()
  const fileInputRef = useRef(null)
  const cameraVideoRef = useRef(null)
  const cameraStreamRef = useRef(null)

  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [photoModal, setPhotoModal] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const now = new Date()
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)
  const [filterYear, setFilterYear] = useState(now.getFullYear())

  const fetchRecords = async () => {
    try {
      const res = await axios.get('/api/attendance')
      setRecords(res.data)
    } catch {
      toast('Failed to load attendance records', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
    if (admin) {
      getEmployees().then(setEmployees).catch(() => {})
    }
  }, [])

  const openForm = (record = null) => {
    if (record) {
      setForm({
        ...EMPTY_FORM,
        ...record,
        fine: record.fine ?? '',
        overtime: record.overtime ?? '',
        photo_data: record.photo_data || '',
      })
      setEditId(record.id)
    } else {
      setForm({
        ...EMPTY_FORM,
        employee_name: admin ? '' : (currentUser?.name || ''),
        date: new Date().toISOString().slice(0, 10),
      })
      setEditId(null)
    }
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    stopCamera()
  }

  // Month-filtered records for dashboard/summary
  const monthRecords = records.filter(r => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear
  })

  const stats = {
    present:   monthRecords.filter(r => r.status === 'Present').length,
    absent:    monthRecords.filter(r => r.status === 'Absent').length,
    halfDay:   monthRecords.filter(r => r.status === 'Half Day').length,
    weeklyOff: monthRecords.filter(r => r.status === 'Weekly Off').length,
    fine:      monthRecords.reduce((s, r) => s + (Number(r.fine) || 0), 0),
    overtime:  monthRecords.reduce((s, r) => s + (Number(r.overtime) || 0), 0),
  }

  const filteredRecords = records.filter(r => {
    if (!r.date) return false
    const d = new Date(r.date)
    const matchMonth = d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear
    const matchSearch = !search || r.employee_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || r.status === filterStatus
    return matchMonth && matchSearch && matchStatus
  })

  // Summary by employee
  const summaryByEmployee = {}
  monthRecords.forEach(r => {
    if (!summaryByEmployee[r.employee_name]) {
      summaryByEmployee[r.employee_name] = { present: 0, absent: 0, halfDay: 0, weeklyOff: 0, fine: 0, overtime: 0 }
    }
    const s = summaryByEmployee[r.employee_name]
    if (r.status === 'Present') s.present++
    else if (r.status === 'Absent') s.absent++
    else if (r.status === 'Half Day') s.halfDay++
    else if (r.status === 'Weekly Off') s.weeklyOff++
    s.fine += Number(r.fine) || 0
    s.overtime += Number(r.overtime) || 0
  })

  // Photo via file input
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setForm(f => ({ ...f, photo_data: compressed }))
    } catch {
      toast('Failed to process image', 'error')
    }
    e.target.value = ''
  }

  // Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      cameraStreamRef.current = stream
      setShowCamera(true)
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
          cameraVideoRef.current.play()
        }
      }, 100)
    } catch {
      toast('Camera unavailable — use Upload instead', 'info')
    }
  }

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop())
      cameraStreamRef.current = null
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    const video = cameraVideoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setForm(f => ({ ...f, photo_data: dataUrl }))
    stopCamera()
  }

  const handleSave = async () => {
    if (!form.employee_name.trim()) { toast('Employee name is required', 'error'); return }
    if (!form.date) { toast('Date is required', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        fine: form.fine !== '' ? Number(form.fine) : 0,
        overtime: form.overtime !== '' ? Number(form.overtime) : 0,
      }
      if (editId) {
        await axios.put(`/api/attendance/${editId}`, payload)
        toast('Attendance updated')
      } else {
        await axios.post('/api/attendance', payload)
        toast('Attendance marked successfully')
      }
      closeForm()
      fetchRecords()
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/attendance/${id}`)
      toast('Record deleted')
      setConfirmDelete(null)
      fetchRecords()
    } catch {
      toast('Failed to delete', 'error')
    }
  }

  const prevMonth = () => {
    if (filterMonth === 1) { setFilterMonth(12); setFilterYear(y => y - 1) }
    else setFilterMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (filterMonth === 12) { setFilterMonth(1); setFilterYear(y => y + 1) }
    else setFilterMonth(m => m + 1)
  }
  const monthLabel = new Date(filterYear, filterMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-[#E8ECF0] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white transition-all'

  return (
    <div className="min-h-screen">
      <Topbar title="Attendance" icon={UserCheck} breadcrumb="Attendance">
        <button
          onClick={() => openForm()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6D28D9, #4C1D95)' }}
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Mark Attendance</span>
          <span className="sm:hidden">Mark</span>
        </button>
      </Topbar>

      <div className="px-4 lg:px-6 py-4 space-y-4 max-w-4xl mx-auto">

        {/* Month navigator */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-1 flex items-center">
          <button onClick={prevMonth} className="p-2.5 rounded-xl hover:bg-white/20 text-white transition-all">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 flex items-center justify-center gap-2">
            <Calendar size={15} className="text-violet-200" />
            <span className="font-heading font-bold text-white text-sm">{monthLabel}</span>
          </div>
          <button onClick={nextMonth} className="p-2.5 rounded-xl hover:bg-white/20 text-white transition-all">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white/10 rounded-2xl p-1">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'records',   label: 'Records' },
            { id: 'summary',   label: 'Summary' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Dashboard ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Present"      value={stats.present}               bgColor="bg-green-50"  textColor="text-green-700"  icon={CheckCircle} />
              <StatCard label="Absent"       value={stats.absent}                bgColor="bg-red-50"    textColor="text-red-600"    icon={XCircle} />
              <StatCard label="Half Day"     value={stats.halfDay}               bgColor="bg-orange-50" textColor="text-orange-600" icon={Minus} />
              <StatCard label="Weekly Off"   value={stats.weeklyOff}             bgColor="bg-blue-50"   textColor="text-blue-600"   icon={Coffee} />
              <StatCard label="Total Fine"   value={`₹${stats.fine}`}           bgColor="bg-rose-50"   textColor="text-rose-600"   icon={AlertTriangle} />
              <StatCard label="Overtime hrs" value={stats.overtime.toFixed(1)}   bgColor="bg-violet-50" textColor="text-violet-700" icon={TrendingUp} />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#EDE9FE] overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-heading font-bold text-gray-800 text-sm">Recent Entries</h3>
                <span className="text-xs text-gray-400">{monthRecords.length} this month</span>
              </div>
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              ) : monthRecords.length === 0 ? (
                <div className="py-14 text-center text-gray-400 text-sm">No records this month</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {monthRecords.slice(0, 12).map(r => (
                    <div key={r.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/60 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 flex-shrink-0 overflow-hidden">
                        {r.photo_data
                          ? <img src={r.photo_data} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <span className="text-violet-600 font-bold text-sm">{r.employee_name?.[0]?.toUpperCase()}</span>
                            </div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{r.employee_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(r.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {r.check_in_time ? ` · ${r.check_in_time}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        {r.photo_data && (
                          <button
                            onClick={() => setPhotoModal(r.photo_data)}
                            className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-600 transition-all"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Records ── */}
        {activeTab === 'records' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Search employee..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="" className="text-gray-800 bg-white">All Status</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s} className="text-gray-800 bg-white">{s}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white/10 rounded-2xl animate-pulse" />)}
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="bg-white rounded-2xl p-14 text-center text-gray-400 shadow-sm">No records found</div>
            ) : (
              <div className="space-y-2">
                {filteredRecords.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE9FE]">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-14 h-14 rounded-xl bg-violet-50 flex-shrink-0 overflow-hidden cursor-pointer"
                        onClick={() => r.photo_data && setPhotoModal(r.photo_data)}
                      >
                        {r.photo_data
                          ? <img src={r.photo_data} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <span className="text-violet-400 font-bold text-xl">{r.employee_name?.[0]?.toUpperCase()}</span>
                            </div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{r.employee_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(r.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {r.check_in_time && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={11} className="text-green-500" /> In: {r.check_in_time}
                            </span>
                          )}
                          {r.check_out_time && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={11} className="text-red-400" /> Out: {r.check_out_time}
                            </span>
                          )}
                          {r.fine > 0 && (
                            <span className="text-xs text-red-500 font-semibold">Fine: ₹{r.fine}</span>
                          )}
                          {r.overtime > 0 && (
                            <span className="text-xs text-green-600 font-semibold">OT: {r.overtime}h</span>
                          )}
                        </div>
                        {r.notes && <p className="text-xs text-gray-400 mt-1 italic truncate">{r.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                      {r.photo_data && (
                        <button
                          onClick={() => setPhotoModal(r.photo_data)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-xs font-semibold hover:bg-violet-100 transition-all"
                        >
                          <Eye size={12} /> View Photo
                        </button>
                      )}
                      {admin && (
                        <>
                          <button
                            onClick={() => openForm(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-all"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(r.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-all ml-auto"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Summary ── */}
        {activeTab === 'summary' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow-sm border border-[#EDE9FE] overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h3 className="font-heading font-bold text-gray-800 text-sm">{monthLabel} — Attendance Summary</h3>
                <p className="text-xs text-gray-400 mt-0.5">P = Present · A = Absent · HD = Half Day · WO = Weekly Off</p>
              </div>
              {Object.keys(summaryByEmployee).length === 0 ? (
                <div className="py-14 text-center text-gray-400 text-sm">No records this month</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead>
                      <tr className="bg-gray-50/80">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-green-600">P</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-red-500">A</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-orange-500">HD</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-blue-500">WO</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-rose-500">Fine</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-violet-600">OT h</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(summaryByEmployee).map(([name, s]) => (
                        <tr key={name} className="hover:bg-gray-50/50 transition-all">
                          <td className="px-4 py-3 font-semibold text-gray-800">{name}</td>
                          <td className="px-3 py-3 text-center font-bold text-green-600">{s.present}</td>
                          <td className="px-3 py-3 text-center font-bold text-red-500">{s.absent}</td>
                          <td className="px-3 py-3 text-center font-bold text-orange-500">{s.halfDay}</td>
                          <td className="px-3 py-3 text-center font-bold text-blue-500">{s.weeklyOff}</td>
                          <td className="px-3 py-3 text-center font-medium text-rose-500">
                            {s.fine > 0 ? `₹${s.fine}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-center font-medium text-violet-600">
                            {s.overtime > 0 ? s.overtime.toFixed(1) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-violet-50/60 border-t-2 border-violet-100">
                        <td className="px-4 py-3 font-bold text-violet-800 text-xs uppercase tracking-wide">Total</td>
                        <td className="px-3 py-3 text-center font-black text-green-700">{stats.present}</td>
                        <td className="px-3 py-3 text-center font-black text-red-600">{stats.absent}</td>
                        <td className="px-3 py-3 text-center font-black text-orange-600">{stats.halfDay}</td>
                        <td className="px-3 py-3 text-center font-black text-blue-600">{stats.weeklyOff}</td>
                        <td className="px-3 py-3 text-center font-bold text-rose-600">₹{stats.fine}</td>
                        <td className="px-3 py-3 text-center font-bold text-violet-700">{stats.overtime.toFixed(1)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Form Drawer ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative ml-auto w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            <div
              className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2D1B69, #4C1D95)' }}
            >
              <h2 className="font-heading font-bold text-white">
                {editId ? 'Edit Attendance' : 'Mark Attendance'}
              </h2>
              <button onClick={closeForm} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Employee */}
              <FormField label="Employee Name" required>
                {admin && employees.length > 0 ? (
                  <select
                    value={form.employee_name}
                    onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select Employee</option>
                    {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.employee_name}
                    onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))}
                    readOnly={!admin && !!currentUser?.name}
                    placeholder="Employee name"
                    className={inputCls}
                  />
                )}
              </FormField>

              {/* Date */}
              <FormField label="Date" required>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                />
              </FormField>

              {/* Status buttons */}
              <FormField label="Status" required>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(s => {
                    const cfg = STATUS_CONFIG[s]
                    const active = form.status === s
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          active
                            ? `${cfg.color} border-current shadow-sm`
                            : 'bg-gray-50 text-gray-500 border-transparent hover:border-gray-200'
                        }`}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </FormField>

              {/* Times — only for Present / Half Day */}
              {(form.status === 'Present' || form.status === 'Half Day') && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Check In">
                    <input
                      type="time"
                      value={form.check_in_time}
                      onChange={e => setForm(f => ({ ...f, check_in_time: e.target.value }))}
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label="Check Out">
                    <input
                      type="time"
                      value={form.check_out_time}
                      onChange={e => setForm(f => ({ ...f, check_out_time: e.target.value }))}
                      className={inputCls}
                    />
                  </FormField>
                </div>
              )}

              {/* Fine & Overtime */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Fine (₹)">
                  <input
                    type="number"
                    min="0"
                    value={form.fine}
                    onChange={e => setForm(f => ({ ...f, fine: e.target.value }))}
                    placeholder="0"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Overtime (hrs)">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.overtime}
                    onChange={e => setForm(f => ({ ...f, overtime: e.target.value }))}
                    placeholder="0"
                    className={inputCls}
                  />
                </FormField>
              </div>

              {/* Photo */}
              <FormField label="Attendance Photo">
                {form.photo_data ? (
                  <div className="relative">
                    <img
                      src={form.photo_data}
                      alt="Attendance"
                      className="w-full h-52 object-cover rounded-xl border border-[#EDE9FE]"
                    />
                    <button
                      onClick={() => setForm(f => ({ ...f, photo_data: '' }))}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white shadow-lg hover:bg-red-600 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : showCamera ? (
                  <div className="space-y-2">
                    <video
                      ref={cameraVideoRef}
                      className="w-full rounded-xl bg-gray-900"
                      autoPlay
                      playsInline
                      muted
                      style={{ maxHeight: 240 }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={capturePhoto}
                        className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-violet-700 transition-all"
                      >
                        <Camera size={16} /> Capture
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 py-4 rounded-xl border-2 border-dashed border-violet-200 text-violet-500 text-sm font-semibold flex items-center justify-center gap-2 hover:border-violet-400 hover:bg-violet-50 transition-all"
                    >
                      <Camera size={16} /> Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 text-sm font-semibold flex items-center justify-center gap-2 hover:border-gray-400 hover:bg-gray-50 transition-all"
                    >
                      <Upload size={16} /> Upload
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                )}
              </FormField>

              {/* Notes */}
              <FormField label="Notes">
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any remarks..."
                  className={`${inputCls} resize-none`}
                />
              </FormField>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button
                onClick={closeForm}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #4C1D95)' }}
              >
                {saving ? 'Saving...' : editId ? 'Update' : 'Mark Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Modal ── */}
      {photoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPhotoModal(null)}
        >
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPhotoModal(null)}
              className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white transition-all"
            >
              <X size={24} />
            </button>
            <img src={photoModal} alt="Attendance Photo" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-gray-900">Delete Record?</h3>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
