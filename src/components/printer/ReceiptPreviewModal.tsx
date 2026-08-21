'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Printer, CheckCircle, AlertTriangle, FileText } from 'lucide-react'
import { BillData } from '@/lib/printer/receipt'
import { CopyType } from '@/lib/printer/printer-config'

interface ReceiptPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  bill: BillData | null
  onPrint?: (copyType: CopyType) => Promise<void>
  initialFormat?: '80mm' | '58mm' | 'A4'
}

export default function ReceiptPreviewModal({
  isOpen,
  onClose,
  bill,
  onPrint,
  initialFormat = '80mm',
}: ReceiptPreviewModalProps) {
  const [copyType, setCopyType] = useState<CopyType>('customer')
  const [formatMode, setFormatMode] = useState<'80mm' | '58mm' | 'A4'>(initialFormat)
  const [printing, setPrinting] = useState(false)
  const [printStatus, setPrintStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  if (!isOpen || !bill) return null

  const formattedDate = bill.date || new Date().toISOString().split('T')[0]
  const timeStr = bill.created_at
    ? new Date(bill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const handlePrintClick = async () => {
    if (!onPrint) return
    setPrinting(true)
    setPrintStatus(null)
    try {
      await onPrint(copyType)
      setPrintStatus({ type: 'success', message: 'Bill Printed Successfully' })
    } catch (err: any) {
      setPrintStatus({ type: 'error', message: err?.message || 'Printing failed' })
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#18181b',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: formatMode === 'A4' ? '700px' : '480px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#09090b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>
              Invoice Preview ({formatMode.toUpperCase()})
            </h3>
          </div>

          {/* Mode Switcher Pills */}
          <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: '#18181b', padding: '3px', borderRadius: '8px', border: '1px solid #27272a' }}>
            {(['80mm', '58mm', 'A4'] as const).map(fmt => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatMode(fmt)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: formatMode === fmt ? '#fbbf24' : 'transparent',
                  color: formatMode === fmt ? '#000' : '#a1a1aa',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {fmt}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, backgroundColor: '#27272a' }}>
          
          {/* Copy Selector */}
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: '#e4e4e7', whiteSpace: 'nowrap' }}>Copy Type:</label>
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value as CopyType)}
              style={{
                backgroundColor: '#18181b',
                color: '#fff',
                border: '1px solid #3f3f46',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.85rem',
                flex: 1,
              }}
            >
              <option value="customer">Customer Copy</option>
              <option value="kitchen">Kitchen Copy</option>
              <option value="office">Office Copy</option>
              <option value="company">Company Copy</option>
              <option value="duplicate">Duplicate Copy</option>
            </select>
          </div>

          {/* Format Mode Previews */}
          {formatMode === 'A4' ? (
            /* A4 Full Sheet Preview */
            <div
              style={{
                backgroundColor: '#fff',
                color: '#000',
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: '12px',
                lineHeight: '1.4',
                width: '100%',
                maxWidth: '600px',
                margin: '0 auto',
                padding: '24px',
                borderRadius: '4px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                border: '1px solid #d4d4d8',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #18181b', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>ROYAL KISSAN</h2>
                  <div style={{ fontSize: '11px', color: '#52525b' }}>Packaged Drinking Water Solutions</div>
                  <div style={{ fontSize: '10px', color: '#71717a' }}>GSTIN: 37BABS2021G1Z3 | Ph: +91 93476 62554</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#18181b' }}>
                    {bill.bill_type === 'non_gst_invoice' ? 'RETAIL INVOICE' : 'TAX INVOICE'}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700 }}>Inv #: {bill.invoice_number}</div>
                  <div style={{ fontSize: '10px', color: '#71717a' }}>Date: {formattedDate}</div>
                </div>
              </div>

              {/* Customer Info */}
              <div style={{ backgroundColor: '#f4f4f5', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, marginBottom: '2px' }}>Billed To:</div>
                <div>Customer: {bill.customer_name}</div>
                {bill.customer_phone && <div>Phone: {bill.customer_phone}</div>}
                {bill.customer_address && <div>Address: {bill.customer_address}</div>}
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#18181b', color: '#fff', fontSize: '11px', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>#</th>
                    <th style={{ padding: '6px 8px' }}>Item Description</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rate</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items?.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e4e4e7', fontSize: '11px' }}>
                      <td style={{ padding: '6px 8px' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{it.product_name}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{it.quantity}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{it.rate}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{it.amount || it.quantity * it.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>₹{Number(bill.subtotal).toFixed(2)}</span>
                  </div>
                  {bill.gst_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>GST:</span>
                      <span>₹{Number(bill.gst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, borderTop: '2px solid #000', paddingTop: '4px', color: '#dc2626' }}>
                    <span>Grand Total:</span>
                    <span>₹{Number(bill.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* Thermal Paper Roll (80mm / 58mm) */
            <div
              style={{
                backgroundColor: '#fff',
                color: '#000',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: formatMode === '58mm' ? '11px' : '12px',
                lineHeight: '1.25',
                width: '100%',
                maxWidth: formatMode === '58mm' ? '280px' : '384px',
                margin: '0 auto',
                padding: formatMode === '58mm' ? '12px 8px' : '16px 12px',
                borderRadius: '2px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                borderTop: '4px dashed #a1a1aa',
                borderBottom: '4px dashed #a1a1aa',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Logo & Header */}
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: formatMode === '58mm' ? '15px' : '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>ROYAL KISSAN</div>
                <div style={{ fontSize: '10px' }}>Packaged Drinking Water</div>
                <div style={{ fontSize: '10px' }}>Phone: +91 93476 62554</div>
                <div style={{ fontSize: '10px' }}>GSTIN: 37BABS2021G1Z3</div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>
                  *** {copyType.toUpperCase()} COPY ***
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

              {/* Meta */}
              <div>
                <div>Inv #: {bill.invoice_number}</div>
                <div>Date : {formattedDate} {timeStr}</div>
                <div>Cust : {bill.customer_name}</div>
                {bill.customer_phone && <div>Ph   : {bill.customer_phone}</div>}
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

              {/* Items Table */}
              <div style={{ display: 'grid', gridTemplateColumns: formatMode === '58mm' ? '100px 25px 35px 45px' : '140px 30px 40px 60px', fontWeight: 'bold' }}>
                <span>Item</span>
                <span style={{ textAlign: 'right' }}>Qty</span>
                <span style={{ textAlign: 'right' }}>Rate</span>
                <span style={{ textAlign: 'right' }}>Amt</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

              {bill.items?.map((it, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: formatMode === '58mm' ? '100px 25px 35px 45px' : '140px 30px 40px 60px', margin: '2px 0' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.product_name}
                  </span>
                  <span style={{ textAlign: 'right' }}>{it.quantity}</span>
                  <span style={{ textAlign: 'right' }}>₹{it.rate}</span>
                  <span style={{ textAlign: 'right' }}>₹{it.amount || it.quantity * it.rate}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{Number(bill.subtotal).toFixed(2)}</span>
              </div>
              {bill.gst_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST:</span>
                  <span>₹{Number(bill.gst_amount).toFixed(2)}</span>
                </div>
              )}

              <div style={{ borderTop: '2px solid #000', margin: '6px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: formatMode === '58mm' ? '13px' : '15px', fontWeight: 'bold' }}>
                <span>TOTAL:</span>
                <span>₹{Number(bill.total_amount).toFixed(2)}</span>
              </div>

              <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '10px' }}>
                Thank You! Visit Again.
              </div>
            </div>
          )}

          {printStatus && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: printStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${printStatus.type === 'success' ? '#10b981' : '#ef4444'}`,
                color: printStatus.type === 'success' ? '#34d399' : '#f87171',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {printStatus.type === 'success' ? <CheckCircle style={{ width: '16px' }} /> : <AlertTriangle style={{ width: '16px' }} />}
              {printStatus.message}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#09090b',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              backgroundColor: '#27272a',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Close
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handlePrintClick}
              disabled={printing}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '6px',
                backgroundColor: '#fbbf24',
                color: '#000',
                fontWeight: 700,
                border: 'none',
                cursor: printing ? 'wait' : 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Printer style={{ width: '16px', height: '16px' }} />
              {printing ? 'Printing...' : `Print ${formatMode}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
