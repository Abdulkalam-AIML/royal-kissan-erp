import { createClient } from '@/lib/supabase/client'
import { emitDataChange } from '@/lib/events/data-sync'
import {
  Dealer,
  DealerDispatch,
  DealerDispatchItem,
  DealerDispatchWithItems,
  DealerReturnEntry,
  DealerReturnItem,
  DealerReturnEntryWithItems,
  DealerCreditAdjustment,
  DealerDailySettlement
} from '@/lib/types/database'
import { round2 } from '@/lib/pricing/pricing-engine'

// Royal Kissan Home State Code: Andhra Pradesh (37)
export const ROYAL_KISSAN_STATE_CODE = '37'

export interface GSTValidationResult {
  isValid: boolean
  formattedGSTIN: string
  stateCode: string
  pan: string
  isInterstate: boolean
  error?: string
}

/**
 * Validates Indian GSTIN format and extracts State Code, PAN, and Inter-State classification.
 * Format: 2 digits (State Code) + 10 alphanumeric (PAN) + 1 entity num + 'Z' + 1 checksum digit.
 */
export function validateGSTIN(gstinInput?: string | null): GSTValidationResult {
  if (!gstinInput || typeof gstinInput !== 'string') {
    return {
      isValid: false,
      formattedGSTIN: '',
      stateCode: '',
      pan: '',
      isInterstate: false,
      error: 'GSTIN is empty.'
    }
  }

  const cleaned = gstinInput.trim().toUpperCase()
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

  if (!gstinRegex.test(cleaned)) {
    return {
      isValid: false,
      formattedGSTIN: cleaned,
      stateCode: cleaned.slice(0, 2),
      pan: cleaned.slice(2, 12),
      isInterstate: cleaned.slice(0, 2) !== ROYAL_KISSAN_STATE_CODE,
      error: 'Invalid 15-character GSTIN format (e.g. 37AABCS1234D1Z5).'
    }
  }

  const stateCode = cleaned.slice(0, 2)
  const pan = cleaned.slice(2, 12)
  const isInterstate = stateCode !== ROYAL_KISSAN_STATE_CODE

  return {
    isValid: true,
    formattedGSTIN: cleaned,
    stateCode,
    pan,
    isInterstate
  }
}

/**
 * Calculates GST breakdown (CGST/SGST vs IGST) consistently with central pricing engine.
 */
export function calculateDealerGSTBreakdown(params: {
  taxableAmount: number
  gstRate: number
  isInterstate: boolean
  isGstEnabled: boolean
}) {
  const { taxableAmount, gstRate, isInterstate, isGstEnabled } = params

  if (!isGstEnabled || gstRate <= 0) {
    return {
      taxableAmount: round2(taxableAmount),
      gstRate: 0,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      grandTotal: round2(taxableAmount)
    }
  }

  const gstAmount = round2((taxableAmount * gstRate) / 100)
  let cgstAmount = 0
  let sgstAmount = 0
  let igstAmount = 0

  if (isInterstate) {
    igstAmount = gstAmount
  } else {
    cgstAmount = round2(gstAmount / 2)
    sgstAmount = round2(gstAmount - cgstAmount)
  }

  return {
    taxableAmount: round2(taxableAmount),
    gstRate,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    grandTotal: round2(taxableAmount + gstAmount)
  }
}

export interface CreateDealerDispatchPayload {
  dispatch_number?: string
  dealer_id: string
  dealer_name: string
  dealer_gstin?: string | null
  is_gst_enabled?: boolean
  is_interstate?: boolean
  dispatch_date?: string
  subtotal: number
  discount_amount?: number
  taxable_amount?: number
  gst_rate?: number
  gst_amount?: number
  cgst_amount?: number
  sgst_amount?: number
  igst_amount?: number
  total_value: number
  responsible_staff?: string
  notes?: string | null
  items: Array<{
    product_id?: string | null
    product_name: string
    unit: string
    quantity: number
    rate: number
    amount: number
    gst_rate?: number
    gst_amount?: number
  }>
}

/**
 * Creates a Dealer Load Dispatch (Goods issued, inventory deducted, load dispatch note).
 * Does NOT generate a final customer sales invoice.
 */
export async function createDealerDispatch(
  payload: CreateDealerDispatchPayload
): Promise<{ success: boolean; dispatch?: DealerDispatchWithItems; message?: string }> {
  if (!payload.items || payload.items.length === 0) {
    return { success: false, message: 'At least one product item is required for dispatch.' }
  }

  const supabase = createClient()
  const totalQty = payload.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)

  const dispatchHeader = {
    dispatch_number: payload.dispatch_number || null,
    dealer_id: payload.dealer_id,
    dealer_name: payload.dealer_name,
    dealer_gstin: payload.dealer_gstin || null,
    is_gst_enabled: payload.is_gst_enabled ?? false,
    is_interstate: payload.is_interstate ?? false,
    dispatch_date: payload.dispatch_date || new Date().toISOString().split('T')[0],
    total_quantity: totalQty,
    subtotal: payload.subtotal,
    discount_amount: payload.discount_amount || 0,
    taxable_amount: payload.taxable_amount ?? payload.subtotal,
    gst_rate: payload.gst_rate || 0,
    gst_amount: payload.gst_amount || 0,
    cgst_amount: payload.cgst_amount || 0,
    sgst_amount: payload.sgst_amount || 0,
    igst_amount: payload.igst_amount || 0,
    total_value: payload.total_value,
    responsible_staff: payload.responsible_staff || 'Operations Admin',
    notes: payload.notes || null
  }

  try {
    const { data, error } = await supabase.rpc('record_dealer_dispatch', {
      p_dispatch: dispatchHeader,
      p_items: payload.items
    })

    if (error) {
      return { success: false, message: `Database dispatch failed: ${error.message}` }
    }

    emitDataChange('dealers')
    emitDataChange('stock')
    emitDataChange('products')

    return {
      success: true,
      dispatch: data as DealerDispatchWithItems,
      message: `Load Dispatch #${data.dispatch_number} recorded successfully!`
    }
  } catch (err: any) {
    return { success: false, message: `Unexpected error recording dispatch: ${err?.message || err}` }
  }
}

/**
 * Fetch all dispatches for a dealer
 */
export async function getDealerDispatches(dealerId?: string): Promise<DealerDispatchWithItems[]> {
  const supabase = createClient()
  try {
    let query = supabase
      .from('dealer_dispatches')
      .select('*, dealer_dispatch_items(*)')
      .order('dispatch_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (dealerId) {
      query = query.eq('dealer_id', dealerId)
    }

    const { data, error } = await query
    if (error || !data) return []

    return data.map(d => ({
      ...d,
      items: d.dealer_dispatch_items || []
    })) as DealerDispatchWithItems[]
  } catch {
    return []
  }
}

export interface RecordDealerReturnPayload {
  dealer_id: string
  dispatch_id: string
  dispatch_date: string
  return_date?: string // Reporting date e.g. 14-11-2026
  condition?: 'good' | 'damaged' | 'leaked' | 'unsellable'
  notes?: string | null
  recorded_by?: string
  approved_by?: string
  items: Array<{
    dispatch_item_id?: string | null
    product_id?: string | null
    product_name: string
    unit: string
    original_quantity: number
    returned_quantity: number
    leaked_quantity: number
    original_rate: number
    adjustment_rate?: number // Preserves original dispatch rate by default
    override_reason?: string | null
  }>
}

/**
 * Records next-day dealer returns & leakage against the original dispatch.
 * Strictly applies credit adjustments to the reporting day's account, leaving the original dispatch unchanged.
 */
export async function recordDealerReturnAndLeakage(
  payload: RecordDealerReturnPayload
): Promise<{ success: boolean; returnEntry?: DealerReturnEntryWithItems; message?: string }> {
  if (!payload.items || payload.items.length === 0) {
    return { success: false, message: 'At least one return/leakage item is required.' }
  }

  const supabase = createClient()

  const returnHeader = {
    dealer_id: payload.dealer_id,
    dispatch_id: payload.dispatch_id,
    dispatch_date: payload.dispatch_date,
    return_date: payload.return_date || new Date().toISOString().split('T')[0],
    condition: payload.condition || 'good',
    notes: payload.notes || null,
    recorded_by: payload.recorded_by || 'Admin',
    approved_by: payload.approved_by || 'Admin'
  }

  try {
    const { data, error } = await supabase.rpc('record_dealer_return_and_leakage', {
      p_return: returnHeader,
      p_items: payload.items
    })

    if (error) {
      return { success: false, message: `Return registration failed: ${error.message}` }
    }

    emitDataChange('dealers')
    emitDataChange('stock')
    emitDataChange('products')

    return {
      success: true,
      returnEntry: data as DealerReturnEntryWithItems,
      message: `Return & Leakage entry #${data.return_number} recorded successfully!`
    }
  } catch (err: any) {
    return { success: false, message: `Unexpected error: ${err?.message || err}` }
  }
}

/**
 * Fetch all return entries for a dealer or dispatch
 */
export async function getDealerReturns(dealerId?: string, dispatchId?: string): Promise<DealerReturnEntryWithItems[]> {
  const supabase = createClient()
  try {
    let query = supabase
      .from('dealer_return_entries')
      .select('*, dealer_return_items(*)')
      .order('return_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (dealerId) query = query.eq('dealer_id', dealerId)
    if (dispatchId) query = query.eq('dispatch_id', dispatchId)

    const { data, error } = await query
    if (error || !data) return []

    return data.map(r => ({
      ...r,
      items: r.dealer_return_items || []
    })) as DealerReturnEntryWithItems[]
  } catch {
    return []
  }
}

/**
 * Calculates Dealer Daily Settlement breakdown for a dealer on a given date.
 * Formula: Opening Balance + Today Dispatches - Previous Returns - Previous Leakage - Collections = Closing Balance
 */
export async function calculateDealerDailySettlement(
  dealerId: string,
  settlementDate: string = new Date().toISOString().split('T')[0]
): Promise<DealerDailySettlement> {
  const supabase = createClient()

  // 1. Fetch Dealer info
  const { data: dealer } = await supabase
    .from('dealers')
    .select('*')
    .eq('id', dealerId)
    .single()

  // 2. Fetch today's dispatches
  const { data: dispatches } = await supabase
    .from('dealer_dispatches')
    .select('total_value')
    .eq('dealer_id', dealerId)
    .eq('dispatch_date', settlementDate)

  const todayDispatchesAmount = (dispatches || []).reduce((sum, d) => sum + Number(d.total_value || 0), 0)

  // 3. Fetch credit adjustments dated today (returns & leakage reported today)
  const { data: returnEntries } = await supabase
    .from('dealer_return_entries')
    .select('*, dealer_return_items(*)')
    .eq('dealer_id', dealerId)
    .eq('return_date', settlementDate)

  let previousReturnsCredit = 0
  let previousLeakageCredit = 0

  if (returnEntries) {
    for (const re of returnEntries) {
      const items = re.dealer_return_items || []
      for (const it of items) {
        previousReturnsCredit += Number(it.return_credit_amount || 0)
        previousLeakageCredit += Number(it.leakage_credit_amount || 0)
      }
    }
  }

  // 4. Fetch collections received today
  const { data: collections } = await supabase
    .from('dealer_collections')
    .select('amount')
    .eq('dealer_id', dealerId)
    .or(`collected_date.eq.${settlementDate},date.eq.${settlementDate}`)

  const collectionsReceived = (collections || []).reduce((sum, c) => sum + Number(c.amount || 0), 0)

  // 5. Calculate Opening Balance:
  // Current outstanding represents state after today's operations.
  // So opening = current_outstanding - today_dispatches + previous_returns + previous_leakage + collections
  const currentOutstanding = Number(dealer?.outstanding_amount || 0)
  const calculatedOpening = Math.max(
    0,
    round2(currentOutstanding - todayDispatchesAmount + previousReturnsCredit + previousLeakageCredit + collectionsReceived)
  )

  const closingBalance = Math.max(
    0,
    round2(calculatedOpening + todayDispatchesAmount - previousReturnsCredit - previousLeakageCredit - collectionsReceived)
  )

  return {
    id: `draft_${dealerId}_${settlementDate}`,
    dealer_id: dealerId,
    settlement_date: settlementDate,
    opening_balance: calculatedOpening,
    today_dispatches_amount: todayDispatchesAmount,
    previous_returns_credit: round2(previousReturnsCredit),
    previous_leakage_credit: round2(previousLeakageCredit),
    collections_received: round2(collectionsReceived),
    other_adjustments: 0,
    closing_balance: closingBalance,
    status: 'DRAFT',
    notes: `Daily Account Settlement for ${dealer?.name || 'Dealer'} on ${settlementDate}`
  }
}

/**
 * Saves and confirms a Dealer Daily Settlement
 */
export async function confirmDealerDailySettlement(
  settlement: Partial<DealerDailySettlement>
): Promise<{ success: boolean; settlement?: DealerDailySettlement; message?: string }> {
  const supabase = createClient()
  try {
    const payload = {
      dealer_id: settlement.dealer_id,
      settlement_date: settlement.settlement_date,
      opening_balance: settlement.opening_balance,
      today_dispatches_amount: settlement.today_dispatches_amount,
      previous_returns_credit: settlement.previous_returns_credit,
      previous_leakage_credit: settlement.previous_leakage_credit,
      collections_received: settlement.collections_received,
      other_adjustments: settlement.other_adjustments || 0,
      closing_balance: settlement.closing_balance,
      status: 'CONFIRMED',
      notes: settlement.notes || null,
      confirmed_by: settlement.confirmed_by || 'Admin',
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('dealer_daily_settlements')
      .upsert(payload, { onConflict: 'dealer_id,settlement_date' })
      .select()
      .single()

    if (error) throw error

    emitDataChange('dealers')
    emitDataChange('dues')

    return {
      success: true,
      settlement: data as DealerDailySettlement,
      message: `Daily Settlement for ${settlement.settlement_date} confirmed successfully!`
    }
  } catch (err: any) {
    return { success: false, message: `Failed to confirm settlement: ${err?.message || err}` }
  }
}

