import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DB_PATH = join(__dirname, 'x1.db')

let db
let SQL

async function initDb() {
  SQL = await initSqlJs()

  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales_inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      customer_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      city TEXT,
      reference_by TEXT,
      interested_in TEXT,
      assigned_to TEXT,
      follow_up_date TEXT,
      status TEXT DEFAULT 'New',
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS service_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      customer_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      product_model TEXT NOT NULL,
      serial_number TEXT,
      warranty_status TEXT DEFAULT 'Out of Warranty',
      problem_description TEXT,
      add_ons TEXT,
      quotation_amount REAL,
      expected_return_date TEXT,
      status TEXT DEFAULT 'Received',
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      customer_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      gst_number TEXT,
      shipping_address TEXT,
      product_model TEXT NOT NULL,
      amount REAL NOT NULL,
      remarks TEXT,
      courier_name TEXT,
      tracking_number TEXT,
      order_status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS qc_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      product_model TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      tested_by TEXT NOT NULL,
      test_result TEXT DEFAULT 'Pending',
      checklist TEXT DEFAULT '[]',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to TEXT,
      due_date TEXT,
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'To Do',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      handle TEXT,
      title TEXT NOT NULL,
      vendor TEXT,
      type TEXT,
      tags TEXT,
      sku TEXT,
      qty INTEGER DEFAULT 0,
      price REAL DEFAULT 0,
      mrp REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Seed if empty
  const userCount = queryOne('SELECT COUNT(*) as c FROM users')
  if (!userCount || userCount.c === 0) {
    seed()
  }

  save()
  return db
}

// Save DB to disk after writes
export function save() {
  const data = db.export()
  writeFileSync(DB_PATH, Buffer.from(data))
}

// Helper: run a SELECT and return all rows as objects
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

// Helper: run a SELECT and return first row
export function queryOne(sql, params = []) {
  const rows = queryAll(sql, params)
  return rows[0] || null
}

// Helper: run an INSERT/UPDATE/DELETE
export function run(sql, params = []) {
  db.run(sql, params)
  return db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0]
}

function seed() {
  const now = new Date().toISOString()

  // Users
  db.run(`INSERT INTO users (name, mobile, created_at) VALUES ('Rahul Sharma', '9876543210', ?)`, [now])
  db.run(`INSERT INTO users (name, mobile, created_at) VALUES ('Priya Patel', '9988776655', ?)`, [now])
  db.run(`INSERT INTO users (name, mobile, created_at) VALUES ('Admin User', '9000000000', ?)`, [now])

  // Sales
  db.run(`INSERT INTO sales_inquiries (date,customer_name,mobile,email,city,reference_by,interested_in,assigned_to,follow_up_date,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-28','Amit Verma','9812345678','amit@example.com','Mumbai','Google','X1 Pro 5G','Rahul','2026-04-05','Follow-Up','Very interested, budget is ₹15,000',now,now])
  db.run(`INSERT INTO sales_inquiries (date,customer_name,mobile,email,city,reference_by,interested_in,assigned_to,follow_up_date,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-29','Sneha Joshi','9823456789','sneha@gmail.com','Pune','Facebook Ad','X1 Mini','Priya','2026-04-03','New','First inquiry, send brochure',now,now])
  db.run(`INSERT INTO sales_inquiries (date,customer_name,mobile,email,city,reference_by,interested_in,assigned_to,follow_up_date,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-30','Karan Singh','9834567890','','Delhi','Walk-in','X1 Pro Max','Rahul','2026-03-31','Saved','Ready to buy, waiting for stock',now,now])
  db.run(`INSERT INTO sales_inquiries (date,customer_name,mobile,email,city,reference_by,interested_in,assigned_to,follow_up_date,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-25','Neha Mehta','9845678901','neha@outlook.com','Bangalore','Referral','X1 Lite','Priya','2026-03-28','Sold','Purchased X1 Lite in black',now,now])
  db.run(`INSERT INTO sales_inquiries (date,customer_name,mobile,email,city,reference_by,interested_in,assigned_to,follow_up_date,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-20','Raj Kumar','9856789012','','Chennai','Instagram','X1 Pro 5G','Rahul','2026-03-25','Lost','Went with competitor product',now,now])

  // Service
  db.run(`INSERT INTO service_records (date,customer_name,mobile,product_model,serial_number,warranty_status,problem_description,add_ons,quotation_amount,expected_return_date,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-28','Vikram Nair','9712345678','X1 Pro 5G','X1P5G2024001','In Warranty','Screen flickering issue','Screen protector',null,'2026-04-02','In Progress','Display panel ordered',now,now])
  db.run(`INSERT INTO service_records (date,customer_name,mobile,product_model,serial_number,warranty_status,problem_description,add_ons,quotation_amount,expected_return_date,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-29','Anita Reddy','9723456789','X1 Mini','X1M2023055','Out of Warranty','Battery not charging','Case',1200,'2026-04-01','Received','Customer informed about cost',now,now])
  db.run(`INSERT INTO service_records (date,customer_name,mobile,product_model,serial_number,warranty_status,problem_description,add_ons,quotation_amount,expected_return_date,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-27','Suresh Pillai','9734567890','X1 Pro Max','X1PM2024012','In Warranty','Speaker distortion',null,null,'2026-03-31','Ready','Speaker module replaced',now,now])
  db.run(`INSERT INTO service_records (date,customer_name,mobile,product_model,serial_number,warranty_status,problem_description,add_ons,quotation_amount,expected_return_date,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-20','Deepa Sharma','9745678901','X1 Lite','X1L2023089','Out of Warranty','Power button stuck','Tempered glass',800,'2026-03-24','Delivered','Delivered and payment received',now,now])

  // Orders
  db.run(`INSERT INTO orders (date,customer_name,mobile,gst_number,shipping_address,product_model,amount,remarks,courier_name,tracking_number,order_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-30','Tech Solutions Pvt Ltd','9612345678','27AABCT1234A1Z5','12 Park Street Mumbai 400069','X1 Pro 5G x 5 units',74995,'Bulk order','Delhivery','DL2024033001234','Dispatched',now,now])
  db.run(`INSERT INTO orders (date,customer_name,mobile,gst_number,shipping_address,product_model,amount,remarks,courier_name,tracking_number,order_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-31','Mobile World Store','9623456789','','45 MG Road Pune 411001','X1 Mini x 3 units',26997,'Regular order','BlueDart','BD20240331005678','Pending',now,now])
  db.run(`INSERT INTO orders (date,customer_name,mobile,gst_number,shipping_address,product_model,amount,remarks,courier_name,tracking_number,order_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-28','Priya Electronics','9634567890','29AABCP5678B2Z3','Shop 7 Electronics Market Bangalore 560001','X1 Pro Max x 2 units',39998,'Festival season stock','DTDC','DTDC2024032589','Delivered',now,now])
  db.run(`INSERT INTO orders (date,customer_name,mobile,gst_number,shipping_address,product_model,amount,remarks,courier_name,tracking_number,order_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['2026-03-25','Raj Mobile Hub','9645678901','','B-12 Nehru Place New Delhi 110019','X1 Lite x 10 units',59990,'Cancelled by customer','','','Cancelled',now,now])

  // QC
  const checklistPass = JSON.stringify([
    {item:'Power On',result:'Pass'},{item:'Display Check',result:'Pass'},
    {item:'Button Test',result:'Pass'},{item:'Port Test',result:'Pass'},
    {item:'Battery Test',result:'Pass'},{item:'Software Test',result:'Pass'},
    {item:'Physical Damage Check',result:'Pass'}
  ])
  const checklistFail = JSON.stringify([
    {item:'Power On',result:'Pass'},{item:'Display Check',result:'Pass'},
    {item:'Button Test',result:'Fail'},{item:'Port Test',result:'Pass'},
    {item:'Battery Test',result:'Pass'},{item:'Software Test',result:'Pass'},
    {item:'Physical Damage Check',result:'Pass'}
  ])
  db.run(`INSERT INTO qc_tests (date,product_model,serial_number,tested_by,test_result,checklist,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    ['2026-03-31','X1 Pro 5G','X1P5G2026B001','Rahul','Pass',checklistPass,'All tests passed. Ready for dispatch.',now,now])
  db.run(`INSERT INTO qc_tests (date,product_model,serial_number,tested_by,test_result,checklist,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    ['2026-03-31','X1 Mini','X1M2026B002','Priya','Fail',checklistFail,'Volume button needs rework.',now,now])
  db.run(`INSERT INTO qc_tests (date,product_model,serial_number,tested_by,test_result,checklist,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    ['2026-03-30','X1 Pro Max','X1PM2026A015','Rahul','Pass',checklistPass,'Excellent build quality.',now,now])
  db.run(`INSERT INTO qc_tests (date,product_model,serial_number,tested_by,test_result,checklist,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    ['2026-03-29','X1 Lite','X1L2026A099','Priya','Pass',checklistPass,'Minor cosmetic mark, within tolerance.',now,now])

  // Tasks
  db.run(`INSERT INTO tasks (title,description,assigned_to,due_date,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    ['Follow up with Amit Verma','Call and check if ready to purchase X1 Pro 5G','Rahul','2026-04-05','High','To Do',now,now])
  db.run(`INSERT INTO tasks (title,description,assigned_to,due_date,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    ['Prepare Q1 Sales Report','Compile all sales data for January-March 2026','Priya','2026-04-07','Medium','In Progress',now,now])
  db.run(`INSERT INTO tasks (title,description,assigned_to,due_date,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    ['Update product catalog','Add new X1 Pro 5G variants and pricing','Rahul','2026-04-10','Low','To Do',now,now])
  db.run(`INSERT INTO tasks (title,description,assigned_to,due_date,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    ['Service center audit','Audit all pending service records older than 7 days','Priya','2026-04-03','Urgent','In Progress',now,now])
  db.run(`INSERT INTO tasks (title,description,assigned_to,due_date,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    ['Dispatch pending orders','Process and dispatch all pending orders before EOD','Rahul','2026-04-01','High','Done',now,now])
  db.run(`INSERT INTO tasks (title,description,assigned_to,due_date,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    ['Set up new QC checklist','Update checklist for X1 Pro Max batch B','Priya','2026-03-28','Medium','Done',now,now])
  db.run(`INSERT INTO tasks (title,description,assigned_to,due_date,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    ['Renew service agreements','Contact warranty partners for renewal','Rahul','2026-04-15','Low','To Do',now,now])
}

export { initDb, db }
export default { queryAll, queryOne, run, save, initDb }
