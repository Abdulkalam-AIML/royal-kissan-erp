import { createClient } from '@/lib/supabase/client'
import { emitDataChange } from '@/lib/events/data-sync'
import {
  DriverLoadDispatch,
  DriverLoadItem,
  DriverLoadDispatchWithItems,
  DriverRouteSettlement,
  DriverRouteSettlementItem,
  DriverRouteSettlementWithItems
} from '@/lib/types/database'
import { round2 } from '@/lib/pricing/pricing-engine'

export interface IssueDriverLoadPayload {
  dispatch_number?: string
  driver_id: string
  driver_name: string
  vehicle_number?: string | null
  route_id?: string | null
  route_name?: string | null
  dispatch_date?: string
  notes?: string | null
  created_by?: string
  items: Array<{
    product_id?: string | null
    product_name: string
    unit: string
    loaded_quantity: number
    rate: number
    amount: number
  }>
}

/**
 * STEP 1 — Issue Load to Driver (Warehouse load issue)
 * Deducts stock from warehouse inventory and generates Load Dispatch Note.
 * Does NOT generate customer sales invoices.
 */
export async function issueDriverLoad(
  payload: IssueDriverLoadPayload
): Promise<{ success: boolean; dispatch?: DriverLoadDispatchWithItems; message?: string }> {
  if (!payload.items || payload.items.length === 0) {
    return { success: false, message: 'At least one product item is required for driver load issue.' }
  }

  const supabase = createClient()
  const totalQty = payload.items.reduce((s, it) => s + (Number(it.loaded_quantity) || 0), 0)
  const totalVal = payload.items.reduce((s, it) => s + (Number(it.amount) || 0), 0)

  const dispatchHeader = {
    dispatch_number: payload.dispatch_number || null,
    driver_id: payload.driver_id,
    driver_name: payload.driver_name,
    vehicle_number: payload.vehicle_number || null,
    route_id: payload.route_id || null,
    route_name: payload.route_name || null,
    dispatch_date: payload.dispatch_date || new Date().toISOString().split('T')[0],
    total_loaded_qty: totalQty,
    total_load_value: totalVal,
    notes: payload.notes || null,
    created_by: payload.created_by || 'Operations Admin'
  }

  try {
    const { data, error } = await supabase.rpc('issue_driver_load', {
      p_dispatch: dispatchHeader,
      p_items: payload.items
    })

    if (error) {
      return { success: false, message: `Driver load issue failed: ${error.message}` }
    }

    emitDataChange('drivers')
    emitDataChange('stock')
    emitDataChange('products')

    return {
      success: true,
      dispatch: data as DriverLoadDispatchWithItems,
      message: `Driver Load Dispatch #${data.dispatch_number} issued successfully!`
    }
  } catch (err: any) {
    return { success: false, message: `Unexpected error issuing driver load: ${err?.message || err}` }
  }
}

/**
 * Fetch all driver load dispatches
 */
export async function getDriverLoads(
  driverId?: string,
  date?: string
): Promise<DriverLoadDispatchWithItems[]> {
  const supabase = createClient()
  try {
    let query = supabase
      .from('driver_load_dispatches')
      .select('*, driver_load_items(*)')
      .order('dispatch_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (driverId) query = query.eq('driver_id', driverId)
    if (date) query = query.eq('dispatch_date', date)

    const { data, error } = await query
    if (error || !data) return []

    return data.map(d => ({
      ...d,
      items: d.driver_load_items || []
    })) as DriverLoadDispatchWithItems[]
  } catch {
    return []
  }
}

export interface CustomerSaleEntry {
  customer_name: string
  customer_phone?: string | null
  product_name: string
  quantity: number
  rate: number
  total_amount: number
  paid_amount: number
  payment_method: string
  cash_amount: number
  upi_amount: number
}

export interface SettleDriverRoutePayload {
  settlement_number?: string
  load_dispatch_id: string
  driver_id: string
  route_id?: string | null
  settlement_date?: string
  total_loaded_qty: number
  total_sold_qty: number
  total_returned_qty: number
  total_leaked_qty: number
  unaccounted_qty?: number
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
  customer_sales?: CustomerSaleEntry[]
}

/**
 * STEPS 2, 3 & 4 — Route Settlement & Final Bill Generation
 * Validates reconciliation: Loaded = Sold + Returned (good) + Leaked + Other.
 * Generates final customer bills from actual completed sales.
 * Checks in good returned stock into inventory, logs leakage into damage quarantine.
 * Prevents double inventory deductions.
 */
export async function settleDriverRoute(
  payload: SettleDriverRoutePayload
): Promise<{ success: boolean; settlement?: DriverRouteSettlementWithItems; message?: string }> {
  // Validate quantity conservation
  for (const it of payload.items) {
    const accounted = (Number(it.sold_qty) || 0) + (Number(it.returned_good_qty) || 0) + (Number(it.leaked_damaged_qty) || 0)
    if (accounted > Number(it.loaded_qty)) {
      return {
        success: false,
        message: `Validation failed: Accounted quantity (${accounted}) exceeds loaded quantity (${it.loaded_qty}) for ${it.product_name}.`
      }
    }
  }

  const supabase = createClient()

  const settlementHeader = {
    settlement_number: payload.settlement_number || null,
    load_dispatch_id: payload.load_dispatch_id,
    driver_id: payload.driver_id,
    route_id: payload.route_id || null,
    settlement_date: payload.settlement_date || new Date().toISOString().split('T')[0],
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
    confirmed_by: payload.confirmed_by || 'Operations Admin'
  }

  try {
    const { data, error } = await supabase.rpc('settle_driver_route', {
      p_settlement: settlementHeader,
      p_items: payload.items,
      p_customer_sales: payload.customer_sales || []
    })

    if (error) {
      return { success: false, message: `Route settlement failed: ${error.message}` }
    }

    emitDataChange('drivers')
    emitDataChange('bills')
    emitDataChange('sales')
    emitDataChange('collections')
    emitDataChange('stock')

    return {
      success: true,
      settlement: data as DriverRouteSettlementWithItems,
      message: `Driver Route Settlement #${data.settlement_number} confirmed and bills generated successfully!`
    }
  } catch (err: any) {
    return { success: false, message: `Unexpected error in settlement: ${err?.message || err}` }
  }
}

/**
 * Fetch all driver route settlements
 */
export async function getDriverSettlements(
  driverId?: string,
  date?: string
): Promise<DriverRouteSettlementWithItems[]> {
  const supabase = createClient()
  try {
    let query = supabase
      .from('driver_route_settlements')
      .select('*, driver_route_settlement_items(*)')
      .order('settlement_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (driverId) query = query.eq('driver_id', driverId)
    if (date) query = query.eq('settlement_date', date)

    const { data, error } = await query
    if (error || !data) return []

    return data.map(s => ({
      ...s,
      items: s.driver_route_settlement_items || []
    })) as DriverRouteSettlementWithItems[]
  } catch {
    return []
  }
}

