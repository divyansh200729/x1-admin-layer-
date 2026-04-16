import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, TrendingUp, Wrench, Package, ClipboardCheck, CheckSquare,
  Users, LogOut, Menu, X, ScanLine, Archive
} from 'lucide-react'
import { isAdmin, canAccess, getCurrentUser } from '../utils/roleChecker'

function getInitials(name) {
  if (!name) return 'U'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const NAV_ITEMS = [
  { id: 'home',    label: 'Home',    path: '/home',      icon: Home,          section: null },
  { id: 'sales',   label: 'Sales',   path: '/sales',     icon: TrendingUp,    section: 'sales' },
  { id: 'service', label: 'Service', path: '/service',   icon: Wrench,        section: 'service' },
  { id: 'orders',  label: 'Orders',  path: '/orders',    icon: Package,       section: 'orders' },
  { id: 'qc',      label: 'QC',      path: '/qc',        icon: ClipboardCheck,section: 'qc' },
  { id: 'tasks',   label: 'Tasks',   path: '/tasks',     icon: CheckSquare,   section: 'tasks' },
  { id: 'scanner', label: 'Scanner', path: '/scanner',   icon: ScanLine,      section: null },
  { id: 'stock',   label: 'Stock',   path: '/stock',     icon: Archive,       section: null },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const user = getCurrentUser()
  const admin = isAdmin()

  const handleLogout = () => {
    localStorage.removeItem('x1_user')
    navigate('/')
  }

  const visibleNav = NAV_ITEMS.filter(item =>
    item.section === null || canAccess(item.section)
  )

  const isActive = (path) => location.pathname === path

  const SidebarContent = ({ onNav }) => (
    <>
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <span className="font-heading font-black text-white text-sm">X1</span>
          </div>
          <div>
            <p className="font-heading font-bold text-white text-base leading-tight">X1 Suite</p>
            <p className="text-violet-300 text-[10px] font-medium">Business Management</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map(item => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <button key={item.id}
              onClick={() => { navigate(item.path); onNav?.() }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                active
                  ? 'bg-white text-violet-700 shadow-lg shadow-black/20'
                  : 'text-violet-200 hover:bg-white/10 hover:text-white'
              }`}>
              <Icon size={18} />
              {item.label}
            </button>
          )
        })}

        {admin && (
          <button
            onClick={() => { navigate('/employees'); onNav?.() }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              isActive('/employees')
                ? 'bg-white text-violet-700 shadow-lg shadow-black/20'
                : 'text-violet-200 hover:bg-white/10 hover:text-white'
            }`}>
            <Users size={18} />
            Team
          </button>
        )}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <span className="font-bold text-white text-xs">{getInitials(user?.name)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] text-violet-300 truncate">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold text-violet-300 hover:bg-white/10 hover:text-white transition-all">
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 fixed top-0 left-0 h-full z-40"
        style={{ background: 'linear-gradient(180deg, #2D1B69 0%, #4C1D95 100%)' }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full shadow-2xl flex flex-col"
            style={{ background: 'linear-gradient(180deg, #2D1B69 0%, #4C1D95 100%)' }}>
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-violet-300 hover:text-white hover:bg-white/10">
              <X size={18} />
            </button>
            <SidebarContent onNav={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen"
        style={{ background: 'linear-gradient(135deg, #2D1B69 0%, #4C1D95 50%, #6D28D9 100%)' }}>

        {/* Mobile Top Header */}
        <header className="lg:hidden sticky top-0 z-30 px-4 h-14 flex items-center justify-between border-b border-white/10"
          style={{ background: 'rgba(45,27,105,0.95)', backdropFilter: 'blur(12px)' }}>
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-violet-300 hover:bg-white/10 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span className="font-heading font-black text-white text-xs">X1</span>
            </div>
            <span className="font-heading font-bold text-white text-sm">X1 Suite</span>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            <span className="font-bold text-white text-xs">{getInitials(user?.name)}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>

        {/* ── Mobile Bottom Tab Bar ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(109,40,217,0.1)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center justify-around h-16 px-1">
            {[
              { path: '/home',      icon: Home,          label: 'Home',    always: true },
              { path: '/stock',     icon: Archive,       label: 'Stock',   always: true },
              { path: '/scanner',   icon: ScanLine,      label: 'Scanner', always: true },
              { path: '/sales',     icon: TrendingUp,    label: 'Sales',   section: 'sales' },
              { path: '/service',   icon: Wrench,        label: 'Service', section: 'service' },
              { path: '/orders',    icon: Package,       label: 'Orders',  section: 'orders' },
              { path: '/qc',        icon: ClipboardCheck,label: 'QC',      section: 'qc' },
              { path: '/tasks',     icon: CheckSquare,   label: 'Tasks',   section: 'tasks' },
              { path: '/employees', icon: Users,         label: 'Team',    adminOnly: true },
            ].filter(t => t.always || (t.adminOnly && admin) || (t.section && canAccess(t.section)))
             .slice(0, 6)
             .map(tab => {
              const Icon = tab.icon
              const active = isActive(tab.path)
              return (
                <button key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className="flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-2xl min-w-[44px] min-h-[44px] justify-center transition-all">
                  <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-violet-100' : ''}`}>
                    <Icon size={19} className={active ? 'text-violet-600' : 'text-gray-400'} />
                  </div>
                  <span className={`text-[9px] font-semibold ${active ? 'text-violet-600' : 'text-gray-400'}`}>
                    {tab.label}
                  </span>
                </button>
              )
            })}
            <button onClick={handleLogout}
              className="flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-2xl min-w-[44px] min-h-[44px] justify-center">
              <div className="p-1.5 rounded-xl">
                <LogOut size={19} className="text-gray-400" />
              </div>
              <span className="text-[9px] font-semibold text-gray-400">Logout</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
