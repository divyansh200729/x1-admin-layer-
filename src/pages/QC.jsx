import { useState, useEffect } from 'react'
import { ClipboardCheck, Plus, Search, Pencil, Trash2, Eye, Archive, ChevronDown, X as XIcon, Camera } from 'lucide-react'
import InlineScanner from '../components/InlineScanner'
import axios from 'axios'
import Topbar from '../components/Topbar'
import Drawer from '../components/ui/Drawer'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import ExportButtons from '../components/ExportButtons'
import { SkeletonRow } from '../components/ui/Skeleton'
import { useApi } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { exportQCCSV, exportQCPDF } from '../utils/exportUtils'

const today = () => new Date().toISOString().split('T')[0]

const DEFAULT_CHECKLIST_ITEMS = [
  'Power On', 'Display Check', 'Button Test', 'Port Test',
  'Battery Test', 'Software Test', 'Physical Damage Check'
]

function buildDefaultChecklist() {
  return DEFAULT_CHECKLIST_ITEMS.map(item => ({ item, result: 'Pass' }))
}

function calcResult(checklist) {
  if (!checklist || checklist.length === 0) return 'Pending'
  return checklist.every(c => c.result === 'Pass') ? 'Pass' : 'Fail'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY_FORM = {
  date: today(), product_model: '', serial_number: '', tested_by: '',
  test_result: 'Pending', checklist: buildDefaultChecklist(), notes: ''
}

export default function QC() {
  const toast = useToast()
  const { data: records, loading, refetch } = useApi('/api/qc_tests')
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [viewRecord, setViewRecord] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [deletingSelected, setDeletingSelected] = useState(false)
  const [stockItems, setStockItems] = useState([])
  const [stockSearch, setStockSearch] = useState('')
  const [showStockPicker, setShowStockPicker] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => {
    axios.get('/api/stock').then(r => setStockItems(r.data)).catch(() => {})
  }, [])

  const filtered = records.filter(r =>
    r.product_model.toLowerCase().includes(search.toLowerCase()) ||
    r.serial_number.toLowerCase().includes(search.toLowerCase()) ||
    r.tested_by.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => setSelected(selected.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(r => r.id)))
  const handleDeleteSelected = async () => {
    if (!selected.size) return
    setDeletingSelected(true)
    try {
      await Promise.all([...selected].map(id => axios.delete(`/api/qc_tests/${id}`)))
      toast(`${selected.size} QC tests deleted`)
      setSelected(new Set()); refetch()
    } catch { toast('Failed to delete some records', 'error') }
    finally { setDeletingSelected(false) }
  }

  // Stats
  const total = records.length
  const passed = records.filter(r => r.test_result === 'Pass').length
  const failed = records.filter(r => r.test_result === 'Fail').length
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

  const openAdd = () => {
    setEditing(null)
    const cl = buildDefaultChecklist()
    setForm({ ...EMPTY_FORM, checklist: cl, test_result: calcResult(cl) })
    setErrors({})
    setSelectedStock(null); setStockSearch(''); setShowStockPicker(false); setShowScanner(false)
    setDrawerOpen(true)
  }

  const openEdit = (r) => {
    setEditing(r)
    const cl = Array.isArray(r.checklist) && r.checklist.length > 0 ? r.checklist : buildDefaultChecklist()
    setForm({
      date: r.date || today(), product_model: r.product_model || '',
      serial_number: r.serial_number || '', tested_by: r.tested_by || '',
      test_result: r.test_result || 'Pending', checklist: cl, notes: r.notes || '',
    })
    setErrors({})
    setSelectedStock(null); setStockSearch(''); setShowStockPicker(false); setShowScanner(false)
    setDrawerOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.product_model.trim()) e.product_model = 'Required'
    if (!form.serial_number.trim()) e.serial_number = 'Required'
    if (!form.tested_by.trim()) e.tested_by = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = { ...form, test_result: calcResult(form.checklist) }
      if (editing) {
        await axios.put(`/api/qc_tests/${editing.id}`, payload)
        toast('QC test updated')
      } else {
        await axios.post('/api/qc_tests', payload)
        toast('QC test added')
      }
      setDrawerOpen(false); refetch()
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await axios.delete(`/api/qc_tests/${confirm.id}`)
      toast('QC test deleted'); setConfirm(null); refetch()
    } catch { toast('Failed to delete', 'error') }
    finally { setDeleting(false) }
  }

  const toggleChecklist = (index) => {
    const updated = form.checklist.map((c, i) =>
      i === index ? { ...c, result: c.result === 'Pass' ? 'Fail' : 'Pass' } : c
    )
    setForm(p => ({ ...p, checklist: updated, test_result: calcResult(updated) }))
  }

  const set = (key, val) => { setForm(p => ({ ...p, [key]: val })); setErrors(p => ({ ...p, [key]: '' })) }

  return (
    <div className="min-h-screen">
      <Topbar title="QC Testing" icon={ClipboardCheck} iconClass="text-purple-500" breadcrumb="QC">
        <div className="flex items-center gap-2">
          <ExportButtons records={records} onCSV={exportQCCSV} onPDF={exportQCPDF} />
          <Button onClick={openAdd} size="sm" className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white border-0">
            <Plus size={15} /> Add Test
          </Button>
        </div>
      </Topbar>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Tested', value: total, color: 'text-gray-900' },
            { label: 'Passed', value: passed, color: 'text-green-600' },
            { label: 'Failed', value: failed, color: 'text-red-500' },
            { label: 'Pass Rate', value: `${passRate}%`, color: 'text-purple-600' },
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
            type="text" placeholder="Search model, serial, tester..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
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
                  {['Date', 'Model', 'Serial', 'Tested By', 'Result', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F5]">
                {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) :
                  filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                      <ClipboardCheck size={36} className="mx-auto text-gray-200 mb-2" />
                      <p className="font-medium">No QC tests yet</p>
                    </td></tr>
                  ) : filtered.map(r => (
                    <tr key={r.id} className={`hover:bg-gray-50/50 ${selected.has(r.id) ? 'bg-violet-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                          className="w-4 h-4 rounded border-gray-300 accent-violet-600" />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{r.product_model}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{r.serial_number}</td>
                      <td className="px-4 py-3 text-gray-600">{r.tested_by}</td>
                      <td className="px-4 py-3"><Badge label={r.test_result} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewRecord(r)} className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50" title="View Checklist"><Eye size={15} /></button>
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50" title="Edit"><Pencil size={15} /></button>
                          <button onClick={() => setConfirm(r)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50" title="Delete"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-[#F0F2F5]">
            {loading ? <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div> :
              filtered.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <ClipboardCheck size={36} className="mx-auto text-gray-200 mb-2" />
                  <p className="font-medium">No QC tests yet</p>
                </div>
              ) : filtered.map(r => (
                <div key={r.id} className={`p-4 space-y-2 ${selected.has(r.id) ? 'bg-violet-50/50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                        className="w-4 h-4 rounded border-gray-300 accent-violet-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">{r.product_model}</p>
                        <p className="text-xs text-gray-500">{r.serial_number} • by {r.tested_by}</p>
                      </div>
                    </div>
                    <Badge label={r.test_result} />
                  </div>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setViewRecord(r)} className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50"><Eye size={14} /></button>
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><Pencil size={14} /></button>
                    <button onClick={() => setConfirm(r)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Checklist view modal */}
      <Modal
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        title={`Checklist — ${viewRecord?.product_model || ''}`}
        size="sm"
      >
        {viewRecord && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Serial: <span className="font-mono font-semibold text-gray-700">{viewRecord.serial_number}</span></span>
              <Badge label={viewRecord.test_result} />
            </div>
            <div className="space-y-2 mt-2">
              {(Array.isArray(viewRecord.checklist) ? viewRecord.checklist : []).map((c, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${c.result === 'Pass' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <span className="text-sm font-medium text-gray-700">{c.item}</span>
                  <span className={`text-base font-bold ${c.result === 'Pass' ? 'text-green-600' : 'text-red-500'}`}>
                    {c.result === 'Pass' ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
            {viewRecord.notes && (
              <div className="pt-2 border-t border-[#E8ECF0]">
                <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{viewRecord.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Drawer */}
      <Drawer open={drawerOpen} onClose={() => { setShowScanner(false); setDrawerOpen(false) }} title={editing ? 'Edit QC Test' : 'New QC Test'}
        footer={<div className="flex gap-3"><Button variant="secondary" fullWidth onClick={() => setDrawerOpen(false)}>Cancel</Button><Button fullWidth onClick={handleSave} loading={saving} className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 border-0">Save Test</Button></div>}
      >
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />

          {/* Stock Device Picker */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Pick from Stock</p>
            {selectedStock ? (
              <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <Archive size={15} className="text-purple-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedStock.title}</p>
                    <p className="text-xs text-gray-500">{[selectedStock.vendor, selectedStock.sku].filter(Boolean).join(' • ')}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedStock(null); set('product_model', '') }} className="p-1 rounded-lg hover:bg-purple-100 text-purple-400 hover:text-purple-600">
                  <XIcon size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-purple-400 transition-colors"
                  onClick={() => setShowStockPicker(p => !p)}
                >
                  <Archive size={14} className="text-gray-400" />
                  <span className="flex-1 text-sm text-gray-400">Select device from stock...</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </div>
                {showStockPicker && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search device..."
                        value={stockSearch}
                        onChange={e => setStockSearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {(() => {
                        const q = stockSearch.toLowerCase()
                        const matches = stockItems.filter(s =>
                          Number(s.qty) > 0 &&
                          (!q || s.title.toLowerCase().includes(q) ||
                            (s.sku || '').toLowerCase().includes(q) ||
                            (s.vendor || '').toLowerCase().includes(q))
                        )
                        return matches.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-6">No stock devices found</p>
                        ) : matches.map(s => (
                          <button key={s.id} type="button"
                            onClick={() => { setSelectedStock(s); set('product_model', s.title); setShowStockPicker(false); setStockSearch('') }}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-purple-50 text-left border-b border-gray-50 last:border-0"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{s.title}</p>
                              <p className="text-xs text-gray-400">{[s.vendor, s.sku].filter(Boolean).join(' • ')}</p>
                            </div>
                            <span className="text-xs font-semibold text-gray-500 shrink-0 ml-2">Qty: {s.qty}</span>
                          </button>
                        ))
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Input label="Product Model" required value={form.product_model} onChange={e => set('product_model', e.target.value)} error={errors.product_model} />
          {/* Serial Number with inline scanner */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Serial Number <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowScanner(p => !p)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  showScanner
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                }`}
              >
                <Camera size={12} />
                {showScanner ? 'Close Camera' : 'Scan Barcode'}
              </button>
            </div>
            {showScanner && (
              <div className="mb-2">
                <InlineScanner
                  elementId="qc-serial-scanner"
                  onScan={(val) => { set('serial_number', val); setShowScanner(false) }}
                  onClose={() => setShowScanner(false)}
                />
              </div>
            )}
            <input
              type="text"
              value={form.serial_number}
              onChange={e => set('serial_number', e.target.value)}
              placeholder="Device serial number"
              className={`w-full px-3 py-2.5 text-sm rounded-xl border font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 ${
                errors.serial_number ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
              }`}
            />
            {errors.serial_number && <p className="text-xs text-red-500 mt-1">{errors.serial_number}</p>}
          </div>
          <Input label="Tested By" required value={form.tested_by} onChange={e => set('tested_by', e.target.value)} error={errors.tested_by} />

          {/* Checklist toggles */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Checklist</p>
            <div className="space-y-2">
              {form.checklist.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleChecklist(i)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium
                    ${c.result === 'Pass'
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-red-300 bg-red-50 text-red-600'
                    }`}
                >
                  <span>{c.item}</span>
                  <span className="text-base font-bold">{c.result === 'Pass' ? '✓' : '✗'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-[#E8ECF0]">
            <span className="text-sm font-semibold text-gray-600">Auto Result:</span>
            <Badge label={calcResult(form.checklist)} />
          </div>

          <Input label="Notes" type="textarea" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional observations..." />
        </div>
      </Drawer>

      <ConfirmDialog open={!!confirm} onCancel={() => setConfirm(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete QC Test" message={`Delete QC test for ${confirm?.product_model}?`} />
    </div>
  )
}



