import { useState } from 'react'
import { Wrench, Plus, Search, Pencil, Trash2, MessageCircle } from 'lucide-react'
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
import { exportServiceCSV, exportServicePDF } from '../utils/exportUtils'

const today = () => new Date().toISOString().split('T')[0]
const STATUSES = ['Received', 'In Progress', 'Ready', 'Delivered']
const WARRANTY = ['In Warranty', 'Out of Warranty']

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  return dateStr < today()
}

const EMPTY_FORM = {
  date: today(), customer_name: '', mobile: '', product_model: '', serial_number: '',
  warranty_status: 'Out of Warranty', problem_description: '', add_ons: '',
  quotation_amount: '', expected_return_date: '', status: 'Received', remarks: ''
}

export default function Service() {
  const toast = useToast()
  const { data: records, loading, refetch } = useApi('/api/service_records')
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
    r.product_model.toLowerCase().includes(search.toLowerCase()) ||
    (r.serial_number || '').toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => setSelected(selected.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(r => r.id)))
  const handleDeleteSelected = async () => {
    if (!selected.size) return
    setDeletingSelected(true)
    try {
      await Promise.all([...selected].map(id => axios.delete(`/api/service_records/${id}`)))
      toast(`${selected.size} records deleted`)
      setSelected(new Set()); refetch()
    } catch { toast('Failed to delete some records', 'error') }
    finally { setDeletingSelected(false) }
  }

  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = records.filter(r => r.status === s).length
    return acc
  }, {})

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setErrors({}); setDrawerOpen(true) }
  const openEdit = (r) => {
    setEditing(r)
    setForm({
      date: r.date || today(), customer_name: r.customer_name || '', mobile: r.mobile || '',
      product_model: r.product_model || '', serial_number: r.serial_number || '',
      warranty_status: r.warranty_status || 'Out of Warranty', problem_description: r.problem_description || '',
      add_ons: r.add_ons || '', quotation_amount: r.quotation_amount || '', expected_return_date: r.expected_return_date || '',
      status: r.status || 'Received', remarks: r.remarks || '',
    })
    setErrors({}); setDrawerOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.customer_name.trim()) e.customer_name = 'Required'
    if (!form.mobile.trim()) e.mobile = 'Required'
    if (!form.product_model.trim()) e.product_model = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        await axios.put(`/api/service_records/${editing.id}`, form)
        toast('Service record updated')
      } else {
        await axios.post('/api/service_records', form)
        toast('Service record added')
      }
      setDrawerOpen(false); refetch()
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await axios.delete(`/api/service_records/${confirm.id}`)
      toast('Record deleted'); setConfirm(null); refetch()
    } catch { toast('Failed to delete', 'error') }
    finally { setDeleting(false) }
  }

  const set = (key, val) => { setForm(p => ({ ...p, [key]: val })); setErrors(p => ({ ...p, [key]: '' })) }

  return (
    <div className="min-h-screen">
      <Topbar title="Service" icon={Wrench} iconClass="text-emerald-500" breadcrumb="Service">
        <div className="flex items-center gap-2">
          <ExportButtons records={records} onCSV={exportServiceCSV} onPDF={exportServicePDF} />
          <Button onClick={openAdd} size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0">
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
            type="text" placeholder="Search customer, model, serial..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
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
        <div className="rounded-2xl overflow-hidden shadow-xl bg-white">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8ECF0] bg-gray-50/50">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 accent-violet-600" />
                  </th>
                  {['Date', 'Customer', 'Device', 'Model', 'Serial', 'Warranty', 'Status', 'Return Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F5]">
                {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) :
                  filtered.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-16 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Wrench size={36} className="text-gray-200" />
                        <p className="font-medium">No service records yet</p>
                      </div>
                    </td></tr>
                  ) : filtered.map(r => (
                    <tr key={r.id} className={`hover:bg-gray-50/50 ${selected.has(r.id) ? 'bg-violet-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                          className="w-4 h-4 rounded border-gray-300 accent-violet-600" />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{r.customer_name}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.mobile}</td>
                      <td className="px-4 py-3 text-gray-600">{r.product_model}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.serial_number || '—'}</td>
                      <td className="px-4 py-3"><Badge label={r.warranty_status} /></td>
                      <td className="px-4 py-3"><Badge label={r.status} /></td>
                      <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${isOverdue(r.expected_return_date) ? 'text-red-500' : 'text-gray-600'}`}>
                        {formatDate(r.expected_return_date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <a href={`https://wa.me/91${r.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-green-600 hover:bg-green-50">
                            <MessageCircle size={15} />
                          </a>
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><Pencil size={15} /></button>
                          <button onClick={() => setConfirm(r)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-[#F0F2F5]">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Wrench size={36} className="mx-auto text-gray-200 mb-2" />
                <p className="font-medium">No service records yet</p>
              </div>
            ) : filtered.map(r => (
              <div key={r.id} className={`p-4 space-y-2.5 ${selected.has(r.id) ? 'bg-violet-50/50' : ''}`}>
                {/* Row 1: checkbox + name + status */}
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
                {/* Row 2: device + warranty */}
                <div className="pl-[26px] space-y-1">
                  <p className="text-xs text-gray-700 font-medium truncate">{r.product_model}{r.serial_number ? ` · ${r.serial_number}` : ''}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge label={r.warranty_status} dot={false} />
                    <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                    {r.expected_return_date && (
                      <span className={`text-xs font-semibold ${isOverdue(r.expected_return_date) ? 'text-red-500' : 'text-gray-400'}`}>
                        Return: {formatDate(r.expected_return_date)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Row 3: actions */}
                <div className="flex justify-end gap-1">
                  <a href={`https://wa.me/91${r.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 active:bg-green-100">
                    <MessageCircle size={14} />
                  </a>
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 active:bg-blue-100">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setConfirm(r)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 active:bg-red-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit Service Record' : 'New Service Record'}
        footer={<div className="flex gap-3"><Button variant="secondary" fullWidth onClick={() => setDrawerOpen(false)}>Cancel</Button><Button fullWidth onClick={handleSave} loading={saving} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-0">Save Record</Button></div>}
      >
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          <Input label="Customer Name" required value={form.customer_name} onChange={e => set('customer_name', e.target.value)} error={errors.customer_name} placeholder="Full name" />
          <Input label="Mobile" required type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} error={errors.mobile} placeholder="10-digit mobile" />
          <Input label="Product Model" required value={form.product_model} onChange={e => set('product_model', e.target.value)} error={errors.product_model} placeholder="e.g. X1 Pro 5G" />
          <Input label="Serial Number" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} placeholder="Device serial number" />
          <Input label="Warranty Status" type="select" value={form.warranty_status} onChange={e => set('warranty_status', e.target.value)} options={WARRANTY} />
          <Input label="Problem Description" type="textarea" rows={3} value={form.problem_description} onChange={e => set('problem_description', e.target.value)} placeholder="Describe the issue..." />
          <Input label="Add-Ons" value={form.add_ons} onChange={e => set('add_ons', e.target.value)} placeholder="Accessories received with device" />
          <Input label="Quotation Amount (₹)" type="number" value={form.quotation_amount} onChange={e => set('quotation_amount', e.target.value)} placeholder="0.00" />
          <Input label="Expected Return Date" type="date" value={form.expected_return_date} onChange={e => set('expected_return_date', e.target.value)} />
          <Input label="Status" type="select" value={form.status} onChange={e => set('status', e.target.value)} options={STATUSES} />
          <Input label="Remarks" type="textarea" rows={3} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Additional notes..." />
        </div>
      </Drawer>

      <ConfirmDialog open={!!confirm} onCancel={() => setConfirm(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Service Record" message={`Delete service record for ${confirm?.customer_name}?`} />
    </div>
  )
}



