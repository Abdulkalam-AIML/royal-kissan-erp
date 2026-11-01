import { createClient } from '@/lib/supabase/client'
import { emitDataChange } from '@/lib/events/data-sync'
import { 
  PricingRule, 
  RateResolutionParams, 
  RateResolutionResult, 
  resolveProductRate, 
  round2 
} from '@/lib/pricing/pricing-engine'

export interface PricingAuditLogEntry {
  id: string
  rule_id?: string | null
  product_id?: string | null
  product_name?: string | null
  entity_type: string
  entity_id?: string | null
  entity_name?: string | null
  action: 'create' | 'update' | 'delete' | 'override' | 'activate' | 'deactivate'
  old_rate?: number | null
  new_rate: number
  reason: string
  changed_by: string
  created_at: string
}

export interface PricingConflictOrGap {
  type: 'missing' | 'conflict' | 'expired' | 'zero_rate'
  productId: string
  productName: string
  message: string
  details?: string
  suggestedAction: string
}

/**
 * Fetch all active pricing rules from database with local storage resilient caching
 */
export async function fetchPricingRules(): Promise<PricingRule[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*, products(name, category, default_rate, gst_rate, unit), customers(name, phone), dealers(name, phone), routes(name, area)')
      .order('priority', { ascending: true })

    if (!error && data) {
      const formatted: PricingRule[] = data.map((r: any) => ({
        id: r.id,
        rule_type: r.rule_type,
        product_id: r.product_id,
        product_name: r.products?.name,
        customer_id: r.customer_id,
        customer_name: r.customers?.name,
        dealer_id: r.dealer_id,
        dealer_name: r.dealers?.name,
        route_id: r.route_id,
        route_name: r.routes?.name,
        category: r.category,
        unit: r.unit || r.products?.unit || 'piece',
        selling_rate: Number(r.selling_rate) || 0,
        min_quantity: Number(r.min_quantity) || 1,
        is_tax_inclusive: Boolean(r.is_tax_inclusive),
        gst_rate: r.gst_rate !== null ? Number(r.gst_rate) : (r.products?.gst_rate || 18),
        effective_from: r.effective_from || '2026-01-01',
        effective_to: r.effective_to || null,
        priority: Number(r.priority) || 100,
        is_active: Boolean(r.is_active),
        notes: r.notes || null,
        created_by: r.created_by,
        created_at: r.created_at,
        updated_at: r.updated_at
      }))

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('rk_cached_pricing_rules', JSON.stringify(formatted))
        } catch {}
      }

      return formatted
    }
  } catch (err) {
    console.warn('Error fetching pricing rules from server:', err)
  }

  // Fallback to local cache if offline
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('rk_cached_pricing_rules')
      if (raw) return JSON.parse(raw)
    } catch {}
  }

  return []
}

/**
 * Resolve rate for a product under given transaction context
 */
export function resolveRate(params: RateResolutionParams): RateResolutionResult {
  return resolveProductRate(params)
}

/**
 * Save new pricing rule (Insert or update) with mandatory audit log
 */
export async function savePricingRule(
  rule: Omit<PricingRule, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  adminUser = 'Admin',
  reason = 'Admin Rate Configuration'
): Promise<PricingRule> {
  const supabase = createClient()

  const payload: Record<string, any> = {
    rule_type: rule.rule_type,
    product_id: rule.product_id,
    customer_id: rule.customer_id || null,
    dealer_id: rule.dealer_id || null,
    route_id: rule.route_id || null,
    category: rule.category || null,
    unit: rule.unit || 'piece',
    selling_rate: round2(rule.selling_rate),
    min_quantity: rule.min_quantity || 1,
    is_tax_inclusive: Boolean(rule.is_tax_inclusive),
    gst_rate: rule.gst_rate !== undefined ? rule.gst_rate : null,
    effective_from: rule.effective_from || new Date().toISOString().split('T')[0],
    effective_to: rule.effective_to || null,
    priority: rule.priority || (
      rule.rule_type === 'customer' || rule.rule_type === 'dealer' ? 10 :
      rule.rule_type === 'route' ? 20 :
      rule.rule_type === 'category' ? 30 : 40
    ),
    is_active: rule.is_active !== false,
    notes: rule.notes || null,
    created_by: adminUser,
    updated_at: new Date().toISOString()
  }

  let savedRecord: any = null
  let oldRate: number | null = null

  if (rule.id) {
    // Fetch old rate for audit
    try {
      const { data: oldData } = await supabase.from('pricing_rules').select('selling_rate').eq('id', rule.id).single()
      if (oldData) oldRate = Number(oldData.selling_rate)
    } catch {}

    const { data, error } = await supabase
      .from('pricing_rules')
      .update(payload)
      .eq('id', rule.id)
      .select()
      .single()

    if (error) throw error
    savedRecord = data
  } else {
    const { data, error } = await supabase
      .from('pricing_rules')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    savedRecord = data
  }

  // Insert audit log
  try {
    await supabase.from('pricing_audit_logs').insert([{
      rule_id: savedRecord.id,
      product_id: rule.product_id,
      entity_type: rule.rule_type,
      entity_id: rule.customer_id || rule.dealer_id || rule.route_id || null,
      entity_name: rule.customer_name || rule.dealer_name || rule.route_name || rule.product_name || rule.rule_type,
      action: rule.id ? 'update' : 'create',
      old_rate: oldRate,
      new_rate: round2(rule.selling_rate),
      reason,
      changed_by: adminUser
    }])
  } catch (auditErr) {
    console.warn('Failed to insert pricing audit log:', auditErr)
  }

  emitDataChange('pricing_rules')
  emitDataChange('products')
  return savedRecord as PricingRule
}

/**
 * Toggle active status of a pricing rule with audit trail
 */
export async function togglePricingRuleActive(
  ruleId: string, 
  newStatus: boolean, 
  adminUser = 'Admin', 
  reason = 'Status update'
) {
  const supabase = createClient()
  const { data: existing } = await supabase.from('pricing_rules').select('*').eq('id', ruleId).single()
  if (!existing) throw new Error('Rule not found')

  const { error } = await supabase
    .from('pricing_rules')
    .update({ is_active: newStatus, updated_at: new Date().toISOString() })
    .eq('id', ruleId)

  if (error) throw error

  try {
    await supabase.from('pricing_audit_logs').insert([{
      rule_id: ruleId,
      product_id: existing.product_id,
      entity_type: existing.rule_type,
      entity_id: existing.customer_id || existing.dealer_id || existing.route_id || null,
      action: newStatus ? 'activate' : 'deactivate',
      old_rate: existing.selling_rate,
      new_rate: existing.selling_rate,
      reason: `${reason} (${newStatus ? 'Activated' : 'Deactivated'})`,
      changed_by: adminUser
    }])
  } catch {}

  emitDataChange('pricing_rules')
}

/**
 * Log manual cashier rate override
 */
export async function logManualRateOverride(params: {
  billId?: string | null
  invoiceNumber: string
  productId: string
  productName: string
  originalRate: number
  overriddenRate: number
  reason: string
  user: string
}) {
  const supabase = createClient()
  try {
    await supabase.from('pricing_audit_logs').insert([{
      product_id: params.productId,
      entity_type: 'bill_override',
      entity_id: params.billId || null,
      entity_name: `Bill ${params.invoiceNumber} - ${params.productName}`,
      action: 'override',
      old_rate: round2(params.originalRate),
      new_rate: round2(params.overriddenRate),
      reason: params.reason || 'Manual Cashier Override',
      changed_by: params.user || 'Cashier'
    }])
  } catch (err) {
    console.warn('Could not record rate override audit:', err)
  }
}

/**
 * Fetch pricing audit history
 */
export async function fetchPricingAuditLogs(limit = 100): Promise<PricingAuditLogEntry[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('pricing_audit_logs')
      .select('*, products (name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!error && data) {
      return data.map((d: any) => ({
        id: d.id,
        rule_id: d.rule_id,
        product_id: d.product_id,
        product_name: d.products?.name,
        entity_type: d.entity_type,
        entity_id: d.entity_id,
        entity_name: d.entity_name,
        action: d.action,
        old_rate: d.old_rate !== null ? Number(d.old_rate) : null,
        new_rate: Number(d.new_rate) || 0,
        reason: d.reason,
        changed_by: d.changed_by,
        created_at: d.created_at
      }))
    }
  } catch (e) {
    console.warn('Error loading audit logs:', e)
  }
  return []
}

/**
 * Scan for Missing Rates or Overlapping Conflicts
 */
export function detectPricingConflictsAndGaps(
  products: any[], 
  rules: PricingRule[], 
  targetDate = new Date().toISOString().split('T')[0]
): PricingConflictOrGap[] {
  const issues: PricingConflictOrGap[] = []

  // 1. Check for products with missing or 0 default rates
  for (const prod of products) {
    const defRules = rules.filter(r => r.product_id === prod.id && r.rule_type === 'default' && r.is_active)
    const activeDefRule = defRules.find(r => (!r.effective_to || r.effective_to >= targetDate) && r.effective_from <= targetDate)

    const defaultRate = activeDefRule ? activeDefRule.selling_rate : (Number(prod.default_rate) || 0)

    if (defaultRate <= 0) {
      issues.push({
        type: 'zero_rate',
        productId: prod.id,
        productName: prod.name,
        message: `Product "${prod.name}" has no valid selling rate (rate is ₹0.00).`,
        details: 'Transactions will be blocked for this product until a valid rate is configured.',
        suggestedAction: 'Set a positive default selling rate in Rate Management or Master Catalog.'
      })
    }

    if (defRules.length > 1) {
      const activeOverlaps = defRules.filter(r => (!r.effective_to || r.effective_to >= targetDate) && r.effective_from <= targetDate)
      if (activeOverlaps.length > 1) {
        issues.push({
          type: 'conflict',
          productId: prod.id,
          productName: prod.name,
          message: `Product "${prod.name}" has ${activeOverlaps.length} conflicting active default rates.`,
          details: `Found rates: ${activeOverlaps.map(r => '₹' + r.selling_rate).join(', ')}`,
          suggestedAction: 'Deactivate or adjust validity dates on overlapping default rules.'
        })
      }
    }
  }

  // 2. Check for conflicting dealer-specific rates
  const dealerRules = rules.filter(r => r.rule_type === 'dealer' && r.is_active)
  const dealerMap = new Map<string, PricingRule[]>()
  for (const r of dealerRules) {
    if (!r.dealer_id) continue
    const key = `${r.dealer_id}_${r.product_id}`
    const existing = dealerMap.get(key) || []
    existing.push(r)
    dealerMap.set(key, existing)
  }

  for (const [_, list] of dealerMap.entries()) {
    if (list.length > 1) {
      const activeOverlaps = list.filter(r => (!r.effective_to || r.effective_to >= targetDate) && r.effective_from <= targetDate)
      if (activeOverlaps.length > 1) {
        issues.push({
          type: 'conflict',
          productId: list[0].product_id,
          productName: list[0].product_name || 'Product',
          message: `Dealer "${list[0].dealer_name || list[0].dealer_id}" has multiple active overlapping rates for ${list[0].product_name || 'Product'}.`,
          details: `Conflicting rates: ${activeOverlaps.map(r => '₹' + r.selling_rate).join(', ')}`,
          suggestedAction: 'Ensure only one rule per dealer and product is active for a given date.'
        })
      }
    }
  }

  return issues
}
