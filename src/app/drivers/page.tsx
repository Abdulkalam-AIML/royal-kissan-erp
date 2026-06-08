'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Fallback preseeded data for drivers
const FALLBACK_DRIVERS = [
  { id: 'b097b6a9-8395-4eb8-a720-3057e07662c1', name: 'Nagaraju', phone: '8184918757', salary: 12000, is_active: true },
  { id: 'c097b6a9-8395-4eb8-a720-3057e07662c2', name: 'Mallaya', phone: '9876543210', salary: 16000, is_active: true }
]

const FALLBACK_ROUTES = [
  { id: 'a1111111-1111-1111-1111-111111111111', name: 'Local Route', driver_id: 'b097b6a9-8395-4eb8-a720-3057e07662c1', area: 'Local Area' },
  { id: 'a2222222-2222-2222-2222-222222222222', name: 'Raghavapuram Route', driver_id: 'c097b6a9-8395-4eb8-a720-3057e07662c2', area: 'Raghavapuram' },
  { id: 'a3333333-3333-3333-3333-333333333333', name: 'Mukkinavarigudem Route', driver_id: 'c097b6a9-8395-4eb8-a720-3057e07662c2', area: 'Mukkinavarigudem' },
  { id: 'a4444444-4444-4444-4444-444444444444', name: 'Dammapeta Route', driver_id: 'c097b6a9-8395-4eb8-a720-3057e07662c2', area: 'Dammapeta' }
]

const FALLBACK_CUSTOMERS: Record<string, Array<{ name: string; section: 'cans' | 'bags' | 'bottles'; default_qty: number; default_rate: number; product_name: string }>> = {
  // Local route
  'a1111111-1111-1111-1111-111111111111': [
    { name: 'Bismillah Dhaba', section: 'cans', default_qty: 15, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Vamsi Mess', section: 'cans', default_qty: 15, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Lithu', section: 'cans', default_qty: 15, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Tiffin Center-1', section: 'cans', default_qty: 4, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Tea Stall', section: 'cans', default_qty: 5, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Juices Point', section: 'cans', default_qty: 20, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Surendra Juices Point', section: 'cans', default_qty: 20, default_rate: 20.00, product_name: 'Water Can (20L)' },
    { name: 'House Point 1', section: 'cans', default_qty: 1, default_rate: 30.00, product_name: 'Water Can (20L)' },
    { name: 'House Point 2', section: 'cans', default_qty: 1, default_rate: 30.00, product_name: 'Water Can (20L)' },
    { name: 'House Point 3', section: 'cans', default_qty: 1, default_rate: 30.00, product_name: 'Water Can (20L)' }
  ],
  // Raghavapuram
  'a2222222-2222-2222-2222-222222222222': [
    { name: 'Raghavapuram Wines', section: 'bags', default_qty: 12, default_rate: 80.00, product_name: 'Bags (100 Pack)' },
    { name: 'Gandicherla Shop', section: 'bags', default_qty: 8, default_rate: 90.00, product_name: 'Bags (100 Pack)' },
    { name: 'DN Rao Peta Store', section: 'bags', default_qty: 5, default_rate: 90.00, product_name: 'Bags (100 Pack)' }
  ],
  // Mukkinavarigudem
  'a3333333-3333-3333-3333-333333333333': [
    { name: 'Makkinavarigudem Wines', section: 'bags', default_qty: 15, default_rate: 75.00, product_name: 'Bags (100 Pack)' },
    { name: 'Aunty Shop (Bags)', section: 'bags', default_qty: 10, default_rate: 80.00, product_name: 'Bags (100 Pack)' }
  ],
  // Dammapeta
  'a4444444-4444-4444-4444-444444444444': [
    { name: 'Wine Shop-1', section: 'bags', default_qty: 20, default_rate: 75.00, product_name: 'Bags (100 Pack)' },
    { name: 'Wine Shop-2', section: 'bags', default_qty: 15, default_rate: 75.00, product_name: 'Bags (100 Pack)' }
  ]
}

export default function DriversPage() {
  const [currentView, setCurrentView] = useState<'drivers' | 'profile' | 'categories' | 'customers'>('drivers')
  const [drivers, setDrivers] = useState<any[]>(FALLBACK_DRIVERS)
  const [routes, setRoutes] = useState<any[]>(FALLBACK_ROUTES)
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null)
  
  // Tabs inside Driver Profile
  const [activeTab, setActiveTab] = useState<'local' | 'non-local' | 'collections' | 'dues' | 'daily' | 'monthly' | 'expenses'>('local')
  
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'cans' | 'bags' | 'bottles' | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  
  // Billing form state
  const [billingCustomer, setBillingCustomer] = useState<any | null>(null)
  const [billingForm, setBillingForm] = useState({
    qty: 0,
    rate: 0,
    cash: 0,
    upi: 0,
    product_name: 'Water Can (20L)'
  })
  const [billingModalOpen, setBillingModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successData, setSuccessData] = useState<any | null>(null)

  // Expense logging form state
  const [expenseForm, setExpenseForm] = useState({
    fuel: 0,
    bata: 0,
    other: 0,
    remarks: '',
    vehicle: ''
  })
  const [expenseLoading, setExpenseLoading] = useState(false)
  
  // Driver statistics
  const [driverStats, setDriverStats] = useState<Record<string, { 
    collection: number, due: number, sales: number, mSales: number, mCollection: number 
  }>>({
    'b097b6a9-8395-4eb8-a720-3057e07662c1': { collection: 2500, due: 800, sales: 3300, mSales: 48000, mCollection: 42000 },
    'c097b6a9-8395-4eb8-a720-3057e07662c2': { collection: 0, due: 0, sales: 0, mSales: 0, mCollection: 0 }
  })

  // History tables
  const [dailySalesList, setDailySalesList] = useState<any[]>([])
  const [monthlySalesList, setMonthlySalesList] = useState<any[]>([])
  const [expensesList, setExpensesList] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    loadDriversAndRoutes()
  }, [])

  async function loadDriversAndRoutes() {
    try {
      const { data: dbDrivers } = await supabase.from('drivers').select('*').order('name')
      const { data: dbRoutes } = await supabase.from('routes').select('*').order('name')
      
      // Filter out any other drivers
      if (dbDrivers && dbDrivers.length > 0) {
        const filteredDrivers = dbDrivers.filter(d => 
          d.name.toLowerCase().includes('nagaraju') || d.name.toLowerCase().includes('mallaya')
        )
        setDrivers(filteredDrivers)
      }
      if (dbRoutes && dbRoutes.length > 0) setRoutes(dbRoutes)

      // Fetch sales to aggregate statistics
      const today = new Date().toISOString().split('T')[0]
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

      // Retrieve today sales
      const { data: todaySales } = await supabase
        .from('route_sales')
        .select('*')
        .eq('sale_date', today)

      // Retrieve month sales
      const { data: monthSales } = await supabase
        .from('route_sales')
        .select('*')
        .gte('sale_date', firstOfMonth)

      const statsMap = {
        'b097b6a9-8395-4eb8-a720-3057e07662c1': { collection: 2500, due: 800, sales: 3300, mSales: 48000, mCollection: 42000 },
        'c097b6a9-8395-4eb8-a720-3057e07662c2': { collection: 0, due: 0, sales: 0, mSales: 0, mCollection: 0 }
      } as any

      if (todaySales) {
        todaySales.forEach((s: any) => {
          const dId = s.driver_id || 'b097b6a9-8395-4eb8-a720-3057e07662c1'
          if (!statsMap[dId]) statsMap[dId] = { collection: 0, due: 0, sales: 0, mSales: 0, mCollection: 0 }
          
          const total = Number(s.total_amount) || 0
          const due = Number(s.due_amount) || 0
          const coll = (Number(s.cash_paid) || 0) + (Number(s.upi_paid) || 0)

          statsMap[dId].sales += total
          statsMap[dId].due += due
          statsMap[dId].collection += coll
        })
      }

      if (monthSales) {
        monthSales.forEach((s: any) => {
          const dId = s.driver_id || 'b097b6a9-8395-4eb8-a720-3057e07662c1'
          if (!statsMap[dId]) statsMap[dId] = { collection: 0, due: 0, sales: 0, mSales: 0, mCollection: 0 }
          
          const total = Number(s.total_amount) || 0
          const coll = (Number(s.cash_paid) || 0) + (Number(s.upi_paid) || 0)

          statsMap[dId].mSales += total
          statsMap[dId].mCollection += coll
        })
      }

      setDriverStats(statsMap)
    } catch (e) {
      console.error('Error fetching driver info:', e)
    }
  }

  // Load driver profile history
  async function loadProfileHistory(driverId: string) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

      // 1. Fetch Today Sales
      const { data: dSales } = await supabase
        .from('route_sales')
        .select('*')
        .eq('driver_id', driverId)
        .eq('sale_date', today)
      setDailySalesList(dSales || [])

      // 2. Fetch Monthly Sales
      const { data: mSales } = await supabase
        .from('route_sales')
        .select('*')
        .eq('driver_id', driverId)
        .gte('sale_date', firstOfMonth)
      setMonthlySalesList(mSales || [])

      // 3. Fetch Expenses
      const { data: exp } = await supabase
        .from('route_expenses')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
      setExpensesList(exp || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleDriverSelect = (driver: any) => {
    setSelectedDriver(driver)
    loadProfileHistory(driver.id)
    setCurrentView('profile')
    setActiveTab('local')
  }

  const handleRouteSelect = async (route: any) => {
    setSelectedRoute(route)
    try {
      const { data: dbCustomers } = await supabase
        .from('route_customers')
        .select('*')
        .eq('route_id', route.id)

      if (dbCustomers && dbCustomers.length > 0) {
        const customersWithState = dbCustomers.map(c => ({
          ...c,
          due_amount: c.default_qty * c.default_rate,
          cash_paid: 0,
          upi_paid: 0,
          qty_entered: c.default_qty,
          rate_entered: c.default_rate
        }))
        setCustomers(customersWithState)
      } else {
        const defaultList = FALLBACK_CUSTOMERS[route.id] || FALLBACK_CUSTOMERS['a1111111-1111-1111-1111-111111111111']
        const mapped = defaultList.map((c, i) => ({
          id: `temp-${route.id}-${i}`,
          name: c.name,
          section: c.section,
          default_qty: c.default_qty,
          default_rate: c.default_rate,
          product_name: c.product_name,
          qty_entered: c.default_qty,
          rate_entered: c.default_rate,
          due_amount: c.default_qty * c.default_rate,
          cash_paid: 0,
          upi_paid: 0
        }))
        setCustomers(mapped)
      }
    } catch (e) {
      console.error(e)
    }
    setCurrentView('categories')
  }

  const handleCategorySelect = (category: 'cans' | 'bags' | 'bottles') => {
    setSelectedCategory(category)
    setCurrentView('customers')
  }

  const openBillingModal = (customer: any) => {
    setBillingCustomer(customer)
    setBillingForm({
      qty: customer.qty_entered || customer.default_qty || 1,
      rate: customer.rate_entered || customer.default_rate || 15.00,
      cash: customer.cash_paid || 0,
      upi: customer.upi_paid || 0,
      product_name: customer.product_name || 'Water Can (20L)'
    })
    setBillingModalOpen(true)
  }

  const updateBillingForm = (field: string, val: any) => {
    setBillingForm(prev => ({
      ...prev,
      [field]: val
    }))
  }

  const handleSaveSale = async () => {
    if (!billingCustomer) return
    setSubmitting(true)

    const total = billingForm.qty * billingForm.rate
    const due = total - (Number(billingForm.cash) || 0) - (Number(billingForm.upi) || 0)
    const invoiceNumber = `RK-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`

    const updatedCustomers = customers.map(c => {
      if (c.id === billingCustomer.id) {
        return {
          ...c,
          qty_entered: billingForm.qty,
          rate_entered: billingForm.rate,
          cash_paid: Number(billingForm.cash) || 0,
          upi_paid: Number(billingForm.upi) || 0,
          due_amount: due > 0 ? due : 0
        }
      }
      return c
    })
    setCustomers(updatedCustomers)

    const routeSalesPayload = {
      invoice_number: invoiceNumber,
      driver_id: selectedDriver.id,
      route_id: selectedRoute?.id || null,
      customer_name: billingCustomer.name,
      product_name: billingForm.product_name,
      quantity: billingForm.qty,
      rate: billingForm.rate,
      total_amount: total,
      cash_paid: Number(billingForm.cash) || 0,
      upi_paid: Number(billingForm.upi) || 0,
      due_amount: due > 0 ? due : 0
    }

    try {
      const { error: routeSalesErr } = await supabase
        .from('route_sales')
        .insert(routeSalesPayload)

      if (routeSalesErr) {
        console.error('Failed to save route sale:', routeSalesErr.message)
      }

      setSuccessData({
        invoiceNumber,
        customerName: billingCustomer.name,
        productName: billingForm.product_name,
        qty: billingForm.qty,
        rate: billingForm.rate,
        total,
        cash: Number(billingForm.cash) || 0,
        upi: Number(billingForm.upi) || 0,
        due: due > 0 ? due : 0,
        driverName: selectedDriver.name,
        routeName: selectedRoute?.name || 'Local Route'
      })

      setBillingModalOpen(false)
      loadDriversAndRoutes()
      loadProfileHistory(selectedDriver.id)
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle trip expense logging
  const handleSaveExpense = async () => {
    if (!selectedDriver) return
    setExpenseLoading(true)
    
    try {
      const { error } = await supabase.from('route_expenses').insert({
        route_id: selectedRoute?.id || null,
        driver_id: selectedDriver.id,
        fuel_charges: Number(expenseForm.fuel) || 0,
        driver_bata: Number(expenseForm.bata) || 0,
        other_expenses: Number(expenseForm.other) || 0,
        remarks: expenseForm.remarks,
        vehicle_number: expenseForm.vehicle
      })

      if (!error) {
        setExpenseForm({ fuel: 0, bata: 0, other: 0, remarks: '', vehicle: '' })
        loadProfileHistory(selectedDriver.id)
        alert('🎉 Trip Expense Saved Successfully!')
      } else {
        alert('Failed to save expense: ' + error.message)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setExpenseLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Filter routes for driver
  const driverRoutes = routes.filter(r => r.driver_id === selectedDriver?.id || r.driver_id === null)
  const localRoutes = driverRoutes.filter(r => r.name.toLowerCase().includes('local'))
  const nonLocalRoutes = driverRoutes.filter(r => !r.name.toLowerCase().includes('local'))

  return (
    <div style={{ padding: '0.25rem' }}>
      
      {/* MONOSPACE BLUETOOTH THERMAL PRINTER OVERLAY (PRINT-ONLY CLASS) */}
      {successData && (
        <div id="print-area" style={{ display: 'none', backgroundColor: '#fff', color: '#000', padding: '1rem', fontFamily: 'monospace', fontSize: '12px' }}>
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 'bold' }}>ROYAL KISSAN DRINKING WATER</h3>
            <p style={{ margin: '0 0 2px' }}>Guntur Highway Road, Guntur</p>
            <p style={{ margin: '0 0 8px' }}>Phone: 9876543210</p>
            <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '3px 0', fontWeight: 'bold' }}>
              RECEIPT / BILL TICKET
            </div>
          </div>

          <table style={{ width: '100%', marginBottom: '10px', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td><strong>Invoice:</strong> {successData.invoiceNumber}</td>
                <td style={{ textAlign: 'right' }}><strong>Date:</strong> {new Date().toLocaleDateString('en-IN')}</td>
              </tr>
              <tr>
                <td><strong>Driver:</strong> {successData.driverName}</td>
                <td style={{ textAlign: 'right' }}><strong>Route:</strong> {successData.routeName}</td>
              </tr>
              <tr>
                <td colSpan={2}><strong>Customer:</strong> {successData.customerName}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ borderBottom: '1px dashed #000', marginBottom: '5px' }}></div>
          
          <table style={{ width: '100%', fontSize: '11px', marginBottom: '8px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <th style={{ textAlign: 'left' }}>Item description</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{successData.productName}</td>
                <td style={{ textAlign: 'center' }}>{successData.qty}</td>
                <td style={{ textAlign: 'right' }}>₹{successData.total.toFixed(0)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #000', paddingTop: '5px', textAlign: 'right', fontSize: '11px' }}>
            <p style={{ margin: '2px 0' }}><strong>Subtotal:</strong> ₹{successData.total.toFixed(0)}</p>
            <p style={{ margin: '2px 0' }}><strong>Received (Cash):</strong> ₹{successData.cash.toFixed(0)}</p>
            <p style={{ margin: '2px 0' }}><strong>Received (UPI):</strong> ₹{successData.upi.toFixed(0)}</p>
            <p style={{ margin: '2px 0', fontWeight: 'bold' }}><strong>Remaining Due:</strong> ₹{successData.due.toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* SUCCESS TICKET POPUP WINDOW FOR APP UI */}
      {successData && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 999 }}>
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ color: '#34d399', fontWeight: 'bold', margin: 0 }}>🎉 Invoice Saved</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSuccessData(null)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem', color: '#fff' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '3rem' }}>🧾</span>
                <h4 style={{ margin: '0.5rem 0 0.25rem', fontWeight: '700' }}>Bill Generated</h4>
                <p style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Invoice #: {successData.invoiceNumber}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.875rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'hsl(215 20% 55%)' }}>Customer:</span>
                  <span style={{ fontWeight: '700' }}>{successData.customerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'hsl(215 20% 55%)' }}>Product:</span>
                  <span>{successData.productName} ({successData.qty} units)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ color: 'hsl(215 20% 55%)' }}>Total Amount:</span>
                  <span style={{ fontWeight: '700' }}>₹{successData.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                  <span>Paid:</span>
                  <span>₹{successData.cash + successData.upi}</span>
                </div>
                {successData.due > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
                    <span>Outstanding Due:</span>
                    <span style={{ fontWeight: '800' }}>₹{successData.due}</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button className="btn btn-ghost" onClick={() => setSuccessData(null)}>Close</button>
              <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print Receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BAR & BREADCRUMBS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        {currentView !== 'drivers' && (
          <button
            onClick={() => {
              if (currentView === 'profile') setCurrentView('drivers')
              else if (currentView === 'categories') setCurrentView('profile')
              else if (currentView === 'customers') setCurrentView('categories')
            }}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'hsl(215 20% 65%)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
          >
            ←
          </button>
        )}
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
            {currentView === 'drivers' && '🚚 Driver Route Sales Portal'}
            {currentView === 'profile' && `🚛 Driver Profile: ${selectedDriver?.name}`}
            {currentView === 'categories' && `🗺️ Category Selector: ${selectedRoute?.name}`}
            {currentView === 'customers' && `👥 Route Billing Sheet: ${selectedCategory?.toUpperCase()}`}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'hsl(215 20% 55%)', marginTop: '0.25rem' }}>
            {currentView === 'drivers' && 'Select active driver to run invoice dispatch sheet'}
            {currentView === 'profile' && 'Review routes, collection sheets, sales records, and log expenses'}
            {currentView === 'categories' && 'Select product type to log sales'}
            {currentView === 'customers' && `Record dues and log customer sales for ${selectedRoute?.name}`}
          </p>
        </div>
      </div>

      {/* VIEW 1: ONLY 2 DRIVER SELECTION CARDS */}
      {currentView === 'drivers' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
          maxWidth: '850px',
          margin: '0 auto',
          padding: '1rem 0'
        }}>
          {drivers.map(d => {
            const stats = driverStats[d.id] || { collection: 0, due: 0, sales: 0, mSales: 0, mCollection: 0 }
            
            return (
              <div
                key={d.id}
                onClick={() => handleDriverSelect(d)}
                className="glass-card-3d"
                style={{
                  padding: '2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(199 89% 48%))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    boxShadow: '0 8px 20px rgba(59,130,246,0.3)'
                  }}>
                    👤
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                      {d.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span className="badge badge-success">Active</span>
                      {d.phone && <span style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>{d.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* Today Stats */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'hsl(215 20% 60%)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Today's Performance</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', fontWeight: '600' }}>Sales</div>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>
                        ₹{stats.sales.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', fontWeight: '600' }}>Collected</div>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>
                        ₹{stats.collection.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', fontWeight: '600' }}>Due</div>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: stats.due > 0 ? '#f87171' : 'hsl(215 20% 55%)', marginTop: '0.25rem' }}>
                        ₹{stats.due.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Stats */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'hsl(215 20% 60%)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Monthly Performance</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 55%)' }}>Month Sales</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#60a5fa', marginTop: '0.125rem' }}>
                        ₹{stats.mSales.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 55%)' }}>Month Collection</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399', marginTop: '0.125rem' }}>
                        ₹{stats.mCollection.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.8125rem', color: 'hsl(215 20% 45%)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                  <span>Salary: ₹{(d.salary || 10000).toLocaleString('en-IN')}/mo</span>
                  <span style={{ color: '#3b82f6', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Open Profile <span>→</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* VIEW 2: DRIVER PROFILE WITH 7 PREMIUM TABS */}
      {currentView === 'profile' && selectedDriver && (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }} className="animate-fade-in">
          
          {/* Driver Stats summary strip */}
          <div className="glass-card-3d" style={{ padding: '1.25rem 2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '2rem' }}>🚛</span>
              <div>
                <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem', color: '#fff' }}>{selectedDriver.name}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Active Duty Driver Profile</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase' }}>Today Sales</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>₹{(driverStats[selectedDriver.id]?.sales || 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase' }}>Today Collection</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399' }}>₹{(driverStats[selectedDriver.id]?.collection || 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase' }}>Salary</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#60a5fa' }}>₹{(selectedDriver.salary || 10000).toLocaleString('en-IN')}/mo</div>
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            overflowX: 'auto', 
            paddingBottom: '0.75rem', 
            marginBottom: '1.5rem', 
            borderBottom: '1px solid rgba(255,255,255,0.06)' 
          }}>
            {[
              { id: 'local', label: 'Local Routes', icon: '🗺️' },
              { id: 'non-local', label: 'Non Local Routes', icon: '🛣️' },
              { id: 'collections', label: 'Collections', icon: '💰' },
              { id: 'dues', label: 'Due Reports', icon: '🔴' },
              { id: 'daily', label: 'Daily Sales', icon: '📅' },
              { id: 'monthly', label: 'Monthly Sales', icon: '📈' },
              { id: 'expenses', label: 'Expenses', icon: '💸' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={activeTab === tab.id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                style={{ borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: '700' }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: LOCAL ROUTES */}
          {activeTab === 'local' && (
            <div className="glass-card-3d" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>Select Local Route Sheet</h3>
              {localRoutes.length === 0 ? (
                <p style={{ color: 'hsl(215 20% 55%)' }}>No local routes configured for this driver.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {localRoutes.map(r => (
                    <div
                      key={r.id}
                      onClick={() => handleRouteSelect(r)}
                      style={{
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'}
                      onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                    >
                      <h4 style={{ margin: 0, fontWeight: '800', color: '#fff' }}>{r.name}</h4>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Area: {r.area || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NON LOCAL ROUTES */}
          {activeTab === 'non-local' && (
            <div className="glass-card-3d" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>Select Highway Route Sheet</h3>
              {nonLocalRoutes.length === 0 ? (
                <p style={{ color: 'hsl(215 20% 55%)' }}>No non-local routes configured.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {nonLocalRoutes.map(r => (
                    <div
                      key={r.id}
                      onClick={() => handleRouteSelect(r)}
                      style={{
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.borderColor = '#fbbf24'}
                      onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                    >
                      <h4 style={{ margin: 0, fontWeight: '800', color: '#fff' }}>{r.name}</h4>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Area: {r.area || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COLLECTIONS */}
          {activeTab === 'collections' && (
            <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
              <div className="card-header"><h3 className="card-title">💰 Today's Collections Log</h3></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Cash Received</th>
                      <th style={{ textAlign: 'right' }}>UPI Received</th>
                      <th style={{ textAlign: 'right' }}>Outstanding Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySalesList.filter(s => (s.cash_paid > 0 || s.upi_paid > 0)).map((s, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600', color: '#fff' }}>{s.customer_name}</td>
                        <td>{s.product_name}</td>
                        <td style={{ textAlign: 'center' }}>{s.quantity}</td>
                        <td style={{ textAlign: 'right', color: '#34d399' }}>₹{s.cash_paid}</td>
                        <td style={{ textAlign: 'right', color: '#34d399' }}>₹{s.upi_paid}</td>
                        <td style={{ textAlign: 'right', color: s.due_amount > 0 ? '#f87171' : 'inherit' }}>₹{s.due_amount}</td>
                      </tr>
                    ))}
                    {dailySalesList.filter(s => (s.cash_paid > 0 || s.upi_paid > 0)).length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'hsl(215 20% 45%)' }}>
                          No collections registered today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DUE REPORTS */}
          {activeTab === 'dues' && (
            <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
              <div className="card-header"><h3 className="card-title">🔴 Pending Route Dues</h3></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Route Name</th>
                      <th style={{ textAlign: 'right' }}>Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.filter(c => c.due_amount > 0).map((c, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '700', color: '#fff' }}>{c.name}</td>
                        <td>{selectedRoute?.name || 'Local Route'}</td>
                        <td style={{ textAlign: 'right', color: '#f87171', fontWeight: '800' }}>₹{c.due_amount}</td>
                      </tr>
                    ))}
                    {customers.filter(c => c.due_amount > 0).length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'hsl(215 20% 45%)' }}>
                          No outstanding customer dues for active route.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: DAILY SALES */}
          {activeTab === 'daily' && (
            <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
              <div className="card-header"><h3 className="card-title">📅 Today's Sales Activity</h3></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Customer Name</th>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Rate</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySalesList.map((s, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'monospace', color: '#3b82f6', fontWeight: '600' }}>{s.invoice_number}</td>
                        <td style={{ fontWeight: '600', color: '#fff' }}>{s.customer_name}</td>
                        <td>{s.product_name}</td>
                        <td style={{ textAlign: 'center' }}>{s.quantity}</td>
                        <td style={{ textAlign: 'right' }}>₹{s.rate}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{s.total_amount}</td>
                      </tr>
                    ))}
                    {dailySalesList.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'hsl(215 20% 45%)' }}>
                          No sales registered today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: MONTHLY SALES */}
          {activeTab === 'monthly' && (
            <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
              <div className="card-header"><h3 className="card-title">📈 Monthly Consolidated Sales Log</h3></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Date</th>
                      <th>Customer Name</th>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySalesList.map((s, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{s.invoice_number}</td>
                        <td>{s.sale_date}</td>
                        <td style={{ fontWeight: '600', color: '#fff' }}>{s.customer_name}</td>
                        <td>{s.product_name}</td>
                        <td style={{ textAlign: 'center' }}>{s.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{s.total_amount}</td>
                      </tr>
                    ))}
                    {monthlySalesList.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'hsl(215 20% 45%)' }}>
                          No sales registered in current month.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: EXPENSES */}
          {activeTab === 'expenses' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              {/* Trip expense logger form */}
              <div className="glass-card-3d" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>Log Route Trip Expense</h3>
                
                <div className="form-group">
                  <label className="form-label">Vehicle Number *</label>
                  <input className="form-input" placeholder="e.g. AP-07-TY-1234" value={expenseForm.vehicle} onChange={e => setExpenseForm({...expenseForm, vehicle: e.target.value})} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Fuel Charges (₹)</label>
                    <input type="number" className="form-input" placeholder="0" value={expenseForm.fuel || ''} onChange={e => setExpenseForm({...expenseForm, fuel: Math.max(0, Number(e.target.value))})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Driver Bata (₹)</label>
                    <input type="number" className="form-input" placeholder="0" value={expenseForm.bata || ''} onChange={e => setExpenseForm({...expenseForm, bata: Math.max(0, Number(e.target.value))})} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Other Trip Expenses (₹)</label>
                  <input type="number" className="form-input" placeholder="0" value={expenseForm.other || ''} onChange={e => setExpenseForm({...expenseForm, other: Math.max(0, Number(e.target.value))})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks / Description</label>
                  <textarea className="form-input" rows={2} placeholder="Trip remarks" value={expenseForm.remarks} onChange={e => setExpenseForm({...expenseForm, remarks: e.target.value})} style={{ resize: 'none' }} />
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '0.5rem' }} 
                  onClick={handleSaveExpense}
                  disabled={expenseLoading || !expenseForm.vehicle}
                >
                  {expenseLoading ? 'Saving...' : '💾 Log Trip Expense'}
                </button>
              </div>

              {/* History list */}
              <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
                <div className="card-header"><h3 className="card-title">💸 Historical Trip Expenses</h3></div>
                <div style={{ overflowY: 'auto', maxHeight: '420px' }}>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Vehicle</th>
                        <th style={{ textAlign: 'right' }}>Fuel</th>
                        <th style={{ textAlign: 'right' }}>Bata</th>
                        <th style={{ textAlign: 'right' }}>Other</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesList.map((x, idx) => (
                        <tr key={idx}>
                          <td>{x.expense_date || x.created_at?.split('T')[0]}</td>
                          <td style={{ fontWeight: '600' }}>{x.vehicle_number || '—'}</td>
                          <td style={{ textAlign: 'right' }}>₹{x.fuel_charges}</td>
                          <td style={{ textAlign: 'right' }}>₹{x.driver_bata}</td>
                          <td style={{ textAlign: 'right' }}>₹{x.other_expenses}</td>
                        </tr>
                      ))}
                      {expensesList.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'hsl(215 20% 45%)' }}>
                            No trip expenses logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* VIEW 3: CATEGORY SELECTOR FOR INVOICING */}
      {currentView === 'categories' && selectedRoute && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }} className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', padding: '1rem 0' }}>
            
            {/* Cans */}
            <div
              onClick={() => handleCategorySelect('cans')}
              className="glass-card-3d"
              style={{
                padding: '2rem 1.5rem',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, hsl(199 89% 15% / 0.5) 0%, rgba(10, 18, 36, 0.45) 100%)',
                borderColor: 'rgba(6, 182, 212, 0.2)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                💧
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', marginTop: '1.5rem' }}>Water Cans</h3>
              <p style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', margin: '0.25rem 0 0' }}>20L Cans & dispensers delivery</p>
            </div>

            {/* Bags */}
            <div
              onClick={() => handleCategorySelect('bags')}
              className="glass-card-3d"
              style={{
                padding: '2rem 1.5rem',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, hsl(270 75% 15% / 0.5) 0%, rgba(10, 18, 36, 0.45) 100%)',
                borderColor: 'rgba(168, 85, 247, 0.2)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                🛍️
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', marginTop: '1.5rem' }}>Water Bags</h3>
              <p style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', margin: '0.25rem 0 0' }}>Poly-bag pack crates distribution</p>
            </div>

            {/* Bottles */}
            <div
              onClick={() => handleCategorySelect('bottles')}
              className="glass-card-3d"
              style={{
                padding: '2rem 1.5rem',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, hsl(340 82% 15% / 0.5) 0%, rgba(10, 18, 36, 0.45) 100%)',
                borderColor: 'rgba(236, 72, 153, 0.2)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                🍾
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', marginTop: '1.5rem' }}>Water Bottles</h3>
              <p style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', margin: '0.25rem 0 0' }}>500ml & 1L Case supply</p>
            </div>

          </div>
        </div>
      )}

      {/* VIEW 4: CUSTOMER GRID SELECTOR */}
      {currentView === 'customers' && (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }} className="animate-fade-in">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            paddingBottom: '2rem'
          }}>
            {customers
              .filter(c => c.section === selectedCategory)
              .map(c => {
                const totalAmount = c.qty_entered * c.rate_entered
                const remainingDue = Math.max(0, totalAmount - c.cash_paid - c.upi_paid)
                const isFullyPaid = remainingDue === 0 && totalAmount > 0
                
                return (
                  <div
                    key={c.id}
                    className="glass-card-3d"
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                        {c.name}
                      </h4>
                      <div>
                        {remainingDue > 0 ? (
                          <span className="badge badge-danger">Due: ₹{remainingDue}</span>
                        ) : isFullyPaid ? (
                          <span className="badge badge-success">Paid</span>
                        ) : (
                          <span className="badge badge-muted">Unbilled</span>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: 'hsl(215 20% 55%)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <div>Rate: ₹{c.rate_entered} • Base Qty: {c.default_qty || 'Manual'}</div>
                      <div style={{ marginTop: '0.25rem' }}>Product: {c.product_name}</div>
                    </div>

                    {totalAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'hsl(215 20% 45%)' }}>
                        <span>Qty: {c.qty_entered}</span>
                        <span>Cash: ₹{c.cash_paid} • UPI: ₹{c.upi_paid}</span>
                      </div>
                    )}

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{
                        marginTop: 'auto',
                        width: '100%',
                        fontWeight: '700'
                      }}
                      onClick={() => openBillingModal(c)}
                    >
                      🧾 {totalAmount > 0 ? 'Edit / Print Bill' : 'Create Bill'}
                    </button>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* FLOATING BILLING MODAL SHEET */}
      {billingModalOpen && billingCustomer && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                🧾 Register Route Sale
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setBillingModalOpen(false)}>✕</button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input className="form-input" style={{ background: 'rgba(255,255,255,0.02)', color: 'hsl(215 20% 55%)' }} value={billingCustomer.name} readOnly />
              </div>

              <div className="form-group">
                <label className="form-label">Product</label>
                <select
                  className="form-input"
                  value={billingForm.product_name}
                  onChange={e => updateBillingForm('product_name', e.target.value)}
                >
                  <option value="Water Can (20L)">Water Can (20L)</option>
                  <option value="Cooling Can (20L)">Cooling Can (20L)</option>
                  <option value="Bags (100 Pack)">Bags (100 Pack)</option>
                  <option value="500ml Bottle Case">500ml Bottle Case</option>
                  <option value="1L Bottle Case">1L Bottle Case</option>
                  <option value="2L Bottle Case">2L Bottle Case</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    className="form-input"
                    value={billingForm.qty}
                    onChange={e => updateBillingForm('qty', Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rate (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={billingForm.rate}
                    onChange={e => updateBillingForm('rate', Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Cash Paid (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={billingForm.cash || ''}
                    onChange={e => updateBillingForm('cash', Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">UPI Paid (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={billingForm.upi || ''}
                    onChange={e => updateBillingForm('upi', Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem'
              }}>
                <div>
                  <span style={{ color: 'hsl(215 20% 55%)' }}>Total Amount:</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>
                    ₹{billingForm.qty * billingForm.rate}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'hsl(215 20% 55%)' }}>Outstanding Due:</span>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '800',
                    color: (billingForm.qty * billingForm.rate - billingForm.cash - billingForm.upi) > 0 ? '#f87171' : '#34d399',
                    marginTop: '0.25rem'
                  }}>
                    ₹{Math.max(0, billingForm.qty * billingForm.rate - billingForm.cash - billingForm.upi)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                <button className="btn btn-ghost" onClick={() => setBillingModalOpen(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  style={{ minWidth: '160px' }}
                  onClick={handleSaveSale}
                  disabled={submitting || billingForm.qty <= 0}
                >
                  {submitting ? 'Saving...' : '💾 Save & Print'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
