import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Archive, Upload, Download, Search, X, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, Trash2, RefreshCw, Filter
} from 'lucide-react'
import axios from 'axios'
import Topbar from '../components/Topbar'

// ─── CSV Parser (handles BOM, quoted fields, embedded newlines & escaped quotes) ─
function parseCSV(raw) {
  const text = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw
  const rows = []
  let row = []
  let field = ''
  let inQuote = false
  let i = 0
  const n = text.length

  while (i < n) {
    const ch = text[i]
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2 }
        else { inQuote = false; i++ }
      } else { field += ch; i++ }
    } else {
      if (ch === '"') { inQuote = true; i++ }
      else if (ch === ',') { row.push(field); field = ''; i++ }
      else if (ch === '\r') { i++ }
      else if (ch === '\n') {
        row.push(field); field = ''
        if (row.length > 0 && !(row.length === 1 && row[0] === '')) rows.push(row)
        row = []; i++
      } else { field += ch; i++ }
    }
  }
  if (row.length > 0 || field) {
    row.push(field)
    if (!(row.length === 1 && row[0] === '')) rows.push(row)
  }
  return rows
}

// ─── CSV Exporter ─────────────────────────────────────────────────────────────
function toCSVCell(val) {
  const s = String(val ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0)

const discPct = (price, mrp) => {
  const p = Number(price), m = Number(mrp)
  return m > 0 && p > 0 ? Math.round((1 - p / m) * 100) : 0
}

function QtyBadge({ qty }) {
  const q = Number(qty)
  if (q === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Out</span>
  if (q <= 3)  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">{q} Low</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{q}</span>
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase()
  const cls = s === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>{status || 'draft'}</span>
}

const PER_PAGE = 25

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Stock() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterVendor, setFilterVendor] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  // ── Load from backend ──────────────────────────────────────────────────
  const fetchStock = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/stock')
      setData(res.data)
    } catch {
      showToast('error', 'Failed to load stock data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStock() }, [])

  // ── Filter/search ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let d = data
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      d = d.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.sku   || '').toLowerCase().includes(q) ||
        (r.vendor|| '').toLowerCase().includes(q) ||
        (r.type  || '').toLowerCase().includes(q) ||
        (r.tags  || '').toLowerCase().includes(q)
      )
    }
    if (filterVendor) d = d.filter(r => r.vendor === filterVendor)
    if (filterType)   d = d.filter(r => r.type   === filterType)
    if (filterStatus) d = d.filter(r => (r.status || 'draft').toLowerCase() === filterStatus)
    return d
  }, [data, search, filterVendor, filterType, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const pageData   = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  const vendors = useMemo(() => [...new Set(data.map(r => r.vendor).filter(Boolean))].sort(), [data])
  const types   = useMemo(() => [...new Set(data.map(r => r.type  ).filter(Boolean))].sort(), [data])

  useEffect(() => { setPage(1) }, [search, filterVendor, filterType, filterStatus])

  // ── Stats (explicit Number() to prevent string concat) ──────────────
  const totalQty       = data.reduce((s, r) => s + Number(r.qty),                    0)
  const sellingValue   = data.reduce((s, r) => s + Number(r.price) * Number(r.qty),  0)
  const mrpValue       = data.reduce((s, r) => s + Number(r.mrp)   * Number(r.qty),  0)
  const lowStock       = data.filter(r => Number(r.qty) > 0 && Number(r.qty) <= 3).length
  const outOfStock     = data.filter(r => Number(r.qty) === 0).length

  // ── Toast ────────────────────────────────────────────────────────────
  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Import CSV ───────────────────────────────────────────────────────
  function processFile(file) {
    if (!file) return
    if (!file.name.endsWith('.csv')) { showToast('error', 'Please upload a .csv file'); return }
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const rows = parseCSV(e.target.result)
        if (rows.length < 2) throw new Error('No data rows found in CSV')
        const headers = rows[0].map(h => h.trim())
        const idx = (name) => headers.indexOf(name)

        const iTitle  = idx('Title')
        const iHandle = idx('Handle')
        const iVendor = idx('Vendor')
        const iType   = idx('Type')
        const iTags   = idx('Tags')
        const iSKU    = idx('Variant SKU')
        const iQty    = idx('Variant Inventory Qty')
        const iPrice  = idx('Variant Price')
        const iMRP    = idx('Variant Compare At Price')
        const iStatus = idx('Status')

        if (iTitle === -1 || iSKU === -1)
          throw new Error('Missing required columns (Title, Variant SKU)')

        const parsed = rows.slice(1)
          .map(row => ({
            handle: row[iHandle] || '',
            title:  row[iTitle]  || '',
            vendor: row[iVendor] || '',
            type:   row[iType]   || '',
            tags:   row[iTags]   || '',
            sku:    row[iSKU]    || '',
            qty:    parseInt(row[iQty])    || 0,
            price:  parseFloat(row[iPrice]) || 0,
            mrp:    parseFloat(row[iMRP])   || 0,
            status: (row[iStatus] || 'draft').toLowerCase(),
          }))
          .filter(r => r.title.trim())

        if (parsed.length === 0) throw new Error('No valid product rows found')

        await axios.post('/api/stock/import', parsed)
        await fetchStock()
        setSearch(''); setFilterVendor(''); setFilterType(''); setFilterStatus('')
        showToast('success', `${parsed.length} products imported & synced`)
      } catch (err) {
        showToast('error', `Import failed: ${err.response?.data?.error || err.message}`)
      }
    }
    reader.readAsText(file)
  }

  function handleFileInput(e) { processFile(e.target.files[0]); e.target.value = '' }
  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  // ── Export CSV ───────────────────────────────────────────────────────
  function handleExport() {
    if (filtered.length === 0) { showToast('error', 'No data to export'); return }
    const headers = ['SKU', 'Title', 'Vendor', 'Type', 'Selling Price (₹)', 'MRP (₹)', 'Discount %', 'Stock Qty', 'Status']
    const csvRows = [
      headers.map(toCSVCell).join(','),
      ...filtered.map(r => [
        r.sku, r.title, r.vendor, r.type,
        Number(r.price), Number(r.mrp),
        `${discPct(r.price, r.mrp)}%`,
        Number(r.qty), r.status
      ].map(toCSVCell).join(','))
    ]
    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `x1_stock_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('success', `Exported ${filtered.length} rows`)
  }

  // ── Clear all data ───────────────────────────────────────────────────
  async function handleClear() {
    if (!window.confirm('Clear all stock data from the server? This cannot be undone.')) return
    try {
      await axios.delete('/api/stock')
      setData([])
      setSearch(''); setFilterVendor(''); setFilterType(''); setFilterStatus('')
      showToast('success', 'Stock data cleared')
    } catch {
      showToast('error', 'Failed to clear stock data')
    }
  }

  const hasFilters = search || filterVendor || filterType || filterStatus

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Topbar */}
      <Topbar title="Stock Management" icon={Archive} iconClass="text-emerald-300" breadcrumb="Stock">
        {data.length > 0 && (
          <>
            <button onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-red-300 hover:text-white hover:bg-red-500/30 transition-all">
              <Trash2 size={15} /><span className="hidden sm:inline ml-1">Clear</span>
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-300 hover:text-white hover:bg-emerald-500/30 transition-all">
              <Download size={15} /><span className="hidden sm:inline ml-1">Export</span>
            </button>
          </>
        )}
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          <Upload size={15} /><span className="hidden sm:inline ml-1">Import CSV</span>
          <span className="sm:hidden">Import</span>
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
      </Topbar>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold
          ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        )}

        {/* ── Empty / Upload State ─────────────────────────────────────── */}
        {!loading && data.length === 0 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-3xl border-2 border-dashed transition-all p-8 sm:p-20 flex flex-col items-center justify-center gap-4 text-center
              ${dragging ? 'border-violet-400 bg-violet-50' : 'border-violet-200 bg-white hover:border-violet-400 hover:bg-violet-50/50'}`}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#7c3aed22,#6d28d922)' }}>
              <Upload size={28} className="text-violet-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-700">Import Stock CSV</p>
              <p className="text-sm text-gray-400 mt-1">Drag & drop your Shopify CSV file here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-3">Supports Shopify product export format · Synced across all devices</p>
            </div>
            <button className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white pointer-events-none"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              Choose File
            </button>
          </div>
        )}

        {/* ── Stats Strip ──────────────────────────────────────────────── */}
        {!loading && data.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-white p-3 shadow-sm overflow-hidden">
                <p className="text-xs text-gray-500 font-medium truncate">Total Products</p>
                <p className="text-xl font-extrabold mt-1 text-violet-600">{data.length}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 border border-white p-3 shadow-sm overflow-hidden">
                <p className="text-xs text-gray-500 font-medium truncate">Stock Units</p>
                <p className="text-xl font-extrabold mt-1 text-blue-600">{totalQty.toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-white p-3 shadow-sm overflow-hidden">
                <p className="text-xs text-gray-500 font-medium truncate">Selling Value</p>
                <p className="text-xs font-extrabold mt-1 text-emerald-600 truncate">{fmtINR(sellingValue)}</p>
                <p className="text-xs text-emerald-500 mt-0.5 truncate">MRP: {fmtINR(mrpValue)}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-white p-3 shadow-sm overflow-hidden">
                <p className="text-xs text-gray-500 font-medium truncate">Low / Out</p>
                <p className="text-xl font-extrabold mt-1 text-orange-600">{lowStock} / {outOfStock}</p>
              </div>
            </div>

            {/* ── Search + Filter Bar ─────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by product name, SKU, vendor, tags…"
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button onClick={() => setShowFilters(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all
                    ${showFilters || filterVendor || filterType || filterStatus
                      ? 'border-violet-400 bg-violet-50 text-violet-700'
                      : 'border-gray-200 text-gray-600 hover:border-violet-300'}`}>
                  <Filter size={15} />
                  <span className="hidden sm:inline">Filters</span>
                  {(filterVendor || filterType || filterStatus) && (
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                  )}
                </button>
                <button onClick={fetchStock}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-violet-400 hover:text-violet-600 transition-all">
                  <RefreshCw size={14} />
                </button>
              </div>

              {showFilters && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                  <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
                    className="flex-1 min-w-[130px] px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 bg-white">
                    <option value="">All Brands</option>
                    {vendors.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="flex-1 min-w-[130px] px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 bg-white">
                    <option value="">All Types</option>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="flex-1 min-w-[130px] px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 bg-white">
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </select>
                  {(filterVendor || filterType || filterStatus) && (
                    <button onClick={() => { setFilterVendor(''); setFilterType(''); setFilterStatus('') }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-all">
                      Clear
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{hasFilters ? `${filtered.length} of ${data.length} products` : `${data.length} products`}</span>
                <span>Page {safePage} of {totalPages}</span>
              </div>
            </div>

            {/* ── Desktop Table ──────────────────────────────────────── */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                      {['#','SKU','Device Name','Vendor','Type','Selling Price','MRP','Disc%','Qty','Status'].map(h => (
                        <th key={h} className={`px-4 py-3 text-xs font-bold text-violet-700 uppercase tracking-wide
                          ${['Selling Price','MRP','Disc%'].includes(h) ? 'text-right' : h === 'Qty' || h === 'Status' ? 'text-center' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center py-12 text-gray-400">
                          <Search size={32} className="mx-auto mb-2 opacity-30" />
                          No products match your search
                        </td>
                      </tr>
                    )}
                    {pageData.map((row, i) => {
                      const d = discPct(row.price, row.mrp)
                      const rowNum = (safePage - 1) * PER_PAGE + i + 1
                      return (
                        <tr key={row.id} className="border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
                          <td className="px-4 py-3 text-gray-400 text-xs">{rowNum}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">{row.sku || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 max-w-xs" title={row.title}>
                              {row.title}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-violet-100 text-violet-700">{row.vendor || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{row.type || '—'}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">
                            {Number(row.price) > 0 ? fmtINR(row.price) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400 text-xs line-through">
                            {Number(row.mrp) > 0 ? fmtINR(row.mrp) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {d > 0
                              ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">-{d}%</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center"><QtyBadge qty={row.qty} /></td>
                          <td className="px-4 py-3 text-center"><StatusBadge status={row.status} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Mobile Cards ────────────────────────────────────────── */}
            <div className="md:hidden space-y-3">
              {pageData.length === 0 && (
                <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm border border-gray-100">
                  <Search size={28} className="mx-auto mb-2 opacity-30" />
                  No products match your search
                </div>
              )}
              {pageData.map(row => {
                const d = discPct(row.price, row.mrp)
                return (
                  <div key={row.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm leading-tight">{row.title}</p>
                        {row.sku && <p className="text-xs text-gray-400 mt-0.5 font-mono">{row.sku}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <QtyBadge qty={row.qty} />
                        <StatusBadge status={row.status} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {row.vendor && <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-violet-100 text-violet-700">{row.vendor}</span>}
                        {row.type   && <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">{row.type}</span>}
                        {d > 0      && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">-{d}%</span>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-gray-800">{Number(row.price) > 0 ? fmtINR(row.price) : '—'}</p>
                        {Number(row.mrp) > 0 && <p className="text-xs text-gray-400 line-through">{fmtINR(row.mrp)}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Pagination ───────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="p-2 rounded-xl border border-gray-200 text-gray-500 disabled:opacity-30 hover:border-violet-400 hover:text-violet-600 transition-all">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                    acc.push(p); return acc
                  }, [])
                  .map((p, idx) =>
                    p === '...'
                      ? <span key={`e${idx}`} className="px-2 text-gray-400 text-sm">…</span>
                      : <button key={p} onClick={() => setPage(p)}
                          className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all
                            ${safePage === p ? 'text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:border-violet-400 hover:text-violet-600'}`}
                          style={safePage === p ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' } : {}}>
                          {p}
                        </button>
                  )}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className="p-2 rounded-xl border border-gray-200 text-gray-500 disabled:opacity-30 hover:border-violet-400 hover:text-violet-600 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-1">
              <RefreshCw size={11} />
              <span>Data synced across all devices via server · Re-import CSV to update stock</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
