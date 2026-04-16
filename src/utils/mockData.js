// Mock data for dashboard charts and KPI cards

export const monthlySalesData = [
  { month: 'Jan', value: 38000 },
  { month: 'Feb', value: 42000 },
  { month: 'Mar', value: 35000 },
  { month: 'Apr', value: 51000 },
  { month: 'May', value: 47000 },
  { month: 'Jun', value: 58000 },
  { month: 'Jul', value: 63000 },
  { month: 'Aug', value: 55000 },
  { month: 'Sep', value: 70000 },
  { month: 'Oct', value: 66000 },
  { month: 'Nov', value: 74000 },
  { month: 'Dec', value: 82000 },
]

export const ordersDistributionData = [
  { name: 'Pending', value: 4, color: '#6B7280' },
  { name: 'Dispatched', value: 5, color: '#FF9500' },
  { name: 'Delivered', value: 8, color: '#10B981' },
  { name: 'Cancelled', value: 1, color: '#EF4444' },
]

export const kpiData = {
  totalSales: { value: '₹45,200', trend: '+12%', up: true },
  activeOrders: { value: 12, trend: '+3%', up: true },
  serviceCount: { value: 18, trend: '-5%', up: false },
  teamSize: { value: 6, trend: 'No change', up: null },
}
