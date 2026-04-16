import React from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from './ui/Button'

export default function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title = 'Delete Record',
  message = 'Are you sure you want to delete this record?',
  loading = false,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-fadeIn">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={26} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500">{message}</p>
            <p className="text-xs text-red-500 font-medium mt-2">This action cannot be undone.</p>
          </div>
          <div className="flex gap-3 w-full">
            <Button variant="secondary" fullWidth onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button variant="danger" fullWidth onClick={onConfirm} loading={loading}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
