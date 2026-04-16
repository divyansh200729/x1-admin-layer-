import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Format date for filename: DDMMYYYY
function fileDateStamp() {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}${mm}${yyyy}`
}

// Escape a CSV cell value
function escapeCSV(val) {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Convert array of objects to CSV string
function toCSV(headers, rows) {
  const headerLine = headers.map(h => escapeCSV(h.label)).join(',')
  const dataLines = rows.map(row =>
    headers.map(h => escapeCSV(row[h.key])).join(',')
  )
  return [headerLine, ...dataLines].join('\n')
}

// Trigger a browser download
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── CSV EXPORTS ────────────────────────────────────────────────

export function exportSalesCSV(records) {
  if (!records || records.length === 0) return false
  const headers = [
    { label: 'ID', key: 'id' },
    { label: 'Date', key: 'date' },
    { label: 'Customer Name', key: 'customer_name' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'Email', key: 'email' },
    { label: 'City', key: 'city' },
    { label: 'Reference By', key: 'reference_by' },
    { label: 'Interested In', key: 'interested_in' },
    { label: 'Assigned To', key: 'assigned_to' },
    { label: 'Follow-Up Date', key: 'follow_up_date' },
    { label: 'Status', key: 'status' },
    { label: 'Remarks', key: 'remarks' },
  ]
  downloadFile(toCSV(headers, records), `SalesInquiries_Export_${fileDateStamp()}.csv`, 'text/csv')
  return true
}

export function exportServiceCSV(records) {
  if (!records || records.length === 0) return false
  const headers = [
    { label: 'ID', key: 'id' },
    { label: 'Date', key: 'date' },
    { label: 'Customer Name', key: 'customer_name' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'Product Model', key: 'product_model' },
    { label: 'Serial Number', key: 'serial_number' },
    { label: 'Warranty Status', key: 'warranty_status' },
    { label: 'Problem', key: 'problem_description' },
    { label: 'Add-Ons', key: 'add_ons' },
    { label: 'Quotation (₹)', key: 'quotation_amount' },
    { label: 'Expected Return', key: 'expected_return_date' },
    { label: 'Status', key: 'status' },
    { label: 'Remarks', key: 'remarks' },
  ]
  downloadFile(toCSV(headers, records), `Service_Export_${fileDateStamp()}.csv`, 'text/csv')
  return true
}

export function exportOrdersCSV(records) {
  if (!records || records.length === 0) return false
  const headers = [
    { label: 'ID', key: 'id' },
    { label: 'Date', key: 'date' },
    { label: 'Customer Name', key: 'customer_name' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'GST Number', key: 'gst_number' },
    { label: 'Shipping Address', key: 'shipping_address' },
    { label: 'Product Model', key: 'product_model' },
    { label: 'Amount (₹)', key: 'amount' },
    { label: 'Courier', key: 'courier_name' },
    { label: 'Tracking Number', key: 'tracking_number' },
    { label: 'Status', key: 'order_status' },
    { label: 'Remarks', key: 'remarks' },
  ]
  downloadFile(toCSV(headers, records), `Orders_Export_${fileDateStamp()}.csv`, 'text/csv')
  return true
}

export function exportQCCSV(records) {
  if (!records || records.length === 0) return false
  const flat = records.map(r => ({
    ...r,
    checklist_summary: Array.isArray(r.checklist)
      ? r.checklist.map(c => `${c.item}:${c.result}`).join(' | ')
      : '',
  }))
  const headers = [
    { label: 'ID', key: 'id' },
    { label: 'Date', key: 'date' },
    { label: 'Product Model', key: 'product_model' },
    { label: 'Serial Number', key: 'serial_number' },
    { label: 'Tested By', key: 'tested_by' },
    { label: 'Test Result', key: 'test_result' },
    { label: 'Checklist', key: 'checklist_summary' },
    { label: 'Notes', key: 'notes' },
  ]
  downloadFile(toCSV(headers, flat), `QCTesting_Export_${fileDateStamp()}.csv`, 'text/csv')
  return true
}

export function exportTasksCSV(records) {
  if (!records || records.length === 0) return false
  const headers = [
    { label: 'ID', key: 'id' },
    { label: 'Title', key: 'title' },
    { label: 'Description', key: 'description' },
    { label: 'Assigned To', key: 'assigned_to' },
    { label: 'Due Date', key: 'due_date' },
    { label: 'Priority', key: 'priority' },
    { label: 'Status', key: 'status' },
  ]
  downloadFile(toCSV(headers, records), `Tasks_Export_${fileDateStamp()}.csv`, 'text/csv')
  return true
}

// ── PDF EXPORTS ────────────────────────────────────────────────

function createPDF(title, columns, rows) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(30, 41, 59)
  doc.text(title, 14, 18)

  // Timestamp
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 25)
  doc.text(`Total Records: ${rows.length}`, 14, 30)

  // Table
  autoTable(doc, {
    startY: 36,
    head: [columns.map(c => c.label)],
    body: rows.map(r => columns.map(c => {
      const val = r[c.key]
      if (val === null || val === undefined) return ''
      return String(val)
    })),
    headStyles: {
      fillColor: [91, 127, 255],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  })

  return doc
}

export function exportSalesPDF(records) {
  if (!records || records.length === 0) return false
  const doc = createPDF('Sales Inquiries Report', [
    { label: 'Date', key: 'date' },
    { label: 'Customer', key: 'customer_name' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'City', key: 'city' },
    { label: 'Interested In', key: 'interested_in' },
    { label: 'Assigned To', key: 'assigned_to' },
    { label: 'Follow-Up', key: 'follow_up_date' },
    { label: 'Status', key: 'status' },
  ], records)
  doc.save(`SalesInquiries_Report_${fileDateStamp()}.pdf`)
  return true
}

export function exportServicePDF(records) {
  if (!records || records.length === 0) return false
  const doc = createPDF('Service Records Report', [
    { label: 'Date', key: 'date' },
    { label: 'Customer', key: 'customer_name' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'Model', key: 'product_model' },
    { label: 'Serial', key: 'serial_number' },
    { label: 'Warranty', key: 'warranty_status' },
    { label: 'Return Date', key: 'expected_return_date' },
    { label: 'Status', key: 'status' },
    { label: 'Amount (₹)', key: 'quotation_amount' },
  ], records)
  doc.save(`Service_Report_${fileDateStamp()}.pdf`)
  return true
}

export function exportOrdersPDF(records) {
  if (!records || records.length === 0) return false
  const doc = createPDF('Orders Report', [
    { label: 'Date', key: 'date' },
    { label: 'Customer', key: 'customer_name' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'Model', key: 'product_model' },
    { label: 'Amount (₹)', key: 'amount' },
    { label: 'Courier', key: 'courier_name' },
    { label: 'Tracking', key: 'tracking_number' },
    { label: 'Status', key: 'order_status' },
  ], records)
  doc.save(`Orders_Report_${fileDateStamp()}.pdf`)
  return true
}

export function exportQCPDF(records) {
  if (!records || records.length === 0) return false
  const flat = records.map(r => ({
    ...r,
    checklist_summary: Array.isArray(r.checklist)
      ? r.checklist.map(c => `${c.item}:${c.result}`).join(' | ')
      : '',
  }))
  const doc = createPDF('QC Testing Report', [
    { label: 'Date', key: 'date' },
    { label: 'Model', key: 'product_model' },
    { label: 'Serial', key: 'serial_number' },
    { label: 'Tested By', key: 'tested_by' },
    { label: 'Result', key: 'test_result' },
    { label: 'Notes', key: 'notes' },
  ], flat)
  doc.save(`QCTesting_Report_${fileDateStamp()}.pdf`)
  return true
}

export function exportTasksPDF(records) {
  if (!records || records.length === 0) return false
  const doc = createPDF('Tasks Report', [
    { label: 'Title', key: 'title' },
    { label: 'Assigned To', key: 'assigned_to' },
    { label: 'Due Date', key: 'due_date' },
    { label: 'Priority', key: 'priority' },
    { label: 'Status', key: 'status' },
    { label: 'Description', key: 'description' },
  ], records)
  doc.save(`Tasks_Report_${fileDateStamp()}.pdf`)
  return true
}
