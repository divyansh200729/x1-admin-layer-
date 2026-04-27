# X1 Business Management Suite

A full-stack, mobile-first business management web app built for small-to-medium device retail and repair businesses. Manage sales inquiries, service jobs, orders, QC testing, stock inventory, and team operations — all from one place.

---

## Features

### Modules
- **Sales Inquiries** — Track leads, follow-ups, assigned staff, and conversion status
- **Service** — Manage device repair jobs with warranty tracking and status updates
- **Orders** — Handle customer orders with courier and tracking number management
- **QC Testing** — Run structured quality control checklists on devices with pass/fail results
- **Stock Management** — Import Shopify CSV inventory, track live stock levels, prices, and discount %
- **Serial Scanner** — Scan any barcode/QR code to instantly look up a device across all modules
- **Tasks** — Assign and track team tasks with priority and due dates
- **Team Management** — Manage employee roles and module-level access permissions

### General
- Role-based access control (Admin / Employee)
- Mobile-friendly PWA — installable on Android and iOS
- Barcode and QR code scanning via device camera (works on Samsung, Vivo, and most Android browsers)
- Export data as CSV or PDF from every module
- Bulk select and delete records
- WhatsApp quick-action on every customer record
- Real-time search and filter across all modules
- Responsive layout — card view on mobile, full table on desktop

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | SQLite (via better-sqlite3) |
| Barcode Scanning | html5-qrcode |
| PDF Export | jsPDF, html2canvas |
| Icons | Lucide React |
| Fonts | Plus Jakarta Sans, Syne (Google Fonts) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/divyansh200729/x1-admin-layer-.git
cd x1-admin-layer-

# Install dependencies
npm install

# Start the backend server
node server/index.js

# In a separate terminal, start the frontend
npm run dev
x1-app/
├── server/
│   ├── index.js        # Express API server
│   └── db.js           # SQLite database setup
├── src/
│   ├── components/     # Shared UI components (Drawer, Badge, Button, etc.)
│   ├── context/        # Toast notifications context
│   ├── hooks/          # useApi data-fetching hook
│   ├── pages/          # All module pages
│   │   ├── Sales.jsx
│   │   ├── Service.jsx
│   │   ├── Orders.jsx
│   │   ├── QC.jsx
│   │   ├── Stock.jsx
│   │   ├── SerialReader.jsx
│   │   ├── Tasks.jsx
│   │   └── Employees.jsx
│   └── utils/          # Export utilities, role checker
├── public/             # PWA icons and manifest
├── package.json
└── vite.config.js
