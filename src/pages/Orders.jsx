import { useState } from 'react'
import { Package, Plus, Search, Pencil, Trash2, MessageCircle, Copy } from 'lucide-react'
import axios from 'axios'
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
import { exportOrdersCSV, exportOrdersPDF } from '../utils/exportUtils'

const today = () => new Date().toISOString().split('T')[0]
const STATUSES = ['Pending', 'Dispatched', 'Delivered', 'Cancelled']
const TABS = ['All', ...STATUSES]

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY_FORM = {
  date: today(), customer_name: '', mobile: '', gst_number: '', shipping_address: '',
  product_model: '', amount: '', remarks: '', courier_name: '', tracking_number: '',
  order_status: 'Pending'
}

export default function Orders() {
  const toast = useToast()
  const { data: records, loading, refetch } = useApi('/api/orders')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [deletingSelected, setDeletingSelected] = useState(false)

  const filtered = records.filter(r => {
    const matchTab = activeTab === 'All' || r.order_status === activeTab
    const matchSearch = r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.mobile.includes(search) ||
      r.product_model.toLowerCase().includes(search.toLowerCase()) ||
      (r.tracking_number || '').toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => setSelected(selected.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(r => r.id)))
  const handleDeleteSelected = async () => {
    if (!selected.size) return
    setDeletingSelected(true)
    try {
      await Promise.all([...selected].map(id => axios.delete(`/api/orders/${id}`)))
      toast(`${selected.size} orders deleted`)
      setSelected(new Set()); refetch()
    } catch { toast('Failed to delete some records', 'error') }
    finally { setDeletingSelected(false) }
  }

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setErrors({}); setDrawerOpen(true) }
  const openEdit = (r) => {
    setEditing(r)
    setForm({
      date: r.date || today(), customer_name: r.customer_name || '', mobile: r.mobile || '',
      gst_number: r.gst_number || '', shipping_address: r.shipping_address || '',
      product_model: r.product_model || '', amount: r.amount || '', remarks: r.remarks || '',
      courier_name: r.courier_name || '', tracking_number: r.tracking_number || '',
      order_status: r.order_status || 'Pending',
    })
    setErrors({}); setDrawerOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.customer_name.trim()) e.customer_name = 'Required'
    if (!form.mobile.trim()) e.mobile = 'Required'
    if (!form.product_model.trim()) e.product_model = 'Required'
    if (!form.amount) e.amount = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        await axios.put(`/api/orders/${editing.id}`, form)
        toast('Order updated')
      } else {
        await axios.post('/api/orders', form)
        toast('Order created')
      }
      setDrawerOpen(false); refetch()
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await axios.delete(`/api/orders/${confirm.id}`)
      toast('Order deleted'); setConfirm(null); refetch()
    } catch { toast('Failed to delete', 'error') }
    finally { setDeleting(false) }
  }

  const copyTracking = (tracking) => {
    if (!tracking) return
    navigator.clipboard.writeText(tracking).then(() => toast('Tracking number copied!', 'info'))
  }

  const set = (key, val) => { setForm(p => ({ ...p, [key]: val })); setErrors(p => ({ ...p, [key]: '' })) }

  const tabAccent = 'bg-gradient-to-r from-orange-500 to-amber-500'

  return (
    <div className="min-h-screen">
      <Topbar title="Orders" icon={Package} iconClass="text-orange-500" breadcrumb="Orders">
        <div className="flex items-center gap-2">
          <ExportButtons records={records} onCSV={exportOrdersCSV} onPDF={exportOrdersPDF} />
          <Button onClick={openAdd} size="sm" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0">
            <Plus size={15} /> Add New
          </Button>
        </div>
      </Topbar>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-[#E8ECF0] p-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0
                ${activeTab === tab
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              {tab}
              <span className="ml-1.5 text-xs opacity-70">
                ({tab === 'All' ? records.length : records.filter(r => r.order_status === tab).length})
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search orders..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
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
                      className="w-4 h-4 rounded border-gray-300 accent-violet-600" />
                  </th>
                  {['Date', 'Customer', 'Model', 'Amount', 'Courier', 'Tracking', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F5]">
                {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) :
                  filtered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-16 text-gray-400">
                      <Package size={36} className="mx-auto text-gray-200 mb-2" />
                      <p className="font-medium">No orders found</p>
                    </td></tr>
                  ) : filtered.map(r => (
                    <tr key={r.id} className={`hover:bg-gray-50/50 ${selected.has(r.id) ? 'bg-violet-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                          className="w-4 h-4 rounded border-gray-300 accent-violet-600" />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{r.customer_name}</p>
                        <p className="text-xs text-gray-400">{r.mobile}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.product_model}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-gray-600">{r.courier_name || '—'}</td>
                      <td className="px-4 py-3">
                        {r.tracking_number ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-gray-600 truncate max-w-[120px]">{r.tracking_number}</span>
                            <button onClick={() => copyTracking(r.tracking_number)} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"><Copy size={12} /></button>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3"><Badge label={r.order_status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <a href={`https://wa.me/91${r.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"><MessageCircle size={15} /></a>
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><Pencil size={15} /></button>
                          <button onClick={() => setConfirm(r)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={15} /></button>
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
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm border border-gray-100">
              <Package size={36} className="mx-auto text-gray-200 mb-2" />
              <p className="font-medium">No orders found</p>
            </div>
          ) : filtered.map(r => (
            <div key={r.id} className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2 ${selected.has(r.id) ? 'border-orange-300 bg-orange-50/30' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                    className="w-4 h-4 rounded border-gray-300 accent-orange-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-sm leading-tight">{r.customer_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.mobile}</p>
                  </div>
                </div>
                <Badge label={r.order_status} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-xs text-gray-500 truncate">{r.product_model}</p>
                  <p className="text-xs text-gray-400">{formatDate(r.date)} · <span className="font-bold text-gray-800">₹{Number(r.amount).toLocaleString('en-IN')}</span></p>
                  {r.courier_name && (
                    <p className="text-xs text-gray-400 truncate">{r.courier_name}{r.tracking_number ? ` • ${r.tracking_number}` : ''}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <a href={`https://wa.me/91${r.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"><MessageCircle size={14} /></a>
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><Pencil size={14} /></button>
                  <button onClick={() => setConfirm(r)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit Order' : 'New Order'}
        footer={<div className="flex gap-3"><Button variant="secondary" fullWidth onClick={() => setDrawerOpen(false)}>Cancel</Button><Button fullWidth onClick={handleSave} loading={saving} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0">Save Order</Button></div>}
      >
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          <Input label="Customer Name" required value={form.customer_name} onChange={e => set('customer_name', e.target.value)} error={errors.customer_name} />
          <Input label="Mobile" required type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} error={errors.mobile} />
          <Input label="GST Number" value={form.gst_number} onChange={e => set('gst_number', e.target.value)} placeholder="GST registration number" />
          <Input label="Shipping Address" type="textarea" rows={2} value={form.shipping_address} onChange={e => set('shipping_address', e.target.value)} />
          <Input label="Product Model" required value={form.product_model} onChange={e => set('product_model', e.target.value)} error={errors.product_model} />
          <Input label="Amount (₹)" required type="number" value={form.amount} onChange={e => set('amount', e.target.value)} error={errors.amount} placeholder="0.00" />
          <Input label="Remarks" type="textarea" rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} />
          <Input label="Courier Name" value={form.courier_name} onChange={e => set('courier_name', e.target.value)} placeholder="e.g. Delhivery, BlueDart" />
          <Input label="Tracking Number" value={form.tracking_number} onChange={e => set('tracking_number', e.target.value)} placeholder="Tracking / AWB number" />
          <Input label="Order Status" type="select" value={form.order_status} onChange={e => set('order_status', e.target.value)} options={STATUSES} />
        </div>
      </Drawer>

      <ConfirmDialog open={!!confirm} onCancel={() => setConfirm(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Order" message={`Delete order for ${confirm?.customer_name}?`} />
    </div>
  )
}



