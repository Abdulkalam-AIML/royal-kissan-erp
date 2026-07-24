'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Fallback preseeded data for drivers
const FALLBACK_DRIVERS = [
  { id: 'b097b6a9-8395-4eb8-a720-3057e07662c1', name: 'Nagaraju', phone: '8184918757', salary: 12000, is_active: true },
  { id: '70c293e7-bae8-4de2-a505-edccfd35f761', name: 'Driver-2', phone: '9999988888', salary: 14000, is_active: true }
]

const FALLBACK_ROUTES = [
  { id: 'a1111111-1111-1111-1111-111111111111', name: 'Local Route', driver_id: 'b097b6a9-8395-4eb8-a720-3057e07662c1', area: 'Local Area' },
  { id: 'a2222222-2222-2222-2222-222222222222', name: 'Raghavapuram Route', driver_id: '70c293e7-bae8-4de2-a505-edccfd35f761', area: 'Raghavapuram' },
  { id: 'a3333333-3333-3333-3333-333333333333', name: 'Mukkinavarigudem Route', driver_id: '70c293e7-bae8-4de2-a505-edccfd35f761', area: 'Mukkinavarigudem' },
  { id: 'a4444444-4444-4444-4444-444444444444', name: 'Dammapeta Route', driver_id: '70c293e7-bae8-4de2-a505-edccfd35f761', area: 'Dammapeta' }
]

const FALLBACK_CUSTOMERS: Record<string, Array<{ name: string; section: 'cans' | 'bags' | 'bottles'; default_qty: number; default_rate: number; product_name: string }>> = {
  // LOCAL ROUTE
  'a1111111-1111-1111-1111-111111111111': [
    { name: 'Bismillah Daba', section: 'cans', default_qty: 10, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Vamsi Mess', section: 'cans', default_qty: 10, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Lithu', section: 'cans', default_qty: 5, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Tiffin Center-1', section: 'cans', default_qty: 4, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Tea Stall', section: 'cans', default_qty: 5, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Juice Point', section: 'cans', default_qty: 10, default_rate: 15.00, product_name: 'Water Can (20L)' },
    { name: 'Surendra Juice Point', section: 'cans', default_qty: 10, default_rate: 20.00, product_name: 'Water Can (20L)' },
    { name: 'House Point 1', section: 'cans', default_qty: 1, default_rate: 30.00, product_name: 'Water Can (20L)' },
    { name: 'House Point 2', section: 'cans', default_qty: 1, default_rate: 30.00, product_name: 'Water Can (20L)' },
    { name: 'House Point 3', section: 'cans', default_qty: 1, default_rate: 30.00, product_name: 'Water Can (20L)' },
    { name: 'House Point 4', section: 'cans', default_qty: 1, default_rate: 30.00, product_name: 'Water Can (20L)' },
    { name: 'House Point 5', section: 'cans', default_qty: 1, default_rate: 30.00, product_name: 'Water Can (20L)' },
    { name: 'SBI', section: 'cans', default_qty: 1, default_rate: 0, product_name: 'Water Can (20L)' },
    { name: 'Fire Station', section: 'cans', default_qty: 1, default_rate: 0, product_name: 'Water Can (20L)' },
    { name: 'Amaravati Wines', section: 'bags', default_qty: 5, default_rate: 75.00, product_name: 'Bags (100 Pack)' },
    { name: 'Balaji Wines', section: 'bags', default_qty: 5, default_rate: 80.00, product_name: 'Bags (100 Pack)' },
    { name: 'Shop 1', section: 'bags', default_qty: 5, default_rate: 100.00, product_name: 'Bags (100 Pack)' },
    { name: 'Bala Sundari Shop', section: 'bags', default_qty: 5, default_rate: 95.00, product_name: 'Bags (100 Pack)' },
    { name: 'Shop 2', section: 'bags', default_qty: 5, default_rate: 90.00, product_name: 'Bags (100 Pack)' },
    { name: 'Shop 3', section: 'bags', default_qty: 5, default_rate: 90.00, product_name: 'Bags (100 Pack)' },
    { name: 'Shop 4', section: 'bags', default_qty: 5, default_rate: 90.00, product_name: 'Bags (100 Pack)' },
    { name: 'Route Sale', section: 'bags', default_qty: 10, default_rate: 100.00, product_name: 'Bags (100 Pack)' },
    { name: 'Healthy Plate', section: 'bottles', default_qty: 5, default_rate: 140.00, product_name: '500ml Bottle Case' },
    { name: 'Bismillah Daba', section: 'bottles', default_qty: 5, default_rate: 145.00, product_name: '500ml Bottle Case' },
    { name: 'Bismillah Daba', section: 'bottles', default_qty: 5, default_rate: 130.00, product_name: '1L Bottle Case' },
    { name: 'Tiffin Shop', section: 'bottles', default_qty: 5, default_rate: 145.00, product_name: '500ml Bottle Case' },
    { name: 'Tiffin Shop', section: 'bottles', default_qty: 5, default_rate: 130.00, product_name: '1L Bottle Case' },
    { name: 'Bottle Shop 1', section: 'bottles', default_qty: 5, default_rate: 140.00, product_name: '500ml Bottle Case' },
    { name: 'Bottle Shop 4', section: 'bottles', default_qty: 5, default_rate: 150.00, product_name: '500ml Bottle Case' },
    { name: 'Bottle Shop 4', section: 'bottles', default_qty: 5, default_rate: 135.00, product_name: '1L Bottle Case' }
  ],
  // RAGHAVAPURAM ROUTE
  'a2222222-2222-2222-2222-222222222222': [
    { name: 'Raghavapuram Wines', section: 'bags', default_qty: 10, default_rate: 80.00, product_name: 'Bags (100 Pack)' },
    { name: 'Gandicherla', section: 'bags', default_qty: 8, default_rate: 90.00, product_name: 'Bags (100 Pack)' },
    { name: 'DN Rao Peta', section: 'bags', default_qty: 8, default_rate: 90.00, product_name: 'Bags (100 Pack)' },
    { name: 'Route Sale-1', section: 'bags', default_qty: 10, default_rate: 100.00, product_name: 'Bags (100 Pack)' },
    { name: 'Route Sale-2', section: 'bags', default_qty: 10, default_rate: 90.00, product_name: 'Bags (100 Pack)' },
    { name: 'Raghavapuram Can Customer', section: 'cans', default_qty: 5, default_rate: 30.00, product_name: 'Water Can (20L)' },
    { name: 'Raghavapuram Bottle', section: 'bottles', default_qty: 5, default_rate: 120.00, product_name: '1L Bottle Case' },
    { name: 'Raghavapuram Bottle', section: 'bottles', default_qty: 5, default_rate: 140.00, product_name: '500ml Bottle Case' }
  ],
  // MAKKINAVARIGUDEM ROUTE
  'a3333333-3333-3333-3333-333333333333': [
    { name: 'Wine Shop', section: 'bags', default_qty: 10, default_rate: 75.00, product_name: 'Bags (100 Pack)' },
    { name: 'Aunty Shop', section: 'bags', default_qty: 10, default_rate: 80.00, product_name: 'Bags (100 Pack)' },
    { name: 'Wine Shop', section: 'bottles', default_qty: 5, default_rate: 110.00, product_name: '1L Bottle Case' },
    { name: 'Aunty Shop', section: 'bottles', default_qty: 5, default_rate: 120.00, product_name: '1L Bottle Case' }
  ],
  // DAMMAPETA ROUTE
  'a4444444-4444-4444-4444-444444444444': [
    { name: 'Wine Shop 1', section: 'bags', default_qty: 10, default_rate: 75.00, product_name: 'Bags (100 Pack)' },
    { name: 'Wine Shop 2', section: 'bags', default_qty: 10, default_rate: 80.00, product_name: 'Bags (100 Pack)' },
    { name: 'Wine Shop 3', section: 'bags', default_qty: 10, default_rate: 75.00, product_name: 'Bags (100 Pack)' }
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
    '70c293e7-bae8-4de2-a505-edccfd35f761': { collection: 0, due: 0, sales: 0, mSales: 0, mCollection: 0 }
  })

  // History tables
  const [dailySalesList, setDailySalesList] = useState<any[]>([])
  const [monthlySalesList, setMonthlySalesList] = useState<any[]>([])
  const [expensesList, setExpensesList] = useState<any[]>([])

  // =========================================================================
  // NEW DRIVER WORKFLOW STATE: Daily Assignments, Dispatches, and Route Runs
  // =========================================================================
  const [dailyAssignment, setDailyAssignment] = useState<any | null>(null)
  const [assignRouteId, setAssignRouteId] = useState<string>('')
  const [assignVehicle, setAssignVehicle] = useState<string>('AP 16 AB 1234')
  const [assigning, setAssigning] = useState<boolean>(false)

  const [dispatchItems, setDispatchItems] = useState<Record<string, number>>({
    'Water Can (20L)': 50,
    'Cooling Can (20L)': 20,
    'Bags (100 Pack)': 30,
    '500ml Bottle Case': 15,
    '1L Bottle Case': 15,
    '2L Bottle Case': 5
  })
  const [activeDispatch, setActiveDispatch] = useState<any | null>(null)
  const [savingDispatch, setSavingDispatch] = useState<boolean>(false)
  const [showDispatchForm, setShowDispatchForm] = useState<boolean>(false)
  const [savingRouteRun, setSavingRouteRun] = useState<boolean>(false)

  const supabase = createClient()

  useEffect(() => {
    loadDriversAndRoutes()
  }, [])

  async function loadDriversAndRoutes() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

      // PARALLEL QUERY FETCHING (PROMISE.ALL FOR ZERO WATERFALL LATENCY)
      const [driversRes, routesRes, todaySalesRes, monthSalesRes] = await Promise.all([
        supabase.from('drivers').select('id, name, phone, salary, is_active').order('name'),
        supabase.from('routes').select('id, name, driver_id, area').order('name'),
        supabase.from('route_sales').select('driver_id, total_amount, cash_paid, upi_paid, due_amount').eq('sale_date', today),
        supabase.from('route_sales').select('driver_id, total_amount, cash_paid, upi_paid, due_amount').gte('sale_date', firstOfMonth)
      ])

      const dbDrivers = driversRes.data
      const dbRoutes = routesRes.data
      const todaySales = todaySalesRes.data
      const monthSales = monthSalesRes.data
      
      if (dbDrivers && dbDrivers.length > 0) {
        const filteredDrivers = dbDrivers.filter(d => 
          d.name.toLowerCase().includes('nagaraju') || d.name.toLowerCase().includes('driver-2')
        )
        setDrivers(filteredDrivers)
      }
      if (dbRoutes && dbRoutes.length > 0) setRoutes(dbRoutes)

      const statsMap = {
        'b097b6a9-8395-4eb8-a720-3057e07662c1': { collection: 2500, due: 800, sales: 3300, mSales: 48000, mCollection: 42000 },
        '70c293e7-bae8-4de2-a505-edccfd35f761': { collection: 0, due: 0, sales: 0, mSales: 0, mCollection: 0 }
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

  // Load persistent customer stop registry from route_customers table
  async function loadRouteCustomers(routeId: string) {
    try {
      const { data: dbCustomers } = await supabase
        .from('route_customers')
        .select('*')
        .eq('route_id', routeId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (dbCustomers && dbCustomers.length > 0) {
        const mapped = dbCustomers.map(c => ({
          id: c.id,
          name: c.customer_name,
          section: c.section || 'cans',
          default_qty: Number(c.default_quantity) || 1,
          default_rate: Number(c.default_rate) || 0,
          product_name: c.default_product || (c.section === 'bags' ? 'Bags (100 Pack)' : c.section === 'bottles' ? '500ml Bottle Case' : 'Water Can (20L)'),
          qty_entered: Number(c.default_quantity) || 1,
          rate_entered: Number(c.default_rate) || 0, // AUTO-POPULATED DEFAULT RATE
          cash_paid: 0,
          upi_paid: 0,
          returned_qty: 0,
          leaked_qty: 0,
          due_amount: (Number(c.default_quantity) || 1) * (Number(c.default_rate) || 0)
        }))
        setCustomers(mapped)
      } else {
        const defaultList = FALLBACK_CUSTOMERS[routeId] || FALLBACK_CUSTOMERS['a1111111-1111-1111-1111-111111111111']
        const mapped = defaultList.map((c, i) => ({
          id: `temp-${routeId}-${i}`,
          name: c.name,
          section: c.section,
          default_qty: c.default_qty,
          default_rate: c.default_rate,
          product_name: c.product_name,
          qty_entered: c.default_qty,
          rate_entered: c.default_rate,
          due_amount: c.default_qty * c.default_rate,
          cash_paid: 0,
          upi_paid: 0,
          returned_qty: 0,
          leaked_qty: 0
        }))
        setCustomers(mapped)
      }
    } catch (e) {
      console.error('Error loading route customers:', e)
    }
  }

  // Load driver profile history & active daily assignment
  async function loadProfileHistory(driverId: string) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

      // PARALLEL PROFILE HISTORY FETCHING (PROMISE.ALL)
      const [assignRes, dispRes, dSalesRes, mSalesRes, expRes] = await Promise.all([
        supabase.from('daily_route_assignments').select('*, routes(id, name, area)').eq('driver_id', driverId).eq('date', today).maybeSingle(),
        supabase.from('route_dispatches').select('*').eq('driver_id', driverId).eq('date', today).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('route_sales').select('id, invoice_number, customer_name, product_name, quantity, rate, total_amount, cash_paid, upi_paid, due_amount, payment_status, sale_date').eq('driver_id', driverId).eq('sale_date', today),
        supabase.from('route_sales').select('id, invoice_number, customer_name, product_name, quantity, rate, total_amount, cash_paid, upi_paid, due_amount, payment_status, sale_date').eq('driver_id', driverId).gte('sale_date', firstOfMonth),
        supabase.from('route_expenses').select('id, expense_date, fuel_charges, driver_bata, other_expenses, notes, created_at').eq('driver_id', driverId).order('created_at', { ascending: false })
      ])

      const assignData = assignRes.data
      const dispData = dispRes.data
      const dSales = dSalesRes.data
      const mSales = mSalesRes.data
      const expenses = expRes.data

      setDailyAssignment(assignData || null)
      setActiveDispatch(dispData || null)
      setDailySalesList(dSales || [])
      setMonthlySalesList(mSales || [])
      setExpensesList(expenses || [])

      if (assignData) {
        setAssignVehicle(assignData.vehicle_number || 'AP 16 AB 1234')
        setAssignRouteId(assignData.route_id || '')
        
        const routeObj = routes.find(r => r.id === assignData.route_id) || assignData.routes
        setSelectedRoute(routeObj)

        loadRouteCustomers(assignData.route_id)

        // Fetch dispatch record for this assignment
        if (dispData?.items) {
          const itemsObj: Record<string, number> = {
            'Water Can (20L)': 0,
            'Cooling Can (20L)': 0,
            'Bags (100 Pack)': 0,
            '500ml Bottle Case': 0,
            '1L Bottle Case': 0,
            '2L Bottle Case': 0
          }
          if (Array.isArray(dispData.items)) {
            dispData.items.forEach((it: any) => {
              if (it.product_name) itemsObj[it.product_name] = Number(it.quantity) || 0
            })
          }
          setDispatchItems(itemsObj)
        }
      } else {
        const firstDriverRoute = routes.find(r => r.driver_id === driverId)
        if (firstDriverRoute) {
          setAssignRouteId(firstDriverRoute.id)
          setSelectedRoute(firstDriverRoute)
          loadRouteCustomers(firstDriverRoute.id)
        }
      }
    } catch (e) {
      console.error('Error loading driver profile history:', e)
    }
  }

  const handleDriverSelect = (driver: any) => {
    setSelectedDriver(driver)
    loadProfileHistory(driver.id)
    setCurrentView('profile')
    setActiveTab(driver.id === 'b097b6a9-8395-4eb8-a720-3057e07662c1' ? 'local' : 'non-local')
  }

  const handleRouteSelect = async (route: any) => {
    setSelectedRoute(route)
    setAssignRouteId(route.id)
    await loadRouteCustomers(route.id)
    setCurrentView('categories')
  }

  const handleCategorySelect = (category: 'cans' | 'bags' | 'bottles') => {
    setSelectedCategory(category)
    setCurrentView('customers')
  }

  // Create daily route assignment
  const handleCreateAssignment = async () => {
    if (!selectedDriver || !assignRouteId) return
    setAssigning(true)
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data, error } = await supabase
        .from('daily_route_assignments')
        .insert({
          driver_id: selectedDriver.id,
          route_id: assignRouteId,
          vehicle_number: assignVehicle || 'AP 16 AB 1234',
          date: today,
          status: 'assigned'
        })
        .select('*, routes(id, name, area)')
        .single()

      if (!error && data) {
        setDailyAssignment(data)
        loadRouteCustomers(assignRouteId)
        alert('✅ Daily Route Assigned Successfully!')
      } else {
        alert('Failed to assign route: ' + (error?.message || 'Error'))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAssigning(false)
    }
  }

  // Save truck stock dispatch into route_dispatches
  const handleSaveDispatch = async () => {
    if (!selectedDriver || !assignRouteId) return
    setSavingDispatch(true)
    const today = new Date().toISOString().split('T')[0]

    const itemsList = Object.entries(dispatchItems)
      .filter(([_, qty]) => qty > 0)
      .map(([pName, qty]) => ({ product_name: pName, quantity: qty }))

    try {
      const dispatchPayload = {
        route_id: assignRouteId,
        driver_id: selectedDriver.id,
        date: today,
        items: itemsList,
        issued_by: 'Admin',
        status: 'dispatched',
        assignment_id: dailyAssignment?.id || null
      }

      const { data: savedDisp, error: dispErr } = await supabase
        .from('route_dispatches')
        .insert(dispatchPayload)
        .select()
        .single()

      if (!dispErr && savedDisp) {
        setActiveDispatch(savedDisp)
        
        if (dailyAssignment) {
          await supabase
            .from('daily_route_assignments')
            .update({
              products_loaded: itemsList,
              status: 'in_progress'
            })
            .eq('id', dailyAssignment.id)

          setDailyAssignment((prev: any) => prev ? { ...prev, products_loaded: itemsList, status: 'in_progress' } : null)
        }

        setShowDispatchForm(false)
        alert('🚚 Truck Dispatch Stock Saved & Route In Progress!')
      } else {
        alert('Failed to save dispatch: ' + dispErr?.message)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingDispatch(false)
    }
  }

  // Save Route Completion & Reconciliation into route_runs
  const handleCompleteRouteRun = async () => {
    if (!selectedDriver || !assignRouteId) return
    setSavingRouteRun(true)
    const today = new Date().toISOString().split('T')[0]

    const totalSales = customers.reduce((acc, c) => acc + ((Number(c.qty_entered) || 0) * (Number(c.rate_entered) || 0)), 0)
    const totalReturned = customers.reduce((acc, c) => acc + (Number(c.returned_qty) || 0), 0)
    const totalLeaked = customers.reduce((acc, c) => acc + (Number(c.leaked_qty) || 0), 0)
    const totalExpenses = (Number(expenseForm.fuel) || 0) + (Number(expenseForm.bata) || 0) + (Number(expenseForm.other) || 0)
    const totalCash = customers.reduce((acc, c) => acc + (Number(c.cash_paid) || 0), 0)
    const totalUpi = customers.reduce((acc, c) => acc + (Number(c.upi_paid) || 0), 0)
    const netCollection = totalCash + totalUpi - totalExpenses

    const routeRunPayload = {
      route_id: assignRouteId,
      driver_id: selectedDriver.id,
      date: today,
      dispatch_id: activeDispatch?.id || null,
      assignment_id: dailyAssignment?.id || null,
      stops: customers,
      total_sales: totalSales,
      total_returned: totalReturned,
      total_leaked: totalLeaked,
      total_expenses: totalExpenses,
      net_collection: netCollection
    }

    try {
      const { error: runErr } = await supabase
        .from('route_runs')
        .insert(routeRunPayload)

      if (!runErr) {
        if (totalExpenses > 0) {
          await supabase.from('route_expenses').insert({
            route_id: assignRouteId,
            driver_id: selectedDriver.id,
            fuel_charges: Number(expenseForm.fuel) || 0,
            driver_bata: Number(expenseForm.bata) || 0,
            other_expenses: Number(expenseForm.other) || 0,
            remarks: expenseForm.remarks || 'Route Completion Expense',
            vehicle_number: assignVehicle
          })
        }

        if (dailyAssignment) {
          await supabase
            .from('daily_route_assignments')
            .update({ status: 'completed' })
            .eq('id', dailyAssignment.id)

          setDailyAssignment((prev: any) => prev ? { ...prev, status: 'completed' } : null)
        }

        alert('🎉 Route Run Reconciled & Completed Successfully!')
        loadProfileHistory(selectedDriver.id)
      } else {
        alert('Failed to save route run: ' + runErr.message)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingRouteRun(false)
    }
  }

  // Edit Customer stop entry inline (Rate is auto default_rate with manual override!)
  const updateCustomerEntry = (id: string, field: string, value: any) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, [field]: value }
        const total = (Number(updated.qty_entered) || 0) * (Number(updated.rate_entered) || 0)
        const cash = Number(updated.cash_paid) || 0
        const upi = Number(updated.upi_paid) || 0
        updated.due_amount = Math.max(0, total - cash - upi)
        return updated
      }
      return c
    }))
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

  const driverRoutes = routes.filter(r => r.driver_id === selectedDriver?.id)
  const localRoutes = driverRoutes.filter(r => r.name.toLowerCase().includes('local') && !r.name.toLowerCase().includes('non'))
  const nonLocalRoutes = driverRoutes.filter(r => !r.name.toLowerCase().includes('local') || r.name.toLowerCase().includes('non'))

  const isNagaraju = selectedDriver?.id === 'b097b6a9-8395-4eb8-a720-3057e07662c1'
  const isDriver2  = selectedDriver?.id === '70c293e7-bae8-4de2-a505-edccfd35f761'

  // Reconciliation summary calculations
  const summarySales = customers.reduce((acc, c) => acc + ((Number(c.qty_entered) || 0) * (Number(c.rate_entered) || 0)), 0)
  const summaryCash = customers.reduce((acc, c) => acc + (Number(c.cash_paid) || 0), 0)
  const summaryUpi = customers.reduce((acc, c) => acc + (Number(c.upi_paid) || 0), 0)
  const summaryDue = customers.reduce((acc, c) => acc + (Number(c.due_amount) || 0), 0)
  const summaryReturned = customers.reduce((acc, c) => acc + (Number(c.returned_qty) || 0), 0)
  const summaryLeaked = customers.reduce((acc, c) => acc + (Number(c.leaked_qty) || 0), 0)
  const summaryExpenses = (Number(expenseForm.fuel) || 0) + (Number(expenseForm.bata) || 0) + (Number(expenseForm.other) || 0)

  return (
    <div style={{ padding: '0.25rem' }}>
      
      {/* MONOSPACE THERMAL PRINTER RECEIPT OVERLAY */}
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

          <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', marginBottom: '10px' }}>
            <table style={{ width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Rate</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{successData.productName}</td>
                  <td style={{ textAlign: 'center' }}>{successData.qty}</td>
                  <td style={{ textAlign: 'right' }}>₹{successData.rate}</td>
                  <td style={{ textAlign: 'right' }}>₹{successData.total}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <table style={{ width: '100%', fontSize: '11px', marginBottom: '15px' }}>
            <tbody>
              <tr>
                <td style={{ textAlign: 'right' }}><strong>Net Amount:</strong></td>
                <td style={{ textAlign: 'right', width: '80px' }}>₹{successData.total}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'right' }}>Cash Paid:</td>
                <td style={{ textAlign: 'right' }}>₹{successData.cash}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'right' }}>UPI Paid:</td>
                <td style={{ textAlign: 'right' }}>₹{successData.upi}</td>
              </tr>
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{ textAlign: 'right' }}>Balance Due:</td>
                <td style={{ textAlign: 'right' }}>₹{successData.due}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: 'center', fontSize: '10px', borderTop: '1px dashed #000', paddingTop: '8px' }}>
            <p style={{ margin: 0 }}>Thank you for doing business with us!</p>
            <p style={{ margin: '2px 0 0' }}>Quality Water Guaranteed • Royal Kissan ERP</p>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL ON SCREEN */}
      {successData && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                🎉 Sale Recorded Successfully
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSuccessData(null)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
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
          >
            ←
          </button>
        )}
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
            {currentView === 'drivers' && '🚚 Driver Route Sales & Dispatch Portal'}
            {currentView === 'profile' && `🚛 Driver Workspace: ${selectedDriver?.name}`}
            {currentView === 'categories' && `🗺️ Route Category: ${selectedRoute?.name}`}
            {currentView === 'customers' && `👥 Stop List & Billing: ${selectedCategory?.toUpperCase()}`}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'hsl(215 20% 55%)', marginTop: '0.25rem' }}>
            {currentView === 'drivers' && 'Select active driver to run daily route assignments, dispatches, and reconciliation'}
            {currentView === 'profile' && 'Assign daily routes, record truck stock, enter customer stops with auto/manual rates, and complete run reconciliation'}
            {currentView === 'categories' && 'Select product type to log sales'}
            {currentView === 'customers' && `Record dues and log customer sales for ${selectedRoute?.name}`}
          </p>
        </div>
      </div>

      {/* VIEW 1: DRIVER SELECTION CARDS */}
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
                    Open Driver Workspace <span>→</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* VIEW 2: DRIVER WORKSPACE & PROFILE */}
      {currentView === 'profile' && selectedDriver && (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }} className="animate-fade-in">
          
          {/* Driver Stats summary strip */}
          <div className="glass-card-3d" style={{ padding: '1.25rem 2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '2rem' }}>🚛</span>
              <div>
                <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem', color: '#fff' }}>{selectedDriver.name}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>
                  {dailyAssignment ? `Assigned Route: ${dailyAssignment.routes?.name || 'Local Route'} (${dailyAssignment.vehicle_number})` : 'No Route Assigned For Today'}
                </p>
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
                <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase' }}>Status</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: dailyAssignment?.status === 'completed' ? '#34d399' : dailyAssignment?.status === 'in_progress' ? '#fbbf24' : '#60a5fa' }}>
                  {dailyAssignment?.status ? dailyAssignment.status.toUpperCase() : 'PENDING'}
                </div>
              </div>
            </div>
          </div>

          {/* 1. DAILY ROUTE ASSIGNMENT BANNER (LAYER) */}
          <div className="glass-card-3d" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                  📅 Today's Temporary Driver Route Assignment
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'hsl(215 20% 55%)', margin: '0.25rem 0 0' }}>
                  Assign driver to route temporarily for today without hardcoding permanent route links.
                </p>
              </div>

              {dailyAssignment ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fff' }}>
                      {dailyAssignment.routes?.name || selectedRoute?.name || 'Local Route'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>
                      Vehicle: {dailyAssignment.vehicle_number}
                    </div>
                  </div>
                  <span className={`badge ${dailyAssignment.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                    {dailyAssignment.status?.toUpperCase()}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    className="form-input"
                    style={{ width: '220px' }}
                    value={assignRouteId}
                    onChange={e => {
                      setAssignRouteId(e.target.value)
                      const r = routes.find(x => x.id === e.target.value)
                      if (r) setSelectedRoute(r)
                    }}
                  >
                    <option value="">Select Today's Route...</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '150px' }}
                    placeholder="Vehicle #"
                    value={assignVehicle}
                    onChange={e => setAssignVehicle(e.target.value)}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateAssignment}
                    disabled={assigning || !assignRouteId}
                  >
                    {assigning ? 'Assigning...' : '▶ Assign Route for Today'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. TRUCK DISPATCH / STOCK LOADING SECTION */}
          <div className="glass-card-3d" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                  🚚 Truck Loading & Dispatch (Products Loaded)
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', margin: '0.25rem 0 0' }}>
                  {activeDispatch ? `Dispatched Stock Logged on ${activeDispatch.date}` : 'Log truck stock loaded before starting route run'}
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDispatchForm(!showDispatchForm)}
              >
                {showDispatchForm ? 'Hide Stock Form' : activeDispatch ? '✏️ Edit Dispatched Stock' : '📦 Load Truck Stock'}
              </button>
            </div>

            {/* Display Active Dispatch Summary */}
            {activeDispatch && !showDispatchForm && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                {Array.isArray(activeDispatch.items) && activeDispatch.items.map((it: any, idx: number) => (
                  <div key={idx} style={{ fontSize: '0.8125rem' }}>
                    <span style={{ color: 'hsl(215 20% 55%)' }}>{it.product_name}: </span>
                    <strong style={{ color: '#60a5fa' }}>{it.quantity} units</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Stock Loading Form */}
            {showDispatchForm && (
              <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  {Object.keys(dispatchItems).map(pName => (
                    <div key={pName} className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>{pName}</label>
                      <input
                        type="number"
                        className="form-input"
                        value={dispatchItems[pName]}
                        onChange={e => setDispatchItems({ ...dispatchItems, [pName]: Math.max(0, Number(e.target.value)) })}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowDispatchForm(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveDispatch} disabled={savingDispatch}>
                    {savingDispatch ? 'Saving Dispatch...' : '💾 Save Truck Stock Dispatch'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs inside Workspace */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            overflowX: 'auto', 
            paddingBottom: '0.75rem', 
            marginBottom: '1.5rem', 
            borderBottom: '1px solid rgba(255,255,255,0.06)' 
          }}>
            {[
              ...(isNagaraju ? [{ id: 'local', label: 'Route Completion & Customer Stop Sheet', icon: '🗺️' }] : []),
              ...(isDriver2  ? [{ id: 'non-local', label: 'Route Completion & Customer Stop Sheet', icon: '🛣️' }] : []),
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

          {/* MAIN DRIVER ROUTE COMPLETION & CUSTOMER STOP SHEET (Reuses route_runs & route_customers) */}
          {(activeTab === 'local' || activeTab === 'non-local') && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Route Customer Stop Sheet with Auto/Manual Rates */}
              <div className="glass-card-3d" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                      📋 Route Customer Stop Registry ({selectedRoute?.name || 'Local Route'})
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', margin: '0.25rem 0 0' }}>
                      Rates are pre-filled automatically from route_customers.default_rate with manual override per stop entry.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className={`btn btn-xs ${selectedCategory === null ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedCategory(null)}
                    >
                      All Stops ({customers.length})
                    </button>
                    <button
                      className={`btn btn-xs ${selectedCategory === 'cans' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedCategory('cans')}
                    >
                      Cans ({customers.filter(c => c.section === 'cans').length})
                    </button>
                    <button
                      className={`btn btn-xs ${selectedCategory === 'bags' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedCategory('bags')}
                    >
                      Bags ({customers.filter(c => c.section === 'bags').length})
                    </button>
                    <button
                      className={`btn btn-xs ${selectedCategory === 'bottles' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedCategory('bottles')}
                    >
                      Bottles ({customers.filter(c => c.section === 'bottles').length})
                    </button>
                  </div>
                </div>

                {/* Customer Stop Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Stop / Customer Name</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Section</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Sold Qty</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Rate (₹) [Auto/Manual]</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Cash Paid</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>UPI Paid</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Return Qty</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Leaked</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Due Amount</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers
                        .filter(c => selectedCategory === null || c.section === selectedCategory)
                        .map((c, idx) => {
                          const total = (Number(c.qty_entered) || 0) * (Number(c.rate_entered) || 0)
                          const cash = Number(c.cash_paid) || 0
                          const upi = Number(c.upi_paid) || 0
                          const calculatedDue = Math.max(0, total - cash - upi)

                          return (
                            <tr key={c.id || idx}>
                              <td style={{ fontWeight: '700', color: '#fff' }}>
                                {c.name}
                                <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 50%)', fontWeight: 'normal' }}>
                                  {c.product_name}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`badge ${c.section === 'cans' ? 'badge-primary' : c.section === 'bags' ? 'badge-warning' : 'badge-success'}`}>
                                  {c.section}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ padding: '0.25rem 0.5rem', textAlign: 'center', width: '70px' }}
                                  value={c.qty_entered}
                                  onChange={e => updateCustomerEntry(c.id, 'qty_entered', Math.max(0, Number(e.target.value)))}
                                />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {/* EDITABLE RATE FIELD — AUTO PRE-FILLED WITH default_rate */}
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ padding: '0.25rem 0.5rem', textAlign: 'right', width: '85px', color: '#60a5fa', fontWeight: 'bold' }}
                                  value={c.rate_entered}
                                  onChange={e => updateCustomerEntry(c.id, 'rate_entered', Math.max(0, Number(e.target.value)))}
                                />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ padding: '0.25rem 0.5rem', textAlign: 'right', width: '85px', color: '#34d399' }}
                                  value={c.cash_paid || ''}
                                  placeholder="0"
                                  onChange={e => updateCustomerEntry(c.id, 'cash_paid', Math.max(0, Number(e.target.value)))}
                                />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ padding: '0.25rem 0.5rem', textAlign: 'right', width: '85px', color: '#34d399' }}
                                  value={c.upi_paid || ''}
                                  placeholder="0"
                                  onChange={e => updateCustomerEntry(c.id, 'upi_paid', Math.max(0, Number(e.target.value)))}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ padding: '0.25rem 0.5rem', textAlign: 'center', width: '65px' }}
                                  value={c.returned_qty || ''}
                                  placeholder="0"
                                  onChange={e => updateCustomerEntry(c.id, 'returned_qty', Math.max(0, Number(e.target.value)))}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ padding: '0.25rem 0.5rem', textAlign: 'center', width: '65px', color: '#f87171' }}
                                  value={c.leaked_qty || ''}
                                  placeholder="0"
                                  onChange={e => updateCustomerEntry(c.id, 'leaked_qty', Math.max(0, Number(e.target.value)))}
                                />
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: '800', color: calculatedDue > 0 ? '#f87171' : '#34d399' }}>
                                ₹{calculatedDue}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => openBillingModal(c)}
                                >
                                  🧾 Receipt
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ROUTE RUN RECONCILIATION SUMMARY & TRIP EXPENSES FORM */}
              <div className="glass-card-3d" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>
                  📊 Route Run Completion & Reconciliation Summary
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Total Route Sales</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>₹{summarySales.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Cash Collected</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>₹{summaryCash.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>UPI Collected</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>₹{summaryUpi.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Outstanding Dues</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: summaryDue > 0 ? '#f87171' : '#34d399', marginTop: '0.25rem' }}>₹{summaryDue.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Returned / Leaked</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.25rem' }}>
                      {summaryReturned} ret / {summaryLeaked} leak
                    </div>
                  </div>
                </div>

                {/* Trip Expenses Form */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff', margin: '0 0 1rem' }}>💸 Log Trip Expenses for Reconciliation</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Fuel Charges (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={expenseForm.fuel || ''}
                        onChange={e => setExpenseForm({ ...expenseForm, fuel: Math.max(0, Number(e.target.value)) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Driver Bata (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={expenseForm.bata || ''}
                        onChange={e => setExpenseForm({ ...expenseForm, bata: Math.max(0, Number(e.target.value)) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Other Expenses (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={expenseForm.other || ''}
                        onChange={e => setExpenseForm({ ...expenseForm, other: Math.max(0, Number(e.target.value)) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Remarks</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Optional remarks"
                        value={expenseForm.remarks}
                        onChange={e => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'hsl(215 20% 55%)' }}>Net Reconciliation Collection: </span>
                    <strong style={{ fontSize: '1.35rem', color: '#34d399', marginLeft: '0.5rem' }}>
                      ₹{(summaryCash + summaryUpi - summaryExpenses).toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <button
                    className="btn btn-primary btn-lg"
                    style={{ minWidth: '240px' }}
                    onClick={handleCompleteRouteRun}
                    disabled={savingRouteRun}
                  >
                    {savingRouteRun ? 'Saving Reconciliation...' : '🏁 Save Route Run & Complete Trip'}
                  </button>
                </div>

              </div>

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
                          No sales recorded this month.
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Log Expense Form */}
              <div className="glass-card-3d" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1rem' }}>
                  💸 Log Trip Expense
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Fuel Charges (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={expenseForm.fuel || ''}
                      onChange={e => setExpenseForm({ ...expenseForm, fuel: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Driver Bata (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={expenseForm.bata || ''}
                      onChange={e => setExpenseForm({ ...expenseForm, bata: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Other Expenses (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={expenseForm.other || ''}
                      onChange={e => setExpenseForm({ ...expenseForm, other: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. AP 16 AB 1234"
                      value={expenseForm.vehicle}
                      onChange={e => setExpenseForm({ ...expenseForm, vehicle: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Remarks / Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter trip remarks or expense details..."
                    value={expenseForm.remarks}
                    onChange={e => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleSaveExpense}
                  disabled={expenseLoading}
                >
                  {expenseLoading ? 'Saving...' : '💾 Log Expense'}
                </button>
              </div>

              {/* Expenses History List */}
              <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
                <div className="card-header"><h3 className="card-title">📜 Expense History Log</h3></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Fuel (₹)</th>
                        <th style={{ textAlign: 'right' }}>Bata (₹)</th>
                        <th style={{ textAlign: 'right' }}>Other (₹)</th>
                        <th style={{ textAlign: 'right' }}>Total (₹)</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesList.map((e, idx) => {
                        const totalExp = (Number(e.fuel_charges) || 0) + (Number(e.driver_bata) || 0) + (Number(e.other_expenses) || 0)
                        return (
                          <tr key={idx}>
                            <td>{e.expense_date || new Date(e.created_at).toLocaleDateString('en-IN')}</td>
                            <td style={{ textAlign: 'right' }}>₹{e.fuel_charges}</td>
                            <td style={{ textAlign: 'right' }}>₹{e.driver_bata}</td>
                            <td style={{ textAlign: 'right' }}>₹{e.other_expenses}</td>
                            <td style={{ textAlign: 'right', fontWeight: '800', color: '#f87171' }}>₹{totalExp}</td>
                            <td>{e.notes || '—'}</td>
                          </tr>
                        )
                      })}
                      {expensesList.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'hsl(215 20% 45%)' }}>
                            No expenses logged yet.
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
                  <label className="form-label">Rate (₹) [Default: ₹{billingCustomer.default_rate || 0}]</label>
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
