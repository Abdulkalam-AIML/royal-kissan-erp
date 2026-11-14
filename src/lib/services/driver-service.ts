import { createClient } from '@/lib/supabase/client'
import { emitDataChange } from '@/lib/events/data-sync'

export interface DriverWithStats {
  id: string
  employee_id?: string | null
  name: string
  phone: string
  license_number?: string | null
  vehicle_number?: string | null
  assigned_vehicle?: string | null
  address?: string | null
  joining_date?: string | null
  salary: number
  employment_status: string // 'ACTIVE' | 'INACTIVE'
  status: 'AVAILABLE' | 'ON_ROUTE' | 'INACTIVE'
  is_active: boolean
  total_completed_routes: number
  total_sales: number
  total_collections: number
  created_at?: string
}

export interface RouteLoadItem {
  id?: string
  product_id?: string | null
  product_name: string
  unit: string
  loaded_quantity: number
  rate: number
  amount: number
  sold_quantity?: number
  returned_quantity?: number
  leaked_quantity?: number
}

export interface RouteDispatchRecord {
  id: string
  dispatch_number: string
  driver_id: string
  driver_name: string
  vehicle_number?: string | null
  route_id?: string | null
  route_name?: string | null
  dispatch_date: string
  start_time?: string | null
  end_time?: string | null
  start_location?: string | null
  destination_areas?: string | null
  total_loaded_qty: number
  total_load_value: number
  total_sold_qty?: number
  total_returned_qty?: number
  total_leaked_qty?: number
  unaccounted_qty?: number
  total_sales_amount?: number
  cash_collected?: number
  upi_collected?: number
  credit_amount?: number
  expenses_amount?: number
  bills_generated?: boolean
  bills_count?: number
  status: 'IN_PROGRESS' | 'COMPLETED' | 'SETTLED' | 'CANCELLED' | 'ISSUED'
  notes?: string | null
  created_by?: string
  created_at: string
  updated_at?: string
  items?: RouteLoadItem[]
  sales?: RouteCustomerSale[]
  expenses?: RouteExpenseRecord[]
  settlement?: any
  generated_bills?: any[]
}

export interface RouteCustomerSale {
  id?: string
  dispatch_id: string
  driver_id: string
  route_id?: string | null
  customer_name: string
  customer_phone?: string | null
  product_name: string
  quantity: number
  unit?: string
  rate: number
  total_amount: number
  discount?: number
  gst_amount?: number
  payment_type: 'CASH' | 'UPI' | 'CREDIT'
  cash_paid: number
  upi_paid: number
  due_amount: number
  sale_date: string
  remarks?: string | null
  bill_id?: string | null
  created_at?: string
}

export interface RouteExpenseRecord {
  id?: string
  dispatch_id?: string | null
  route_id?: string | null
  driver_id?: string | null
  fuel_charges: number
  driver_bata: number
  other_expenses: number
  remarks?: string | null
  expense_date: string
  vehicle_number?: string | null
  created_at?: string
}

export interface StartRoutePayload {
  route_name: string
  driver_id: string
  driver_name: string
  vehicle_number: string
  dispatch_date: string
  start_time: string
  start_location: string
  destination_areas?: string
  notes?: string
  items: Array<{
    product_id?: string | null
    product_name: string
    unit: string
    loaded_quantity: number
    rate: number
    amount: number
  }>
}

export interface FinalizeRoutePayload {
  load_dispatch_id: string
  driver_id: string
  route_id?: string | null
  route_name?: string | null
  settlement_date: string
  start_time?: string
  end_time?: string
  total_loaded_qty: number
  total_sold_qty: number
  total_returned_qty: number
  total_leaked_qty: number
  unaccounted_qty: number
  cash_collected: number
  upi_collected: number
  credit_sales_amount: number
  route_expenses_amount: number
  expected_collection: number
  actual_collection: number
  collection_difference: number
  discrepancy_reason?: string | null
  confirmed_by?: string
  items: Array<{
    product_id?: string | null
    product_name: string
    loaded_qty: number
    sold_qty: number
    returned_good_qty: number
    leaked_damaged_qty: number
    rate: number
    condition?: string
  }>
  customer_sales: RouteCustomerSale[]
}

/**
 * MODULE 1: Get Drivers Directory
 */
export async function getDrivers(): Promise<DriverWithStats[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('name', { ascending: true })

    if (error || !data) return []

    return data.map(d => ({
      ...d,
      status: (d.status || (d.is_active ? 'AVAILABLE' : 'INACTIVE')).toUpperCase(),
      employment_status: d.employment_status || (d.is_active ? 'ACTIVE' : 'INACTIVE'),
      total_completed_routes: Number(d.total_completed_routes || 0),
      total_sales: Number(d.total_sales || 0),
      total_collections: Number(d.total_collections || 0),
      salary: Number(d.salary || 0)
    })) as DriverWithStats[]
  } catch {
    return []
  }
}

/**
 * MODULE 1: Create or Update Driver
 */
export async function saveDriver(
  driverData: Partial<DriverWithStats>
): Promise<{ success: boolean; driver?: DriverWithStats; message?: string }> {
  const supabase = createClient()
  try {
    const payload = {
      name: driverData.name,
      phone: driverData.phone,
      license_number: driverData.license_number || null,
      vehicle_number: driverData.vehicle_number || null,
      assigned_vehicle: driverData.assigned_vehicle || null,
      address: driverData.address || null,
      joining_date: driverData.joining_date || new Date().toISOString().split('T')[0],
      salary: Number(driverData.salary || 0),
      is_active: driverData.is_active !== false,
      employment_status: driverData.employment_status || 'ACTIVE',
      status: driverData.status || 'AVAILABLE'
    }

    if (driverData.id) {
      const { data, error } = await supabase
        .from('drivers')
        .update(payload)
        .eq('id', driverData.id)
        .select()
        .single()

      if (error) throw error
      emitDataChange('drivers')
      return { success: true, driver: data, message: 'Driver details updated successfully!' }
    } else {
      const { data, error } = await supabase
        .from('drivers')
        .insert([payload])
        .select()
        .single()

      if (error) throw error
      emitDataChange('drivers')
      return { success: true, driver: data, message: 'New driver created successfully!' }
    }
  } catch (err: any) {
    return { success: false, message: `Failed to save driver: ${err?.message || err}` }
  }
}

/**
 * MODULE 2A: START A ROUTE
 * Reserves/deducts stock once, creates dispatch reference, changes driver status to ON_ROUTE,
 * marks route IN_PROGRESS. Stored in DB permanently.
 */
export async function startDriverRoute(
  payload: StartRoutePayload
): Promise<{ success: boolean; dispatch?: RouteDispatchRecord; message?: string }> {
  if (!payload.items || payload.items.length === 0) {
    return { success: false, message: 'At least one product item must be loaded.' }
  }

  const supabase = createClient()
  const dispatchHeader = {
    driver_id: payload.driver_id,
    driver_name: payload.driver_name,
    vehicle_number: payload.vehicle_number,
    route_name: payload.route_name,
    dispatch_date: payload.dispatch_date || new Date().toISOString().split('T')[0],
    start_time: payload.start_time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    start_location: payload.start_location || 'Main Factory Plant',
    destination_areas: payload.destination_areas || '',
    notes: payload.notes || null,
    created_by: 'Operations Supervisor'
  }

  try {
    const { data, error } = await supabase.rpc('start_driver_route', {
      p_dispatch: dispatchHeader,
      p_items: payload.items
    })

    if (error) {
      return { success: false, message: `Failed to start route: ${error.message}` }
    }

    emitDataChange('drivers')
    emitDataChange('routes')
    emitDataChange('stock')
    emitDataChange('products')

    return {
      success: true,
      dispatch: data as RouteDispatchRecord,
      message: `Route "${payload.route_name}" started successfully! Route ID: ${data.dispatch_number}`
    }
  } catch (err: any) {
    return { success: false, message: `Error starting route: ${err?.message || err}` }
  }
}

/**
 * MODULE 2B: Get Active Routes (IN_PROGRESS)
 * Remains visible across refreshes until manually ended.
 */
export async function getActiveRoutes(): Promise<RouteDispatchRecord[]> {
  const supabase = createClient()
  try {
    const { data: dispatches, error } = await supabase
      .from('driver_load_dispatches')
      .select('*, driver_load_items(*)')
      .in('status', ['IN_PROGRESS', 'ISSUED'])
      .order('created_at', { ascending: false })

    if (error || !dispatches) return []

    // Fetch related route_sales and route_expenses for live active summary
    const dispatchIds = dispatches.map(d => d.id)
    const salesMap: Record<string, RouteCustomerSale[]> = {}
    const expensesMap: Record<string, RouteExpenseRecord[]> = {}

    if (dispatchIds.length > 0) {
      const [{ data: sales }, { data: expenses }] = await Promise.all([
        supabase.from('route_sales').select('*').in('dispatch_id', dispatchIds),
        supabase.from('route_expenses').select('*').in('dispatch_id', dispatchIds)
      ])

      if (sales) {
        for (const s of sales) {
          if (!salesMap[s.dispatch_id]) salesMap[s.dispatch_id] = []
          salesMap[s.dispatch_id].push(s)
        }
      }
      if (expenses) {
        for (const e of expenses) {
          if (e.dispatch_id) {
            if (!expensesMap[e.dispatch_id]) expensesMap[e.dispatch_id] = []
            expensesMap[e.dispatch_id].push(e)
          }
        }
      }
    }

    return dispatches.map(d => {
      const items = (d.driver_load_items || []) as RouteLoadItem[]
      const sales = salesMap[d.id] || []
      const expenses = expensesMap[d.id] || []

      // Calculate live numbers
      const totalSoldQty = sales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0)
      const totalSalesAmt = sales.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0)
      const cashCollected = sales.reduce((acc, s) => acc + (Number(s.cash_paid) || 0), 0)
      const upiCollected = sales.reduce((acc, s) => acc + (Number(s.upi_paid) || 0), 0)
      const creditAmt = sales.reduce((acc, s) => acc + (Number(s.due_amount) || 0), 0)
      const expensesAmt = expenses.reduce((acc, e) => acc + (Number(e.fuel_charges || 0) + Number(e.driver_bata || 0) + Number(e.other_expenses || 0)), 0)

      const totalReturned = items.reduce((acc, i) => acc + (Number(i.returned_quantity) || 0), 0)
      const totalLeaked = items.reduce((acc, i) => acc + (Number(i.leaked_quantity) || 0), 0)

      return {
        ...d,
        status: d.status || 'IN_PROGRESS',
        total_loaded_qty: Number(d.total_loaded_qty || 0),
        total_load_value: Number(d.total_load_value || 0),
        total_sold_qty: totalSoldQty,
        total_returned_qty: totalReturned,
        total_leaked_qty: totalLeaked,
        total_sales_amount: totalSalesAmt,
        cash_collected: cashCollected,
        upi_collected: upiCollected,
        credit_amount: creditAmt,
        expenses_amount: expensesAmt,
        items,
        sales,
        expenses
      } as RouteDispatchRecord
    })
  } catch {
    return []
  }
}

/**
 * MODULE 2C: Record Route Customer Sale
 */
export async function recordRouteCustomerSale(
  payload: {
    dispatch_id: string
    driver_id: string
    route_id?: string | null
    customer_name: string
    customer_phone?: string | null
    product_name: string
    quantity: number
    unit?: string
    rate: number
    total_amount: number
    discount?: number
    gst_amount?: number
    payment_type: 'CASH' | 'UPI' | 'CREDIT'
    cash_paid: number
    upi_paid: number
    due_amount: number
    remarks?: string | null
    sale_date?: string
  }
): Promise<{ success: boolean; sale?: RouteCustomerSale; message?: string }> {
  const supabase = createClient()
  try {
    const saleDate = payload.sale_date || new Date().toISOString().split('T')[0]
    const invoiceNumber = `RK-RSALE-${Date.now().toString().slice(-6)}`

    const { data, error } = await supabase
      .from('route_sales')
      .insert([{
        dispatch_id: payload.dispatch_id,
        driver_id: payload.driver_id,
        route_id: payload.route_id || null,
        invoice_number: invoiceNumber,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone || null,
        product_name: payload.product_name,
        quantity: payload.quantity,
        unit: payload.unit || 'cans',
        rate: payload.rate,
        total_amount: payload.total_amount,
        discount: payload.discount || 0,
        gst_amount: payload.gst_amount || 0,
        payment_type: payload.payment_type || 'CASH',
        cash_paid: payload.cash_paid || 0,
        upi_paid: payload.upi_paid || 0,
        due_amount: payload.due_amount || 0,
        sale_date: saleDate,
        remarks: payload.remarks || null
      }])
      .select()
      .single()

    if (error) throw error

    emitDataChange('sales')
    emitDataChange('routes')

    return {
      success: true,
      sale: data,
      message: `Sale of ₹${payload.total_amount} recorded for ${payload.customer_name}!`
    }
  } catch (err: any) {
    return { success: false, message: `Failed to record customer sale: ${err?.message || err}` }
  }
}

/**
 * MODULE 2B: Record Route Returns & Leakage on Active Route
 */
export async function updateRouteReturnsAndLeakage(
  dispatchId: string,
  items: Array<{
    id: string
    returned_quantity: number
    leaked_quantity: number
  }>
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()
  try {
    for (const it of items) {
      await supabase
        .from('driver_load_items')
        .update({
          returned_quantity: it.returned_quantity,
          leaked_quantity: it.leaked_quantity
        })
        .eq('id', it.id)
    }

    emitDataChange('routes')
    return { success: true, message: 'Route returns and leakage updated successfully.' }
  } catch (err: any) {
    return { success: false, message: `Failed to update returns: ${err?.message || err}` }
  }
}

/**
 * MODULE 2B: Record Route Expenses
 */
export async function recordRouteExpense(
  payload: {
    dispatch_id: string
    driver_id?: string | null
    route_id?: string | null
    fuel_charges: number
    driver_bata: number
    other_expenses: number
    remarks?: string | null
    expense_date?: string
    vehicle_number?: string | null
  }
): Promise<{ success: boolean; expense?: RouteExpenseRecord; message?: string }> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('route_expenses')
      .insert([{
        dispatch_id: payload.dispatch_id,
        driver_id: payload.driver_id || null,
        route_id: payload.route_id || null,
        fuel_charges: payload.fuel_charges || 0,
        driver_bata: payload.driver_bata || 0,
        other_expenses: payload.other_expenses || 0,
        remarks: payload.remarks || null,
        expense_date: payload.expense_date || new Date().toISOString().split('T')[0],
        vehicle_number: payload.vehicle_number || null
      }])
      .select()
      .single()

    if (error) throw error

    emitDataChange('expenses')
    emitDataChange('routes')

    return {
      success: true,
      expense: data,
      message: 'Route expense recorded successfully.'
    }
  } catch (err: any) {
    return { success: false, message: `Failed to record route expense: ${err?.message || err}` }
  }
}

/**
 * MODULE 2D & MODULE 3: Finalize Route, Reconcile & Generate Customer Invoices
 * Reconciles starting load = sold + good returns + leaked + other.
 * Generates customer bills in bills and bill_items.
 * Checks back good returned stock into warehouse.
 * Updates customer dues and collections.
 * Marks route COMPLETED and driver AVAILABLE.
 */
export async function finalizeRouteAndGenerateBills(
  payload: FinalizeRoutePayload
): Promise<{ success: boolean; settlement?: any; message?: string }> {
  const supabase = createClient()

  // Front-end reconciliation sanity check
  for (const it of payload.items) {
    const accounted = (Number(it.sold_qty) || 0) + (Number(it.returned_good_qty) || 0) + (Number(it.leaked_damaged_qty) || 0)
    if (accounted > Number(it.loaded_qty)) {
      return {
        success: false,
        message: `Reconciliation error: Accounted quantity (${accounted}) exceeds starting load (${it.loaded_qty}) for ${it.product_name}.`
      }
    }
  }

  const settlementHeader = {
    load_dispatch_id: payload.load_dispatch_id,
    driver_id: payload.driver_id,
    route_id: payload.route_id || null,
    settlement_date: payload.settlement_date || new Date().toISOString().split('T')[0],
    end_time: payload.end_time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    total_loaded_qty: payload.total_loaded_qty,
    total_sold_qty: payload.total_sold_qty,
    total_returned_qty: payload.total_returned_qty,
    total_leaked_qty: payload.total_leaked_qty,
    unaccounted_qty: payload.unaccounted_qty || 0,
    cash_collected: payload.cash_collected,
    upi_collected: payload.upi_collected,
    credit_sales_amount: payload.credit_sales_amount,
    route_expenses_amount: payload.route_expenses_amount,
    expected_collection: payload.expected_collection,
    actual_collection: payload.actual_collection,
    collection_difference: payload.collection_difference,
    discrepancy_reason: payload.discrepancy_reason || null,
    confirmed_by: payload.confirmed_by || 'Operations Supervisor'
  }

  try {
    const { data, error } = await supabase.rpc('finalize_route_and_generate_bills', {
      p_settlement: settlementHeader,
      p_items: payload.items,
      p_customer_sales: payload.customer_sales || []
    })

    if (error) {
      return { success: false, message: `Route finalization failed: ${error.message}` }
    }

    emitDataChange('routes')
    emitDataChange('drivers')
    emitDataChange('bills')
    emitDataChange('sales')
    emitDataChange('collections')
    emitDataChange('stock')
    emitDataChange('dues')

    return {
      success: true,
      settlement: data,
      message: `Route finalized successfully! ${data.bills_generated_count || payload.customer_sales.length} customer invoices generated and driver marked AVAILABLE.`
    }
  } catch (err: any) {
    return { success: false, message: `Error finalizing route: ${err?.message || err}` }
  }
}

/**
 * MODULE 4: Get Completed Routes History
 */
export async function getCompletedRoutes(): Promise<RouteDispatchRecord[]> {
  const supabase = createClient()
  try {
    const { data: dispatches, error } = await supabase
      .from('driver_load_dispatches')
      .select('*, driver_load_items(*)')
      .in('status', ['COMPLETED', 'SETTLED'])
      .order('dispatch_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error || !dispatches) return []

    // Fetch settlements and bills count
    const dispatchIds = dispatches.map(d => d.id)
    const settlementsMap: Record<string, any> = {}
    const billsMap: Record<string, any[]> = {}

    if (dispatchIds.length > 0) {
      const [{ data: settlements }, { data: bills }] = await Promise.all([
        supabase.from('driver_route_settlements').select('*, driver_route_settlement_items(*)').in('load_dispatch_id', dispatchIds),
        supabase.from('bills').select('id, invoice_number, customer_name, customer_phone, grand_total, paid_amount, due_amount, payment_mode, dispatch_id, bill_items(*)').in('dispatch_id', dispatchIds)
      ])

      if (settlements) {
        for (const s of settlements) {
          settlementsMap[s.load_dispatch_id] = s
        }
      }

      if (bills) {
        for (const b of bills) {
          if (b.dispatch_id) {
            if (!billsMap[b.dispatch_id]) billsMap[b.dispatch_id] = []
            billsMap[b.dispatch_id].push({
              ...b,
              items: b.bill_items || []
            })
          }
        }
      }
    }

    return dispatches.map(d => ({
      ...d,
      items: d.driver_load_items || [],
      settlement: settlementsMap[d.id] || null,
      generated_bills: billsMap[d.id] || [],
      bills_count: (billsMap[d.id] || []).length
    })) as RouteDispatchRecord[]
  } catch {
    return []
  }
}

/**
 * MODULE 9: Get Driver & Route Dashboard KPIs
 */
export interface DriverDashboardStats {
  totalDrivers: number
  availableDrivers: number
  driversOnRoute: number
  activeRoutesCount: number
  completedRoutesToday: number
  todayRouteSales: number
  todayCollections: number
  pendingSettlements: number
}

export async function getDriverDashboardStats(): Promise<DriverDashboardStats> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  try {
    const [
      { data: allDrivers },
      { data: activeDispatches },
      { data: completedToday },
      { data: settlementsToday },
      { data: salesToday }
    ] = await Promise.all([
      supabase.from('drivers').select('id, status, is_active'),
      supabase.from('driver_load_dispatches').select('id').in('status', ['IN_PROGRESS', 'ISSUED']),
      supabase.from('driver_load_dispatches').select('id').eq('dispatch_date', today).in('status', ['COMPLETED', 'SETTLED']),
      supabase.from('driver_route_settlements').select('cash_collected, upi_collected').eq('settlement_date', today),
      supabase.from('route_sales').select('total_amount, cash_paid, upi_paid').eq('sale_date', today)
    ])

    const totalDrivers = (allDrivers || []).length
    const availableDrivers = (allDrivers || []).filter(d => d.is_active && (!d.status || d.status === 'AVAILABLE')).length
    const driversOnRoute = (allDrivers || []).filter(d => d.status === 'ON_ROUTE').length
    const activeRoutesCount = (activeDispatches || []).length
    const completedRoutesToday = (completedToday || []).length

    // Today's route sales and collections
    const salesAmt = (salesToday || []).reduce((acc, s) => acc + Number(s.total_amount || 0), 0)
    const collectionsAmt = (salesToday || []).reduce((acc, s) => acc + (Number(s.cash_paid || 0) + Number(s.upi_paid || 0)), 0) +
      (settlementsToday || []).reduce((acc, st) => acc + (Number(st.cash_collected || 0) + Number(st.upi_collected || 0)), 0)

    return {
      totalDrivers,
      availableDrivers,
      driversOnRoute,
      activeRoutesCount,
      completedRoutesToday,
      todayRouteSales: salesAmt,
      todayCollections: collectionsAmt,
      pendingSettlements: activeRoutesCount
    }
  } catch {
    return {
      totalDrivers: 0,
      availableDrivers: 0,
      driversOnRoute: 0,
      activeRoutesCount: 0,
      completedRoutesToday: 0,
      todayRouteSales: 0,
      todayCollections: 0,
      pendingSettlements: 0
    }
  }
}
