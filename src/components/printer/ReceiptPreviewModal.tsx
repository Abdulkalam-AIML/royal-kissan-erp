'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Printer, CheckCircle, AlertTriangle } from 'lucide-react'
import { BillData } from '@/lib/printer/receipt'
import { CopyType } from '@/lib/printer/printer-config'

interface ReceiptPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  bill: BillData | null
  onPrint?: (copyType: CopyType) => Promise<void>
  initialFormat?: '80mm' | '58mm' | 'A4'
}

function numberToIndianRupeesWords(num: number): string {
  if (!num || num === 0) return 'Zero Rupees Only'
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  function convert(n: number): string {
    if (n < 20) return units[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '')
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }

  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 100)
  let result = convert(intPart) + ' Rupees'
  if (decPart > 0) {
    result += ' and ' + convert(decPart) + ' Paise'
  }
  return result + ' Only'
}

export default function ReceiptPreviewModal({
  isOpen,
  onClose,
  bill,
  onPrint,
  initialFormat = '80mm',
}: ReceiptPreviewModalProps) {
  const defaultCopy: CopyType = (bill?.dealer_name || bill?.dealer_id || bill?.bill_type === 'dealer') ? 'dealer' : 'customer'
  const [copyType, setCopyType] = useState<CopyType>(defaultCopy)
  const [formatMode, setFormatMode] = useState<'80mm' | '58mm' | 'A4'>(initialFormat)
  const [printing, setPrinting] = useState(false)
  const [printStatus, setPrintStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  if (!isOpen || !bill) return null

  const formattedDate = bill.date || new Date().toISOString().split('T')[0]
  const timeStr = bill.created_at
    ? new Date(bill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const isDealerCopy = copyType === 'dealer'
  const isGstOn = bill.bill_type !== 'non_gst_invoice' && bill.gst_amount > 0
  const grandTotal = Number(bill.total_amount || 0)
  const subtotal = Number(bill.subtotal || 0)
  const discount = Number(bill.discount_amount || 0)
  const gstAmount = Number(bill.gst_amount || 0)
  const cgstAmount = isGstOn ? gstAmount / 2 : 0
  const sgstAmount = isGstOn ? gstAmount / 2 : 0
  const taxableAmount = Math.max(0, subtotal - discount)
  const paidAmount = Number(bill.paid_amount || 0)
  const dueAmount = Number(bill.due_amount || 0)

  const dealerDisplayName = bill.dealer_name || bill.customer_name || 'Customer'
  const dealerPhone = bill.dealer_phone || bill.customer_phone
  const dealerAddress = bill.dealer_address || bill.customer_address
  const dealerGstin = bill.dealer_gstin || bill.customer_gstin

  const handlePrintClick = async () => {
    setPrinting(true)
    setPrintStatus(null)
    try {
      // Trigger standard browser / system print dialog
      window.print()

      setPrintStatus({
        type: 'success',
        message: 'Device print dialog opened. Select your TVS-E RP3230ABW (or system printer) to print. Note: The operating system handles physical print spooling.',
      })

      if (onPrint) {
        await onPrint(copyType)
      }
    } catch (err: any) {
      setPrintStatus({ type: 'error', message: err?.message || 'Failed to open system print dialog' })
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div
      className="receipt-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Dynamic @page sizing injected based on active format */}
      <style>{`
        @media print {
          @page {
            size: ${formatMode === 'A4' ? 'A4 portrait' : formatMode === '58mm' ? '58mm auto' : '80mm auto'};
            margin: ${formatMode === 'A4' ? '8mm' : '0'};
          }
        }
      `}</style>

      <div
        className="receipt-modal-container"
        style={{
          backgroundColor: '#18181b',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          maxWidth: formatMode === 'A4' ? '820px' : '480px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Modal Header Bar */}
        <div
          className="no-print"
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f4f4f5', margin: 0 }}>
              Print Bill ({copyType.toUpperCase()} — {formatMode})
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
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  backgroundColor: formatMode === fmt ? '#fbbf24' : 'transparent',
                  color: formatMode === fmt ? '#000' : '#a1a1aa',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
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

        {/* Modal Content Scroll Area */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, backgroundColor: '#27272a' }}>
          
          {/* Copy Selector */}
          <div className="no-print" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: '#e4e4e7', whiteSpace: 'nowrap', fontWeight: 600 }}>Copy Type:</label>
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value as CopyType)}
              style={{
                backgroundColor: '#18181b',
                color: '#fff',
                border: '1px solid #3f3f46',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.85rem',
                flex: 1,
              }}
            >
              <option value="customer">Customer Copy</option>
              <option value="dealer">Dealer Copy</option>
              <option value="kitchen">Kitchen Copy</option>
              <option value="office">Office Copy</option>
              <option value="company">Company Copy</option>
              <option value="duplicate">Duplicate Copy</option>
            </select>
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* TEMPLATE A: A4 FULL GST TAX / RETAIL INVOICE                     */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {formatMode === 'A4' && (
            <div
              className="printable-area print-format-a4"
              style={{
                backgroundColor: '#fff',
                color: '#000',
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                fontSize: '12px',
                lineHeight: '1.4',
                width: '100%',
                maxWidth: '740px',
                margin: '0 auto',
                padding: '28px',
                borderRadius: '4px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                border: '1px solid #e4e4e7',
              }}
            >
              {/* Header: Logo & Company Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <Image src="/branding/royal-kissan-logo.png" alt="Royal Kissan Logo" width={130} height={52} style={{ objectFit: 'contain' }} priority />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#000', letterSpacing: '-0.02em' }}>ROYAL KISSAN</h2>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#18181b', textTransform: 'uppercase' }}>Packaged Drinking Water</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#27272a' }}>BASHU ABBAS BEVERAGES</div>
                    <div style={{ fontSize: '10px', color: '#52525b', marginTop: '2px' }}>
                      15-2 Behind AnjaneyaSwami Temple, Sri Ram Nagar, Chintalapudi, Elure-534460
                    </div>
                    <div style={{ fontSize: '10px', color: '#52525b', fontWeight: 600 }}>
                      Ph: +91 93476 62554 | GSTIN: 37BABS2021G1Z3
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#000', letterSpacing: '-0.02em' }}>
                    {isGstOn ? 'TAX INVOICE' : 'RETAIL INVOICE'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: isDealerCopy ? '#dc2626' : '#27272a', marginTop: '4px', textTransform: 'uppercase' }}>
                    *** {isDealerCopy ? 'DEALER COPY' : `${copyType.toUpperCase()} COPY`} ***
                  </div>
                </div>
              </div>

              {/* Invoice Meta & Customer / Dealer Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f4f4f5', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e4e4e7' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: isDealerCopy ? '#dc2626' : '#52525b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {isDealerCopy ? 'DEALER INFORMATION:' : 'Billed To:'}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#000' }}>{dealerDisplayName}</div>
                  {dealerPhone && <div style={{ fontSize: '11px', color: '#27272a' }}>Phone: {dealerPhone}</div>}
                  {dealerAddress && <div style={{ fontSize: '11px', color: '#27272a' }}>Address: {dealerAddress}</div>}
                  {dealerGstin && <div style={{ fontSize: '11px', fontWeight: 700, color: '#000' }}>GSTIN: {dealerGstin}</div>}
                  {bill.dealer_code && <div style={{ fontSize: '10px', color: '#52525b' }}>Dealer Code: {bill.dealer_code}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#52525b', textTransform: 'uppercase', marginBottom: '4px' }}>Invoice Details:</div>
                  <div style={{ fontSize: '12px', fontWeight: 800 }}>Invoice #: <span style={{ color: '#000' }}>{bill.invoice_number}</span></div>
                  <div style={{ fontSize: '11px' }}>Date: {formattedDate}</div>
                  <div style={{ fontSize: '11px' }}>Time: {timeStr}</div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#18181b', color: '#fff', fontSize: '10px', textTransform: 'uppercase', textAlign: 'left' }}>
                    <th style={{ padding: '8px', width: '30px' }}>#</th>
                    <th style={{ padding: '8px' }}>Item Description</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>HSN</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '50px' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '60px' }}>Rate</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '60px' }}>Disc</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '70px' }}>Taxable</th>
                    {isGstOn && <th style={{ padding: '8px', textAlign: 'right', width: '60px' }}>GST %</th>}
                    <th style={{ padding: '8px', textAlign: 'right', width: '80px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items?.map((it, idx) => {
                    const qty = it.quantity || 1
                    const rate = it.rate || 0
                    const disc = it.item_discount || 0
                    const itemSubtotal = qty * rate
                    const itemTaxable = Math.max(0, itemSubtotal - disc)
                    const itemAmt = it.amount || itemTaxable
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e4e4e7', fontSize: '11px' }}>
                        <td style={{ padding: '8px' }}>{idx + 1}</td>
                        <td style={{ padding: '8px', fontWeight: 700 }}>{it.product_name}</td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#52525b' }}>2201</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{rate.toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{disc > 0 ? `₹${disc.toFixed(2)}` : '-'}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{itemTaxable.toFixed(2)}</td>
                        {isGstOn && <td style={{ padding: '8px', textAlign: 'right' }}>{it.gst_rate || 18}%</td>}
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>₹{itemAmt.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Financial Totals & Payment Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <div style={{ backgroundColor: '#f4f4f5', padding: '10px 14px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #e4e4e7' }}>
                    <div style={{ fontWeight: 800, fontSize: '11px', color: '#52525b', textTransform: 'uppercase', marginBottom: '4px' }}>Payment Summary:</div>
                    <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>Payment Mode:</span>
                      <strong style={{ textTransform: 'uppercase' }}>{bill.payment_method || 'CASH'}</strong>
                    </div>
                    {bill.cash_amount && bill.cash_amount > 0 ? (
                      <div style={{ fontSize: '10px', color: '#52525b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Cash Paid:</span>
                        <span>₹{Number(bill.cash_amount).toFixed(2)}</span>
                      </div>
                    ) : null}
                    {bill.upi_amount && bill.upi_amount > 0 ? (
                      <div style={{ fontSize: '10px', color: '#52525b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>UPI Paid:</span>
                        <span>₹{Number(bill.upi_amount).toFixed(2)}</span>
                      </div>
                    ) : null}
                    <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginTop: '4px', borderTop: '1px solid #d4d4d8', paddingTop: '4px' }}>
                      <span>Amount Paid:</span>
                      <strong>₹{paidAmount.toFixed(2)}</strong>
                    </div>
                    <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', color: dueAmount > 0 ? '#dc2626' : '#16a34a', fontWeight: 800 }}>
                      <span>Balance Due:</span>
                      <span>₹{dueAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '10px', color: '#52525b', fontStyle: 'italic' }}>
                    <strong>Amount in Words:</strong> {numberToIndianRupeesWords(grandTotal)}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                      <span>Total Discount:</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>Taxable Amount:</span>
                    <span>₹{taxableAmount.toFixed(2)}</span>
                  </div>
                  {isGstOn && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                        <span>CGST (9%):</span>
                        <span>₹{cgstAmount.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                        <span>SGST (9%):</span>
                        <span>₹{sgstAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 900, borderTop: '2px solid #000', paddingTop: '6px', marginTop: '4px', color: '#000' }}>
                    <span>Grand Total:</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '10px', color: '#71717a' }}>
                  Thank you for your business! | Visit Again.
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#000' }}>
                  Authorised Signatory
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* TEMPLATE B: 80MM THERMAL RECEIPT (DYNAMIC HEIGHT)               */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {formatMode === '80mm' && (
            <div
              className="printable-area print-format-80mm"
              style={{
                backgroundColor: '#fff',
                color: '#000',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '12px',
                lineHeight: '1.25',
                width: '80mm',
                minHeight: '50mm',
                height: 'auto',
                margin: '0 auto',
                padding: '14px 10px',
                borderRadius: '2px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                borderTop: '4px dashed #a1a1aa',
                borderBottom: '4px dashed #a1a1aa',
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <Image src="/branding/royal-kissan-logo.png" alt="Royal Kissan Logo" width={90} height={36} style={{ objectFit: 'contain', margin: '0 auto 4px auto', display: 'block' }} priority />
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>ROYAL KISSAN</div>
                <div style={{ fontSize: '10px' }}>Packaged Drinking Water</div>
                <div style={{ fontSize: '10px', fontWeight: 'bold' }}>BASHU ABBAS BEVERAGES</div>
                <div style={{ fontSize: '9px', margin: '2px 0' }}>15-2 Behind AnjaneyaSwami Temple, Sri Ram Nagar, Chintalapudi</div>
                <div style={{ fontSize: '10px' }}>Ph: +91 93476 62554</div>
                <div style={{ fontSize: '10px' }}>GSTIN: 37BABS2021G1Z3</div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '6px', color: isDealerCopy ? '#dc2626' : '#000' }}>
                  *** {isDealerCopy ? 'DEALER COPY' : `${copyType.toUpperCase()} COPY`} ***
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

              {/* Meta */}
              <div style={{ fontSize: '11px' }}>
                {isDealerCopy ? (
                  <>
                    <div><strong>DEALER:</strong> {dealerDisplayName}</div>
                    {dealerPhone && <div><strong>PHONE :</strong> {dealerPhone}</div>}
                    {dealerAddress && <div><strong>ADDR  :</strong> {dealerAddress}</div>}
                    {dealerGstin && <div><strong>GSTIN :</strong> {dealerGstin}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span>INV: {bill.invoice_number}</span>
                      <span>{formattedDate}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Inv #: {bill.invoice_number}</span>
                      <span>{formattedDate}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Cust: {bill.customer_name}</span>
                      <span>{timeStr}</span>
                    </div>
                    {bill.customer_phone && <div>Ph  : {bill.customer_phone}</div>}
                  </>
                )}
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

              {/* Item Table */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 34px 50px 60px', fontWeight: 'bold', fontSize: '11px' }}>
                <span>ITEM</span>
                <span style={{ textAlign: 'right' }}>QTY</span>
                <span style={{ textAlign: 'right' }}>RATE</span>
                <span style={{ textAlign: 'right' }}>AMT</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

              {bill.items?.map((it, idx) => (
                <div key={idx} className="receipt-item-row" style={{ display: 'grid', gridTemplateColumns: '1fr 34px 50px 60px', fontSize: '11px', margin: '2px 0' }}>
                  <span style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    {it.product_name}
                  </span>
                  <span style={{ textAlign: 'right' }}>{it.quantity}</span>
                  <span style={{ textAlign: 'right' }}>₹{it.rate}</span>
                  <span style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{it.amount || it.quantity * it.rate}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

              {/* Totals */}
              <div style={{ fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Discount:</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                {isGstOn && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>CGST (9%):</span>
                      <span>₹{cgstAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>SGST (9%):</span>
                      <span>₹{sgstAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div style={{ borderTop: '2px solid #000', margin: '6px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                <span>TOTAL:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

              <div style={{ fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>MODE:</span>
                  <strong style={{ textTransform: 'uppercase' }}>{bill.payment_method || 'CASH'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>PAID:</span>
                  <span>₹{paidAmount.toFixed(2)}</span>
                </div>
                {dueAmount > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>DUE:</span>
                    <span>₹{dueAmount.toFixed(2)}</span>
                  </div>
                ) : (
                  <div style={{ textAlign: 'right', fontWeight: 'bold' }}>*** PAID ***</div>
                )}
              </div>

              <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '10px' }}>
                {isDealerCopy ? 'DEALER COPY — ROYAL KISSAN' : 'Thank You! Visit Again.'}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* TEMPLATE C: 58MM COMPACT THERMAL RECEIPT (DYNAMIC HEIGHT)        */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {formatMode === '58mm' && (
            <div
              className="printable-area print-format-58mm"
              style={{
                backgroundColor: '#fff',
                color: '#000',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '10px',
                lineHeight: '1.2',
                width: '58mm',
                minHeight: '50mm',
                height: 'auto',
                margin: '0 auto',
                padding: '10px 6px',
                borderRadius: '2px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                borderTop: '4px dashed #a1a1aa',
                borderBottom: '4px dashed #a1a1aa',
              }}
            >
              {/* Compact Header */}
              <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <Image src="/branding/royal-kissan-logo.png" alt="Royal Kissan Logo" width={70} height={28} style={{ objectFit: 'contain', margin: '0 auto 2px auto', display: 'block' }} priority />
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>ROYAL KISSAN</div>
                <div style={{ fontSize: '9px' }}>Packaged Water</div>
                <div style={{ fontSize: '8px' }}>15-2 Sri Ram Nagar, Chintalapudi</div>
                <div style={{ fontSize: '9px' }}>Ph: +91 93476 62554</div>
                <div style={{ fontSize: '9px' }}>GST: 37BABS2021G1Z3</div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px', color: isDealerCopy ? '#dc2626' : '#000' }}>
                  *** {isDealerCopy ? 'DEALER COPY' : `${copyType.toUpperCase()} COPY`} ***
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

              <div style={{ fontSize: '9px' }}>
                {isDealerCopy ? (
                  <>
                    <div><strong>DEALER:</strong> {dealerDisplayName}</div>
                    {dealerPhone && <div><strong>PHONE :</strong> {dealerPhone}</div>}
                    {dealerGstin && <div><strong>GSTIN :</strong> {dealerGstin}</div>}
                    <div>INV: {bill.invoice_number} | {formattedDate}</div>
                  </>
                ) : (
                  <>
                    <div>Inv #: {bill.invoice_number}</div>
                    <div>Date : {formattedDate} {timeStr}</div>
                    <div>Cust : {bill.customer_name}</div>
                  </>
                )}
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

              {/* Items */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 26px 36px 48px', fontWeight: 'bold', fontSize: '9px' }}>
                <span>ITEM</span>
                <span style={{ textAlign: 'right' }}>QTY</span>
                <span style={{ textAlign: 'right' }}>RATE</span>
                <span style={{ textAlign: 'right' }}>AMT</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />

              {bill.items?.map((it, idx) => (
                <div key={idx} className="receipt-item-row" style={{ display: 'grid', gridTemplateColumns: '1fr 26px 36px 48px', fontSize: '9px', margin: '2px 0' }}>
                  <span style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    {it.product_name}
                  </span>
                  <span style={{ textAlign: 'right' }}>{it.quantity}</span>
                  <span style={{ textAlign: 'right' }}>₹{it.rate}</span>
                  <span style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{it.amount || it.quantity * it.rate}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

              <div style={{ fontSize: '9px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Disc:</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1.5px solid #000', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                <span>TOTAL:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>

              <div style={{ fontSize: '9px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>MODE:</span>
                  <span>{bill.payment_method?.toUpperCase() || 'CASH'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>PAID:</span>
                  <span>₹{paidAmount.toFixed(2)}</span>
                </div>
                {dueAmount > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>DUE:</span>
                    <span>₹{dueAmount.toFixed(2)}</span>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '2px' }}>*** PAID ***</div>
                )}
              </div>

              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '8px' }}>
                Thank You! Visit Again.
              </div>
            </div>
          )}

          {printStatus && (
            <div
              className="no-print"
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

        {/* Modal Footer Bar */}
        <div
          className="no-print"
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
              {printing ? 'Opening Print...' : `Print ${formatMode}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
