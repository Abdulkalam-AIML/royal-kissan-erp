'use client'

import React from 'react'
import { BillingCartItem } from './BillingProductTable'
import ProductVisualIcon from './ProductVisualIcon'
import { formatCurrency } from '@/lib/utils/formatters'
import { 
  Minus, 
  Plus, 
  Trash2, 
  Edit3, 
  Tag, 
  AlertTriangle, 
  RotateCcw, 
  Droplet,
  Percent
} from 'lucide-react'

interface BillingItemCardProps {
  item: BillingCartItem
  index: number
  isGstEnabled: boolean
  showReturnsAndLeakages?: boolean
  onQuantityChange: (newQty: number) => void
  onDiscountChange: (discountVal: number, discountType: 'flat' | 'percent') => void
  onReturnQtyChange?: (returnQty: number) => void
  onLeakQtyChange?: (leakQty: number) => void
  onOpenOverrideModal: () => void
  onRemove: () => void
}

export default function BillingItemCard({
  item,
  index,
  isGstEnabled,
  showReturnsAndLeakages = false,
  onQuantityChange,
  onDiscountChange,
  onReturnQtyChange,
  onLeakQtyChange,
  onOpenOverrideModal,
  onRemove
}: BillingItemCardProps) {
  const isMissingRate = item.is_missing_rate || item.rate <= 0

  // Render rate source badge
  function renderRateBadge(rateSource: string) {
    let bg = 'rgba(96, 165, 250, 0.12)'
    let border = 'rgba(96, 165, 250, 0.35)'
    let color = '#60a5fa'

    if (rateSource === 'Dealer Rate') {
      bg = 'rgba(251, 191, 36, 0.15)'
      border = '#fbbf24'
      color = '#fbbf24'
    } else if (rateSource === 'Customer Rate') {
      bg = 'rgba(52, 211, 153, 0.15)'
      border = '#34d399'
      color = '#34d399'
    } else if (rateSource === 'Route Rate') {
      bg = 'rgba(167, 139, 250, 0.15)'
      border = '#a78bfa'
      color = '#a78bfa'
    } else if (rateSource === 'Manual Override') {
      bg = 'rgba(239, 68, 68, 0.2)'
      border = '#ef4444'
      color = '#ef4444'
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '0.68rem',
          fontWeight: 800,
          padding: '2px 6px',
          borderRadius: '5px',
          background: bg,
          border: `1px solid ${border}`,
          color: color,
          letterSpacing: '0.02em',
          textTransform: 'uppercase'
        }}
      >
        {rateSource}
      </span>
    )
  }

  return (
    <div
      style={{
        background: '#121214',
        border: isMissingRate ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        position: 'relative',
        transition: 'border-color 0.2s'
      }}
    >
      {/* 1. TOP HEADER: Product Info & Quick Delete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <ProductVisualIcon
            productName={item.product_name}
            category={item.category}
            size="sm"
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
                {item.product_name}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#a1a1aa',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  textTransform: 'capitalize'
                }}
              >
                {item.unit || 'piece'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '3px', fontSize: '0.72rem' }}>
              <span style={{ color: '#71717a' }}>
                Stock: <strong style={{ color: (item.stock_quantity ?? 0) > 0 ? '#34d399' : '#f87171' }}>{item.stock_quantity ?? 0}</strong>
              </span>
              {item.has_conflict && (
                <span style={{ color: '#fbbf24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <AlertTriangle style={{ width: '11px', height: '11px' }} /> Conflict
                </span>
              )}
              {isMissingRate && (
                <span style={{ color: '#ef4444', fontWeight: 800 }}>
                  ⚠️ MISSING RATE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Remove Button */}
        <button
          type="button"
          onClick={onRemove}
          title="Remove from bill"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '6px',
            color: '#ef4444',
            padding: '0.35rem 0.6rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#ef4444'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
            e.currentTarget.style.color = '#ef4444'
          }}
        >
          <Trash2 style={{ width: '13px', height: '13px' }} />
          <span>Remove</span>
        </button>
      </div>

      {/* 2. MIDDLE ROW: Interactive Controls Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          padding: '0.75rem'
        }}
      >
        {/* Applied Unit Rate */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
            Unit Rate
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span className="num" style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fbbf24' }}>
              ₹{item.rate}
            </span>
            <button
              type="button"
              onClick={onOpenOverrideModal}
              title="Override Rate with Reason"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                color: '#a1a1aa',
                padding: '2px 5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.68rem'
              }}
            >
              <Edit3 style={{ width: '11px', height: '11px' }} />
              Override
            </button>
          </div>
          <div style={{ marginTop: '3px' }}>
            {renderRateBadge(item.rate_source)}
          </div>
        </div>

        {/* Quantity Stepper */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
            Quantity
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#18181b',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            <button
              type="button"
              onClick={() => onQuantityChange(Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.04)',
                color: item.quantity <= 1 ? '#52525b' : '#fff',
                cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Minus style={{ width: '13px', height: '13px' }} />
            </button>

            <input
              type="number"
              min="1"
              className="num"
              value={item.quantity}
              onChange={e => onQuantityChange(Math.max(1, Number(e.target.value) || 1))}
              style={{
                width: '50px',
                height: '32px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.95rem',
                textAlign: 'center',
                outline: 'none'
              }}
            />

            <button
              type="button"
              onClick={() => onQuantityChange(item.quantity + 1)}
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'rgba(251, 191, 36, 0.15)',
                color: '#fbbf24',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Plus style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
        </div>

        {/* Item Discount */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
            Item Discount
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <input
              type="number"
              min="0"
              className="num"
              value={item.item_discount || ''}
              placeholder="0"
              onChange={e => onDiscountChange(Number(e.target.value) || 0, item.discount_type)}
              style={{
                width: '65px',
                height: '32px',
                background: '#18181b',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.82rem',
                textAlign: 'center',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={() => onDiscountChange(item.item_discount, item.discount_type === 'flat' ? 'percent' : 'flat')}
              style={{
                height: '32px',
                padding: '0 6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fbbf24',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {item.discount_type === 'percent' ? '%' : '₹'}
            </button>
          </div>
        </div>

        {/* Tax (GST) */}
        {isGstEnabled && (
          <div>
            <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
              GST Rate
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e4e4e7', marginTop: '4px' }}>
              {item.gst_rate}%
            </div>
            <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>
              Tax: ₹{item.gst_amount?.toFixed(2) || '0.00'}
            </div>
          </div>
        )}

        {/* Optional Returns & Leakages (Route/Dealer) */}
        {showReturnsAndLeakages && (
          <div>
            <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
              Returns & Leakage
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                placeholder="Ret"
                title="Can Returns"
                value={item.return_qty || ''}
                onChange={e => onReturnQtyChange && onReturnQtyChange(Number(e.target.value) || 0)}
                style={{
                  width: '50px',
                  height: '32px',
                  background: 'rgba(52, 211, 153, 0.1)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  borderRadius: '6px',
                  color: '#34d399',
                  fontSize: '0.78rem',
                  textAlign: 'center'
                }}
              />
              <input
                type="number"
                min="0"
                placeholder="Leak"
                title="Jar Leakages"
                value={item.leak_qty || ''}
                onChange={e => onLeakQtyChange && onLeakQtyChange(Number(e.target.value) || 0)}
                style={{
                  width: '50px',
                  height: '32px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#ef4444',
                  fontSize: '0.78rem',
                  textAlign: 'center'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM FOOTER: Line Total & Financial Breakdown */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '0.5rem'
        }}
      >
        <div style={{ fontSize: '0.75rem', color: '#71717a' }}>
          <span>Taxable: ₹{item.taxable_amount?.toFixed(2) || (item.quantity * item.rate).toFixed(2)}</span>
          {isGstEnabled && item.gst_amount > 0 && (
            <span> + GST: ₹{item.gst_amount.toFixed(2)}</span>
          )}
        </div>

        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>
            Line Total:
          </span>
          <span className="num" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fbbf24' }}>
            {formatCurrency(item.total)}
          </span>
        </div>
      </div>
    </div>
  )
}
