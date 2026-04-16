import { useEffect, useRef, useCallback, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X, AlertCircle, RefreshCw } from 'lucide-react'

export default function InlineScanner({ onScan, onClose, elementId = 'inline-scanner-view' }) {
  const html5QrRef = useRef(null)
  const streamRef  = useRef(null)
  const mountedRef = useRef(true)
  const [started, setStarted] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [errorDetail, setErrorDetail] = useState('')

  // Hide html5-qrcode injected widgets — do NOT force video height (breaks Samsung)
  useEffect(() => {
    const style = document.createElement('style')
    style.id = `${elementId}-style`
    style.textContent = `
      #${elementId} > img,
      #${elementId} > select,
      #${elementId}__dashboard,
      #${elementId}__header_message,
      #${elementId}__status_span { display: none !important; }
      #${elementId} video {
        width: 100% !important;
        max-height: 160px !important;
        object-fit: cover !important;
        display: block !important;
      }
      #${elementId} canvas { display: none !important; }
    `
    document.head.appendChild(style)
    return () => { document.getElementById(`${elementId}-style`)?.remove() }
  }, [elementId])

  const killTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const stopScanner = useCallback(async () => {
    killTracks()
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop() } catch {}
      try { html5QrRef.current.clear() }      catch {}
      html5QrRef.current = null
    }
    if (mountedRef.current) setStarted(false)
  }, [killTracks])

  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return
    setCameraError('')
    setErrorDetail('')

    // Step 1: enumerate cameras first (most reliable on Samsung)
    // This gives us actual device IDs which bypass facingMode constraint issues
    const configs = []
    try {
      const cameras = await Html5Qrcode.getCameras()
      if (cameras && cameras.length > 0) {
        // Prefer back/rear camera; fall back to first available
        const back = cameras.find(c =>
          /back|rear|environment|主|後/i.test(c.label)
        ) || cameras[cameras.length - 1]
        configs.push({ deviceId: back.id })
        // Add other cameras as further fallback
        cameras.forEach(c => {
          if (c.id !== back.id) configs.push({ deviceId: c.id })
        })
      }
    } catch { /* enumerate failed — continue to facingMode fallbacks */ }

    // Step 2: facingMode fallbacks (works on Chrome Android, Vivo, etc.)
    configs.push({ facingMode: 'environment' })
    configs.push({})

    let lastErr = null

    for (const cfg of configs) {
      if (!mountedRef.current) return

      // Fresh DOM + fresh instance for every attempt
      const el = document.getElementById(elementId)
      if (el) el.innerHTML = ''

      const html5Qr = new Html5Qrcode(elementId, { verbose: false })
      html5QrRef.current = html5Qr

      try {
        await html5Qr.start(
          cfg,
          { fps: 10, qrbox: { width: 250, height: 100 }, aspectRatio: 1.5 },
          (text) => { stopScanner(); onScan(text.trim()) },
          () => {}
        )

        // Save stream for reliable track-stop on close
        const video = document.getElementById(elementId)?.querySelector('video')
        if (video?.srcObject) streamRef.current = video.srcObject

        if (!mountedRef.current) { await stopScanner(); return }
        setStarted(true)
        return  // ✅ success
      } catch (err) {
        lastErr = err
        const msg = (err?.message || '').toLowerCase()
        // Permission denied — no point trying other cameras
        if (msg.includes('permission') || msg.includes('notallowed') || msg.includes('denied')) break
        // Clean up before next attempt
        try { await html5Qr.stop() } catch {}
        try { html5Qr.clear() }      catch {}
        html5QrRef.current = null
      }
    }

    // All attempts failed
    killTracks()
    if (html5QrRef.current) {
      try { html5QrRef.current.clear() } catch {}
      html5QrRef.current = null
    }
    if (!mountedRef.current) return
    setStarted(false)

    const msg = (lastErr?.message || '').toLowerCase()
    if (msg.includes('permission') || msg.includes('notallowed') || msg.includes('denied')) {
      setCameraError('Camera permission denied.')
      setErrorDetail('Tap the lock icon in your browser address bar, allow camera, then tap Try Again.')
    } else if (msg.includes('notfound') || msg.includes('no cameras') || msg.includes('devicenotfound')) {
      setCameraError('No camera found on this device.')
      setErrorDetail('Type the serial number manually in the field below.')
    } else if (!window.isSecureContext) {
      setCameraError('Camera requires HTTPS.')
      setErrorDetail('Open the app via https:// — plain HTTP blocks camera on mobile.')
    } else if (msg.includes('notreadable') || msg.includes('trackstart')) {
      setCameraError('Camera is busy.')
      setErrorDetail('Close WhatsApp, Camera, or any other app using the camera, then tap Try Again.')
    } else {
      setCameraError('Could not start camera.')
      setErrorDetail('Close other apps using the camera and tap Try Again, or type the serial number below.')
    }
  }, [elementId, onScan, stopScanner, killTracks])

  useEffect(() => {
    mountedRef.current = true
    startScanner()
    return () => {
      mountedRef.current = false
      killTracks()
      stopScanner()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = async () => { await stopScanner(); onClose() }
  const handleRetry = async () => { await stopScanner(); startScanner() }

  return (
    <div className="rounded-xl overflow-hidden border border-purple-200 bg-gray-900">

      <div className="flex items-center justify-between px-3 py-2 bg-gray-800">
        <div className="flex items-center gap-2">
          <Camera size={13} className="text-cyan-400" />
          <span className="text-xs font-semibold text-white">
            {started ? 'Point camera at barcode / QR code' : cameraError ? 'Camera unavailable' : 'Starting camera…'}
          </span>
        </div>
        <button type="button" onClick={handleClose}
          className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
          <X size={13} />
        </button>
      </div>

      {!cameraError && (
        <div className="relative bg-black" style={{ height: 160, overflow: 'hidden' }}>
          <div id={elementId} className="w-full" />

          {started && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative z-10 w-60 h-20">
                <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-cyan-400" />
                <div className="absolute top-1/2 left-1 right-1 h-0.5 bg-cyan-400/80 animate-pulse" />
              </div>
            </div>
          )}

          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Camera size={18} className="text-white/40" />
              </div>
              <p className="text-white/40 text-xs">Starting camera…</p>
            </div>
          )}
        </div>
      )}

      {started && (
        <div className="px-3 py-1.5 bg-gray-800 text-center">
          <p className="text-xs text-gray-400">Align the barcode inside the box — scans automatically</p>
        </div>
      )}

      {cameraError && (
        <div className="p-3 bg-gray-800 space-y-2.5">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-300">{cameraError}</p>
              {errorDetail && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{errorDetail}</p>}
            </div>
          </div>
          <button type="button" onClick={handleRetry}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 hover:text-white text-xs font-semibold">
            <RefreshCw size={11} /> Try Again
          </button>
        </div>
      )}
    </div>
  )
}
