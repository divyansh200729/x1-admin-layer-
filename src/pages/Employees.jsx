import { useState, useEffect } from 'react'
import { Users, Plus, Search, Pencil, Trash2, X, Check } from 'lucide-react'
import axios from 'axios'
import Topbar from '../components/Topbar'
import { useToast } from '../context/ToastContext'

const ROLE_OPTIONS = [
  'Sales Executive', 'Service Technician', 'Order Manager',
  'QC Inspector', 'Design Engineer', 'AI Enabler', 'Other'
]

const DEPT_OPTIONS = [
  'Sales', 'Service', 'Operations', 'Quality Control', 'Design', 'Management'
]

const EMPTY_FORM = {
  name: '', email: '', password: '', role: 'Sales Executive',
  department: 'Sales', status: 'Active'
}

function FormField({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  )
}

function InputField({ error, ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all
        ${error ? 'border-red-400 bg-red-50' : 'border-[#E8ECF0] hover:border-gray-300 bg-white'}`}
    />
  )
}

function SelectField({ options, ...props }) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2.5 rounded-xl border border-[#E8ECF0] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export default function Employees() {
  const toast = useToast()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selected, setSelected] = useState(new Set())
  const [deletingSelected, setDeletingSelected] = useState(false)
  const PER_PAGE = 10

  const fetchEmployees = async () => {
    try {
      const res = await axios.get('/api/employees')
      setEmployees(res.data)
    } catch {
      toast('Failed to load employees', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployees() }, [])

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => setSelected(selected.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(e => e.id)))
  const handleDeleteSelected = async () => {
    if (!selected.size) return
    setDeletingSelected(true)
    try {
      await Promise.all([...selected].map(id => axios.delete(`/api/employees/${id}`)))
      toast(`${selected.size} employees removed`)
      setSelected(new Set()); await fetchEmployees()
    } catch { toast('Failed to delete some employees', 'error') }
    finally { setDeletingSelected(false) }
  }

  const openAdd = () => {
    setEditId(null); setForm(EMPTY_FORM); setErrors({}); setShowForm(true)
  }

  const openEdit = (emp) => {
    setEditId(emp.id)
    setForm({ name: emp.name, email: emp.email, password: '', role: emp.role, department: emp.department, status: emp.status })
    setErrors({}); setShowForm(true)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email'
    if (!editId && !form.password.trim()) e.password = 'Password is required'
    else if (form.password && form.password.length < 8) e.password = 'Minimum 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editId) {
        // If password blank during edit, keep old one — fetch it first
        const payload = { ...form }
        if (!payload.password) {
          // re-use existing (server will require it so we send a placeholder fetch)
          const existing = employees.find(e => e.id === editId)
          // We don't store password on client — ask user to re-enter or keep field
          toast('Please enter the password to confirm changes', 'info')
          setSaving(false)
          return
        }
        await axios.put(`/api/employees/${editId}`, payload)
        toast('Employee updated successfully')
      } else {
        await axios.post('/api/employees', form)
        toast('Employee registered successfully')
      }
      await fetchEmployees()
      setShowForm(false)
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save'
      if (msg.includes('Email')) setErrors({ email: msg })
      else toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/employees/${confirmDelete.id}`)
      toast('Employee removed')
      setConfirmDelete(null)
      await fetchEmployees()
    } catch {
      toast('Failed to delete', 'error')
    }
  }

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  const statusColor = (s) => s === 'Active'
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-500'

  return (
    <div className="min-h-screen">
      <Topbar title="Team Management" icon={Users} iconClass="text-violet-300" breadcrumb="Team">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-sm active:scale-[0.98] transition-all border-0"
        >
          <Plus size={16} /> Add Employee
        </button>
      </Topbar>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: employees.length, color: 'text-gray-900' },
            { label: 'Active', value: employees.filter(e => e.status === 'Active').length, color: 'text-green-600' },
            { label: 'Inactive', value: employees.filter(e => e.status === 'Inactive').length, color: 'text-gray-400' },
            { label: 'Roles', value: new Set(employees.map(e => e.role)).size, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#E8ECF0] p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or role..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[#E8ECF0] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <span className="text-sm font-semibold text-red-700">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded-lg hover:bg-gray-100">Clear</button>
              <button onClick={handleDeleteSelected} disabled={deletingSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg disabled:opacity-60">
                <Trash2 size={13} /> Delete {selected.size}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E8ECF0] shadow-sm overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8ECF0] bg-gray-50/50">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 accent-violet-600" />
                  </th>
                  {['Name', 'Email', 'Role', 'Department', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F5]">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-gray-100 rounded-lg animate-pulse" /></td></tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-400">
                      <Users size={36} className="mx-auto text-gray-200 mb-2" />
                      <p className="font-medium">{search ? 'No employees match your search' : 'No employees yet'}</p>
                      {!search && <p className="text-xs mt-1">Click "Add Employee" to get started</p>}
                    </td>
                  </tr>
                ) : paginated.map(emp => (
                  <tr key={emp.id} className={`hover:bg-gray-50/50 ${selected.has(emp.id) ? 'bg-violet-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelect(emp.id)}
                        className="w-4 h-4 rounded border-gray-300 accent-violet-600" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {emp.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{emp.email}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{emp.role}</td>
                    <td className="px-4 py-3 text-gray-500">{emp.department}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(emp.status)}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><Pencil size={15} /></button>
                        <button onClick={() => setConfirmDelete(emp)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#F0F2F5]">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : paginated.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Users size={36} className="mx-auto text-gray-200 mb-2" />
                <p className="font-medium">{search ? 'No results' : 'No employees yet'}</p>
              </div>
            ) : paginated.map(emp => (
              <div key={emp.id} className={`p-4 space-y-2 ${selected.has(emp.id) ? 'bg-violet-50/50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelect(emp.id)}
                      className="w-4 h-4 rounded border-gray-300 accent-violet-600 shrink-0" />
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {emp.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(emp.status)}`}>
                    {emp.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{emp.role} · {emp.department}</span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><Pencil size={14} /></button>
                    <button onClick={() => setConfirmDelete(emp)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-[#E8ECF0] px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold ${p === currentPage ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-[#E8ECF0] flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900">{editId ? 'Edit Employee' : 'Register Employee'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{editId ? 'Update employee details' : 'Add a new team member'}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <FormField label="Full Name" required error={errors.name}>
                <InputField type="text" placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
              </FormField>

              <FormField label="Email" required error={errors.email}>
                <InputField type="email" placeholder="employee@company.com" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} />
              </FormField>

              <FormField label={editId ? 'New Password (required to save)' : 'Password'} required={!editId} error={errors.password}>
                <InputField type="password" placeholder="Minimum 8 characters" value={form.password} onChange={e => set('password', e.target.value)} error={errors.password} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Role" required>
                  <SelectField options={ROLE_OPTIONS} value={form.role} onChange={e => set('role', e.target.value)} />
                </FormField>
                <FormField label="Department" required>
                  <SelectField options={DEPT_OPTIONS} value={form.department} onChange={e => set('department', e.target.value)} />
                </FormField>
              </div>

              <FormField label="Status">
                <div className="flex gap-4 pt-1">
                  {['Active', 'Inactive'].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer" onClick={() => set('status', s)}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${form.status === s ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                        {form.status === s && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{s}</span>
                    </label>
                  ))}
                </div>
              </FormField>
            </div>

            <div className="px-6 py-4 border-t border-[#E8ECF0] flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-[#E8ECF0] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</>
                ) : (
                  <><Check size={16} />{editId ? 'Save Changes' : 'Register'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-1">Delete Employee</h3>
            <p className="text-sm text-gray-500 mb-6">Remove <span className="font-semibold text-gray-700">{confirmDelete.name}</span>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-[#E8ECF0] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
