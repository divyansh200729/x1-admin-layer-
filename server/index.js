import express from 'express'
import cors from 'cors'
import { initDb, queryAll, queryOne, run, save } from './db.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Wait for DB init before handling requests
let dbReady = false
initDb().then(() => {
  dbReady = true
  console.log('\n  X1 Database initialized\n')
})

app.use((req, res, next) => {
  if (!dbReady) return res.status(503).json({ error: 'Database initializing, please retry in a moment' })
  next()
})

// ─── USERS ────────────────────────────────────────────────────────────────────

app.get('/api/users', (req, res) => {
  try {
    res.json(queryAll('SELECT * FROM users ORDER BY created_at DESC'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/users', (req, res) => {
  try {
    const { name, mobile } = req.body
    if (!name || !mobile) return res.status(400).json({ error: 'Name and mobile required' })
    const existing = queryOne('SELECT * FROM users WHERE mobile = ?', [mobile])
    if (existing) return res.json(existing)
    const now = new Date().toISOString()
    const id = run('INSERT INTO users (name, mobile, created_at) VALUES (?, ?, ?)', [name, mobile, now])
    save()
    res.status(201).json(queryOne('SELECT * FROM users WHERE id = ?', [id]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/users/:mobile', (req, res) => {
  try {
    const user = queryOne('SELECT * FROM users WHERE mobile = ?', [req.params.mobile])
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── SALES INQUIRIES ─────────────────────────────────────────────────────────

app.get('/api/sales_inquiries', (req, res) => {
  try {
    res.json(queryAll('SELECT * FROM sales_inquiries ORDER BY created_at DESC'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/sales_inquiries', (req, res) => {
  try {
    const { date, customer_name, mobile, email, city, reference_by, interested_in, assigned_to, follow_up_date, status, remarks } = req.body
    const now = new Date().toISOString()
    const id = run(`INSERT INTO sales_inquiries (date,customer_name,mobile,email,city,reference_by,interested_in,assigned_to,follow_up_date,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [date, customer_name, mobile, email||'', city||'', reference_by||'', interested_in||'', assigned_to||'', follow_up_date||'', status||'New', remarks||'', now, now])
    save()
    res.status(201).json(queryOne('SELECT * FROM sales_inquiries WHERE id = ?', [id]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/sales_inquiries/:id', (req, res) => {
  try {
    const { date, customer_name, mobile, email, city, reference_by, interested_in, assigned_to, follow_up_date, status, remarks } = req.body
    const now = new Date().toISOString()
    run(`UPDATE sales_inquiries SET date=?,customer_name=?,mobile=?,email=?,city=?,reference_by=?,interested_in=?,assigned_to=?,follow_up_date=?,status=?,remarks=?,updated_at=? WHERE id=?`,
      [date, customer_name, mobile, email||'', city||'', reference_by||'', interested_in||'', assigned_to||'', follow_up_date||'', status, remarks||'', now, req.params.id])
    save()
    res.json(queryOne('SELECT * FROM sales_inquiries WHERE id = ?', [req.params.id]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/sales_inquiries/:id', (req, res) => {
  try {
    run('DELETE FROM sales_inquiries WHERE id = ?', [req.params.id])
    save()
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── SERVICE RECORDS ─────────────────────────────────────────────────────────

app.get('/api/service_records', (req, res) => {
  try {
    res.json(queryAll('SELECT * FROM service_records ORDER BY created_at DESC'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/service_records', (req, res) => {
  try {
    const { date, customer_name, mobile, product_model, serial_number, warranty_status, problem_description, add_ons, quotation_amount, expected_return_date, status, remarks } = req.body
    const now = new Date().toISOString()
    const id = run(`INSERT INTO service_records (date,customer_name,mobile,product_model,serial_number,warranty_status,problem_description,add_ons,quotation_amount,expected_return_date,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [date, customer_name, mobile, product_model, serial_number||'', warranty_status||'Out of Warranty', problem_description||'', add_ons||'', quotation_amount||null, expected_return_date||'', status||'Received', remarks||'', now, now])
    save()
    res.status(201).json(queryOne('SELECT * FROM service_records WHERE id = ?', [id]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/service_records/:id', (req, res) => {
  try {
    const { date, customer_name, mobile, product_model, serial_number, warranty_status, problem_description, add_ons, quotation_amount, expected_return_date, status, remarks } = req.body
    const now = new Date().toISOString()
    run(`UPDATE service_records SET date=?,customer_name=?,mobile=?,product_model=?,serial_number=?,warranty_status=?,problem_description=?,add_ons=?,quotation_amount=?,expected_return_date=?,status=?,remarks=?,updated_at=? WHERE id=?`,
      [date, customer_name, mobile, product_model, serial_number||'', warranty_status, problem_description||'', add_ons||'', quotation_amount||null, expected_return_date||'', status, remarks||'', now, req.params.id])
    save()
    res.json(queryOne('SELECT * FROM service_records WHERE id = ?', [req.params.id]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/service_records/:id', (req, res) => {
  try {
    run('DELETE FROM service_records WHERE id = ?', [req.params.id])
    save()
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── ORDERS ──────────────────────────────────────────────────────────────────

app.get('/api/orders', (req, res) => {
  try {
    res.json(queryAll('SELECT * FROM orders ORDER BY created_at DESC'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/orders', (req, res) => {
  try {
    const { date, customer_name, mobile, gst_number, shipping_address, product_model, amount, remarks, courier_name, tracking_number, order_status } = req.body
    const now = new Date().toISOString()
    const id = run(`INSERT INTO orders (date,customer_name,mobile,gst_number,shipping_address,product_model,amount,remarks,courier_name,tracking_number,order_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [date, customer_name, mobile, gst_number||'', shipping_address||'', product_model, amount, remarks||'', courier_name||'', tracking_number||'', order_status||'Pending', now, now])
    save()
    res.status(201).json(queryOne('SELECT * FROM orders WHERE id = ?', [id]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/orders/:id', (req, res) => {
  try {
    const { date, customer_name, mobile, gst_number, shipping_address, product_model, amount, remarks, courier_name, tracking_number, order_status } = req.body
    const now = new Date().toISOString()
    run(`UPDATE orders SET date=?,customer_name=?,mobile=?,gst_number=?,shipping_address=?,product_model=?,amount=?,remarks=?,courier_name=?,tracking_number=?,order_status=?,updated_at=? WHERE id=?`,
      [date, customer_name, mobile, gst_number||'', shipping_address||'', product_model, amount, remarks||'', courier_name||'', tracking_number||'', order_status, now, req.params.id])
    save()
    res.json(queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/orders/:id', (req, res) => {
  try {
    run('DELETE FROM orders WHERE id = ?', [req.params.id])
    save()
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── QC TESTS ────────────────────────────────────────────────────────────────

app.get('/api/qc_tests', (req, res) => {
  try {
    const records = queryAll('SELECT * FROM qc_tests ORDER BY created_at DESC')
    res.json(records.map(r => ({
      ...r,
      checklist: (() => { try { return JSON.parse(r.checklist || '[]') } catch { return [] } })()
    })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/qc_tests', (req, res) => {
  try {
    const { date, product_model, serial_number, tested_by, test_result, checklist, notes } = req.body
    const now = new Date().toISOString()
    const id = run(`INSERT INTO qc_tests (date,product_model,serial_number,tested_by,test_result,checklist,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      [date, product_model, serial_number, tested_by, test_result||'Pending', JSON.stringify(checklist||[]), notes||'', now, now])
    save()
    const record = queryOne('SELECT * FROM qc_tests WHERE id = ?', [id])
    res.status(201).json({ ...record, checklist: JSON.parse(record.checklist||'[]') })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/qc_tests/:id', (req, res) => {
  try {
    const { date, product_model, serial_number, tested_by, test_result, checklist, notes } = req.body
    const now = new Date().toISOString()
    run(`UPDATE qc_tests SET date=?,product_model=?,serial_number=?,tested_by=?,test_result=?,checklist=?,notes=?,updated_at=? WHERE id=?`,
      [date, product_model, serial_number, tested_by, test_result, JSON.stringify(checklist||[]), notes||'', now, req.params.id])
    save()
    const record = queryOne('SELECT * FROM qc_tests WHERE id = ?', [req.params.id])
    res.json({ ...record, checklist: JSON.parse(record.checklist||'[]') })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/qc_tests/:id', (req, res) => {
  try {
    run('DELETE FROM qc_tests WHERE id = ?', [req.params.id])
    save()
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── TASKS ────────────────────────────────────────────────────────────────────

app.get('/api/tasks', (req, res) => {
  try {
    res.json(queryAll('SELECT * FROM tasks ORDER BY created_at DESC'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/tasks', (req, res) => {
  try {
    const { title, description, assigned_to, due_date, priority, status } = req.body
    const now = new Date().toISOString()
    const id = run(`INSERT INTO tasks (title,description,assigned_to,due_date,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
      [title, description||'', assigned_to||'', due_date||'', priority||'Medium', status||'To Do', now, now])
    save()
    res.status(201).json(queryOne('SELECT * FROM tasks WHERE id = ?', [id]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/tasks/:id', (req, res) => {
  try {
    const { title, description, assigned_to, due_date, priority, status } = req.body
    const now = new Date().toISOString()
    run(`UPDATE tasks SET title=?,description=?,assigned_to=?,due_date=?,priority=?,status=?,updated_at=? WHERE id=?`,
      [title, description||'', assigned_to||'', due_date||'', priority, status, now, req.params.id])
    save()
    res.json(queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/tasks/:id', (req, res) => {
  try {
    run('DELETE FROM tasks WHERE id = ?', [req.params.id])
    save()
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── EMPLOYEES ───────────────────────────────────────────────────────────────

app.get('/api/employees', (_req, res) => {
  try {
    // Never send password to client list
    const rows = queryAll('SELECT id,name,email,role,department,status,created_at FROM employees ORDER BY created_at DESC')
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/employees', (req, res) => {
  try {
    const { name, email, password, role, department, status } = req.body
    if (!name || !email || !password || !role || !department) {
      return res.status(400).json({ error: 'All fields are required' })
    }
    const existing = queryOne('SELECT id FROM employees WHERE email = ?', [email.toLowerCase()])
    if (existing) return res.status(409).json({ error: 'Email already in use' })
    const now = new Date().toISOString()
    const id = run(
      `INSERT INTO employees (name,email,password,role,department,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
      [name, email.toLowerCase(), password, role, department, status || 'Active', now, now]
    )
    save()
    const emp = queryOne('SELECT id,name,email,role,department,status,created_at FROM employees WHERE id = ?', [id])
    res.status(201).json(emp)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/employees/:id', (req, res) => {
  try {
    const { name, email, password, role, department, status } = req.body
    const now = new Date().toISOString()
    // Check email uniqueness (excluding self)
    if (email) {
      const existing = queryOne('SELECT id FROM employees WHERE email = ? AND id != ?', [email.toLowerCase(), req.params.id])
      if (existing) return res.status(409).json({ error: 'Email already in use' })
    }
    run(
      `UPDATE employees SET name=?,email=?,password=?,role=?,department=?,status=?,updated_at=? WHERE id=?`,
      [name, email.toLowerCase(), password, role, department, status || 'Active', now, req.params.id]
    )
    save()
    const emp = queryOne('SELECT id,name,email,role,department,status,created_at FROM employees WHERE id = ?', [req.params.id])
    res.json(emp)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/employees/:id', (req, res) => {
  try {
    run('DELETE FROM employees WHERE id = ?', [req.params.id])
    save()
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Employee login verification (used by Auth page)
app.post('/api/employees/login', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const emp = queryOne('SELECT * FROM employees WHERE email = ?', [email.toLowerCase()])
    if (!emp) return res.status(404).json({ error: 'No employee found with this email' })
    if (emp.password !== password) return res.status(401).json({ error: 'Incorrect password' })
    if (emp.status === 'Inactive') return res.status(403).json({ error: 'Account is inactive. Contact admin.' })
    // Return without password
    const { password: _, ...safeEmp } = emp
    res.json(safeEmp)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── STOCK ────────────────────────────────────────────────────────────────────

app.get('/api/stock', (req, res) => {
  try {
    res.json(queryAll('SELECT * FROM stock_items ORDER BY id ASC'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Bulk import — replaces ALL stock items
app.post('/api/stock/import', (req, res) => {
  try {
    const items = req.body
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'items array required' })
    const now = new Date().toISOString()
    run('DELETE FROM stock_items')
    for (const item of items) {
      run(
        `INSERT INTO stock_items (handle,title,vendor,type,tags,sku,qty,price,mrp,status,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [item.handle||'', item.title||'', item.vendor||'', item.type||'', item.tags||'',
         item.sku||'', Number(item.qty)||0, Number(item.price)||0, Number(item.mrp)||0,
         item.status||'draft', now, now]
      )
    }
    save()
    res.json({ imported: items.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Update a single stock item's qty
app.patch('/api/stock/:id', (req, res) => {
  try {
    const { qty, price, mrp, status } = req.body
    const now = new Date().toISOString()
    const existing = queryOne('SELECT * FROM stock_items WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Item not found' })
    run(
      `UPDATE stock_items SET qty=?,price=?,mrp=?,status=?,updated_at=? WHERE id=?`,
      [qty ?? existing.qty, price ?? existing.price, mrp ?? existing.mrp,
       status ?? existing.status, now, req.params.id]
    )
    save()
    res.json(queryOne('SELECT * FROM stock_items WHERE id = ?', [req.params.id]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/stock', (req, res) => {
  try {
    run('DELETE FROM stock_items')
    save()
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── SERIAL LOOKUP ────────────────────────────────────────────────────────────

app.get('/api/serial-lookup', (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.json({ service: [], qc: [], orders: [] })
    const pattern = `%${q}%`
    const service = queryAll('SELECT * FROM service_records WHERE serial_number LIKE ? ORDER BY created_at DESC', [pattern])
    const qc      = queryAll('SELECT * FROM qc_tests WHERE serial_number LIKE ? ORDER BY created_at DESC', [pattern])
    const orders  = queryAll('SELECT * FROM orders WHERE tracking_number LIKE ? ORDER BY created_at DESC', [pattern])
    res.json({ service, qc, orders })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  X1 Server running at http://localhost:${PORT}\n`)
})
