'use client'

import { useState, useEffect } from 'react'
import { PaymentMode } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/formatters'
import { CreditCard, Banknote, QrCode, Building, Wallet, Split, AlertCircle, FileText } from 'lucide-react'
import { Input } from '@/components/ui/Input'

interface BillingPaymentPanelProps {
  grandTotal: number
  paidAmount: number
  paymentMode: PaymentMode
  cashAmount: number
  upiAmount: number
  cardAmount: number
  bankAmount: number
  walletAmount: number
  notes: string
  reference: string
  onPaidAmountChange: (paid: number) => void
  onPaymentModeChange: (mode: PaymentMode) => void
  onCashChange: (val: number) => void
  onUpiChange: (val: number) => void
  onCardChange: (val: number) => void
  onBankChange: (val: number) => void
  onWalletChange: (val: number) => void
  onNotesChange: (notes: string) => void
  onReferenceChange: (ref: string) => void
}

export default function BillingPaymentPanel({
  grandTotal,
  paidAmount,
  paymentMode,
  cashAmount,
  upiAmount,
  cardAmount,
  bankAmount,
  walletAmount,
  notes,
  reference,
  onPaidAmountChange,
  onPaymentModeChange,
  onCashChange,
  onUpiChange,
  onCardChange,
  onBankChange,
  onWalletChange,
  onNotesChange,
  onReferenceChange
}: BillingPaymentPanelProps) {
  const modes: { mode: PaymentMode; label: string; icon: any }[] = [
    { mode: 'cash', label: 'Cash', icon: Banknote },
    { mode: 'upi', label: 'UPI / QR', icon: QrCode },
    { mode: 'card', label: 'Card', icon: CreditCard },
    { mode: 'bank', label: 'Bank Transfer', icon: Building },
    { mode: 'wallet', label: 'Wallet', icon: Wallet },
    { mode: 'mixed', label: 'Split / Mixed', icon: Split },
    { mode: 'due', label: 'Credit / Due', icon: AlertCircle }
  ]

  function handleModeSelect(mode: PaymentMode) {
    onPaymentModeChange(mode)
    if (mode === 'due') {
      onPaidAmountChange(0)
      onCashChange(0)
      onUpiChange(0)
      onCardChange(0)
      onBankChange(0)
      onWalletChange(0)
    } else if (mode === 'cash') {
      onPaidAmountChange(grandTotal)
      onCashChange(grandTotal)
      onUpiChange(0)
      onCardChange(0)
      onBankChange(0)
      onWalletChange(0)
    } else if (mode === 'upi') {
      onPaidAmountChange(grandTotal)
      onCashChange(0)
      onUpiChange(grandTotal)
      onCardChange(0)
      onBankChange(0)
      onWalletChange(0)
    } else if (mode === 'card') {
      onPaidAmountChange(grandTotal)
      onCashChange(0)
      onUpiChange(0)
      onCardChange(grandTotal)
      onBankChange(0)
      onWalletChange(0)
    } else if (mode === 'bank') {
      onPaidAmountChange(grandTotal)
      onCashChange(0)
      onUpiChange(0)
      onCardChange(0)
      onBankChange(grandTotal)
      onWalletChange(0)
    } else if (mode === 'wallet') {
      onPaidAmountChange(grandTotal)
      onCashChange(0)
      onUpiChange(0)
      onCardChange(0)
      onBankChange(0)
      onWalletChange(grandTotal)
    }
  }

  // Handle mixed payment updates
  function updateMixedSplit(field: 'cash' | 'upi' | 'card' | 'bank' | 'wallet', val: number) {
    const c = field === 'cash' ? val : cashAmount
    const u = field === 'upi' ? val : upiAmount
    const cd = field === 'card' ? val : cardAmount
    const b = field === 'bank' ? val : bankAmount
    const w = field === 'wallet' ? val : walletAmount

    if (field === 'cash') onCashChange(val)
    if (field === 'upi') onUpiChange(val)
    if (field === 'card') onCardChange(val)
    if (field === 'bank') onBankChange(val)
    if (field === 'wallet') onWalletChange(val)

    const totalPaid = c + u + cd + b + w
    onPaidAmountChange(totalPaid)
  }

  const dueAmount = Math.max(0, grandTotal - paidAmount)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <CreditCard style={{ width: '15px', height: '15px', color: '#fbbf24' }} />
        Payment Settlement Mode
      </label>

      {/* Mode Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
        {modes.map(m => {
          const Icon = m.icon
          const isSelected = paymentMode === m.mode
          return (
            <button
              type="button"
              key={m.mode}
              onClick={() => handleModeSelect(m.mode)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.65rem 0.5rem',
                borderRadius: '8px',
                border: `1px solid ${isSelected ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
                background: isSelected ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255,255,255,0.02)',
                color: isSelected ? '#fbbf24' : '#a1a1aa',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Icon style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 800 : 600 }}>{m.label}</span>
            </button>
          )
        })}
      </div>

      {/* Mixed / Split Payment Panel */}
      {paymentMode === 'mixed' ? (
        <div style={{ 
          background: 'rgba(0,0,0,0.3)', 
          border: '1px solid rgba(251, 191, 36, 0.25)', 
          borderRadius: '8px', 
          padding: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem'
        }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Cash (₹)</label>
            <input
              type="number"
              min="0"
              className="num"
              value={cashAmount || ''}
              placeholder="0"
              onChange={e => updateMixedSplit('cash', Number(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.45rem 0.5rem',
                background: '#18181b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '4px',
                color: '#34d399',
                fontWeight: 700
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>UPI / QR (₹)</label>
            <input
              type="number"
              min="0"
              className="num"
              value={upiAmount || ''}
              placeholder="0"
              onChange={e => updateMixedSplit('upi', Number(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.45rem 0.5rem',
                background: '#18181b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '4px',
                color: '#60a5fa',
                fontWeight: 700
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Card / POS (₹)</label>
            <input
              type="number"
              min="0"
              className="num"
              value={cardAmount || ''}
              placeholder="0"
              onChange={e => updateMixedSplit('card', Number(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.45rem 0.5rem',
                background: '#18181b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '4px',
                color: '#fbbf24',
                fontWeight: 700
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Bank NEFT (₹)</label>
            <input
              type="number"
              min="0"
              className="num"
              value={bankAmount || ''}
              placeholder="0"
              onChange={e => updateMixedSplit('bank', Number(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.45rem 0.5rem',
                background: '#18181b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '4px',
                color: '#c084fc',
                fontWeight: 700
              }}
            />
          </div>
        </div>
      ) : paymentMode !== 'due' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Amount Received (₹)
            </label>
            <input
              type="number"
              min="0"
              className="num"
              value={paidAmount}
              onChange={e => {
                const val = Number(e.target.value) || 0
                onPaidAmountChange(val)
                if (paymentMode === 'cash') onCashChange(val)
                if (paymentMode === 'upi') onUpiChange(val)
                if (paymentMode === 'card') onCardChange(val)
                if (paymentMode === 'bank') onBankChange(val)
                if (paymentMode === 'wallet') onWalletChange(val)
              }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                background: '#18181b',
                border: '1px solid rgba(251,191,36,0.4)',
                borderRadius: '6px',
                color: '#34d399',
                fontSize: '1.1rem',
                fontWeight: 800
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Transaction Ref / UTR / Cheque No
            </label>
            <input
              type="text"
              placeholder="e.g. UPI Ref 3829104820"
              value={reference}
              onChange={e => onReferenceChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                background: '#18181b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.08)', 
          border: '1px solid rgba(239, 68, 68, 0.25)', 
          borderRadius: '8px', 
          padding: '0.75rem 1rem',
          color: '#fca5a5',
          fontSize: '0.85rem'
        }}>
          ⚠️ Full bill amount of <strong style={{ color: '#fff' }}>{formatCurrency(grandTotal)}</strong> will be recorded as Outstanding Receivable in Dues Ledger.
        </div>
      )}

      {/* Payment Remarks */}
      <div>
        <input
          type="text"
          placeholder="Payment remarks or delivery instructions (optional)..."
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            color: '#d4d4d8',
            fontSize: '0.85rem'
          }}
        />
      </div>
    </div>
  )
}
