import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ekuhqbmsnhzhlcftpkqp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrdWhxYm1zbmh6aGxjZnRwa3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTQ1ODAsImV4cCI6MjA5MjA3MDU4MH0.dLngGQadm0yuAoBEPc9cSXi8p6u3GfA4WDFlA2fsVe8'
)

const ts = () => new Date().toISOString()

async function q(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}

// Wake up Supabase on app start to avoid cold-start delays
export async function pingDB() {
  try {
    await supabase.from('employees').select('id').limit(1)
  } catch { /* silent */ }
}

// ─── Orders ───────────────────────────────────────────────────
export async function getOrders() {
  return q(supabase.from('orders').select('*').order('created_at', { ascending: false }))
}
export async function addOrder(data) {
  return q(supabase.from('orders').insert(data).select().single())
}
export async function updateOrder(id, data) {
  return q(supabase.from('orders').update({ ...data, updated_at: ts() }).eq('id', id).select().single())
}
export async function deleteOrder(id) {
  return q(supabase.from('orders').delete().eq('id', id))
}

// ─── Service Records ──────────────────────────────────────────
export async function getServiceRecords() {
  return q(supabase.from('service_records').select('*').order('created_at', { ascending: false }))
}
export async function addServiceRecord(data) {
  return q(supabase.from('service_records').insert(data).select().single())
}
export async function updateServiceRecord(id, data) {
  return q(supabase.from('service_records').update({ ...data, updated_at: ts() }).eq('id', id).select().single())
}
export async function deleteServiceRecord(id) {
  return q(supabase.from('service_records').delete().eq('id', id))
}

// ─── Sales Inquiries ──────────────────────────────────────────
export async function getSalesInquiries() {
  return q(supabase.from('sales_inquiries').select('*').order('created_at', { ascending: false }))
}
export async function addSalesInquiry(data) {
  return q(supabase.from('sales_inquiries').insert(data).select().single())
}
export async function updateSalesInquiry(id, data) {
  return q(supabase.from('sales_inquiries').update({ ...data, updated_at: ts() }).eq('id', id).select().single())
}
export async function deleteSalesInquiry(id) {
  return q(supabase.from('sales_inquiries').delete().eq('id', id))
}

// ─── QC Tests ─────────────────────────────────────────────────
export async function getQCTests() {
  return q(supabase.from('qc_tests').select('*').order('created_at', { ascending: false }))
}
export async function addQCTest(data) {
  return q(supabase.from('qc_tests').insert(data).select().single())
}
export async function updateQCTest(id, data) {
  return q(supabase.from('qc_tests').update({ ...data, updated_at: ts() }).eq('id', id).select().single())
}
export async function deleteQCTest(id) {
  return q(supabase.from('qc_tests').delete().eq('id', id))
}

// ─── Tasks ────────────────────────────────────────────────────
export async function getTasks() {
  return q(supabase.from('tasks').select('*').order('created_at', { ascending: false }))
}
export async function addTask(data) {
  return q(supabase.from('tasks').insert(data).select().single())
}
export async function updateTask(id, data) {
  return q(supabase.from('tasks').update({ ...data, updated_at: ts() }).eq('id', id).select().single())
}
export async function deleteTask(id) {
  return q(supabase.from('tasks').delete().eq('id', id))
}

// ─── Employees ────────────────────────────────────────────────
const EMP_COLS = 'id,name,email,role,department,status,created_at'

export async function getEmployees() {
  return q(supabase.from('employees').select(EMP_COLS).order('created_at', { ascending: false }))
}
export async function addEmployee(data) {
  const existing = await q(supabase.from('employees').select('id').eq('email', data.email.toLowerCase()).maybeSingle())
  if (existing) throw new Error('Email already in use')
  return q(supabase.from('employees').insert({ ...data, email: data.email.toLowerCase() }).select(EMP_COLS).single())
}
export async function updateEmployee(id, data) {
  const existing = await q(supabase.from('employees').select('id').eq('email', data.email.toLowerCase()).neq('id', id).maybeSingle())
  if (existing) throw new Error('Email already in use')
  return q(supabase.from('employees').update({ ...data, email: data.email.toLowerCase(), updated_at: ts() }).eq('id', id).select(EMP_COLS).single())
}
export async function deleteEmployee(id) {
  return q(supabase.from('employees').delete().eq('id', id))
}
export async function loginEmployee(email, password) {
  const emp = await q(supabase.from('employees').select('*').eq('email', email.toLowerCase()).maybeSingle())
  if (!emp) throw new Error('No employee found with this email')
  if (emp.password !== password) throw new Error('Incorrect password')
  if (emp.status === 'Inactive') throw new Error('Account is inactive. Contact admin.')
  const { password: _, ...safe } = emp
  return safe
}
export async function changeEmployeePassword(id, currentPassword, newPassword) {
  const emp = await q(supabase.from('employees').select('id,password').eq('id', id).maybeSingle())
  if (!emp) throw new Error('Employee not found')
  if (emp.password !== currentPassword) throw new Error('Current password is incorrect')
  await q(supabase.from('employees').update({ password: newPassword, updated_at: new Date().toISOString() }).eq('id', id))
}

// ─── Stock ────────────────────────────────────────────────────
export async function getStock() {
  return q(supabase.from('stock_items').select('*').order('id', { ascending: true }))
}
export async function importStock(items) {
  await q(supabase.from('stock_items').delete().gte('id', 1))
  const now = ts()
  const rows = items.map(item => ({
    handle: item.handle || '', title: item.title || '', vendor: item.vendor || '',
    type: item.type || '', tags: item.tags || '', sku: item.sku || '',
    qty: Number(item.qty) || 0, price: Number(item.price) || 0,
    mrp: Number(item.mrp) || 0, status: item.status || 'draft',
    created_at: now, updated_at: now,
  }))
  await q(supabase.from('stock_items').insert(rows))
  return rows.length
}
export async function patchStock(id, data) {
  return q(supabase.from('stock_items').update({ ...data, updated_at: ts() }).eq('id', id).select().single())
}
export async function clearStock() {
  return q(supabase.from('stock_items').delete().gte('id', 1))
}

// ─── Attendance ───────────────────────────────────────────────
export async function getAttendanceRecords() {
  return q(supabase.from('attendance_records').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }))
}
export async function addAttendanceRecord(data) {
  return q(supabase.from('attendance_records').insert({ ...data, created_at: ts(), updated_at: ts() }).select().single())
}
export async function updateAttendanceRecord(id, data) {
  return q(supabase.from('attendance_records').update({ ...data, updated_at: ts() }).eq('id', id).select().single())
}
export async function deleteAttendanceRecord(id) {
  return q(supabase.from('attendance_records').delete().eq('id', id))
}

// ─── Serial Lookup ────────────────────────────────────────────
export async function serialLookup(query) {
  const pattern = (query || '').trim()
  if (!pattern) return { service: [], qc: [], orders: [] }
  const [service, qc, orders] = await Promise.all([
    q(supabase.from('service_records').select('*').ilike('serial_number', `%${pattern}%`).order('created_at', { ascending: false })),
    q(supabase.from('qc_tests').select('*').ilike('serial_number', `%${pattern}%`).order('created_at', { ascending: false })),
    q(supabase.from('orders').select('*').ilike('tracking_number', `%${pattern}%`).order('created_at', { ascending: false })),
  ])
  return { service, qc, orders }
}
