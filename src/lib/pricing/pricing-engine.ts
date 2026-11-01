/**
 * ROYAL KISSAN ERP — CENTRAL PRICING ENGINE
 * Single authoritative source of truth for rate resolution, deterministic hierarchy,
 * financial accuracy, tax calculations (inclusive/exclusive), and rounding.
 */

export type RateSource = 
  | 'Customer Rate' 
  | 'Dealer Rate' 
  | 'Route Rate' 
  | 'Category Rate' 
  | 'Default Product Rate' 
  | 'Manual Override'

export type RuleType = 'customer' | 'dealer' | 'route' | 'category' | 'default'
export type PricingRuleType = RuleType

export interface PricingRule {
  id?: string
  rule_type: RuleType
  product_id: string
  product_name?: string
  customer_id?: string | null
  customer_name?: string | null
  dealer_id?: string | null
  dealer_name?: string | null
  route_id?: string | null
  route_name?: string | null
  category?: string | null
  customer_category?: string | null
  unit?: string
  selling_rate: number
  min_quantity?: number
  is_tax_inclusive?: boolean
  gst_rate?: number | null
  effective_from: string // YYYY-MM-DD
  effective_to?: string | null // YYYY-MM-DD or null
  priority?: number
  is_active: boolean
  notes?: string | null
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface RateResolutionParams {
  productId: string
  productName?: string
  defaultRate: number
  defaultGstRate?: number
  unit?: string
  customerId?: string | null
  dealerId?: string | null
  routeId?: string | null
  customerCategory?: string | null
  billDate?: string // YYYY-MM-DD
  quantity?: number
  availableRules?: PricingRule[]
  customPriorityOrder?: ('customer_dealer' | 'route' | 'category' | 'default')[]
}

export interface RateResolutionResult {
  resolvedRate: number
  rateSource: RateSource
  ruleId?: string | null
  isTaxInclusive: boolean
  gstRate: number
  unit: string
  hasConflict: boolean
  conflictDetails?: string | null
  isMissing: boolean
  validationError?: string | null
  notes?: string | null
}

export interface LineFinancialInput {
  quantity: number
  rate: number
  itemDiscount?: number
  discountType?: 'flat' | 'percent'
  gstRate?: number
  isTaxInclusive?: boolean
  isGstEnabled?: boolean
  costPrice?: number
}

export interface LineFinancialOutput {
  grossAmount: number
  discountAmount: number
  taxableAmount: number
  gstRate: number
  gstAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  lineTotal: number
  cogsAmount: number
  grossProfit: number
  isTaxInclusive: boolean
}

export interface BillFinancialInput {
  items: LineFinancialOutput[]
  extraDiscountValue?: number
  extraDiscountType?: 'flat' | 'percent'
  paidAmount?: number
  isGstEnabled?: boolean
}

export interface BillFinancialOutput {
  subtotal: number
  totalQuantity: number
  itemsDiscount: number
  extraDiscount: number
  totalDiscount: number
  taxableAmount: number
  gstAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  roundOff: number
  grandTotal: number
  totalCogs: number
  grossProfit: number
  profitMarginPercent: number
  paidAmount: number
  dueAmount: number
  paymentStatus: 'paid' | 'partial' | 'due'
}

/**
 * High-precision rounding to 2 decimal places avoiding IEEE 754 floating point drift
 */
export function round2(num: number): number {
  if (isNaN(num) || !isFinite(num)) return 0
  return Math.round((num + Number.EPSILON) * 100) / 100
}

/**
 * Checks if a given date string (YYYY-MM-DD) falls within effective_from and effective_to range
 */
export function isRuleDateValid(rule: PricingRule, targetDateStr?: string): boolean {
  if (!targetDateStr) return true
  const target = targetDateStr.trim()
  if (rule.effective_from && rule.effective_from > target) {
    return false // Not yet effective
  }
  if (rule.effective_to && rule.effective_to < target) {
    return false // Expired
  }
  return true
}

/**
 * Authoritative Deterministic Rate Resolution Engine
 * Hierarchy:
 * 1. Customer-specific or Dealer-specific rate
 * 2. Applicable Route-specific rate
 * 3. Customer-category or Dealer-category rate
 * 4. Default product rate
 */
export function resolveProductRate(params: RateResolutionParams): RateResolutionResult {
  const {
    productId,
    productName = 'Product',
    defaultRate = 0,
    defaultGstRate = 18,
    unit = 'piece',
    customerId,
    dealerId,
    routeId,
    customerCategory,
    billDate = new Date().toISOString().split('T')[0],
    quantity = 1,
    availableRules = [],
    customPriorityOrder = ['customer_dealer', 'route', 'category', 'default']
  } = params

  // Filter rules for this product that are active and date-valid
  const matchingRules = availableRules.filter(r => 
    r.product_id === productId &&
    r.is_active &&
    isRuleDateValid(r, billDate) &&
    quantity >= (r.min_quantity || 1)
  )

  let resolvedRule: PricingRule | null = null
  let rateSource: RateSource = 'Default Product Rate'
  let hasConflict = false
  let conflictDetails: string | null = null

  for (const tier of customPriorityOrder) {
    if (resolvedRule) break

    if (tier === 'customer_dealer') {
      if (customerId) {
        const custRules = matchingRules.filter(r => r.rule_type === 'customer' && r.customer_id === customerId)
        if (custRules.length > 1) {
          hasConflict = true
          conflictDetails = `Multiple conflicting customer-specific rates configured for customer on ${billDate}`
        }
        if (custRules.length > 0) {
          resolvedRule = custRules[0]
          rateSource = 'Customer Rate'
          break
        }
      }
      if (dealerId) {
        const dlrRules = matchingRules.filter(r => r.rule_type === 'dealer' && r.dealer_id === dealerId)
        if (dlrRules.length > 1) {
          hasConflict = true
          conflictDetails = `Multiple conflicting dealer-specific rates configured for dealer on ${billDate}`
        }
        if (dlrRules.length > 0) {
          resolvedRule = dlrRules[0]
          rateSource = 'Dealer Rate'
          break
        }
      }
    } else if (tier === 'route') {
      if (routeId) {
        const routeRules = matchingRules.filter(r => r.rule_type === 'route' && r.route_id === routeId)
        if (routeRules.length > 1) {
          hasConflict = true
          conflictDetails = `Multiple conflicting route-specific rates configured for route on ${billDate}`
        }
        if (routeRules.length > 0) {
          resolvedRule = routeRules[0]
          rateSource = 'Route Rate'
          break
        }
      }
    } else if (tier === 'category') {
      if (customerCategory) {
        const catRules = matchingRules.filter(r => 
          r.rule_type === 'category' && 
          r.category?.toLowerCase().trim() === customerCategory.toLowerCase().trim()
        )
        if (catRules.length > 1) {
          hasConflict = true
          conflictDetails = `Multiple conflicting category rates configured for category "${customerCategory}" on ${billDate}`
        }
        if (catRules.length > 0) {
          resolvedRule = catRules[0]
          rateSource = 'Category Rate'
          break
        }
      }
    } else if (tier === 'default') {
      const defRules = matchingRules.filter(r => r.rule_type === 'default')
      if (defRules.length > 1) {
        hasConflict = true
        conflictDetails = `Multiple conflicting default rates found for product on ${billDate}`
      }
      if (defRules.length > 0) {
        resolvedRule = defRules[0]
        rateSource = 'Default Product Rate'
        break
      }
    }
  }

  // If a rule matched
  if (resolvedRule) {
    const finalRate = round2(Number(resolvedRule.selling_rate))
    const isMissing = finalRate <= 0
    return {
      resolvedRate: finalRate,
      rateSource,
      ruleId: resolvedRule.id || null,
      isTaxInclusive: Boolean(resolvedRule.is_tax_inclusive),
      gstRate: resolvedRule.gst_rate !== null && resolvedRule.gst_rate !== undefined 
        ? Number(resolvedRule.gst_rate) 
        : Number(defaultGstRate),
      unit: resolvedRule.unit || unit,
      hasConflict,
      conflictDetails,
      isMissing,
      validationError: isMissing 
        ? `Rate resolved from ${rateSource} is 0.00. Bill confirmation blocked until a positive rate is set.` 
        : null,
      notes: resolvedRule.notes || null
    }
  }

  // Fallback to default product selling rate
  const finalDefaultRate = round2(Number(defaultRate))
  const isMissing = finalDefaultRate <= 0

  return {
    resolvedRate: finalDefaultRate,
    rateSource: 'Default Product Rate',
    ruleId: null,
    isTaxInclusive: false,
    gstRate: Number(defaultGstRate),
    unit,
    hasConflict,
    conflictDetails,
    isMissing,
    validationError: isMissing 
      ? `No valid active rate configured for product "${productName}". Please configure a selling rate before billing.` 
      : null,
    notes: 'Default Master Catalog Rate'
  }
}

/**
 * Pure Line-Item Financial Calculation
 * Supports both Tax-Inclusive (e.g. MRP) and Tax-Exclusive (e.g. Wholesale Base + GST)
 */
export function calculateLineFinancials(input: LineFinancialInput): LineFinancialOutput {
  const qty = Math.max(1, Number(input.quantity) || 1)
  const rate = Math.max(0, Number(input.rate) || 0)
  const isGstEnabled = input.isGstEnabled !== false
  const gstRate = isGstEnabled ? Math.max(0, Number(input.gstRate) || 0) : 0
  const isTaxInclusive = Boolean(input.isTaxInclusive)
  const costPrice = Math.max(0, Number(input.costPrice) || 0)

  const rawGross = round2(qty * rate)

  // Calculate discount
  let discVal = 0
  const discRaw = Math.max(0, Number(input.itemDiscount) || 0)
  if (input.discountType === 'percent') {
    discVal = round2((rawGross * Math.min(100, discRaw)) / 100)
  } else {
    discVal = round2(Math.min(rawGross, discRaw))
  }

  const netAfterDiscount = round2(Math.max(0, rawGross - discVal))

  let taxable = 0
  let gst = 0

  if (isTaxInclusive && gstRate > 0 && isGstEnabled) {
    // Back-calculate taxable: taxable = net / (1 + gstRate / 100)
    taxable = round2(netAfterDiscount / (1 + gstRate / 100))
    gst = round2(netAfterDiscount - taxable)
  } else if (!isTaxInclusive && gstRate > 0 && isGstEnabled) {
    taxable = netAfterDiscount
    gst = round2((taxable * gstRate) / 100)
  } else {
    taxable = netAfterDiscount
    gst = 0
  }

  const lineTotal = round2(taxable + gst)
  const cgst = round2(gst / 2)
  const sgst = round2(gst - cgst) // ensures cgst + sgst === gst
  const igst = 0
  const cogsAmount = round2(qty * costPrice)
  const grossProfit = round2(taxable - cogsAmount)

  return {
    grossAmount: rawGross,
    discountAmount: discVal,
    taxableAmount: taxable,
    gstRate,
    gstAmount: gst,
    cgstAmount: cgst,
    sgstAmount: sgst,
    igstAmount: igst,
    lineTotal,
    cogsAmount,
    grossProfit,
    isTaxInclusive
  }
}

/**
 * Pure Bill-Level Financial Aggregation
 */
export function calculateBillFinancials(input: BillFinancialInput): BillFinancialOutput {
  const items = input.items || []
  const subtotal = round2(items.reduce((sum, item) => sum + item.grossAmount, 0))
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.grossAmount > 0) ? 1 : 1), 0)
  const itemsDiscount = round2(items.reduce((sum, item) => sum + item.discountAmount, 0))

  // Extra bill discount
  let extraDiscount = 0
  const netBeforeExtra = Math.max(0, subtotal - itemsDiscount)
  const extraVal = Math.max(0, Number(input.extraDiscountValue) || 0)

  if (input.extraDiscountType === 'percent') {
    extraDiscount = round2((netBeforeExtra * Math.min(100, extraVal)) / 100)
  } else {
    extraDiscount = round2(Math.min(netBeforeExtra, extraVal))
  }

  const totalDiscount = round2(itemsDiscount + extraDiscount)
  const taxableAmount = round2(Math.max(0, items.reduce((sum, item) => sum + item.taxableAmount, 0) - extraDiscount))
  
  // Recalculate GST proportionally if extra discount applies
  const rawGst = items.reduce((sum, item) => sum + item.gstAmount, 0)
  let gstAmount = round2(rawGst)
  if (extraDiscount > 0 && subtotal > 0) {
    const factor = Math.max(0, (subtotal - totalDiscount) / Math.max(1, subtotal - itemsDiscount))
    gstAmount = round2(rawGst * factor)
  }

  const cgstAmount = round2(gstAmount / 2)
  const sgstAmount = round2(gstAmount - cgstAmount)
  const igstAmount = 0

  const calculatedGrandTotal = round2(taxableAmount + gstAmount)
  const roundOff = 0
  const grandTotal = calculatedGrandTotal

  const totalCogs = round2(items.reduce((sum, item) => sum + item.cogsAmount, 0))
  const grossProfit = round2(taxableAmount - totalCogs)
  const profitMarginPercent = taxableAmount > 0 ? round2((grossProfit / taxableAmount) * 100) : 0

  const paidAmount = round2(Math.max(0, Number(input.paidAmount) || 0))
  const dueAmount = round2(Math.max(0, grandTotal - paidAmount))

  let paymentStatus: 'paid' | 'partial' | 'due' = 'due'
  if (dueAmount <= 0 && grandTotal > 0) {
    paymentStatus = 'paid'
  } else if (paidAmount > 0) {
    paymentStatus = 'partial'
  }

  return {
    subtotal,
    totalQuantity,
    itemsDiscount,
    extraDiscount,
    totalDiscount,
    taxableAmount,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    roundOff,
    grandTotal,
    totalCogs,
    grossProfit,
    profitMarginPercent,
    paidAmount,
    dueAmount,
    paymentStatus
  }
}
