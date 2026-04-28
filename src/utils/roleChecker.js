// Role-to-section access mapping
export const ROLE_ACCESS = {
  'Admin': ['sales', 'service', 'orders', 'qc', 'tasks', 'employees', 'attendance'],
  'Sales Executive': ['sales', 'orders', 'attendance'],
  'Service Technician': ['service', 'orders', 'attendance'],
  'Order Manager': ['orders', 'tasks', 'attendance'],
  'QC Inspector': ['qc', 'attendance'],
  'Design Engineer': ['sales', 'service', 'orders', 'qc', 'tasks', 'attendance'],
  'AI Enabler': ['sales', 'service', 'orders', 'qc', 'tasks', 'attendance'],
  'Other': ['sales', 'service', 'orders', 'qc', 'tasks', 'attendance'],
}

// Get current user from localStorage
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('x1_user') || 'null')
  } catch {
    return null
  }
}

export function isAdmin() {
  return getCurrentUser()?.role === 'Admin'
}

export function getAccessibleSections() {
  const user = getCurrentUser()
  if (!user) return []
  return ROLE_ACCESS[user.role] || []
}

export function canAccess(sectionId) {
  const user = getCurrentUser()
  if (!user) return false
  return (ROLE_ACCESS[user.role] || []).includes(sectionId)
}

// Admin credentials (hardcoded for client-side check)
export const ADMIN_EMAIL = 'admin@x1.com'
export const ADMIN_PASSWORD = 'admin123'

// Returns the active admin password — supports changes made in Settings
export function getAdminPassword() {
  try { return localStorage.getItem('x1_admin_pass') || ADMIN_PASSWORD } catch { return ADMIN_PASSWORD }
}
