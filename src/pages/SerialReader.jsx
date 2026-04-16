import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, Search, Wrench, ClipboardCheck, Package, Clock, Trash2, X, CheckCircle2, XCircle, Camera, Keyboard } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import Badge from '../components/ui/Badge'

const HISTORY_KEY = 'x1_scan_history'
const MAX_HISTORY = 20

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)))
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' · ' +
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function SerialReader() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('camera') // 'camera' | 'manual'
  const [scanning, setScanning] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState(loadHistory)
  const [cameraError, setCameraError] = useState('')
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)

  // ── Start camera scanner ────────────────────────────────
  const startScanner = useCallback(async () => {
    setCameraError('')
    setScanning(true)

    // Step 1: enumerate cameras (most reliable on Samsung — uses device IDs)
    const configs = []
    try {
      const cameras = await Html5Qrcode.getCameras()
      if (cameras && cameras.length > 0) {
        const back = cameras.find(c =>
          /back|rear|environment|主|後/i.test(c.label)
        ) || cameras[cameras.length - 1]
        configs.push({ deviceId: back.id })
        cameras.forEach(c => {
          if (c.id !== back.id) configs.push({ deviceId: c.id })
        })
      }
    } catch { /* enumerate failed — use facingMode fallbacks */ }

    // Step 2: facingMode fallbacks
    configs.push({ facingMode: 'environment' })
    configs.push({})

    let lastErr = null
    for (const cfg of configs) {
      const el = document.getElementById('serial-scanner-view')
      if (el) el.innerHTML = ''

      const html5Qr = new Html5Qrcode('serial-scanner-view')
      html5QrRef.current = html5Qr

      try {
        await html5Qr.start(
          cfg,
          { fps: 10, qrbox: { width: 260, height: 100 }, aspectRatio: 1.5 },
          (decodedText) => { stopScanner(); handleLookup(decodedText.trim()) },
          () => {}
        )
        return  // ✅ success
      } catch (err) {
        lastErr = err
        const msg = (err?.message || '').toLowerCase()
        if (msg.includes('permission') || msg.includes('notallowed') || msg.includes('denied')) break
        try { await html5Qr.stop() } catch {}
        try { html5Qr.clear() }      catch {}
        html5QrRef.current = null
      }
    }

    // All attempts failed
    html5QrRef.current = null
    setScanning(false)
    const msg = (lastErr?.message || '').toLowerCase()
    setCameraError(
      msg.includes('permission') || msg.includes('notallowed') || msg.includes('denied')
        ? 'Camera permission denied. Please allow camera access and try again.'
        : msg.includes('notreadable') || msg.includes('trackstart')
          ? 'Camera is busy. Close other apps using the camera and try again.'
          : 'Could not start camera. Try manual entry instead.'
    )
  }, [])

  const stopScanner = useCallback(async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop() } catch {}
      try { html5QrRef.current.clear() } catch {}
      html5QrRef.current = null
    }
    setScanning(false)
  }, [])

  // Stop scanner when switching mode or unmounting
  useEffect(() => {
    return () => { stopScanner() }
  }, [stopScanner])

  useEffect(() => {
    if (mode !== 'camera') stopScanner()
  }, [mode, stopScanner])

  // ── Lookup across all modules ────────────────────────────
  const handleLookup = useCallback(async (serial) => {
    const q = serial.trim()
    if (!q) return
    setQuery(q)
    setManualInput(q)
    setSearching(true)
    setResults(null)
    setError('')

    try {
      const res = await axios.get(`/api/serial-lookup?q=${encodeURIComponent(q)}`)
      const data = res.data

      // Save to history
      const entry = {
        serial: q,
        time: new Date().toISOString(),
        total: (data.service?.length || 0) + (data.qc?.length || 0) + (data.orders?.length || 0),
      }
      const updated = [entry, ...loadHistory().filter(h => h.serial !== q)]
      saveHistory(updated)
      setHistory(updated)
      setResults(data)
    } catch {
      setError('Lookup failed. Make sure the server is running.')
    } finally {
      setSearching(false)
    }
  }, [])

  const clearResults = () => {
    setResults(null)
    setQuery('')
    setManualInput('')
    setError('')
  }

  const clearHistory = () => {
    saveHistory([])
    setHistory([])
  }

  const totalResults = results
    ? (results.service?.length || 0) + (results.qc?.length || 0) + (results.orders?.length || 0)
    : 0

  return (
    <div className="min-h-screen">
      <Topbar title="Serial Scanner" icon={ScanLine} iconClass="text-cyan-300" breadcrumb="Scanner" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 rounded-2xl bg-white/10 border border-white/10">
          {[
            { id: 'camera', label: 'Camera Scan', icon: Camera },
            { id: 'manual', label: 'Manual Entry', icon: Keyboard },
          ].map(m => {
            const Icon = m.icon
            return (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === m.id
                    ? 'bg-white text-violet-700 shadow-md'
                    : 'text-violet-200 hover:bg-white/10 hover:text-white'
                }`}>
                <Icon size={16} /> {m.label}
              </button>
            )
          })}
        </div>

        {/* Camera mode */}
        {mode === 'camera' && (
          <div className="rounded-2xl overflow-hidden bg-white shadow-xl">
            <div className="p-4 border-b border-[#E8ECF0]">
              <p className="text-sm font-semibold text-gray-700">Point your camera at a barcode or QR code</p>
              <p className="text-xs text-gray-400 mt-0.5">Supports 1D barcodes, QR codes, Data Matrix</p>
            </div>

            {/* Scanner viewport */}
            <div className="relative bg-gray-900" style={{ minHeight: 220 }}>
              <div id="serial-scanner-view" className="w-full" />
              {!scanning && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Camera size={28} className="text-white/60" />
                  </div>
                  <p className="text-white/60 text-sm">Camera not started</p>
                </div>
              )}
              {/* Scanning overlay guide lines */}
              {scanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-64 h-20">
                    <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
                    <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-cyan-400 rounded-br" />
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cyan-400/60 animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="px-4 py-3 bg-red-50 border-t border-red-100 text-sm text-red-600 flex items-start gap-2">
                <XCircle size={16} className="mt-0.5 shrink-0" />
                {cameraError}
              </div>
            )}

            <div className="p-4 flex gap-2">
              {!scanning ? (
                <button onClick={startScanner}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm shadow-sm hover:from-cyan-600 hover:to-blue-600">
                  <Camera size={18} /> Start Scanning
                </button>
              ) : (
                <button onClick={stopScanner}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm">
                  <X size={18} /> Stop Camera
                </button>
              )}
            </div>
          </div>
        )}

        {/* Manual mode */}
        {mode === 'manual' && (
          <div className="rounded-2xl bg-white shadow-xl p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Enter or paste a serial / tracking number</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. X1P5G2024001"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && manualInput.trim() && handleLookup(manualInput)}
                  className="w-full pl-9 pr-4 py-3 text-sm font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                  autoFocus
                />
              </div>
              <button
                onClick={() => manualInput.trim() && handleLookup(manualInput)}
                disabled={!manualInput.trim() || searching}
                className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-sm rounded-xl disabled:opacity-50 shrink-0">
                {searching ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : 'Search'}
              </button>
            </div>
          </div>
        )}

        {/* Searching indicator */}
        {searching && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/10 border border-white/15">
            <svg className="animate-spin h-5 w-5 text-cyan-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-white font-medium text-sm">Looking up <span className="font-mono text-cyan-300">{query}</span>…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <XCircle size={16} /> {error}
          </div>
        )}

        {/* Results */}
        {results && !searching && (
          <div className="space-y-4">
            {/* Result header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {totalResults > 0
                  ? <CheckCircle2 size={18} className="text-green-400" />
                  : <XCircle size={18} className="text-red-400" />
                }
                <span className="text-white font-semibold text-sm">
                  {totalResults > 0
                    ? `${totalResults} record${totalResults > 1 ? 's' : ''} found for`
                    : 'No records found for'
                  } <span className="font-mono text-cyan-300">{query}</span>
                </span>
              </div>
              <button onClick={clearResults} className="p-1.5 rounded-lg text-violet-300 hover:bg-white/10 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {totalResults === 0 && (
              <div className="rounded-2xl bg-white/10 border border-white/10 p-8 text-center">
                <ScanLine size={36} className="mx-auto text-white/30 mb-3" />
                <p className="text-white/60 font-medium text-sm">No matching records</p>
                <p className="text-white/30 text-xs mt-1">Try a different serial or tracking number</p>
              </div>
            )}

            {/* Service Results */}
            {results.service?.length > 0 && (
              <ResultSection
                icon={Wrench} title="Service Records" color="text-emerald-400" count={results.service.length}
                accent="bg-emerald-500">
                {results.service.map(r => (
                  <ResultCard key={r.id} onClick={() => navigate('/service')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{r.customer_name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{r.serial_number}</p>
                        <p className="text-xs text-gray-500 mt-1">{r.product_model}</p>
                      </div>
                      <Badge label={r.status} />
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                      <Badge label={r.warranty_status} />
                    </div>
                    {r.problem_description && (
                      <p className="text-xs text-gray-500 mt-1.5 italic line-clamp-1">{r.problem_description}</p>
                    )}
                  </ResultCard>
                ))}
              </ResultSection>
            )}

            {/* QC Results */}
            {results.qc?.length > 0 && (
              <ResultSection
                icon={ClipboardCheck} title="QC Tests" color="text-purple-400" count={results.qc.length}
                accent="bg-purple-500">
                {results.qc.map(r => (
                  <ResultCard key={r.id} onClick={() => navigate('/qc')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{r.product_model}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{r.serial_number}</p>
                        <p className="text-xs text-gray-500 mt-1">Tested by: {r.tested_by}</p>
                      </div>
                      <Badge label={r.test_result} />
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                      {r.notes && <span className="text-xs text-gray-400 italic truncate max-w-[160px]">{r.notes}</span>}
                    </div>
                  </ResultCard>
                ))}
              </ResultSection>
            )}

            {/* Orders by tracking number */}
            {results.orders?.length > 0 && (
              <ResultSection
                icon={Package} title="Orders (Tracking Match)" color="text-amber-400" count={results.orders.length}
                accent="bg-amber-500">
                {results.orders.map(r => (
                  <ResultCard key={r.id} onClick={() => navigate('/orders')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{r.customer_name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{r.tracking_number}</p>
                        <p className="text-xs text-gray-500 mt-1">{r.product_model}</p>
                      </div>
                      <Badge label={r.order_status} />
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                      <span className="text-xs font-bold text-gray-800">₹{Number(r.amount).toLocaleString('en-IN')}</span>
                    </div>
                  </ResultCard>
                ))}
              </ResultSection>
            )}
          </div>
        )}

        {/* Scan History */}
        {history.length > 0 && !results && !searching && (
          <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E8ECF0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Recent Scans</span>
              </div>
              <button onClick={clearHistory} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-medium">
                <Trash2 size={12} /> Clear
              </button>
            </div>
            <div className="divide-y divide-[#F0F2F5]">
              {history.map((h, i) => (
                <button key={i} onClick={() => handleLookup(h.serial)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 text-left transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                      <ScanLine size={14} className="text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-sm font-mono font-semibold text-gray-900">{h.serial}</p>
                      <p className="text-xs text-gray-400">{formatTime(h.time)}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    h.total > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {h.total > 0 ? `${h.total} found` : 'No match'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!results && !searching && history.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <ScanLine size={40} className="mx-auto text-white/30 mb-3" />
            <p className="text-white/60 font-semibold text-sm">No scans yet</p>
            <p className="text-white/30 text-xs mt-1">
              {mode === 'camera' ? 'Start the camera and point at a barcode' : 'Type a serial number above and press Search'}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

function ResultSection({ icon: Icon, title, color, count, accent, children }) {
  return (
    <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E8ECF0] flex items-center gap-2">
        <div className={`w-6 h-6 rounded-lg ${accent} flex items-center justify-center`}>
          <Icon size={13} className="text-white" />
        </div>
        <span className="text-sm font-bold text-gray-800">{title}</span>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{count}</span>
      </div>
      <div className="divide-y divide-[#F0F2F5]">{children}</div>
    </div>
  )
}

function ResultCard({ onClick, children }) {
  return (
    <div onClick={onClick}
      className="px-4 py-3 hover:bg-gray-50/60 cursor-pointer transition-all">
      {children}
      <p className="text-xs text-cyan-600 font-semibold mt-2">Tap to open module →</p>
    </div>
  )
}
