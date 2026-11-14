'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import { saveUnifiedBill } from '@/lib/services/billing-service'
import { resolveProductRate, RateSource, round2 } from '@/lib/pricing/pricing-engine'
import { fetchPricingRules } from '@/lib/services/pricing-service'
import type { PricingRule } from '@/lib/pricing/pricing-engine'
import ReceiptPreviewModal from '@/components/printer/ReceiptPreviewModal'
import { BillData } from '@/lib/printer/receipt'
import {
  issueDriverLoad,
  getDriverLoads,
  settleDriverRoute,
  getDriverSettlements
} from '@/lib/services/driver-service'
import type {
  DriverLoadDispatchWithItems,
  DriverRouteSettlementWithItems
} from '@/lib/types/database'

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
  const [activeTab, setActiveTab] = useState<
    'load_dispatches' | 'route_settlement' | 'local' | 'non-local' | 'settlement_history' | 'collections' | 'dues' | 'daily' | 'monthly' | 'expenses'
  >('load_dispatches')
  
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'cans' | 'bags' | 'bottles' | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  
  // Billing form state
  const [billingCustomer, setBillingCustomer] = useState<any | null>(null)
  const [billingForm, setBillingForm] = useState<{
    qty: number
    rate: number
    cash: number
    upi: number
    product_name: string
    rate_source?: string
    rate_rule_id?: string | null
  }>({
    qty: 0,
    rate: 0,
    cash: 0,
    upi: 0,
    product_name: 'Water Can (20L)',
    rate_source: 'Route Rate',
    rate_rule_id: null
  })
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
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
  // OFFICIAL DRIVER LOAD DISPATCHES & ROUTE SETTLEMENT STATE (PARTS 5 & 6)
  // =========================================================================
  const [driverLoadsList, setDriverLoadsList] = useState<DriverLoadDispatchWithItems[]>([])
  const [driverSettlementsList, setDriverSettlementsList] = useState<DriverRouteSettlementWithItems[]>([])
  const [previewBill, setPreviewBill] = useState<BillData | null>(null)

  // Load Issue Form State
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false)
  const [loadDispatchDate, setLoadDispatchDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [loadVehicle, setLoadVehicle] = useState<string>('AP 16 AB 1234')
  const [loadRouteId, setLoadRouteId] = useState<string>('')
  const [loadStaff, setLoadStaff] = useState<string>('Operations Admin')
  const [loadNotes, setLoadNotes] = useState<string>('')
  const [loadIssuing, setLoadIssuing] = useState<boolean>(false)
  const [loadItems, setLoadItems] = useState<Array<{
    product_name: string
    unit: string
    loaded_quantity: number
    rate: number
    amount: number
  }>>([
    { product_name: 'Water Can (20L)', unit: 'cans', loaded_quantity: 50, rate: 30, amount: 1500 },
    { product_name: 'Bags (100 Pack)', unit: 'bags', loaded_quantity: 30, rate: 80, amount: 2400 },
    { product_name: '500ml Bottle Case', unit: 'cases', loaded_quantity: 10, rate: 140, amount: 1400 },
    { product_name: '1L Bottle Case', unit: 'cases', loaded_quantity: 10, rate: 120, amount: 1200 }
  ])

  // Route Settlement State (4-Way Reconciliation)
  const [selectedDispatchToSettle, setSelectedDispatchToSettle] = useState<DriverLoadDispatchWithItems | null>(null)
  const [settlementDate, setSettlementDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [settlementRows, setSettlementRows] = useState<Array<{
    product_name: string
    loaded_qty: number
    sold_qty: number
    returned_good_qty: number
    leaked_damaged_qty: number
    rate: number
    condition: string
  }>>([])
  const [settlementCash, setSettlementCash] = useState<number>(0)
  const [settlementUpi, setSettlementUpi] = useState<number>(0)
  const [settlementCredit, setSettlementCredit] = useState<number>(0)
  const [settlementFuel, setSettlementFuel] = useState<number>(0)
  const [settlementBata, setSettlementBata] = useState<number>(0)
  const [settlementOtherExp, setSettlementOtherExp] = useState<number>(0)
  const [settlementExpenseNotes, setSettlementExpenseNotes] = useState<string>('')
  const [settlementActualHandover, setSettlementActualHandover] = useState<number>(0)
  const [settlementDiscrepancyReason, setSettlementDiscrepancyReason] = useState<string>('')
  const [settlingRoute, setSettlingRoute] = useState<boolean>(false)
  const [autoGenerateCustomerBills, setAutoGenerateCustomerBills] = useState<boolean>(true)

  // Legacy state preserved for temporary runs
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
    fetchPricingRules().then(rules => {
      if (rules && rules.length > 0) setPricingRules(rules)
    })
  }, [])

  useDataSyncListener(['drivers', 'bills', 'stock', 'sales'], () => {
    if (selectedDriver) {
      loadProfileHistory(selectedDriver.id)
    }
  })

  async function loadDriversAndRoutes() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

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
          rate_entered: Number(c.default_rate) || 0,
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

  async function loadProfileHistory(driverId: string) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

      const [assignRes, dispRes, dSalesRes, mSalesRes, expRes, loads, settlements] = await Promise.all([
        supabase.from('daily_route_assignments').select('*, routes(id, name, area)').eq('driver_id', driverId).eq('date', today).maybeSingle(),
        supabase.from('route_dispatches').select('*').eq('driver_id', driverId).eq('date', today).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('route_sales').select('id, invoice_number, customer_name, product_name, quantity, rate, total_amount, cash_paid, upi_paid, due_amount, payment_status, sale_date').eq('driver_id', driverId).eq('sale_date', today),
        supabase.from('route_sales').select('id, invoice_number, customer_name, product_name, quantity, rate, total_amount, cash_paid, upi_paid, due_amount, payment_status, sale_date').eq('driver_id', driverId).gte('sale_date', firstOfMonth),
        supabase.from('route_expenses').select('id, expense_date, fuel_charges, driver_bata, other_expenses, notes, created_at').eq('driver_id', driverId).order('created_at', { ascending: false }),
        getDriverLoads(driverId),
        getDriverSettlements(driverId)
      ])

      setDriverLoadsList(loads)
      setDriverSettlementsList(settlements)

      // Auto-select latest open dispatch if available
      const openLoad = loads.find(l => l.status === 'ISSUED')
      if (openLoad && !selectedDispatchToSettle) {
        initSettlementForDispatch(openLoad)
      }

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
    setActiveTab('load_dispatches')
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

  // -------------------------------------------------------------------------
  // ACTION: ISSUE DRIVER LOAD (PART 5 — STEP 1)
  // Deducts stock from warehouse inventory, generates Load Dispatch Note
  // -------------------------------------------------------------------------
  const handleIssueDriverLoad = async () => {
    if (!selectedDriver) return
    const validItems = loadItems.filter(it => it.loaded_quantity > 0)
    if (validItems.length === 0) {
      alert('⚠️ Please specify at least one product with quantity > 0.')
      return
    }

    setLoadIssuing(true)
    const selectedRouteObj = routes.find(r => r.id === loadRouteId)

    const res = await issueDriverLoad({
      driver_id: selectedDriver.id,
      driver_name: selectedDriver.name,
      vehicle_number: loadVehicle || 'AP 16 AB 1234',
      route_id: loadRouteId || null,
      route_name: selectedRouteObj?.name || null,
      dispatch_date: loadDispatchDate,
      created_by: loadStaff || 'Operations Admin',
      notes: loadNotes,
      items: validItems.map(it => ({
        product_name: it.product_name,
        unit: it.unit,
        loaded_quantity: it.loaded_quantity,
        rate: it.rate,
        amount: round2(it.loaded_quantity * it.rate)
      }))
    })

    setLoadIssuing(false)

    if (res.success && res.dispatch) {
      alert(`✅ Driver Load Dispatch #${res.dispatch.dispatch_number} Issued!\nWarehouse inventory has been deducted atomically.`)
      setShowIssueModal(false)
      loadProfileHistory(selectedDriver.id)

      // Prompt to preview/print Load Dispatch Note
      printLoadDispatchNote(res.dispatch)
    } else {
      alert(`❌ Failed to issue driver load: ${res.message}`)
    }
  }

  // -------------------------------------------------------------------------
  // ACTION: INITIALIZE ROUTE SETTLEMENT FOR A DISPATCH
  // -------------------------------------------------------------------------
  function initSettlementForDispatch(dispatch: DriverLoadDispatchWithItems) {
    setSelectedDispatchToSettle(dispatch)
    const initialRows = (dispatch.items || []).map(it => ({
      product_name: it.product_name,
      loaded_qty: Number(it.loaded_quantity) || 0,
      sold_qty: Number(it.loaded_quantity) || 0,
      returned_good_qty: 0,
      leaked_damaged_qty: 0,
      rate: Number(it.rate) || 0,
      condition: 'good'
    }))
    setSettlementRows(initialRows)
    
    // Estimate collection from sold quantity
    const totalEst = initialRows.reduce((s, r) => s + (r.sold_qty * r.rate), 0)
    setSettlementCash(totalEst)
    setSettlementUpi(0)
    setSettlementCredit(0)
    setSettlementActualHandover(totalEst)
    setSettlementDate(new Date().toISOString().split('T')[0])
  }

  // -------------------------------------------------------------------------
  // ACTION: CONFIRM ROUTE SETTLEMENT & 4-WAY RECONCILIATION (PART 5 — STEPS 3 & 4)
  // -------------------------------------------------------------------------
  const handleConfirmRouteSettlement = async () => {
    if (!selectedDispatchToSettle || !selectedDriver) return

    // 1. Verify 4-way quantity conservation
    for (const r of settlementRows) {
      const accounted = Number(r.sold_qty) + Number(r.returned_good_qty) + Number(r.leaked_damaged_qty)
      if (accounted > Number(r.loaded_qty)) {
        alert(`❌ Validation error for ${r.product_name}:\nAccounted quantity (${accounted}) exceeds loaded quantity (${r.loaded_qty})!`)
        return
      }
    }

    const totalLoaded = settlementRows.reduce((s, r) => s + Number(r.loaded_qty), 0)
    const totalSold = settlementRows.reduce((s, r) => s + Number(r.sold_qty), 0)
    const totalReturned = settlementRows.reduce((s, r) => s + Number(r.returned_good_qty), 0)
    const totalLeaked = settlementRows.reduce((s, r) => s + Number(r.leaked_damaged_qty), 0)
    const totalUnaccounted = totalLoaded - (totalSold + totalReturned + totalLeaked)

    const totalExpenses = round2(Number(settlementFuel) + Number(settlementBata) + Number(settlementOtherExp))
    const expectedCollection = round2(Number(settlementCash) + Number(settlementUpi))
    const expectedHandover = round2(Math.max(0, expectedCollection - totalExpenses))
    const actualHandover = round2(Number(settlementActualHandover))
    const collectionDiff = round2(actualHandover - expectedHandover)

    if ((totalUnaccounted > 0 || Math.abs(collectionDiff) > 0) && !settlementDiscrepancyReason.trim()) {
      alert(`⚠️ Discrepancy detected:\n- Unaccounted Stock: ${totalUnaccounted} units\n- Collection Difference: ₹${collectionDiff}\n\nPlease enter an explanation in Discrepancy Reason before confirming.`)
      return
    }

    setSettlingRoute(true)

    // Optional customer sales generated at route settlement
    const customerSalesPayload = autoGenerateCustomerBills ? customers.filter(c => (Number(c.qty_entered) || 0) > 0).map(c => ({
      customer_name: c.name,
      product_name: c.product_name,
      quantity: Number(c.qty_entered) || 1,
      rate: Number(c.rate_entered) || 0,
      total_amount: (Number(c.qty_entered) || 1) * (Number(c.rate_entered) || 0),
      paid_amount: (Number(c.cash_paid) || 0) + (Number(c.upi_paid) || 0),
      payment_method: (Number(c.cash_paid) || 0) > 0 && (Number(c.upi_paid) || 0) > 0 ? 'cash_upi' : (Number(c.upi_paid) || 0) > 0 ? 'upi' : 'cash',
      cash_amount: Number(c.cash_paid) || 0,
      upi_amount: Number(c.upi_paid) || 0
    })) : []

    const res = await settleDriverRoute({
      load_dispatch_id: selectedDispatchToSettle.id,
      driver_id: selectedDriver.id,
      route_id: selectedDispatchToSettle.route_id,
      settlement_date: settlementDate,
      total_loaded_qty: totalLoaded,
      total_sold_qty: totalSold,
      total_returned_qty: totalReturned,
      total_leaked_qty: totalLeaked,
      unaccounted_qty: totalUnaccounted,
      cash_collected: Number(settlementCash),
      upi_collected: Number(settlementUpi),
      credit_sales_amount: Number(settlementCredit),
      route_expenses_amount: totalExpenses,
      expected_collection: expectedCollection,
      actual_collection: actualHandover,
      collection_difference: collectionDiff,
      discrepancy_reason: settlementDiscrepancyReason,
      confirmed_by: 'Operations Admin',
      items: settlementRows.map(r => ({
        product_name: r.product_name,
        loaded_qty: Number(r.loaded_qty),
        sold_qty: Number(r.sold_qty),
        returned_good_qty: Number(r.returned_good_qty),
        leaked_damaged_qty: Number(r.leaked_damaged_qty),
        rate: Number(r.rate),
        condition: r.condition
      })),
      customer_sales: customerSalesPayload
    })

    setSettlingRoute(false)

    if (res.success && res.settlement) {
      alert(`🎉 Route Settlement #${res.settlement.settlement_number} Confirmed!\n- Returned good stock (${totalReturned}) restored to warehouse.\n- Damaged/leaked stock (${totalLeaked}) quarantined.\n- Final customer bills generated without double-deducting warehouse stock.`)
      loadProfileHistory(selectedDriver.id)
      printSettlementSummary(res.settlement)
      setActiveTab('settlement_history')
    } else {
      alert(`❌ Route settlement failed: ${res.message}`)
    }
  }

  // -------------------------------------------------------------------------
  // PRINT HELPERS: Load Dispatch Note & Route Settlement Summary
  // -------------------------------------------------------------------------
  function printLoadDispatchNote(dispatch: DriverLoadDispatchWithItems) {
    setPreviewBill({
      invoice_number: dispatch.dispatch_number,
      customer_name: `DRIVER LOAD: ${dispatch.driver_name}`,
      dealer_name: `DRIVER LOAD: ${dispatch.driver_name}`,
      date: dispatch.dispatch_date,
      subtotal: dispatch.total_load_value,
      taxable_amount: dispatch.total_load_value,
      gst_amount: 0,
      total_amount: dispatch.total_load_value,
      paid_amount: 0,
      due_amount: dispatch.total_load_value,
      bill_type: 'DRIVER LOAD DISPATCH NOTE (NOT A SALE INVOICE)' as any,
      notes: `Vehicle: ${dispatch.vehicle_number || 'N/A'} | Route: ${dispatch.route_name || 'N/A'} | Dispatched By: ${dispatch.created_by || 'Operations Admin'}`,
      items: (dispatch.items || []).map(it => ({
        product_name: it.product_name,
        quantity: it.loaded_quantity,
        rate: it.rate,
        amount: it.amount
      }))
    })
  }

  function printSettlementSummary(settlement: DriverRouteSettlementWithItems) {
    setPreviewBill({
      invoice_number: settlement.settlement_number,
      customer_name: `ROUTE SETTLEMENT: ${selectedDriver?.name || 'Driver'}`,
      dealer_name: `ROUTE SETTLEMENT: ${selectedDriver?.name || 'Driver'}`,
      date: settlement.settlement_date,
      subtotal: settlement.actual_collection,
      taxable_amount: settlement.actual_collection,
      gst_amount: 0,
      total_amount: settlement.actual_collection,
      paid_amount: settlement.actual_collection,
      due_amount: 0,
      bill_type: 'DRIVER ROUTE SETTLEMENT SUMMARY' as any,
      notes: `Loaded: ${settlement.total_loaded_qty} | Sold: ${settlement.total_sold_qty} | Ret Good: ${settlement.total_returned_qty} | Leaked: ${settlement.total_leaked_qty} | Shortage: ${settlement.unaccounted_qty} | Net Collection: ₹${settlement.actual_collection} | Expenses: ₹${settlement.route_expenses_amount}`,
      items: (settlement.items || []).map(it => ({
        product_name: `${it.product_name} (Sold: ${it.sold_qty}, Ret: ${it.returned_good_qty}, Leak: ${it.leaked_damaged_qty})`,
        quantity: it.sold_qty,
        rate: it.rate,
        amount: it.sold_amount
      }))
    })
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
        emitDataChange('drivers')
        emitDataChange('routes')
        emitDataChange('bills')
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

  // Edit Customer stop entry inline
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
    const prodName = customer.product_name || 'Water Can (20L)'
    const qty = customer.qty_entered || customer.default_qty || 1

    const res = resolveProductRate({
      productId: customer.product_id || '',
      productName: prodName,
      defaultRate: customer.default_rate || 15.00,
      unit: 'piece',
      customerId: customer.id,
      routeId: selectedRoute?.id || null,
      billDate: new Date().toISOString().split('T')[0],
      quantity: qty,
      availableRules: pricingRules
    })

    setBillingForm({
      qty,
      rate: customer.rate_entered || res.resolvedRate,
      cash: customer.cash_paid || 0,
      upi: customer.upi_paid || 0,
      product_name: prodName,
      rate_source: res.rateSource,
      rate_rule_id: res.ruleId
    })
    setBillingModalOpen(true)
  }

  const updateBillingForm = (field: string, val: any) => {
    setBillingForm(prev => {
      const updated = { ...prev, [field]: val }
      if (field === 'qty' || field === 'product_name') {
        const res = resolveProductRate({
          productId: billingCustomer?.product_id || '',
          productName: updated.product_name,
          defaultRate: billingCustomer?.default_rate || 15.00,
          unit: 'piece',
          customerId: billingCustomer?.id,
          routeId: selectedRoute?.id || null,
          billDate: new Date().toISOString().split('T')[0],
          quantity: updated.qty,
          availableRules: pricingRules
        })
        if (field === 'product_name' || !updated.rate) {
          updated.rate = res.resolvedRate
        }
        updated.rate_source = res.rateSource
        updated.rate_rule_id = res.ruleId
      }
      return updated
    })
  }

  const handleSaveSale = async () => {
    if (!billingCustomer || !selectedDriver) return
    setSubmitting(true)

    const today = new Date().toISOString().split('T')[0]
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
    const total = billingForm.qty * billingForm.rate
    const cash = Number(billingForm.cash) || 0
    const upi = Number(billingForm.upi) || 0
    const paid = cash + upi
    const due = Math.max(0, total - paid)

    const payload = {
      invoice_number: invoiceNumber,
      customer_name: billingCustomer.name,
      customer_phone: billingCustomer.phone || null,
      bill_type: 'route' as const,
      driver_id: selectedDriver.id,
      route_id: selectedRoute?.id || null,
      date: today,
      subtotal: total,
      taxable_amount: total,
      gst_amount: 0,
      grand_total: total,
      total_amount: total,
      paid_amount: paid,
      due_amount: due,
      payment_mode: (cash > 0 && upi > 0 ? 'mixed' : upi > 0 ? 'upi' : 'cash') as any,
      payment_status: (due === 0 ? 'paid' : paid > 0 ? 'partial' : 'pending') as any,
      cash_amount: cash,
      upi_amount: upi,
      items: [
        {
          product_name: billingForm.product_name,
          quantity: billingForm.qty,
          rate: billingForm.rate,
          amount: total,
          rate_source: billingForm.rate_source,
          rate_rule_id: billingForm.rate_rule_id
        }
      ]
    }

    try {
      const res = await saveUnifiedBill(payload)
      if (res.success) {
        setSuccessData({
          invoiceNumber,
          customerName: billingCustomer.name,
          productName: billingForm.product_name,
          qty: billingForm.qty,
          rate: billingForm.rate,
          total,
          cash,
          upi,
          due,
          driverName: selectedDriver.name,
          routeName: selectedRoute?.name || 'Local Route'
        })

        setBillingModalOpen(false)
        emitDataChange('bills')
        emitDataChange('drivers')
        loadProfileHistory(selectedDriver.id)
      } else {
        alert('Failed to save bill: ' + res.error)
      }
    } catch (e: any) {
      alert('Error saving bill: ' + e?.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveExpense = async () => {
    if (!selectedDriver) return
    setExpenseLoading(true)
    const today = new Date().toISOString().split('T')[0]

    try {
      const payload = {
        driver_id: selectedDriver.id,
        route_id: selectedRoute?.id || assignRouteId || null,
        expense_date: today,
        fuel_charges: Number(expenseForm.fuel) || 0,
        driver_bata: Number(expenseForm.bata) || 0,
        other_expenses: Number(expenseForm.other) || 0,
        vehicle_number: expenseForm.vehicle || assignVehicle,
        notes: expenseForm.remarks || null
      }

      const { data, error } = await supabase
        .from('route_expenses')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        alert('✅ Trip expense logged successfully!')
        setExpenseForm({ fuel: 0, bata: 0, other: 0, remarks: '', vehicle: '' })
        loadProfileHistory(selectedDriver.id)
      } else {
        alert('Failed to log expense: ' + (error?.message || 'Error'))
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setExpenseLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const isNagaraju = selectedDriver?.id === 'b097b6a9-8395-4eb8-a720-3057e07662c1'
  const isDriver2  = selectedDriver?.id === '70c293e7-bae8-4de2-a505-edccfd35f761'

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
        <div id="print-area" style={{ display: 'none', backgroundColor: '#fff', color: '#000', padding: '1rem', fontFamily: 'var(--font-m)', fontSize: '12px' }}>
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

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <th style={{ textAlign: 'left', padding: '4px 0' }}>Item</th>
                <th style={{ textAlign: 'center', padding: '4px 0' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '4px 0' }}>Rate</th>
                <th style={{ textAlign: 'right', padding: '4px 0' }}>Amt</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0' }}>{successData.productName}</td>
                <td style={{ textAlign: 'center', padding: '4px 0' }}>{successData.qty}</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>₹{successData.rate}</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>₹{successData.total}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #000', paddingTop: '6px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Total Amount:</span>
              <strong>₹{successData.total}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Paid (Cash+UPI):</span>
              <span>₹{successData.cash + successData.upi}</span>
            </div>
            {successData.due > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Remaining Due:</span>
                <span>₹{successData.due}</span>
              </div>
            )}
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
              color: 'var(--text-2)',
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
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginTop: '0.25rem' }}>
            {currentView === 'drivers' && 'Select active driver to run daily route assignments, dispatches, and reconciliation'}
            {currentView === 'profile' && 'Issue warehouse truck load dispatches, complete 4-way physical reconciliation, and confirm route settlements.'}
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
                className="card"
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
                      {d.phone && <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{d.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* Today Stats */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Today's Performance</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-2)', textTransform: 'uppercase', fontWeight: '600' }}>Sales</div>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>
                        ₹{stats.sales.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-2)', textTransform: 'uppercase', fontWeight: '600' }}>Collected</div>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>
                        ₹{stats.collection.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-2)', textTransform: 'uppercase', fontWeight: '600' }}>Due</div>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: stats.due > 0 ? '#f87171' : 'hsl(215 20% 55%)', marginTop: '0.25rem' }}>
                        ₹{stats.due.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Stats */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Monthly Performance</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-2)' }}>Month Sales</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#60a5fa', marginTop: '0.125rem' }}>
                        ₹{stats.mSales.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-2)' }}>Month Collection</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399', marginTop: '0.125rem' }}>
                        ₹{stats.mCollection.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-2)', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
          
          {/* Driver Stats summary strip */}
          <div className="card" style={{ padding: '1.25rem 2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '2rem' }}>🚛</span>
              <div>
                <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem', color: '#fff' }}>{selectedDriver.name}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-2)' }}>
                  {dailyAssignment ? `Route: ${dailyAssignment.routes?.name || 'Local Route'} (${dailyAssignment.vehicle_number})` : 'Active Route Workspace'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-2)', textTransform: 'uppercase' }}>Today Sales</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>₹{(driverStats[selectedDriver.id]?.sales || 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-2)', textTransform: 'uppercase' }}>Today Collection</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399' }}>₹{(driverStats[selectedDriver.id]?.collection || 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-2)', textTransform: 'uppercase' }}>Issued Loads</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#60a5fa' }}>{driverLoadsList.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-2)', textTransform: 'uppercase' }}>Settlements</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399' }}>{driverSettlementsList.length}</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs inside Driver Workspace */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            overflowX: 'auto', 
            paddingBottom: '0.75rem', 
            marginBottom: '1.5rem', 
            borderBottom: '1px solid var(--border)' 
          }}>
            {[
              { id: 'load_dispatches', label: '🚚 Truck Load Dispatches', icon: '' },
              { id: 'route_settlement', label: '⚖️ Route Settlement & Reconciliation', icon: '' },
              ...(isNagaraju ? [{ id: 'local', label: '📋 Customer Stop Sheet', icon: '' }] : []),
              ...(isDriver2  ? [{ id: 'non-local', label: '📋 Customer Stop Sheet', icon: '' }] : []),
              { id: 'settlement_history', label: '📜 Settlement Log', icon: '' },
              { id: 'collections', label: '💰 Collections Log', icon: '' },
              { id: 'dues', label: '🔴 Route Dues', icon: '' },
              { id: 'daily', label: '📅 Daily Sales', icon: '' },
              { id: 'monthly', label: '📈 Monthly Sales', icon: '' },
              { id: 'expenses', label: '💸 Expenses', icon: '' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={activeTab === tab.id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                style={{ borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: '700', whiteSpace: 'nowrap' }}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* =========================================================================
              TAB 1: TRUCK LOAD DISPATCHES (PART 5 — STEP 1)
              ========================================================================= */}
          {activeTab === 'load_dispatches' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                      🚚 Driver Truck Load Dispatches
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', margin: '0.25rem 0 0' }}>
                      Warehouse stock issued for distribution. Deducts stock at dispatch time. Not a sales invoice.
                    </p>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowIssueModal(true)}
                  >
                    + Issue New Truck Load
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Dispatch Number</th>
                        <th>Date</th>
                        <th>Vehicle</th>
                        <th>Route</th>
                        <th style={{ textAlign: 'center' }}>Loaded Items</th>
                        <th style={{ textAlign: 'center' }}>Total Qty</th>
                        <th style={{ textAlign: 'right' }}>Load Value</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverLoadsList.map(load => (
                        <tr key={load.id}>
                          <td style={{ fontWeight: '700', color: '#60a5fa', fontFamily: 'var(--font-m)' }}>
                            {load.dispatch_number}
                          </td>
                          <td>{load.dispatch_date}</td>
                          <td>{load.vehicle_number || 'AP 16 AB 1234'}</td>
                          <td>{load.route_name || 'Assigned Route'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                              {(load.items || []).map(it => `${it.product_name} (${it.loaded_quantity})`).join(', ')}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>
                            {load.total_loaded_qty}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '700' }}>
                            ₹{load.total_load_value.toLocaleString('en-IN')}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${load.status === 'SETTLED' ? 'badge-success' : 'badge-primary'}`}>
                              {load.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                className="btn btn-secondary btn-xs"
                                onClick={() => printLoadDispatchNote(load)}
                                title="Print Load Dispatch Note"
                              >
                                🖨️ Note
                              </button>
                              {load.status === 'ISSUED' && (
                                <button
                                  className="btn btn-primary btn-xs"
                                  onClick={() => {
                                    initSettlementForDispatch(load)
                                    setActiveTab('route_settlement')
                                  }}
                                  title="Reconcile and settle this route run"
                                >
                                  ⚖️ Settle Route
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {driverLoadsList.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-2)' }}>
                            No truck loads dispatched yet for {selectedDriver.name}. Click "+ Issue New Truck Load" to issue inventory.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 2: ROUTE SETTLEMENT & 4-WAY RECONCILIATION (PART 5 — STEPS 3 & 4)
              Loaded = Sold + Returned (Good) + Leaked/Damaged + Unaccounted
              ========================================================================= */}
          {activeTab === 'route_settlement' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                      ⚖️ Driver Route Settlement & Physical Stock Reconciliation
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: '0.25rem 0 0' }}>
                      Reconcile loaded products against actual sales, returns, and leakages. Good returns are checked back into warehouse stock.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>Select Load Dispatch:</label>
                    <select
                      className="form-input"
                      style={{ width: '260px' }}
                      value={selectedDispatchToSettle?.id || ''}
                      onChange={e => {
                        const target = driverLoadsList.find(l => l.id === e.target.value)
                        if (target) initSettlementForDispatch(target)
                      }}
                    >
                      <option value="">-- Choose Dispatched Load --</option>
                      {driverLoadsList.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.dispatch_number} ({l.dispatch_date}) — {l.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedDispatchToSettle ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Header Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--surface-3)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', textTransform: 'uppercase' }}>Dispatch Number</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#60a5fa' }}>{selectedDispatchToSettle.dispatch_number}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', textTransform: 'uppercase' }}>Dispatch Date</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff' }}>{selectedDispatchToSettle.dispatch_date}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', textTransform: 'uppercase' }}>Vehicle</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff' }}>{selectedDispatchToSettle.vehicle_number || 'AP 16 AB 1234'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', textTransform: 'uppercase' }}>Settlement Date</div>
                        <input
                          type="date"
                          className="form-input"
                          style={{ padding: '0.25rem 0.5rem', height: '32px', fontSize: '0.85rem' }}
                          value={settlementDate}
                          onChange={e => setSettlementDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Stock Reconciliation Grid */}
                    <div style={{ overflowX: 'auto' }}>
                      <table className="erp-table">
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th style={{ textAlign: 'center', width: '100px' }}>Loaded Qty</th>
                            <th style={{ textAlign: 'center', width: '110px' }}>Sold Qty</th>
                            <th style={{ textAlign: 'center', width: '110px' }}>Returned (Good)</th>
                            <th style={{ textAlign: 'center', width: '110px' }}>Leaked / Damaged</th>
                            <th style={{ textAlign: 'center', width: '100px' }}>Unaccounted</th>
                            <th style={{ textAlign: 'right', width: '100px' }}>Rate (₹)</th>
                            <th style={{ textAlign: 'right', width: '110px' }}>Sold Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settlementRows.map((r, idx) => {
                            const accounted = Number(r.sold_qty) + Number(r.returned_good_qty) + Number(r.leaked_damaged_qty)
                            const unaccounted = Number(r.loaded_qty) - accounted
                            const isOver = accounted > Number(r.loaded_qty)

                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: '700', color: '#fff' }}>{r.product_name}</td>
                                <td style={{ textAlign: 'center', fontWeight: '700', color: '#60a5fa' }}>{r.loaded_qty}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="number"
                                    className="form-input"
                                    style={{ width: '80px', textAlign: 'center', padding: '0.25rem' }}
                                    value={r.sold_qty}
                                    onChange={e => {
                                      const val = Math.max(0, Number(e.target.value))
                                      setSettlementRows(prev => prev.map((item, i) => i === idx ? { ...item, sold_qty: val } : item))
                                    }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="number"
                                    className="form-input"
                                    style={{ width: '80px', textAlign: 'center', padding: '0.25rem', color: '#34d399' }}
                                    value={r.returned_good_qty}
                                    placeholder="0"
                                    onChange={e => {
                                      const val = Math.max(0, Number(e.target.value))
                                      setSettlementRows(prev => prev.map((item, i) => i === idx ? { ...item, returned_good_qty: val } : item))
                                    }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="number"
                                    className="form-input"
                                    style={{ width: '80px', textAlign: 'center', padding: '0.25rem', color: '#f87171' }}
                                    value={r.leaked_damaged_qty}
                                    placeholder="0"
                                    onChange={e => {
                                      const val = Math.max(0, Number(e.target.value))
                                      setSettlementRows(prev => prev.map((item, i) => i === idx ? { ...item, leaked_damaged_qty: val } : item))
                                    }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: '800', color: isOver ? '#f87171' : unaccounted > 0 ? '#fbbf24' : '#34d399' }}>
                                  {isOver ? `Over by ${accounted - r.loaded_qty}` : unaccounted}
                                </td>
                                <td style={{ textAlign: 'right' }}>₹{r.rate}</td>
                                <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{round2(r.sold_qty * r.rate)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Financials & Expenses Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      
                      {/* Collections Card */}
                      <div className="card" style={{ padding: '1.25rem', background: 'var(--surface-3)' }}>
                        <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>
                          💰 Route Collections
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.8125rem' }}>Cash Collected (₹):</label>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '130px', textAlign: 'right', color: '#34d399' }}
                              value={settlementCash}
                              onChange={e => setSettlementCash(Math.max(0, Number(e.target.value)))}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.8125rem' }}>UPI Collected (₹):</label>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '130px', textAlign: 'right', color: '#34d399' }}
                              value={settlementUpi}
                              onChange={e => setSettlementUpi(Math.max(0, Number(e.target.value)))}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.8125rem' }}>Credit Sales (Due) (₹):</label>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '130px', textAlign: 'right', color: '#fbbf24' }}
                              value={settlementCredit}
                              onChange={e => setSettlementCredit(Math.max(0, Number(e.target.value)))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Route Expenses Card */}
                      <div className="card" style={{ padding: '1.25rem', background: 'var(--surface-3)' }}>
                        <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>
                          💸 Route Trip Expenses
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.8125rem' }}>Fuel Charges (₹):</label>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '130px', textAlign: 'right' }}
                              value={settlementFuel}
                              onChange={e => setSettlementFuel(Math.max(0, Number(e.target.value)))}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.8125rem' }}>Driver Bata (₹):</label>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '130px', textAlign: 'right' }}
                              value={settlementBata}
                              onChange={e => setSettlementBata(Math.max(0, Number(e.target.value)))}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.8125rem' }}>Other Expenses (₹):</label>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '130px', textAlign: 'right' }}
                              value={settlementOtherExp}
                              onChange={e => setSettlementOtherExp(Math.max(0, Number(e.target.value)))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Cashier Handover Reconciliation */}
                      <div className="card" style={{ padding: '1.25rem', background: 'var(--surface-3)' }}>
                        <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>
                          ⚖️ Cashier Handover Reconciliation
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-2)' }}>Expected Handover:</span>
                            <strong>₹{Math.max(0, settlementCash + settlementUpi - (settlementFuel + settlementBata + settlementOtherExp)).toLocaleString('en-IN')}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                            <span style={{ fontWeight: '700', color: '#fff' }}>Actual Handover (₹):</span>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '130px', textAlign: 'right', fontWeight: '800', color: '#34d399' }}
                              value={settlementActualHandover}
                              onChange={e => setSettlementActualHandover(Math.max(0, Number(e.target.value)))}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                            <span style={{ color: 'var(--text-2)' }}>Difference:</span>
                            <strong style={{ color: (settlementActualHandover - Math.max(0, settlementCash + settlementUpi - (settlementFuel + settlementBata + settlementOtherExp))) === 0 ? '#34d399' : '#f87171' }}>
                              ₹{(settlementActualHandover - Math.max(0, settlementCash + settlementUpi - (settlementFuel + settlementBata + settlementOtherExp))).toLocaleString('en-IN')}
                            </strong>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Discrepancy Reason field */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: '700' }}>
                        Discrepancy Explanation / Notes (Required if shortage or cash mismatch exists):
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 2 leaked cans reported, ₹50 shortage approved for route toll"
                        value={settlementDiscrepancyReason}
                        onChange={e => setSettlementDiscrepancyReason(e.target.value)}
                      />
                    </div>

                    {/* Confirmation Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          id="autoGen"
                          checked={autoGenerateCustomerBills}
                          onChange={e => setAutoGenerateCustomerBills(e.target.checked)}
                        />
                        <label htmlFor="autoGen" style={{ fontSize: '0.8125rem', color: 'var(--text-2)', cursor: 'pointer' }}>
                          Generate official customer invoices for completed sales (prevents double inventory deduction)
                        </label>
                      </div>

                      <button
                        className="btn btn-primary btn-lg"
                        style={{ minWidth: '260px' }}
                        onClick={handleConfirmRouteSettlement}
                        disabled={settlingRoute}
                      >
                        {settlingRoute ? 'Processing Settlement...' : '🏁 Confirm & Finalize Route Settlement'}
                      </button>
                    </div>

                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-2)' }}>
                    Please select an issued truck load from the dropdown above to begin settlement and reconciliation.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 3: SETTLEMENT HISTORY (AUDIT TRAIL)
              ========================================================================= */}
          {activeTab === 'settlement_history' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                    📜 Confirmed Route Settlement Audit Log
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', margin: '0.25rem 0 0' }}>
                    Historical log of reconciled routes, physical stock returns, leakages, and cash collections.
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Settlement #</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'center' }}>Loaded</th>
                      <th style={{ textAlign: 'center' }}>Sold</th>
                      <th style={{ textAlign: 'center' }}>Good Returns</th>
                      <th style={{ textAlign: 'center' }}>Leaked / Scrap</th>
                      <th style={{ textAlign: 'center' }}>Shortage</th>
                      <th style={{ textAlign: 'right' }}>Net Collections</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverSettlementsList.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: '700', color: '#60a5fa', fontFamily: 'var(--font-m)' }}>
                          {s.settlement_number}
                        </td>
                        <td>{s.settlement_date}</td>
                        <td style={{ textAlign: 'center' }}>{s.total_loaded_qty}</td>
                        <td style={{ textAlign: 'center', fontWeight: '700' }}>{s.total_sold_qty}</td>
                        <td style={{ textAlign: 'center', color: '#34d399', fontWeight: '700' }}>{s.total_returned_qty}</td>
                        <td style={{ textAlign: 'center', color: '#f87171', fontWeight: '700' }}>{s.total_leaked_qty}</td>
                        <td style={{ textAlign: 'center', color: s.unaccounted_qty > 0 ? '#fbbf24' : 'inherit' }}>{s.unaccounted_qty}</td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: '#34d399' }}>₹{s.actual_collection.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => printSettlementSummary(s)}
                          >
                            🖨️ Summary
                          </button>
                        </td>
                      </tr>
                    ))}
                    {driverSettlementsList.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-2)' }}>
                          No confirmed route settlements recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MAIN DRIVER ROUTE COMPLETION & CUSTOMER STOP SHEET */}
          {(activeTab === 'local' || activeTab === 'non-local') && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Route Customer Stop Sheet with Auto/Manual Rates */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                      📋 Route Customer Stop Registry ({selectedRoute?.name || 'Local Route'})
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', margin: '0.25rem 0 0' }}>
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
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>
                  📊 Route Run Completion & Reconciliation Summary
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--surface-3)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Total Route Sales</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>₹{summarySales.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: 'var(--surface-3)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Cash Collected</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>₹{summaryCash.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: 'var(--surface-3)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>UPI Collected</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>₹{summaryUpi.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: 'var(--surface-3)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Outstanding Dues</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: summaryDue > 0 ? '#f87171' : '#34d399', marginTop: '0.25rem' }}>₹{summaryDue.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: 'var(--surface-3)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Returned / Leaked</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.25rem' }}>
                      {summaryReturned} ret / {summaryLeaked} leak
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>Net Reconciliation Collection: </span>
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

          {/* TAB 4: COLLECTIONS */}
          {activeTab === 'collections' && (
            <div className="card" style={{ overflow: 'hidden' }}>
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
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-2)' }}>
                          No collections registered today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: DUE REPORTS */}
          {activeTab === 'dues' && (
            <div className="card" style={{ overflow: 'hidden' }}>
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
                        <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-2)' }}>
                          No outstanding customer dues for active route.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: DAILY SALES */}
          {activeTab === 'daily' && (
            <div className="card" style={{ overflow: 'hidden' }}>
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
                        <td style={{ fontFamily: 'var(--font-m)', color: '#3b82f6', fontWeight: '600' }}>{s.invoice_number}</td>
                        <td style={{ fontWeight: '600', color: '#fff' }}>{s.customer_name}</td>
                        <td>{s.product_name}</td>
                        <td style={{ textAlign: 'center' }}>{s.quantity}</td>
                        <td style={{ textAlign: 'right' }}>₹{s.rate}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{s.total_amount}</td>
                      </tr>
                    ))}
                    {dailySalesList.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-2)' }}>
                          No sales registered today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: MONTHLY SALES */}
          {activeTab === 'monthly' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-header"><h3 className="card-title">📈 Current Month Route Sales</h3></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice No</th>
                      <th>Customer Name</th>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySalesList.map((s, idx) => (
                      <tr key={idx}>
                        <td>{s.sale_date}</td>
                        <td style={{ fontFamily: 'var(--font-m)', color: '#3b82f6' }}>{s.invoice_number}</td>
                        <td style={{ fontWeight: '600', color: '#fff' }}>{s.customer_name}</td>
                        <td>{s.product_name}</td>
                        <td style={{ textAlign: 'center' }}>{s.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{s.total_amount}</td>
                      </tr>
                    ))}
                    {monthlySalesList.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-2)' }}>
                          No sales registered this month.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: EXPENSES */}
          {activeTab === 'expenses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="card" style={{ padding: '1.5rem' }}>
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

              <div className="card" style={{ overflow: 'hidden' }}>
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
                          <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-2)' }}>
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

      {/* MODAL 1: ISSUE NEW TRUCK LOAD DISPATCH */}
      {showIssueModal && selectedDriver && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                🚚 Issue Truck Load Dispatch to Driver
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowIssueModal(false)}>✕</button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Driver Name</label>
                  <input className="form-input" value={selectedDriver.name} readOnly style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Dispatch Date</label>
                  <input type="date" className="form-input" value={loadDispatchDate} onChange={e => setLoadDispatchDate(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Vehicle Number</label>
                  <input type="text" className="form-input" placeholder="e.g. AP 16 AB 1234" value={loadVehicle} onChange={e => setLoadVehicle(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned Route</label>
                  <select className="form-input" value={loadRouteId} onChange={e => setLoadRouteId(e.target.value)}>
                    <option value="">Select Route...</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line items table */}
              <div>
                <label className="form-label" style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Products to Load (Deducts Warehouse Stock):</label>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                  <table className="erp-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Loaded Qty</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Rate (₹)</th>
                        <th style={{ width: '110px', textAlign: 'right' }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadItems.map((it, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '600', color: '#fff' }}>{it.product_name}</td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '75px', textAlign: 'center', padding: '0.25rem' }}
                              value={it.loaded_quantity}
                              onChange={e => {
                                const val = Math.max(0, Number(e.target.value))
                                setLoadItems(prev => prev.map((item, i) => i === idx ? { ...item, loaded_quantity: val, amount: round2(val * item.rate) } : item))
                              }}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '85px', textAlign: 'right', padding: '0.25rem' }}
                              value={it.rate}
                              onChange={e => {
                                const val = Math.max(0, Number(e.target.value))
                                setLoadItems(prev => prev.map((item, i) => i === idx ? { ...item, rate: val, amount: round2(item.loaded_quantity * val) } : item))
                              }}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '700' }}>
                            ₹{round2(it.loaded_quantity * it.rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--surface-3)', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontWeight: '700' }}>
                <span>Total Load Quantity: {loadItems.reduce((s, it) => s + Number(it.loaded_quantity), 0)} units</span>
                <span style={{ color: '#60a5fa' }}>Total Load Value: ₹{loadItems.reduce((s, it) => s + (it.loaded_quantity * it.rate), 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <input type="text" className="form-input" placeholder="Optional dispatch notes..." value={loadNotes} onChange={e => setLoadNotes(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleIssueDriverLoad}
                  disabled={loadIssuing || loadItems.reduce((s, it) => s + Number(it.loaded_quantity), 0) <= 0}
                >
                  {loadIssuing ? 'Issuing Load...' : '🚚 Confirm & Issue Dispatch'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FLOATING BILLING MODAL SHEET */}
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
                <input className="form-input" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }} value={billingCustomer.name} readOnly />
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Rate (₹)</label>
                    <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontWeight: 800 }}>
                      {billingForm.rate_source || 'Route Rate'}
                    </span>
                  </div>
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
                background: 'var(--surface-3)',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-2)' }}>Total Amount:</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>
                    ₹{billingForm.qty * billingForm.rate}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--text-2)' }}>Outstanding Due:</span>
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

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
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

      {/* RECEIPT & SETTLEMENT PREVIEW MODAL */}
      <ReceiptPreviewModal
        isOpen={!!previewBill}
        onClose={() => setPreviewBill(null)}
        bill={previewBill}
        initialFormat="80mm"
      />

    </div>
  )
}
