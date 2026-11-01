import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveProductRate,
  calculateLineFinancials,
  calculateBillFinancials,
  round2,
  type PricingRule
} from '../pricing-engine'

describe('Central Pricing Engine — Unit Tests', () => {

  const sampleRules: PricingRule[] = [
    // 1. Dealer-specific rate for Babu Water Supplying on Water Can: ₹7.00
    {
      id: 'rule-dlr-1',
      rule_type: 'dealer',
      product_id: 'prod-can-20l',
      dealer_id: 'dlr-babu',
      selling_rate: 7.00,
      unit: 'piece',
      effective_from: '2026-01-01',
      effective_to: null,
      priority: 10,
      is_active: true
    },
    // 2. Customer-specific rate for Srinivasa Tiffins: ₹12.00
    {
      id: 'rule-cust-1',
      rule_type: 'customer',
      product_id: 'prod-can-20l',
      customer_id: 'cust-srini',
      selling_rate: 12.00,
      unit: 'piece',
      effective_from: '2026-01-01',
      effective_to: null,
      priority: 10,
      is_active: true
    },
    // 3. Route-specific rate for Dammapeta Route on Water Can: ₹18.00
    {
      id: 'rule-rte-1',
      rule_type: 'route',
      product_id: 'prod-can-20l',
      route_id: 'rte-damma',
      selling_rate: 18.00,
      unit: 'piece',
      effective_from: '2026-01-01',
      effective_to: null,
      priority: 20,
      is_active: true
    },
    // 4. Category-specific rate for 'hotel' on Water Can: ₹14.00
    {
      id: 'rule-cat-1',
      rule_type: 'category',
      product_id: 'prod-can-20l',
      category: 'hotel',
      selling_rate: 14.00,
      unit: 'piece',
      effective_from: '2026-01-01',
      effective_to: null,
      priority: 30,
      is_active: true
    },
    // 5. Expired rule
    {
      id: 'rule-expired',
      rule_type: 'dealer',
      product_id: 'prod-can-20l',
      dealer_id: 'dlr-old',
      selling_rate: 5.00,
      unit: 'piece',
      effective_from: '2025-01-01',
      effective_to: '2025-12-31',
      priority: 10,
      is_active: true
    },
    // 6. Future-dated rule
    {
      id: 'rule-future',
      rule_type: 'dealer',
      product_id: 'prod-can-20l',
      dealer_id: 'dlr-future',
      selling_rate: 22.00,
      unit: 'piece',
      effective_from: '2027-01-01',
      effective_to: null,
      priority: 10,
      is_active: true
    },
    // 7. Conflicting customer rules (two rules for same customer & product active at same time)
    {
      id: 'rule-conflict-a',
      rule_type: 'customer',
      product_id: 'prod-bottle-1l',
      customer_id: 'cust-conflict',
      selling_rate: 100.00,
      unit: 'case',
      effective_from: '2026-01-01',
      effective_to: null,
      priority: 10,
      is_active: true
    },
    {
      id: 'rule-conflict-b',
      rule_type: 'customer',
      product_id: 'prod-bottle-1l',
      customer_id: 'cust-conflict',
      selling_rate: 110.00,
      unit: 'case',
      effective_from: '2026-01-01',
      effective_to: null,
      priority: 10,
      is_active: true
    }
  ]

  it('1. Resolves normal default product selling rate when no overrides exist', () => {
    const res = resolveProductRate({
      productId: 'prod-can-20l',
      defaultRate: 15.00,
      defaultGstRate: 18,
      billDate: '2026-08-01',
      availableRules: sampleRules
    })
    assert.equal(res.resolvedRate, 15.00)
    assert.equal(res.rateSource, 'Default Product Rate')
    assert.equal(res.isMissing, false)
    assert.equal(res.hasConflict, false)
  })

  it('2. Resolves customer-specific rate with Priority 1', () => {
    const res = resolveProductRate({
      productId: 'prod-can-20l',
      defaultRate: 15.00,
      customerId: 'cust-srini',
      routeId: 'rte-damma',
      customerCategory: 'hotel',
      billDate: '2026-08-01',
      availableRules: sampleRules
    })
    assert.equal(res.resolvedRate, 12.00)
    assert.equal(res.rateSource, 'Customer Rate')
    assert.equal(res.ruleId, 'rule-cust-1')
  })

  it('3. Resolves dealer-specific rate with Priority 1', () => {
    const res = resolveProductRate({
      productId: 'prod-can-20l',
      defaultRate: 15.00,
      dealerId: 'dlr-babu',
      routeId: 'rte-damma',
      billDate: '2026-08-01',
      availableRules: sampleRules
    })
    assert.equal(res.resolvedRate, 7.00)
    assert.equal(res.rateSource, 'Dealer Rate')
    assert.equal(res.ruleId, 'rule-dlr-1')
  })

  it('4. Resolves route-specific rate when no customer/dealer rate exists', () => {
    const res = resolveProductRate({
      productId: 'prod-can-20l',
      defaultRate: 15.00,
      routeId: 'rte-damma',
      customerCategory: 'hotel',
      billDate: '2026-08-01',
      availableRules: sampleRules
    })
    assert.equal(res.resolvedRate, 18.00)
    assert.equal(res.rateSource, 'Route Rate')
    assert.equal(res.ruleId, 'rule-rte-1')
  })

  it('5. Resolves category-specific rate when no customer/dealer/route rate exists', () => {
    const res = resolveProductRate({
      productId: 'prod-can-20l',
      defaultRate: 15.00,
      customerCategory: 'hotel',
      billDate: '2026-08-01',
      availableRules: sampleRules
    })
    assert.equal(res.resolvedRate, 14.00)
    assert.equal(res.rateSource, 'Category Rate')
    assert.equal(res.ruleId, 'rule-cat-1')
  })

  it('6. Ignores expired rate and falls back gracefully to default rate', () => {
    const res = resolveProductRate({
      productId: 'prod-can-20l',
      defaultRate: 15.00,
      dealerId: 'dlr-old',
      billDate: '2026-08-01',
      availableRules: sampleRules
    })
    assert.equal(res.resolvedRate, 15.00)
    assert.equal(res.rateSource, 'Default Product Rate')
  })

  it('7. Ignores future-dated rate and falls back gracefully to default rate', () => {
    const res = resolveProductRate({
      productId: 'prod-can-20l',
      defaultRate: 15.00,
      dealerId: 'dlr-future',
      billDate: '2026-08-01',
      availableRules: sampleRules
    })
    assert.equal(res.resolvedRate, 15.00)
    assert.equal(res.rateSource, 'Default Product Rate')
  })

  it('8. Detects and flags conflicting rates without silent substitution', () => {
    const res = resolveProductRate({
      productId: 'prod-bottle-1l',
      defaultRate: 120.00,
      customerId: 'cust-conflict',
      billDate: '2026-08-01',
      availableRules: sampleRules
    })
    assert.equal(res.hasConflict, true)
    assert.ok(res.conflictDetails?.includes('Multiple conflicting customer-specific rates'))
  })

  it('9. Identifies missing rate when product rate is 0.00 and blocks bill confirmation', () => {
    const res = resolveProductRate({
      productId: 'prod-unknown',
      productName: 'Raw Empty Can',
      defaultRate: 0.00,
      billDate: '2026-08-01',
      availableRules: []
    })
    assert.equal(res.isMissing, true)
    assert.ok(res.validationError?.includes('No valid active rate configured'))
  })

  it('10. Calculates Tax-Exclusive Line Financials accurately', () => {
    // 10 units @ 15.00 = 150.00, 10% discount = 15.00, taxable = 135.00, 18% GST = 24.30, total = 159.30
    const fin = calculateLineFinancials({
      quantity: 10,
      rate: 15.00,
      itemDiscount: 10,
      discountType: 'percent',
      gstRate: 18,
      isTaxInclusive: false,
      costPrice: 8.00
    })
    assert.equal(fin.grossAmount, 150.00)
    assert.equal(fin.discountAmount, 15.00)
    assert.equal(fin.taxableAmount, 135.00)
    assert.equal(fin.gstAmount, 24.30)
    assert.equal(fin.cgstAmount, 12.15)
    assert.equal(fin.sgstAmount, 12.15)
    assert.equal(fin.lineTotal, 159.30)
    assert.equal(fin.cogsAmount, 80.00)
    assert.equal(fin.grossProfit, 55.00)
  })

  it('11. Calculates Tax-Inclusive Line Financials accurately (e.g. MRP ₹118 incl 18% GST)', () => {
    // 1 unit @ 118.00 inclusive: taxable = 100.00, GST = 18.00, lineTotal = 118.00
    const fin = calculateLineFinancials({
      quantity: 1,
      rate: 118.00,
      gstRate: 18,
      isTaxInclusive: true,
      costPrice: 50.00
    })
    assert.equal(fin.taxableAmount, 100.00)
    assert.equal(fin.gstAmount, 18.00)
    assert.equal(fin.cgstAmount, 9.00)
    assert.equal(fin.sgstAmount, 9.00)
    assert.equal(fin.lineTotal, 118.00)
  })

  it('12. Calculates multi-product bill financials with payment dues accurately', () => {
    const line1 = calculateLineFinancials({ quantity: 10, rate: 15.00, gstRate: 18, isTaxInclusive: false, costPrice: 8 })
    const line2 = calculateLineFinancials({ quantity: 2, rate: 120.00, gstRate: 18, isTaxInclusive: false, costPrice: 75 })

    const bill = calculateBillFinancials({
      items: [line1, line2],
      extraDiscountValue: 20.00,
      extraDiscountType: 'flat',
      paidAmount: 200.00
    })

    assert.equal(bill.subtotal, 390.00)
    assert.equal(bill.totalDiscount, 20.00)
    assert.equal(bill.taxableAmount, 370.00)
    assert.ok(bill.grandTotal > 0)
    assert.equal(bill.paidAmount, 200.00)
    assert.equal(bill.dueAmount, round2(bill.grandTotal - 200.00))
    assert.equal(bill.paymentStatus, 'partial')
  })
})
