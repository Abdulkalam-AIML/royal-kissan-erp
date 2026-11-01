'use client'

import React, { useState } from 'react'
import { Product } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/formatters'
import { 
  PricingRule, 
  RateSource, 
  resolveProductRate, 
  calculateLineFinancials, 
  round2 
} from '@/lib/pricing/pricing-engine'
import ProductCardCatalog from './ProductCardCatalog'
import BillingItemCard from './BillingItemCard'
import { 
  Plus, 
  Trash2, 
  Package, 
  RotateCcw, 
  AlertTriangle, 
  Percent, 
  Tag, 
  Edit3, 
  Check, 
  X, 
  ShieldAlert,
  Info,
  Layers,
  LayoutGrid,
  ListFilter,
  ShoppingCart
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export interface BillingCartItem {
  id: string
  product_id?: string | null
  product_name: string
  category?: string
  unit: string
  stock_quantity?: number
  quantity: number
  rate: number // Active applied selling rate
  original_rate: number // Resolved before any manual override
  rate_source: RateSource
  rate_rule_id?: string | null
  is_tax_inclusive: boolean
  is_manually_overridden?: boolean
  override_reason?: string
  overridden_by?: string
  has_conflict?: boolean
  conflict_details?: string | null
  is_missing_rate?: boolean
  mrp?: number
  cost_price?: number
  item_discount: number
  discount_type: 'flat' | 'percent'
  gst_rate: number
  taxable_amount: number
  gst_amount: number
  amount: number
  total: number
  // Optional route/dealer operational return & leakage fields
  return_qty?: number
  leak_qty?: number
}

interface BillingProductTableProps {
  items: BillingCartItem[]
  availableProducts: Product[]
  pricingRules?: PricingRule[]
  customerId?: string | null
  dealerId?: string | null
  routeId?: string | null
  customerCategory?: string | null
  billDate?: string
  isGstEnabled: boolean
  showReturnsAndLeakages?: boolean
  renderMode?: 'all' | 'catalog-only' | 'cart-only'
  onItemsChange: (items: BillingCartItem[]) => void
}

export default function BillingProductTable({
  items,
  availableProducts,
  pricingRules = [],
  customerId = null,
  dealerId = null,
  routeId = null,
  customerCategory = null,
  billDate = new Date().toISOString().split('T')[0],
  isGstEnabled,
  showReturnsAndLeakages = false,
  renderMode = 'all',
  onItemsChange
}: BillingProductTableProps) {
  // View mode for selected items: 'cards' (default) or 'table'
  const [selectedItemsViewMode, setSelectedItemsViewMode] = useState<'cards' | 'table'>('cards')

  // Manual Override Modal State
  const [overrideItemIndex, setOverrideItemIndex] = useState<number | null>(null)
  const [overrideRateInput, setOverrideRateInput] = useState('')
  const [overrideReasonInput, setOverrideReasonInput] = useState('')
  const [overrideUserInput, setOverrideUserInput] = useState('POS Operator')

  // Helper to re-run financial math using the canonical pricing engine
  function recalculateItem(
    item: BillingCartItem,
    qty: number,
    rate: number,
    discountVal: number,
    discountType: 'flat' | 'percent',
    gstRate: number
  ): BillingCartItem {
    const fin = calculateLineFinancials({
      quantity: qty,
      rate,
      itemDiscount: discountVal,
      discountType,
      gstRate,
      isTaxInclusive: item.is_tax_inclusive,
      isGstEnabled,
      costPrice: item.cost_price || 0
    })

    return {
      ...item,
      quantity: qty,
      rate,
      item_discount: discountVal,
      discount_type: discountType,
      gst_rate: fin.gstRate,
      taxable_amount: fin.taxableAmount,
      gst_amount: fin.gstAmount,
      amount: fin.lineTotal,
      total: fin.lineTotal
    }
  }

  // Adding product: runs through central rate resolver
  function handleAddProduct(prod: Product) {
    const resolution = resolveProductRate({
      productId: prod.id,
      productName: prod.name,
      defaultRate: Number(prod.default_rate) || 0,
      defaultGstRate: isGstEnabled ? (Number(prod.gst_rate) || 0) : 0,
      unit: prod.unit || 'piece',
      customerId,
      dealerId,
      routeId,
      customerCategory,
      billDate,
      quantity: 1,
      availableRules: pricingRules
    })

    const existingIndex = items.findIndex(i => i.product_id === prod.id || i.product_name === prod.name)
    if (existingIndex >= 0) {
      const updated = [...items]
      const current = updated[existingIndex]
      const newQty = current.quantity + 1
      updated[existingIndex] = recalculateItem(
        current,
        newQty,
        current.rate,
        current.item_discount,
        current.discount_type,
        current.gst_rate
      )
      onItemsChange(updated)
    } else {
      const initialItem: BillingCartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        product_id: prod.id,
        product_name: prod.name,
        category: prod.category || 'General',
        unit: resolution.unit || prod.unit || 'piece',
        stock_quantity: prod.stock_quantity ?? 0,
        quantity: 1,
        rate: resolution.resolvedRate,
        original_rate: resolution.resolvedRate,
        rate_source: resolution.rateSource,
        rate_rule_id: resolution.ruleId,
        is_tax_inclusive: resolution.isTaxInclusive,
        is_manually_overridden: false,
        has_conflict: resolution.hasConflict,
        conflict_details: resolution.conflictDetails,
        is_missing_rate: resolution.isMissing,
        mrp: prod.mrp || resolution.resolvedRate,
        cost_price: prod.cost_price || 0,
        item_discount: 0,
        discount_type: 'flat',
        gst_rate: resolution.gstRate,
        taxable_amount: 0,
        gst_amount: 0,
        amount: 0,
        total: 0,
        return_qty: 0,
        leak_qty: 0
      }

      const calculated = recalculateItem(
        initialItem,
        1,
        resolution.resolvedRate,
        0,
        'flat',
        resolution.gstRate
      )
      onItemsChange([...items, calculated])
    }
  }

  // Update item quantity
  function handleQuantityChange(index: number, newQty: number) {
    const updated = [...items]
    const current = updated[index]
    updated[index] = recalculateItem(
      current,
      newQty,
      current.rate,
      current.item_discount,
      current.discount_type,
      current.gst_rate
    )
    onItemsChange(updated)
  }

  // Update item discount
  function handleDiscountChange(index: number, discountVal: number, discountType: 'flat' | 'percent') {
    const updated = [...items]
    const current = updated[index]
    updated[index] = recalculateItem(
      current,
      current.quantity,
      current.rate,
      discountVal,
      discountType,
      current.gst_rate
    )
    onItemsChange(updated)
  }

  // Remove item
  function handleRemoveItem(index: number) {
    const updated = items.filter((_, i) => i !== index)
    onItemsChange(updated)
  }

  // Open manual override modal
  function handleOpenOverride(index: number) {
    const item = items[index]
    setOverrideItemIndex(index)
    setOverrideRateInput(String(item.rate))
    setOverrideReasonInput(item.override_reason || '')
    setOverrideUserInput(item.overridden_by || 'POS Operator')
  }

  // Apply manual override
  function handleApplyOverride() {
    if (overrideItemIndex === null) return
    const newRate = Number(overrideRateInput)
    if (isNaN(newRate) || newRate <= 0) {
      alert('⚠️ Please enter a valid positive selling rate.')
      return
    }
    if (!overrideReasonInput.trim()) {
      alert('⚠️ Mandatory Audit Compliance: Please specify the reason for this manual rate override.')
      return
    }

    const updated = [...items]
    const current = updated[overrideItemIndex]
    const recalculated = recalculateItem(
      current,
      current.quantity,
      newRate,
      current.item_discount,
      current.discount_type,
      current.gst_rate
    )

    updated[overrideItemIndex] = {
      ...recalculated,
      rate: newRate,
      rate_source: 'Manual Override',
      is_manually_overridden: true,
      override_reason: overrideReasonInput.trim(),
      overridden_by: overrideUserInput.trim() || 'POS Operator'
    }

    onItemsChange(updated)
    setOverrideItemIndex(null)
  }

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* =========================================================================
          SECTION 1: PRODUCT SELECTION — VISUAL PRODUCT CARDS & DISCOVERY TOOLBAR
          ========================================================================= */}
      {(renderMode === 'all' || renderMode === 'catalog-only') && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                STEP 1: SELECT PRODUCTS
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Visual Product Catalog & Live Rate Resolver
              </h2>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
              {availableProducts.length} Products Available • Live Deterministic Pricing Engine
            </span>
          </div>

          <ProductCardCatalog
            products={availableProducts}
            cartItems={items}
            pricingRules={pricingRules}
            customerId={customerId}
            dealerId={dealerId}
            routeId={routeId}
            customerCategory={customerCategory}
            billDate={billDate}
            isGstEnabled={isGstEnabled}
            onAddProduct={handleAddProduct}
          />
        </div>
      )}

      {/* =========================================================================
          SECTION 2: SELECTED BILL ITEMS — INDIVIDUAL BILLING CARDS
          ========================================================================= */}
      {(renderMode === 'all' || renderMode === 'cart-only') && (
        <div style={{ borderTop: renderMode === 'all' ? '1px solid rgba(255, 255, 255, 0.08)' : 'none', paddingTop: renderMode === 'all' ? '1.25rem' : '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              STEP 2: REVIEW LINE ITEMS
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
              Selected Bill Line Items ({items.length} Products, {totalQuantity} Units)
            </h2>
          </div>

          {/* View Mode Toggle: Cards (Default) vs Table */}
          {items.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#18181b', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => setSelectedItemsViewMode('cards')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedItemsViewMode === 'cards' ? 'rgba(251, 191, 36, 0.18)' : 'transparent',
                  color: selectedItemsViewMode === 'cards' ? '#fbbf24' : '#a1a1aa',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <LayoutGrid style={{ width: '13px', height: '13px' }} />
                Item Cards View
              </button>

              <button
                type="button"
                onClick={() => setSelectedItemsViewMode('table')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedItemsViewMode === 'table' ? 'rgba(251, 191, 36, 0.18)' : 'transparent',
                  color: selectedItemsViewMode === 'table' ? '#fbbf24' : '#a1a1aa',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <ListFilter style={{ width: '13px', height: '13px' }} />
                Compact Table View
              </button>
            </div>
          )}
        </div>

        {/* Selected Items List */}
        {items.length === 0 ? (
          <div
            style={{
              border: '1.5px dashed rgba(255, 255, 255, 0.12)',
              borderRadius: '14px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.01)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(251, 191, 36, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24'
              }}
            >
              <ShoppingCart style={{ width: '28px', height: '28px' }} />
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e4e4e7' }}>
              No Products Added to Bill Yet
            </div>
            <p style={{ color: '#71717a', fontSize: '0.85rem', maxWidth: '420px', margin: 0 }}>
              Click on any product card in the catalog above to add line items. Rates, taxes, discounts, and dues update live.
            </p>
          </div>
        ) : selectedItemsViewMode === 'cards' ? (
          /* Cards Mode: Individual Billing Item Cards */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item, index) => (
              <BillingItemCard
                key={item.id}
                item={item}
                index={index}
                isGstEnabled={isGstEnabled}
                showReturnsAndLeakages={showReturnsAndLeakages}
                onQuantityChange={newQty => handleQuantityChange(index, newQty)}
                onDiscountChange={(discountVal, discountType) => handleDiscountChange(index, discountVal, discountType)}
                onReturnQtyChange={retQty => {
                  const updated = [...items]
                  updated[index] = { ...updated[index], return_qty: retQty }
                  onItemsChange(updated)
                }}
                onLeakQtyChange={leakQty => {
                  const updated = [...items]
                  updated[index] = { ...updated[index], leak_qty: leakQty }
                  onItemsChange(updated)
                }}
                onOpenOverrideModal={() => handleOpenOverride(index)}
                onRemove={() => handleRemoveItem(index)}
              />
            ))}
          </div>
        ) : (
          /* Compact Table Mode */
          <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', background: '#121214' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.85rem', width: '30px' }}>#</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>Product & Variant</th>
                  <th style={{ padding: '0.75rem 0.65rem' }}>Unit</th>
                  <th style={{ padding: '0.75rem 0.65rem' }}>Stock</th>
                  <th style={{ padding: '0.75rem 0.65rem', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>Unit Rate</th>
                  <th style={{ padding: '0.75rem 0.65rem' }}>Discount</th>
                  {isGstEnabled && <th style={{ padding: '0.75rem 0.65rem' }}>GST Tax</th>}
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Line Total (₹)</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.75rem 0.85rem', color: '#71717a' }}>{index + 1}</td>
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{item.product_name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#71717a' }}>{item.category || 'Standard'}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.65rem', color: '#a1a1aa' }}>{item.unit}</td>
                    <td style={{ padding: '0.75rem 0.65rem', color: (item.stock_quantity ?? 0) > 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                      {item.stock_quantity ?? 0}
                    </td>
                    <td style={{ padding: '0.75rem 0.65rem', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleQuantityChange(index, Math.max(1, Number(e.target.value) || 1))}
                        style={{ width: '50px', background: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', textAlign: 'center', padding: '3px' }}
                      />
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <div style={{ fontWeight: 800, color: '#fbbf24' }}>₹{item.rate}</div>
                      <div style={{ fontSize: '0.68rem', color: '#a1a1aa' }}>{item.rate_source}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.65rem' }}>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.item_discount || ''}
                        onChange={e => handleDiscountChange(index, Number(e.target.value) || 0, item.discount_type)}
                        style={{ width: '55px', background: '#18181b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', color: '#fff', textAlign: 'center', padding: '3px' }}
                      />
                    </td>
                    {isGstEnabled && (
                      <td style={{ padding: '0.75rem 0.65rem', fontSize: '0.78rem', color: '#e4e4e7' }}>
                        {item.gst_rate}% (₹{item.gst_amount?.toFixed(2)})
                      </td>
                    )}
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>
                      {formatCurrency(item.total)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Manual Rate Override Modal (Preserves Audit Compliance) */}
      {(renderMode === 'all' || renderMode === 'cart-only') && overrideItemIndex !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#121214',
            border: '1.5px solid rgba(251, 191, 36, 0.4)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(251,191,36,0.05)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  Authorize Rate Override
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '2px' }}>
                  Audit Trail & Financial Governance
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOverrideItemIndex(null)}
                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ color: '#71717a', fontSize: '0.75rem' }}>Product:</div>
                <div style={{ fontWeight: 800, color: '#fff' }}>
                  {items[overrideItemIndex]?.product_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '2px' }}>
                  Original Resolved Rate: <strong style={{ color: '#fbbf24' }}>₹{items[overrideItemIndex]?.original_rate}</strong> ({items[overrideItemIndex]?.rate_source})
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700, marginBottom: '0.35rem' }}>
                  New Unit Selling Rate (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={overrideRateInput}
                  onChange={e => setOverrideRateInput(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#18181b',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                    color: '#fbbf24',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    padding: '0.55rem 0.75rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#ef4444', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Mandatory Reason for Override *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special promotional discount, bulk agreement"
                  value={overrideReasonInput}
                  onChange={e => setOverrideReasonInput(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Authorizing User / Operator
                </label>
                <input
                  type="text"
                  value={overrideUserInput}
                  onChange={e => setOverrideUserInput(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              background: '#0d0d0f'
            }}>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setOverrideItemIndex(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleApplyOverride}
                icon={<Check style={{ width: '15px', height: '15px' }} />}
                style={{ fontWeight: 800 }}
              >
                Apply Authorized Override
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
