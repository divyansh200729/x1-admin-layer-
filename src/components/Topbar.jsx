import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ title, icon: Icon, iconClass = 'text-white', children, breadcrumb }) {
  const navigate = useNavigate()

  return (
    <div className="sticky top-14 lg:top-0 z-20 border-b border-white/10"
      style={{ background: 'rgba(45,27,105,0.85)', backdropFilter: 'blur(16px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-1.5 text-violet-300 hover:text-white p-2 rounded-xl hover:bg-white/10 shrink-0 transition-all">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              {Icon && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Icon size={16} className="text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-heading font-bold text-white text-base leading-tight truncate">{title}</h1>
                {breadcrumb && (
                  <p className="text-xs text-violet-300 truncate">Home / {breadcrumb}</p>
                )}
              </div>
            </div>
          </div>
          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
