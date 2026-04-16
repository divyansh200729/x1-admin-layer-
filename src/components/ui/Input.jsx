import React from 'react'

export default function Input({
  label,
  error,
  helper,
  type = 'text',
  className = '',
  required = false,
  options = [],
  rows = 3,
  ...props
}) {
  const baseClass = `w-full px-4 py-3 rounded-xl border text-sm font-medium text-gray-900 placeholder-gray-400 bg-white
    transition-all outline-none
    ${error
      ? 'border-red-400 bg-red-50 text-red-700'
      : 'border-gray-200 hover:border-violet-400 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(109,40,217,0.15)]'
    }
    ${className}`

  const renderInput = () => {
    if (type === 'select') {
      return (
        <select className={baseClass} style={{ fontSize: '16px' }} {...props}>
          {options.map(opt => (
            typeof opt === 'string'
              ? <option key={opt} value={opt}>{opt}</option>
              : <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    }
    if (type === 'textarea') {
      return <textarea className={`${baseClass} resize-none`} rows={rows} style={{ fontSize: '16px' }} {...props} />
    }
    return <input type={type} className={baseClass} style={{ fontSize: '16px' }} {...props} />
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {renderInput()}
      {error && <p className="text-xs text-red-500 font-semibold pl-1">{error}</p>}
      {helper && !error && <p className="text-xs text-gray-400 pl-1">{helper}</p>}
    </div>
  )
}
