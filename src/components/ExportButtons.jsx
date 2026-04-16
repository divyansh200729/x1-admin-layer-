import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function ExportButtons({ onCSV, onPDF, records }) {
  const toast = useToast()
  const [loadingCSV, setLoadingCSV] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)

  const handleCSV = async () => {
    if (!records || records.length === 0) {
      toast('No records to export', 'info')
      return
    }
    setLoadingCSV(true)
    await new Promise(r => setTimeout(r, 600))
    const ok = onCSV(records)
    setLoadingCSV(false)
    if (ok) toast('CSV downloaded successfully', 'success')
  }

  const handlePDF = async () => {
    if (!records || records.length === 0) {
      toast('No records to export', 'info')
      return
    }
    setLoadingPDF(true)
    await new Promise(r => setTimeout(r, 800))
    const ok = onPDF(records)
    setLoadingPDF(false)
    if (ok) toast('PDF downloaded successfully', 'success')
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCSV}
        disabled={loadingCSV}
        title="Export to CSV (Google Sheets compatible)"
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 active:scale-[0.97] transition-all disabled:opacity-60"
      >
        {loadingCSV ? (
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <Download size={13} />
        )}
        <span className="hidden sm:inline">{loadingCSV ? 'Exporting...' : 'Export CSV'}</span>
      </button>

      <button
        onClick={handlePDF}
        disabled={loadingPDF}
        title="Download as PDF report"
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 active:scale-[0.97] transition-all disabled:opacity-60"
      >
        {loadingPDF ? (
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <FileText size={13} />
        )}
        <span className="hidden sm:inline">{loadingPDF ? 'Generating...' : 'PDF'}</span>
      </button>
    </div>
  )
}
