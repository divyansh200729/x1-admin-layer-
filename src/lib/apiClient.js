import * as db from './db'

function makeError(msg) {
  const err = new Error(msg)
  err.response = { data: { error: msg } }
  return err
}

async function safe(fn) {
  try { return { data: await fn() } }
  catch (e) { throw makeError(e.message) }
}

function parseId(url) {
  const m = url.match(/\/(\d+)$/)
  return m ? parseInt(m[1]) : null
}

const apiClient = {
  get: async (url) => {
    if (url === '/api/orders') return safe(() => db.getOrders())
    if (url === '/api/service_records') return safe(() => db.getServiceRecords())
    if (url === '/api/sales_inquiries') return safe(() => db.getSalesInquiries())
    if (url === '/api/qc_tests') return safe(() => db.getQCTests())
    if (url === '/api/tasks') return safe(() => db.getTasks())
    if (url === '/api/employees') return safe(() => db.getEmployees())
    if (url === '/api/stock') return safe(() => db.getStock())
    if (url === '/api/attendance') return safe(() => db.getAttendanceRecords())
    if (url.startsWith('/api/serial-lookup')) {
      const q = new URL(url, 'http://x').searchParams.get('q') || ''
      return safe(() => db.serialLookup(q))
    }
    throw makeError(`Unknown endpoint: ${url}`)
  },

  post: async (url, body) => {
    if (url === '/api/orders') return safe(() => db.addOrder(body))
    if (url === '/api/service_records') return safe(() => db.addServiceRecord(body))
    if (url === '/api/sales_inquiries') return safe(() => db.addSalesInquiry(body))
    if (url === '/api/qc_tests') return safe(() => db.addQCTest(body))
    if (url === '/api/tasks') return safe(() => db.addTask(body))
    if (url === '/api/employees') return safe(() => db.addEmployee(body))
    if (url === '/api/employees/login') return safe(() => db.loginEmployee(body.email, body.password))
    if (url === '/api/attendance') return safe(() => db.addAttendanceRecord(body))
    if (url === '/api/stock/import') return safe(async () => ({ imported: await db.importStock(body) }))
    throw makeError(`Unknown endpoint: ${url}`)
  },

  put: async (url, body) => {
    const id = parseId(url)
    if (url.startsWith('/api/orders/')) return safe(() => db.updateOrder(id, body))
    if (url.startsWith('/api/service_records/')) return safe(() => db.updateServiceRecord(id, body))
    if (url.startsWith('/api/sales_inquiries/')) return safe(() => db.updateSalesInquiry(id, body))
    if (url.startsWith('/api/qc_tests/')) return safe(() => db.updateQCTest(id, body))
    if (url.startsWith('/api/tasks/')) return safe(() => db.updateTask(id, body))
    if (url.startsWith('/api/employees/')) return safe(() => db.updateEmployee(id, body))
    if (url.startsWith('/api/attendance/')) return safe(() => db.updateAttendanceRecord(id, body))
    throw makeError(`Unknown endpoint: ${url}`)
  },

  patch: async (url, body) => {
    const id = parseId(url)
    if (url.startsWith('/api/stock/')) return safe(() => db.patchStock(id, body))
    throw makeError(`Unknown endpoint: ${url}`)
  },

  delete: async (url) => {
    const id = parseId(url)
    if (url.startsWith('/api/orders/')) return safe(() => db.deleteOrder(id))
    if (url.startsWith('/api/service_records/')) return safe(() => db.deleteServiceRecord(id))
    if (url.startsWith('/api/sales_inquiries/')) return safe(() => db.deleteSalesInquiry(id))
    if (url.startsWith('/api/qc_tests/')) return safe(() => db.deleteQCTest(id))
    if (url.startsWith('/api/tasks/')) return safe(() => db.deleteTask(id))
    if (url.startsWith('/api/employees/')) return safe(() => db.deleteEmployee(id))
    if (url.startsWith('/api/attendance/')) return safe(() => db.deleteAttendanceRecord(id))
    if (url === '/api/stock') return safe(() => db.clearStock())
    throw makeError(`Unknown endpoint: ${url}`)
  },
}

export default apiClient
