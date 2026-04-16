// Role-to-section access mapping
export const ROLE_ACCESS = {
  'Admin': ['sales', 'service', 'orders', 'qc', 'tasks', 'employees'],
  'Sales Executive': ['sales', 'orders'],
  'Service Technician': ['service', 'orders'],
  'Order Manager': ['orders', 'tasks'],
  'QC Inspector': ['qc'],
  'Design Engineer': ['sales', 'service', 'orders', 'qc', 'tasks'],
  'AI Enabler': ['sales', 'service', 'orders', 'qc', 'tasks'],
  'Other': ['sales', 'service', 'orders', 'qc', 'tasks'],
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
