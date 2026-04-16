import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Wrench, Package, ClipboardCheck, CheckSquare, ArrowRight,
  TrendingDown, Minus, BarChart2, ShoppingBag, Users as UsersIcon, RefreshCw, Archive
} from 'lucide-react'
import axios from 'axios'
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { getCurrentUser, isAdmin, canAccess } from '../utils/roleChecker'

const MODULES = [
  { id: 'sales',   label: 'Sales Inquiries',  desc: 'Track leads & follow-ups',       icon: TrendingUp,    path: '/sales',   iconBg: 'linear-gradient(135deg,#6D28D9,#7C3AED)', accent: '#7C3AED' },
  { id: 'service', label: 'Service',           desc: 'Repair tracking & warranty',      icon: Wrench,        path: '/service', iconBg: 'linear-gradient(135deg,#059669,#10B981)', accent: '#10B981' },
  { id: 'orders',  label: 'Orders',            desc: 'Order dispatch & delivery',       icon: Package,       path: '/orders',  iconBg: 'linear-gradient(135deg,#D97706,#F59E0B)', accent: '#F59E0B' },
  { id: 'qc',      label: 'QC Testing',        desc: 'Quality control & checklists',    icon: ClipboardCheck,path: '/qc',      iconBg: 'linear-gradient(135deg,#7C3AED,#A78BFA)', accent: '#A78BFA' },
  { id: 'tasks',   label: 'Tasks',             desc: 'Team tasks & kanban board',       icon: CheckSquare,   path: '/tasks',   iconBg: 'linear-gradient(135deg,#DC2626,#EF4444)', accent: '#EF4444' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDateLabel(d) {
  return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// Build last N months: returns [{ key: 'YYYY-MM', label: 'Jan' }, ...]
function getLastNMonths(n = 6) {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
    })
  }
  return result
}

function inMonth(records, m, y) {
  return records.filter(r => {
    if (!r.date) return false
    const d = new Date(r.date + 'T00:00:00')
    return d.getMonth() === m && d.getFullYear() === y
  })
}

function trendLabel(curr, prev) {
  if (prev === 0) return curr > 0 ? { label: '+New', up: true } : null
  const pct = Math.round(((curr - prev) / prev) * 100)
  if (pct === 0) return { label: 'No change', up: null }
  return { label: `${pct > 0 ? '+' : ''}${pct}%`, up: pct > 0 }
}

const CHART_TOOLTIP = {
  contentStyle: { background: '#fff', border: '1px solid #E8ECF0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  cursor: { fill: 'rgba(91,127,255,0.05)' },
}

function KPICard({ icon: Icon, label, value, trendObj, color, loading }) {
  return (
    <div className="rounded-2xl p-5 hover:shadow-xl transition-all hover:-translate-y-0.5"
      style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(45,27,105,0.15)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color }}>
          <Icon size={20} className="text-white" />
        </div>
        {trendObj && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            trendObj.up === true  ? 'bg-green-50 text-green-600' :
            trendObj.up === false ? 'bg-red-50 text-red-500' :
            'bg-violet-50 text-violet-500'
          }`}>
            {trendObj.up === true ? <TrendingUp size={12} /> : trendObj.up === false ? <TrendingDown size={12} /> : <Minus size={12} />}
            {trendObj.label}
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse mb-1" />
      ) : (
        <p className="text-2xl font-heading font-bold text-gray-900">{value}</p>
      )}
      <p className="text-xs text-violet-400 font-semibold mt-0.5 uppercase tracking-wide">{label}</p>
    </div>
  )
}

function QCCircle({ rate, total }) {
  const r = 64
  const circ = 2 * Math.PI * r
  const offset = circ - (rate / 100) * circ
  const color = rate >= 90 ? '#10B981' : rate >= 70 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#F0F2F5" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text x="80" y="76" textAnchor="middle" dy="0.35em" fontSize="24" fontWeight="bold" fill={color}>{rate}%</text>
        <text x="80" y="100" textAnchor="middle" fontSize="11" fill="#6B7280">Pass Rate</text>
      </svg>
      <p className="text-xs text-gray-500">Based on {total} QC test{total !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const admin = isAdmin()

  const [allData, setAllData] = useState({ sales: [], service: [], orders: [], qc: [], tasks: [], employees: [], stock: [] })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sales, service, orders, qc, tasks, employees, stock] = await Promise.all([
        axios.get('/api/sales_inquiries').then(r => r.data).catch(() => []),
        axios.get('/api/service_records').then(r => r.data).catch(() => []),
        axios.get('/api/orders').then(r => r.data).catch(() => []),
        axios.get('/api/qc_tests').then(r => r.data).catch(() => []),
        axios.get('/api/tasks').then(r => r.data).catch(() => []),
        axios.get('/api/employees').then(r => r.data).catch(() => []),
        axios.get('/api/stock').then(r => r.data).catch(() => []),
      ])
      setAllData({ sales, service, orders, qc, tasks, employees, stock })
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const { sales, service, orders, qc, tasks, employees, stock } = allData

  // ── Time helpers ────────────────────────────────────────
  const now = new Date()
  const thisM = now.getMonth()
  const thisY = now.getFullYear()
  const lastM = thisM === 0 ? 11 : thisM - 1
  const lastY  = thisM === 0 ? thisY - 1 : thisY

  // ── KPI: Sales Inquiries ────────────────────────────────
  const totalSales = sales.length
  const thisMSales = inMonth(sales, thisM, thisY).length
  const lastMSales = inMonth(sales, lastM, lastY).length
  const salesTrend = trendLabel(thisMSales, lastMSales)

  // ── KPI: Active Orders ──────────────────────────────────
  const activeOrders = orders.filter(o => ['Pending', 'Dispatched'].includes(o.order_status)).length
  const thisMOrders  = inMonth(orders, thisM, thisY).length
  const lastMOrders  = inMonth(orders, lastM, lastY).length
  const ordersTrend  = trendLabel(thisMOrders, lastMOrders)

  // ── KPI: Open Service ───────────────────────────────────
  const openService = service.filter(s => s.status !== 'Delivered').length
  const thisMService = inMonth(service, thisM, thisY).length
  const lastMService = inMonth(service, lastM, lastY).length
  const serviceTrend = trendLabel(thisMService, lastMService)

  // ── KPI: Team Size ──────────────────────────────────────
  const teamSize = employees.length
  const activeEmployees = employees.filter(e => e.status === 'Active').length

  // ── QC ─────────────────────────────────────────────────
  const qcTotal  = qc.length
  const qcPassed = qc.filter(r => r.test_result === 'Pass').length
  const qcRate   = qcTotal > 0 ? Math.round((qcPassed / qcTotal) * 100) : 0

  // ── Tasks ───────────────────────────────────────────────
  const tasksDone = tasks.filter(t => t.status === 'Done').length
  const tasksPct  = tasks.length > 0 ? Math.round((tasksDone / tasks.length) * 100) : 0
  const tasksByPriority = ['Low', 'Medium', 'High', 'Urgent'].map(p => ({
    name: p, value: tasks.filter(t => t.priority === p).length,
  }))
  const PRIORITY_COLORS = { Low: '#10B981', Medium: '#F59E0B', High: '#EF4444', Urgent: '#7C3AED' }

  // ── Monthly Revenue Chart (last 6 months) ───────────────
  const months6 = getLastNMonths(6)
  const monthlyChart = months6.map(m => ({
    month: m.label,
    Revenue: orders
      .filter(o => o.date && o.date.startsWith(m.key) && o.order_status !== 'Cancelled')
      .reduce((sum, o) => sum + Number(o.amount || 0), 0),
    Inquiries: sales.filter(s => s.date && s.date.startsWith(m.key)).length,
    Service: service.filter(s => s.date && s.date.startsWith(m.key)).length,
  }))

  // ── Orders Distribution Pie ──────────────────────────────
  const ordersDist = [
    { name: 'Pending',    value: orders.filter(o => o.order_status === 'Pending').length,    color: '#F59E0B' },
    { name: 'Dispatched', value: orders.filter(o => o.order_status === 'Dispatched').length, color: '#3B82F6' },
    { name: 'Delivered',  value: orders.filter(o => o.order_status === 'Delivered').length,  color: '#10B981' },
    { name: 'Cancelled',  value: orders.filter(o => o.order_status === 'Cancelled').length,  color: '#EF4444' },
  ].filter(d => d.value > 0)

  // ── Sales by Status ──────────────────────────────────────
  const salesByStatus = ['New', 'Follow-Up', 'Saved', 'Sold', 'Lost'].map(s => ({
    name: s,
    value: sales.filter(r => r.status === s).length,
  })).filter(d => d.value > 0)
  const SALES_STATUS_COLORS = { New: '#6D28D9', 'Follow-Up': '#3B82F6', Saved: '#F59E0B', Sold: '#10B981', Lost: '#EF4444' }

  // ── Service by Status ────────────────────────────────────
  const serviceByStatus = ['Received', 'In Progress', 'Ready', 'Delivered'].map(s => ({
    name: s, value: service.filter(r => r.status === s).length,
  }))

  // ── Total Revenue (all non-cancelled orders) ─────────────
  const totalRevenue = orders
    .filter(o => o.order_status !== 'Cancelled')
    .reduce((sum, o) => sum + Number(o.amount || 0), 0)

  // ── Stock Metrics ────────────────────────────────────────
  const stockTotalQty    = stock.reduce((s, r) => s + Number(r.qty   || 0), 0)
  const stockSellValue   = stock.reduce((s, r) => s + Number(r.price || 0) * Number(r.qty || 0), 0)
  const stockMrpValue    = stock.reduce((s, r) => s + Number(r.mrp   || 0) * Number(r.qty || 0), 0)
  const stockOutOfStock  = stock.filter(r => Number(r.qty) === 0).length
  const stockLow         = stock.filter(r => Number(r.qty) > 0 && Number(r.qty) <= 3).length

  const visibleModules = MODULES.filter(m => canAccess(m.id))
  const moduleCounts = {
    sales: sales.length, service: service.length,
    orders: orders.length, qc: qc.length, tasks: tasks.length,
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Greeting */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">
              {getGreeting()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-violet-300 mt-1 text-sm">{formatDateLabel(new Date())} — Here's your live business overview.</p>
            {user?.role && (
              <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                {user.role}
              </span>
            )}
          </div>
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-violet-300 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all disabled:opacity-50 mt-1">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Refresh'}
          </button>
        </div>

        {/* KPI Cards */}
        <div>
          <h2 className="font-heading font-bold text-sm text-violet-200 mb-3 flex items-center gap-2 uppercase tracking-widest">
            <BarChart2 size={16} className="text-violet-300" /> Key Metrics
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={TrendingUp} label="Sales Inquiries"
              value={totalSales} trendObj={salesTrend} loading={loading}
              color="linear-gradient(135deg,#6D28D9,#7C3AED)" />
            <KPICard icon={ShoppingBag} label="Active Orders"
              value={activeOrders} trendObj={ordersTrend} loading={loading}
              color="linear-gradient(135deg,#D97706,#F59E0B)" />
            <KPICard icon={Wrench} label="Open Service"
              value={openService} trendObj={serviceTrend} loading={loading}
              color="linear-gradient(135deg,#059669,#10B981)" />
            <KPICard icon={UsersIcon} label="Team Size"
              value={`${activeEmployees}/${teamSize}`} trendObj={null} loading={loading}
              color="linear-gradient(135deg,#7C3AED,#A78BFA)" />
          </div>
        </div>

        {/* Stock Key Metrics */}
        {(stock.length > 0 || !loading) && (
          <div>
            <h2 className="font-heading font-bold text-sm text-violet-200 mb-3 flex items-center gap-2 uppercase tracking-widest">
              <Archive size={16} className="text-violet-300" /> Stock Overview
            </h2>
            {stock.length === 0 ? (
              <div className="rounded-2xl p-5 text-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Archive size={24} className="mx-auto text-violet-400 mb-2 opacity-50" />
                <p className="text-violet-300 text-sm font-medium">No stock data yet</p>
                <p className="text-violet-400 text-xs mt-1">Import a CSV from the Stock page to see inventory metrics here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
                  onClick={() => navigate('/stock')}>
                  <p className="text-xs text-violet-300 font-semibold uppercase tracking-wide">Total Devices</p>
                  <p className="text-2xl font-extrabold text-white mt-1">{stock.length}</p>
                  <p className="text-xs text-violet-300 mt-0.5">{stockTotalQty.toLocaleString('en-IN')} units in stock</p>
                </div>
                <div className="rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
                  onClick={() => navigate('/stock')}>
                  <p className="text-xs text-violet-300 font-semibold uppercase tracking-wide">Selling Value</p>
                  <p className="text-xl font-extrabold text-white mt-1">₹{(stockSellValue / 100000).toFixed(1)}L</p>
                  <p className="text-xs text-violet-300 mt-0.5">MRP: ₹{(stockMrpValue / 100000).toFixed(1)}L</p>
                </div>
                <div className="rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{ background: stockOutOfStock > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.12)', border: `1px solid ${stockOutOfStock > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)'}` }}
                  onClick={() => navigate('/stock')}>
                  <p className="text-xs text-violet-300 font-semibold uppercase tracking-wide">Out of Stock</p>
                  <p className={`text-2xl font-extrabold mt-1 ${stockOutOfStock > 0 ? 'text-red-300' : 'text-white'}`}>{stockOutOfStock}</p>
                  <p className="text-xs text-violet-300 mt-0.5">{stockLow} items running low</p>
                </div>
                <div className="rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
                  onClick={() => navigate('/stock')}>
                  <p className="text-xs text-violet-300 font-semibold uppercase tracking-wide">Margin Potential</p>
                  <p className="text-xl font-extrabold text-white mt-1">
                    {stockMrpValue > 0 ? Math.round((1 - stockSellValue / stockMrpValue) * 100) : 0}%
                  </p>
                  <p className="text-xs text-violet-300 mt-0.5">Avg discount off MRP</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Revenue summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, sub: 'from all orders', color: 'text-green-600' },
            { label: 'QC Pass Rate',  value: `${qcRate}%`,  sub: `${qcPassed} of ${qcTotal} passed`,  color: qcRate >= 90 ? 'text-green-600' : qcRate >= 70 ? 'text-yellow-500' : 'text-red-500' },
            { label: 'Tasks Done',    value: `${tasksPct}%`, sub: `${tasksDone} of ${tasks.length}`,   color: 'text-blue-600' },
            { label: 'Sold Leads',    value: sales.filter(s => s.status === 'Sold').length, sub: `of ${totalSales} inquiries`, color: 'text-violet-600' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <p className="text-xs text-violet-300 font-semibold uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-xl font-heading font-bold text-white`}>{s.value}</p>
              <p className="text-xs text-violet-300 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1: Revenue trend + Orders distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Monthly Revenue + Inquiries Trend */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(45,27,105,0.15)' }}>
            <h3 className="font-heading font-bold text-sm text-gray-800 mb-1">Revenue & Inquiries Trend</h3>
            <p className="text-xs text-gray-400 mb-4">Last 6 months — live from orders & sales data</p>
            {monthlyChart.every(m => m.Revenue === 0 && m.Inquiries === 0) ? (
              <div className="flex flex-col items-center justify-center h-[180px] text-gray-300">
                <BarChart2 size={32} className="mb-2" />
                <p className="text-sm font-medium">No data yet</p>
                <p className="text-xs">Add orders & sales to see trends</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyChart} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6D28D9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6D28D9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="inqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rev" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} width={45} />
                  <YAxis yAxisId="inq" orientation="right" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip {...CHART_TOOLTIP}
                    formatter={(v, n) => n === 'Revenue' ? [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue'] : [v, n]} />
                  <Area yAxisId="rev" type="monotone" dataKey="Revenue" stroke="#6D28D9" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#6D28D9' }} />
                  <Area yAxisId="inq" type="monotone" dataKey="Inquiries" stroke="#10B981" strokeWidth={2} fill="url(#inqGrad)" dot={false} activeDot={{ r: 4, fill: '#10B981' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Orders Distribution */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(45,27,105,0.15)' }}>
            <h3 className="font-heading font-bold text-sm text-gray-800 mb-1">Orders Distribution</h3>
            <p className="text-xs text-gray-400 mb-4">Live breakdown by order status</p>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[180px] text-gray-300">
                <Package size={32} className="mb-2" />
                <p className="text-sm font-medium">No orders yet</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <ResponsiveContainer width="55%" height={180}>
                  <PieChart>
                    <Pie data={ordersDist} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                      dataKey="value" paddingAngle={3} animationBegin={0} animationDuration={600}>
                      {ordersDist.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5 flex-1 pl-2">
                  {[
                    { name: 'Pending',    color: '#F59E0B' },
                    { name: 'Dispatched', color: '#3B82F6' },
                    { name: 'Delivered',  color: '#10B981' },
                    { name: 'Cancelled',  color: '#EF4444' },
                  ].map(item => {
                    const val = orders.filter(o => o.order_status === item.name).length
                    const pct = orders.length > 0 ? Math.round((val / orders.length) * 100) : 0
                    return (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <span className="text-xs text-gray-600 font-medium">{item.name}</span>
                        <span className="text-xs font-bold text-gray-900 ml-auto">{val}</span>
                        <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Row 2: Sales funnel + Service status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Sales Inquiries by Status */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(45,27,105,0.15)' }}>
            <h3 className="font-heading font-bold text-sm text-gray-800 mb-1">Sales Pipeline</h3>
            <p className="text-xs text-gray-400 mb-4">Inquiries by current status</p>
            {sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[160px] text-gray-300">
                <TrendingUp size={32} className="mb-2" />
                <p className="text-sm font-medium">No inquiries yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {['New', 'Follow-Up', 'Saved', 'Sold', 'Lost'].map(s => {
                  const val = sales.filter(r => r.status === s).length
                  const pct = sales.length > 0 ? Math.round((val / sales.length) * 100) : 0
                  const colors = { New: '#6D28D9', 'Follow-Up': '#3B82F6', Saved: '#F59E0B', Sold: '#10B981', Lost: '#EF4444' }
                  return (
                    <div key={s}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">{s}</span>
                        <span className="text-xs text-gray-500">{val} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: colors[s] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Service Status Breakdown */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(45,27,105,0.15)' }}>
            <h3 className="font-heading font-bold text-sm text-gray-800 mb-1">Service Status</h3>
            <p className="text-xs text-gray-400 mb-4">Current service job breakdown</p>
            {service.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[160px] text-gray-300">
                <Wrench size={32} className="mb-2" />
                <p className="text-sm font-medium">No service records yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={serviceByStatus} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="value" name="Jobs" radius={[6, 6, 0, 0]}>
                    {serviceByStatus.map((_, i) => (
                      <Cell key={i} fill={['#6D28D9', '#F59E0B', '#3B82F6', '#10B981'][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* QC + Task Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* QC Pass Rate */}
          <div className="rounded-2xl p-5 flex flex-col items-center" style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(45,27,105,0.15)' }}>
            <h3 className="font-heading font-bold text-sm text-gray-800 mb-1 self-start">QC Pass Rate</h3>
            <p className="text-xs text-gray-400 mb-4 self-start">Calculated from all QC test records</p>
            {qc.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[160px] text-gray-300">
                <ClipboardCheck size={32} className="mb-2" />
                <p className="text-sm font-medium">No QC tests yet</p>
              </div>
            ) : (
              <>
                <QCCircle rate={qcRate} total={qcTotal} />
                <div className="flex gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-xl font-heading font-bold text-green-600">{qcPassed}</p>
                    <p className="text-xs text-gray-400 font-medium">Passed</p>
                  </div>
                  <div className="w-px bg-gray-200" />
                  <div className="text-center">
                    <p className="text-xl font-heading font-bold text-red-500">{qcTotal - qcPassed}</p>
                    <p className="text-xs text-gray-400 font-medium">Failed</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Task Completion */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(45,27,105,0.15)' }}>
            <h3 className="font-heading font-bold text-sm text-gray-800 mb-1">Task Completion</h3>
            <p className="text-xs text-gray-400 mb-4">Live task board progress</p>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[160px] text-gray-300">
                <CheckSquare size={32} className="mb-2" />
                <p className="text-sm font-medium">No tasks yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">{tasksDone} of {tasks.length} tasks done</span>
                    <span className="text-sm font-bold text-gray-900">{tasksPct}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-700"
                      style={{ width: `${tasksPct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'To Do',      value: tasks.filter(t => t.status === 'To Do').length,      color: 'text-gray-700' },
                    { label: 'In Progress',value: tasks.filter(t => t.status === 'In Progress').length, color: 'text-orange-500' },
                    { label: 'Done',       value: tasksDone,                                            color: 'text-green-600' },
                    { label: 'Cancelled',  value: tasks.filter(t => t.status === 'Cancelled').length,   color: 'text-red-400' },
                  ].map(s => (
                    <div key={s.label} className="p-2.5 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                      <p className={`text-lg font-heading font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {tasksByPriority.some(t => t.value > 0) && (
                  <div className="pt-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">By Priority</p>
                    <ResponsiveContainer width="100%" height={80}>
                      <BarChart data={tasksByPriority} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip {...CHART_TOOLTIP} />
                        <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                          {tasksByPriority.map(t => <Cell key={t.name} fill={PRIORITY_COLORS[t.name]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Access Module Cards */}
        <div>
          <h2 className="font-heading font-bold text-sm text-violet-200 mb-3 uppercase tracking-widest">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleModules.map(mod => {
              const Icon = mod.icon
              const count = moduleCounts[mod.id]
              return (
                <div key={mod.id}
                  className="rounded-2xl p-5 cursor-pointer group transition-all hover:-translate-y-1 hover:shadow-2xl duration-200"
                  style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(45,27,105,0.18)' }}
                  onClick={() => navigate(mod.path)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md" style={{ background: mod.iconBg }}>
                      <Icon size={22} className="text-white" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: '#F3F0FF', color: '#6D28D9' }}>
                      {count} records
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-base text-gray-900 mb-1">{mod.label}</h3>
                  <p className="text-xs text-gray-400 mb-4">{mod.desc}</p>
                  <button className="flex items-center gap-1.5 text-sm font-bold group-hover:gap-2.5 transition-all"
                    style={{ color: mod.accent }}>
                    Open <ArrowRight size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
