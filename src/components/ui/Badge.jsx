import React from 'react'

const colorMap = {
  // Sales statuses
  'New': 'bg-blue-100 text-blue-700',
  'Follow-Up': 'bg-orange-100 text-orange-700',
  'Saved': 'bg-teal-100 text-teal-700',
  'Sold': 'bg-green-100 text-green-700',
  'Lost': 'bg-red-100 text-red-700',
  // Service statuses
  'Received': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-orange-100 text-orange-700',
  'Ready': 'bg-teal-100 text-teal-700',
  'Delivered': 'bg-green-100 text-green-700',
  // Warranty
  'In Warranty': 'bg-green-100 text-green-700',
  'Out of Warranty': 'bg-gray-100 text-gray-600',
  // Orders
  'Pending': 'bg-orange-100 text-orange-700',
  'Dispatched': 'bg-blue-100 text-blue-700',
  'Cancelled': 'bg-red-100 text-red-700',
  // QC
  'Pass': 'bg-green-100 text-green-700',
  'Fail': 'bg-red-100 text-red-700',
  // Tasks priority
  'Low': 'bg-gray-100 text-gray-600',
  'Medium': 'bg-blue-100 text-blue-700',
  'High': 'bg-orange-100 text-orange-700',
  'Urgent': 'bg-red-100 text-red-700',
  // Tasks status
  'To Do': 'bg-gray-100 text-gray-600',
  'Done': 'bg-green-100 text-green-700',
  // Generic
  'default': 'bg-gray-100 text-gray-600',
}

export default function Badge({ label, dot = true, className = '' }) {
  const color = colorMap[label] || colorMap['default']
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  )
}
