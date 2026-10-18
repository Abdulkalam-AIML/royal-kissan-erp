'use client'

import { formatCurrency } from '@/lib/utils/formatters'
import { Calculator, Tag, Percent, DollarSign, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface BillingSummaryProps {
  subtotal: number
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  gstAmount: number
  discountAmount: number
  roundOff: number
  grandTotal: number
  paidAmount: number
  dueAmount: number
  totalCogs?: number
  isGstEnabled: boolean
  billDiscountValue: number
  billDiscountType: 'flat' | 'percent'
  onBillDiscountValueChange: (val: number) => void
  onBillDiscountTypeChange: (type: 'flat' | 'percent') => void
}

export default function BillingSummary({
  subtotal,
  taxableAmount,
  cgstAmount,
  sgstAmount,
  igstAmount,
  gstAmount,
  discountAmount,
  roundOff,
  grandTotal,
  paidAmount,
  dueAmount,
  totalCogs = 0,
  isGstEnabled,
  billDiscountValue,
  billDiscountType,
  onBillDiscountValueChange,
  onBillDiscountTypeChange
}: BillingSummaryProps) {
  const paymentStatus = dueAmount <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'due')
  const grossProfit = Math.max(0, taxableAmount - totalCogs)
  const marginPct = taxableAmount > 0 ? ((grossProfit / taxableAmount) * 100).toFixed(1) : '0.0'

  return (
    <div style={{
      background: 'rgba(0,0,0,0.35)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.65rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calculator style={{ width: '15px', height: '15px' }} />
          Financial Breakdown
        </span>
        <Badge variant={paymentStatus === 'paid' ? 'success' : paymentStatus === 'partial' ? 'warning' : 'danger'}>
          {paymentStatus === 'paid' ? 'Fully Settled' : paymentStatus === 'partial' ? 'Partially Paid' : 'Credit / Outstanding'}
        </Badge>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem' }}>
        {/* Gross Subtotal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa' }}>
          <span>Items Gross Subtotal</span>
          <span className="num" style={{ color: '#f4f4f5', fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
        </div>

        {/* Bill-level Discount Input */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0' }}>
          <span style={{ color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Tag style={{ width: '12px', height: '12px', color: '#fbbf24' }} /> Extra Bill Discount:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="number"
              min="0"
              className="num"
              placeholder="0"
              value={billDiscountValue || ''}
              onChange={e => onBillDiscountValueChange(Number(e.target.value) || 0)}
              style={{
                width: '65px',
                padding: '0.25rem 0.4rem',
                background: '#18181b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '0.8rem',
                textAlign: 'right'
              }}
            />
            <button
              type="button"
              onClick={() => onBillDiscountTypeChange(billDiscountType === 'flat' ? 'percent' : 'flat')}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                color: '#fbbf24',
                fontSize: '0.72rem',
                padding: '3px 6px',
                cursor: 'pointer'
              }}
            >
              {billDiscountType === 'percent' ? '%' : '₹'}
            </button>
          </div>
        </div>

        {/* Total Discount Amount */}
        {discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
            <span>Total Discount Applied</span>
            <span className="num" style={{ fontWeight: 600 }}>- {formatCurrency(discountAmount)}</span>
          </div>
        )}

        {/* Taxable Amount */}
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa' }}>
          <span>Taxable Amount</span>
          <span className="num" style={{ color: '#f4f4f5', fontWeight: 600 }}>{formatCurrency(taxableAmount)}</span>
        </div>

        {/* GST Breakdowns if enabled */}
        {isGstEnabled && gstAmount > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', fontSize: '0.8rem' }}>
              <span>CGST (50% of GST)</span>
              <span className="num">+{formatCurrency(cgstAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', fontSize: '0.8rem' }}>
              <span>SGST (50% of GST)</span>
              <span className="num">+{formatCurrency(sgstAmount)}</span>
            </div>
            {igstAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', fontSize: '0.8rem' }}>
                <span>IGST (Interstate)</span>
                <span className="num">+{formatCurrency(igstAmount)}</span>
              </div>
            )}
          </>
        )}

        {/* Round Off */}
        {roundOff !== 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', fontSize: '0.8rem' }}>
            <span>Round Off</span>
            <span className="num">{roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Grand Total Highlight */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0.75rem 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline'
      }}>
        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>Grand Total</span>
        <span className="num" style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24' }}>
          {formatCurrency(grandTotal)}
        </span>
      </div>

      {/* Paid & Due Breakdown */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Amount Paid</div>
          <div className="num" style={{ fontWeight: 800, color: '#34d399', fontSize: '1.1rem' }}>
            {formatCurrency(paidAmount)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Balance Due</div>
          <div className="num" style={{ fontWeight: 800, color: dueAmount > 0 ? '#f87171' : '#34d399', fontSize: '1.1rem' }}>
            {formatCurrency(dueAmount)}
          </div>
        </div>
      </div>

      {/* Historical Margin Intelligence (if product costs populated) */}
      {totalCogs > 0 && (
        <div style={{ 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid rgba(255,255,255,0.04)', 
          borderRadius: '6px', 
          padding: '0.4rem 0.65rem',
          fontSize: '0.72rem',
          color: '#71717a',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>Est. COGS: ₹{totalCogs.toFixed(2)}</span>
          <span style={{ color: '#34d399' }}>Gross Margin: {marginPct}% (₹{grossProfit.toFixed(2)})</span>
        </div>
      )}
    </div>
  )
}
