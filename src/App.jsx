import { Routes, Route, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import Landing from './pages/Landing'
import Sales from './pages/Sales'
import Service from './pages/Service'
import Orders from './pages/Orders'
import QC from './pages/QC'
import Tasks from './pages/Tasks'
import Employees from './pages/Employees'
import SerialReader from './pages/SerialReader'
import Stock from './pages/Stock'
import Layout from './components/Layout'
import { canAccess, getCurrentUser } from './utils/roleChecker'

function ProtectedRoute({ children, section }) {
  const user = getCurrentUser()
  if (!user) return <Navigate to="/" replace />
  if (section && !canAccess(section)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FB] gap-4 p-6">
        <div className="text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="font-heading font-bold text-xl text-gray-800">Access Restricted</h2>
          <p className="text-gray-500 mt-2 text-sm">You don't have permission to view this section.</p>
        </div>
        <a href="/home" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl text-sm">
          Back to Home
        </a>
      </div>
    )
  }
  return children
}

function AdminRoute({ children }) {
  const user = getCurrentUser()
  if (!user) return <Navigate to="/" replace />
  if (user.role !== 'Admin') return <Navigate to="/home" replace />
  return children
}

function AuthRoute({ children }) {
  const user = getCurrentUser()
  if (user) return <Navigate to="/home" replace />
  return children
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FB] gap-6">
      <div className="text-center">
        <p className="font-heading font-bold text-8xl text-gray-200">404</p>
        <h2 className="font-heading font-bold text-2xl text-gray-800 mt-2">Page Not Found</h2>
        <p className="text-gray-500 mt-2">The page you're looking for doesn't exist.</p>
      </div>
      <a
        href="/home"
        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-sm"
      >
        Back to Home
      </a>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthRoute><Auth /></AuthRoute>} />

      <Route path="/home" element={
        <ProtectedRoute>
          <Layout><Landing /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/sales" element={
        <ProtectedRoute section="sales">
          <Layout><Sales /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/service" element={
        <ProtectedRoute section="service">
          <Layout><Service /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/orders" element={
        <ProtectedRoute section="orders">
          <Layout><Orders /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/qc" element={
        <ProtectedRoute section="qc">
          <Layout><QC /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/tasks" element={
        <ProtectedRoute section="tasks">
          <Layout><Tasks /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/employees" element={
        <AdminRoute>
          <Layout><Employees /></Layout>
        </AdminRoute>
      } />

      <Route path="/scanner" element={
        <ProtectedRoute>
          <Layout><SerialReader /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/stock" element={
        <ProtectedRoute>
          <Layout><Stock /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
