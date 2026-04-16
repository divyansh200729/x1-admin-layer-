import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Drawer({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(45,27,105,0.55)' }}
        onClick={onClose}
      />

      {/* Panel — pure white */}
      <div className="relative w-full sm:w-[480px] h-full flex flex-col animate-slideInRight bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0 bg-white">
          <div>
            <h2 className="font-heading font-bold text-lg text-gray-900 leading-tight">{title}</h2>
            <p className="text-xs text-violet-500 font-medium mt-0.5">Fill in the details below</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 hover:bg-violet-100 text-gray-500 hover:text-violet-600 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — white background */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-white">
          {children}
        </div>

        {/* Footer — white background */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
