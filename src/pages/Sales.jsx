import { useState } from 'react'
import { TrendingUp, Plus, Search, Pencil, Trash2, MessageCircle } from 'lucide-react'
import axios from '../lib/apiClient'
import Topbar from '../components/Topbar'
import Drawer from '../components/ui/Drawer'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import ExportButtons from '../components/ExportButtons'
import { SkeletonRow } from '../components/ui/Skeleton'
import { useApi } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { exportSalesCSV, exportSalesPDF } from '../utils/exportUtils'

const today = () => new Date().toISOString().split('T')[0]
const STATUSES = ['New', 'Follow-Up', 'Saved', 'Sold', 'Lost']

function formatDate(d) {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  return dateStr < today()
}

const EMPTY_FORM = {
  date: today(), customer_name: '', mobile: '', email: '', city: '',
  reference_by: '', interested_in: '', assigned_to: '', follow_up_date: '',
  status: 'New', remarks: ''
}

export default function Sales() {
  const toast = useToast()
  const { data: records, loading, refetch } = useApi('/api/sales_inquiries')
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [deletingSelected, setDeletingSelected] = useState(false)

  const filtered = records.filter(r =>
    r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    r.mobile.includes(search) ||
    (r.city || '').toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => setSelected(selected.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(r => r.id)))
  const handleDeleteSelected = async () => {
    if (!selected.size) return
    setDeletingSelected(true)
    try {
      await Promise.all([...selected].map(id => axios.delete(`/api/sales_inquiries/${id}`)))
      toast(`${selected.size} inquiries deleted`)
      setSelected(new Set()); refetch()
    } catch { toast('Failed to delete some records', 'error') }
    finally { setDeletingSelected(false) }
  }

  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = records.filter(r => r.status === s).length
    return acc
  }, {})

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setDrawerOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    setForm({
      date: record.date || today(),
      customer_name: record.customer_name || '',
      mobile: record.mobile || '',
      email: record.email || '',
      city: record.city || '',
      reference_by: record.reference_by || '',
      interested_in: record.interested_in || '',
      assigned_to: record.assigned_to || '',
      follow_up_date: record.follow_up_date || '',
      status: record.status || 'New',
      remarks: record.remarks || '',
    })
    setErrors({})
    setDrawerOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.customer_name.trim()) e.customer_name = 'Required'
    if (!form.mobile.trim()) e.mobile = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        await axios.put(`/api/sales_inquiries/${editing.id}`, form)
        toast('Inquiry updated successfully')
      } else {
        await axios.post('/api/sales_inquiries', form)
        toast('Inquiry added successfully')
      }
      setDrawerOpen(false)
      refetch()
    } catch {
      toast('Failed to save inquiry', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await axios.delete(`/api/sales_inquiries/${confirm.id}`)
      toast('Inquiry deleted')
      setConfirm(null)
      refetch()
    } catch {
      toast('Failed to delete', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Sales Inquiries" icon={TrendingUp} iconClass="text-blue-500" breadcrumb="Sales">
        <div className="flex items-center gap-2">
          <ExportButtons records={records} onCSV={exportSalesCSV} onPDF={exportSalesPDF} />
          <Button onClick={openAdd} size="sm">
            <Plus size={15} /> Add New
          </Button>
        </div>
      </Topbar>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-[#E8ECF0] text-xs font-semibold shadow-sm">
              <Badge label={s} dot /> {statusCounts[s] || 0}
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, mobile, city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
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

        {/* Desktop Table */}
        <div className="hidden md:block rounded-2xl overflow-hidden shadow-xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8ECF0] bg-gray-50/50">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-violet-600 accent-violet-600" />
                  </th>
                  {['Date', 'Customer', 'Device', 'Status', 'Follow-Up', 'Assigned To', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F5]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <TrendingUp size={36} className="text-gray-200" />
                        <p className="font-medium">No inquiries yet</p>
                        <p className="text-xs">Click "Add New" to create your first inquiry</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50/50 ${selected.has(r.id) ? 'bg-violet-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                        className="w-4 h-4 rounded border-gray-300 accent-violet-600" />
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{r.customer_name}</p>
                      {r.city && <p className="text-xs text-gray-400">{r.city}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.mobile}</td>
                    <td className="px-4 py-3"><Badge label={r.status} /></td>
                    <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${isOverdue(r.follow_up_date) ? 'text-red-500' : 'text-gray-600'}`}>
                      {formatDate(r.follow_up_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.assigned_to || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a href={`https://wa.me/91${r.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" title="WhatsApp">
                          <MessageCircle size={15} />
                        </a>
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50" title="Edit"><Pencil size={15} /></button>
                        <button onClick={() => setConfirm(r)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50" title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
              <TrendingUp size={36} className="mx-auto text-gray-200 mb-2" />
              <p className="font-medium">No inquiries yet</p>
              <p className="text-xs mt-1">Tap "Add New" to get started</p>
            </div>
          ) : filtered.map(r => (
            <div key={r.id} className={`bg-white rounded-2xl shadow-sm border p-4 space-y-2.5 ${selected.has(r.id) ? 'border-violet-300 bg-violet-50/30' : 'border-gray-100'}`}>
              {/* Row 1: Checkbox + Name + Status badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                    className="w-4 h-4 rounded border-gray-300 accent-violet-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-sm leading-tight">{r.customer_name}</p>
                    <a href={`tel:${r.mobile}`} className="text-xs text-blue-500 mt-0.5 block font-mono">{r.mobile}</a>
                  </div>
                </div>
                <Badge label={r.status} />
              </div>

              {/* Row 2: Device + assigned + follow-up */}
              <div className="pl-[26px] space-y-1">
                {r.interested_in && (
                  <p className="text-xs text-gray-700 font-medium truncate">📱 {r.interested_in}</p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  {r.assigned_to && (
                    <span className="text-xs text-gray-500">👤 {r.assigned_to}</span>
                  )}
                  {r.follow_up_date && (
                    <span className={`text-xs font-semibold ${isOverdue(r.follow_up_date) ? 'text-red-500' : 'text-gray-400'}`}>
                      📅 {formatDate(r.follow_up_date)}
                    </span>
                  )}
                  {r.city && <span className="text-xs text-gray-400">📍 {r.city}</span>}
                </div>
              </div>

              {/* Row 3: Date + action buttons */}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs text-gray-400 pl-[26px]">{formatDate(r.date)}</span>
                <div className="flex gap-1">
                  <a href={`https://wa.me/91${r.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 active:bg-green-100">
                    <MessageCircle size={15} />
                  </a>
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 active:bg-blue-100">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setConfirm(r)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 active:bg-red-100">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Edit Inquiry' : 'New Inquiry'}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSave} loading={saving}>Save Inquiry</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          <Input label="Customer Name" required value={form.customer_name} onChange={e => set('customer_name', e.target.value)} error={errors.customer_name} placeholder="Full name" />
          <Input label="Mobile" required type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} error={errors.mobile} placeholder="10-digit mobile" />
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
          <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
          <Input label="Reference By" value={form.reference_by} onChange={e => set('reference_by', e.target.value)} placeholder="Google, Referral, Walk-in..." />
          <Input label="Interested In" value={form.interested_in} onChange={e => set('interested_in', e.target.value)} placeholder="Product model/variant" />
          <Input label="Assigned To" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Team member name" />
          <Input label="Follow-Up Date" type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} />
          <Input
            label="Status" type="select"
            value={form.status} onChange={e => set('status', e.target.value)}
            options={STATUSES}
          />
          <Input label="Remarks" type="textarea" rows={3} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Additional notes..." />
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Inquiry"
        message={`Delete inquiry for ${confirm?.customer_name}?`}
      />
    </div>
  )
}



