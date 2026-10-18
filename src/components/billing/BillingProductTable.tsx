'use client'

import { useState } from 'react'
import { Product } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/formatters'
import { Plus, Trash2, Package, RotateCcw, AlertTriangle, Search, Percent } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export interface BillingCartItem {
  id: string
  product_id?: string | null
  product_name: string
  quantity: number
  rate: number // Selling rate for this specific bill
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
  isGstEnabled: boolean
  showReturnsAndLeakages?: boolean // True for Route and Dealer bills
  onItemsChange: (items: BillingCartItem[]) => void
}

export default function BillingProductTable({
  items,
  availableProducts,
  isGstEnabled,
  showReturnsAndLeakages = false,
  onItemsChange
}: BillingProductTableProps) {
  const [productSearch, setProductSearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  function calculateItemFinancials(
    qty: number,
    rate: number,
    itemDiscount: number,
    discountType: 'flat' | 'percent',
    gstRate: number
  ) {
    const rawAmt = Math.max(0, qty * rate)
    let discVal = 0
    if (discountType === 'percent') {
      discVal = (rawAmt * Math.min(100, itemDiscount)) / 100
    } else {
      discVal = Math.min(rawAmt, itemDiscount)
    }

    const netBeforeTax = Math.max(0, rawAmt - discVal)
    const taxable = netBeforeTax
    let gst = 0

    if (isGstEnabled && gstRate > 0) {
      gst = (taxable * gstRate) / 100
    }

    const lineTotal = taxable + gst

    return {
      taxable_amount: Math.round(taxable * 100) / 100,
      gst_amount: Math.round(gst * 100) / 100,
      amount: Math.round(lineTotal * 100) / 100,
      total: Math.round(lineTotal * 100) / 100
    }
  }

  function handleAddProduct(prod: Product) {
    const existingIndex = items.findIndex(i => i.product_id === prod.id || i.product_name === prod.name)
    if (existingIndex >= 0) {
      const updated = [...items]
      const current = updated[existingIndex]
      const newQty = current.quantity + 1
      const fin = calculateItemFinancials(
        newQty,
        current.rate,
        current.item_discount,
        current.discount_type,
        current.gst_rate
      )
      updated[existingIndex] = {
        ...current,
        quantity: newQty,
        ...fin
      }
      onItemsChange(updated)
    } else {
      const rate = Number(prod.default_rate) || 0
      const gstRate = isGstEnabled ? (Number(prod.gst_rate) || 0) : 0
      const fin = calculateItemFinancials(1, rate, 0, 'flat', gstRate)

      const newItem: BillingCartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        product_id: prod.id,
        product_name: prod.name,
        quantity: 1,
        rate: rate,
        mrp: prod.mrp || rate,
        cost_price: prod.cost_price || 0,
        item_discount: 0,
        discount_type: 'flat',
        gst_rate: gstRate,
        return_qty: 0,
        leak_qty: 0,
        ...fin
      }
      onItemsChange([...items, newItem])
    }
    setProductSearch('')
    setIsDropdownOpen(false)
  }

  function handleCustomItemAdd(name: string) {
    if (!name.trim()) return
    const fin = calculateItemFinancials(1, 0, 0, 'flat', isGstEnabled ? 18 : 0)
    const newItem: BillingCartItem = {
      id: `cart-${Date.now()}`,
      product_id: null,
      product_name: name.trim(),
      quantity: 1,
      rate: 0,
      mrp: 0,
      cost_price: 0,
      item_discount: 0,
      discount_type: 'flat',
      gst_rate: isGstEnabled ? 18 : 0,
      return_qty: 0,
      leak_qty: 0,
      ...fin
    }
    onItemsChange([...items, newItem])
    setProductSearch('')
    setIsDropdownOpen(false)
  }

  function updateItem(index: number, updates: Partial<BillingCartItem>) {
    const updated = [...items]
    const current = { ...updated[index], ...updates }
    
    // Recalculate financials
    const fin = calculateItemFinancials(
      Math.max(1, current.quantity),
      Math.max(0, current.rate),
      Math.max(0, current.item_discount || 0),
      current.discount_type || 'flat',
      isGstEnabled ? (current.gst_rate || 0) : 0
    )

    updated[index] = {
      ...current,
      ...fin
    }
    onItemsChange(updated)
  }

  function removeItem(index: number) {
    const updated = items.filter((_, i) => i !== index)
    onItemsChange(updated)
  }

  const filteredProducts = availableProducts.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(productSearch.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Quick Add Buttons & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Package style={{ width: '15px', height: '15px', color: '#fbbf24' }} />
            Bill Line Items & Products ({items.length})
          </label>
        </div>

        {/* Quick Add Chips */}
        {availableProducts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {availableProducts.slice(0, 8).map(prod => (
              <button
                type="button"
                key={prod.id}
                onClick={() => handleAddProduct(prod)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '0.4rem 0.75rem',
                  color: '#e4e4e7',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#fbbf24'
                  e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }}
              >
                <Plus style={{ width: '12px', height: '12px', color: '#fbbf24' }} />
                <span>{prod.name}</span>
                <span className="num" style={{ color: '#fbbf24', fontSize: '0.75rem' }}>
                  ₹{prod.default_rate}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Search / Add Dropdown */}
        <div style={{ position: 'relative' }}>
          <Input 
            placeholder="🔍 Type product name or barcode to add..."
            value={productSearch}
            onChange={e => {
              setProductSearch(e.target.value)
              setIsDropdownOpen(true)
            }}
            onFocus={() => setIsDropdownOpen(true)}
          />

          {isDropdownOpen && productSearch && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '220px',
              overflowY: 'auto',
              background: '#18181b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              marginTop: '4px',
              zIndex: 40,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.6)'
            }}>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Product not found.</span>
                  <Button 
                    type="button" 
                    variant="primary" 
                    size="sm" 
                    icon={<Plus style={{ width: '13px', height: '13px' }} />}
                    onClick={() => handleCustomItemAdd(productSearch)}
                  >
                    Add Custom Item "{productSearch}"
                  </Button>
                </div>
              ) : (
                filteredProducts.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleAddProduct(prod)}
                    style={{
                      padding: '0.65rem 1rem',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#f4f4f5', fontSize: '0.88rem' }}>{prod.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#71717a', marginLeft: '0.5rem' }}>{prod.category}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="num" style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.9rem' }}>
                        ₹{prod.default_rate}
                      </span>
                      {prod.stock_quantity !== undefined && (
                        <div style={{ fontSize: '0.7rem', color: (prod.stock_quantity || 0) < 10 ? '#f87171' : '#a1a1aa' }}>
                          Stock: {prod.stock_quantity} {prod.unit || 'pcs'}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      {items.length === 0 ? (
        <div style={{ 
          border: '1px dashed rgba(255,255,255,0.12)', 
          borderRadius: '10px', 
          padding: '2.5rem 1rem', 
          textAlign: 'center', 
          color: '#71717a' 
        }}>
          <Package style={{ width: '36px', height: '36px', margin: '0 auto 0.75rem', color: '#52525b' }} />
          <div style={{ fontWeight: 700, color: '#a1a1aa', fontSize: '1rem' }}>No products added yet</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Click on a product chip above or search to add items to this bill.
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.85rem' }}>#</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>Product Name</th>
                <th style={{ padding: '0.75rem 0.85rem', width: '90px' }}>Qty</th>
                <th style={{ padding: '0.75rem 0.85rem', width: '110px' }}>Rate (₹)</th>
                <th style={{ padding: '0.75rem 0.85rem', width: '110px' }}>Discount</th>
                {isGstEnabled && (
                  <th style={{ padding: '0.75rem 0.85rem', width: '85px' }}>GST %</th>
                )}
                {showReturnsAndLeakages && (
                  <>
                    <th style={{ padding: '0.75rem 0.85rem', width: '85px', color: '#34d399' }}>Return</th>
                    <th style={{ padding: '0.75rem 0.85rem', width: '85px', color: '#f87171' }}>Leak</th>
                  </>
                )}
                <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right', width: '120px' }}>Line Total (₹)</th>
                <th style={{ padding: '0.75rem 0.5rem', width: '40px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem 0.85rem', color: '#71717a' }}>{index + 1}</td>
                  
                  {/* Product Name */}
                  <td style={{ padding: '0.75rem 0.85rem' }}>
                    <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{item.product_name}</div>
                    {item.cost_price ? (
                      <div style={{ fontSize: '0.7rem', color: '#71717a' }}>
                        Cost: ₹{item.cost_price} &bull; COGS: ₹{item.cost_price * item.quantity}
                      </div>
                    ) : null}
                  </td>

                  {/* Quantity */}
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <input 
                      type="number" 
                      min="1"
                      className="num"
                      value={item.quantity}
                      onChange={e => updateItem(index, { quantity: Number(e.target.value) || 1 })}
                      style={{
                        width: '100%',
                        padding: '0.35rem 0.5rem',
                        background: '#18181b',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '4px',
                        color: '#fff',
                        fontWeight: 700,
                        textAlign: 'center'
                      }}
                    />
                  </td>

                  {/* Editable Selling Rate */}
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <input 
                      type="number" 
                      step="0.5"
                      min="0"
                      className="num"
                      value={item.rate}
                      onChange={e => updateItem(index, { rate: Number(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        padding: '0.35rem 0.5rem',
                        background: '#18181b',
                        border: '1px solid rgba(251,191,36,0.3)',
                        borderRadius: '4px',
                        color: '#fbbf24',
                        fontWeight: 700,
                        textAlign: 'right'
                      }}
                    />
                  </td>

                  {/* Item Discount */}
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <input 
                        type="number" 
                        min="0"
                        className="num"
                        value={item.item_discount || ''}
                        placeholder="0"
                        onChange={e => updateItem(index, { item_discount: Number(e.target.value) || 0 })}
                        style={{
                          width: '60px',
                          padding: '0.35rem 0.35rem',
                          background: '#18181b',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: '#fff',
                          textAlign: 'right'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => updateItem(index, { discount_type: item.discount_type === 'flat' ? 'percent' : 'flat' })}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          color: '#a1a1aa',
                          fontSize: '0.7rem',
                          padding: '4px 6px',
                          cursor: 'pointer'
                        }}
                        title="Toggle Flat ₹ or Percent %"
                      >
                        {item.discount_type === 'percent' ? '%' : '₹'}
                      </button>
                    </div>
                  </td>

                  {/* GST % */}
                  {isGstEnabled && (
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <select
                        value={item.gst_rate}
                        onChange={e => updateItem(index, { gst_rate: Number(e.target.value) || 0 })}
                        style={{
                          width: '100%',
                          padding: '0.35rem 0.25rem',
                          background: '#18181b',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: '#e4e4e7',
                          fontSize: '0.8rem'
                        }}
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                  )}

                  {/* Route / Dealer Returns & Leakages */}
                  {showReturnsAndLeakages && (
                    <>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <input 
                          type="number"
                          min="0"
                          className="num"
                          value={item.return_qty || ''}
                          placeholder="0"
                          onChange={e => updateItem(index, { return_qty: Number(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '0.35rem 0.35rem',
                            background: '#18181b',
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                            borderRadius: '4px',
                            color: '#34d399',
                            fontWeight: 700,
                            textAlign: 'center'
                          }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <input 
                          type="number"
                          min="0"
                          className="num"
                          value={item.leak_qty || ''}
                          placeholder="0"
                          onChange={e => updateItem(index, { leak_qty: Number(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '0.35rem 0.35rem',
                            background: '#18181b',
                            border: '1px solid rgba(248, 113, 113, 0.3)',
                            borderRadius: '4px',
                            color: '#f87171',
                            fontWeight: 700,
                            textAlign: 'center'
                          }}
                        />
                      </td>
                    </>
                  )}

                  {/* Line Total */}
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                    <span className="num" style={{ fontWeight: 800, color: '#f4f4f5', fontSize: '0.95rem' }}>
                      {formatCurrency(item.total)}
                    </span>
                    {item.gst_amount > 0 && (
                      <div style={{ fontSize: '0.68rem', color: '#a1a1aa' }}>
                        (Tax: ₹{item.gst_amount})
                      </div>
                    )}
                  </td>

                  {/* Remove Action */}
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#71717a',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                      onMouseLeave={e => e.currentTarget.style.color = '#71717a'}
                      title="Remove Item"
                    >
                      <Trash2 style={{ width: '15px', height: '15px' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
