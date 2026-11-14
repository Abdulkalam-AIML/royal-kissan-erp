'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Printer, CheckCircle, AlertTriangle, Bluetooth, Wifi, Smartphone, Send, Radio, Clock, RefreshCw, Check } from 'lucide-react'
import { BillData } from '@/lib/printer/receipt'
import { CopyType } from '@/lib/printer/printer-config'
import { 
  enqueueThermalPrintJob, 
  getPrinterSettings, 
  getBridgeWorkerStatus, 
  getPrintJobById,
  confirmPhysicalPrint,
  retryPrintJob,
  PrintBridgeWorkerRecord,
  PrintJobRecord 
} from '@/lib/services/print-job-service'
import WhatsAppShareModal from '@/components/whatsapp/WhatsAppShareModal'

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
  const [selectedTransport, setSelectedTransport] = useState<'bluetooth' | 'wifi'>('wifi')
  const [bridgeWorker, setBridgeWorker] = useState<PrintBridgeWorkerRecord | null>(null)
  const [printing, setPrinting] = useState(false)
  const [thermalQueueing, setThermalQueueing] = useState(false)
  const [printStatus, setPrintStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  
  // Real-time print job lifecycle tracking
  const [trackedJobId, setTrackedJobId] = useState<string | null>(null)
  const [trackedJob, setTrackedJob] = useState<PrintJobRecord | null>(null)
  const [isConfirmingPrint, setIsConfirmingPrint] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setTrackedJobId(null)
      setTrackedJob(null)
      setPrintStatus(null)
      return
    }
    async function initSettings() {
      const [settings, worker] = await Promise.all([
        getPrinterSettings(),
        getBridgeWorkerStatus()
      ])
      if (settings?.preferred_connection) {
        setSelectedTransport(settings.preferred_connection === 'bluetooth' ? 'bluetooth' : 'wifi')
      }
      setBridgeWorker(worker)
    }
    initSettings()

    // Poll bridge worker status every 6 seconds while modal is open
    const workerInterval = setInterval(async () => {
      const worker = await getBridgeWorkerStatus()
      setBridgeWorker(worker)
    }, 6000)

    return () => clearInterval(workerInterval)
  }, [isOpen])

  // Track active print job state changes across the lifecycle
  useEffect(() => {
    if (!trackedJobId) return

    let isSubscribed = true
    const interval = setInterval(async () => {
      const job = await getPrintJobById(trackedJobId)
      if (!isSubscribed || !job) return
      setTrackedJob(job)

      // Stop high-frequency polling on terminal states
      if (job.status === 'PRINTED' || job.status === 'COMPLETED') {
        clearInterval(interval)
        if (onPrint) {
          await onPrint(copyType)
        }
      }
    }, 1200)

    return () => {
      isSubscribed = false
      clearInterval(interval)
    }
  }, [trackedJobId, onPrint, copyType])

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
  const igstAmount = Number((bill as any).igst_amount || 0)
  const isInterstate = igstAmount > 0
  const cgstAmount = isGstOn && !isInterstate ? Number((bill as any).cgst_amount ?? gstAmount / 2) : 0
  const sgstAmount = isGstOn && !isInterstate ? Number((bill as any).sgst_amount ?? gstAmount / 2) : 0
  const taxableAmount = Number((bill as any).taxable_amount ?? Math.max(0, subtotal - discount))
  const paidAmount = Number(bill.paid_amount || 0)
  const dueAmount = Number(bill.due_amount || 0)

  const dealerDisplayName = bill.dealer_name || bill.customer_name || 'Customer'
  const dealerPhone = bill.dealer_phone || bill.customer_phone
  const dealerAddress = bill.dealer_address || bill.customer_address
  const dealerGstin = bill.dealer_gstin || bill.customer_gstin

  // Standard Universal Browser / System Print
  const handleSystemPrint = async () => {
    setPrinting(true)
    setPrintStatus(null)
    try {
      window.print()
      setPrintStatus({
        type: 'success',
        message: 'Device print dialog opened. Select your TVS-E RP3230ABW (or system printer) to complete printing.',
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

  // TVS Thermal Print Bridge via Supabase Queue
  const handleThermalBridgePrint = async () => {
    setThermalQueueing(true)
    setPrintStatus(null)

    try {
      const res = await enqueueThermalPrintJob(bill, copyType, selectedTransport)
      if (res.success && res.jobId) {
        setTrackedJobId(res.jobId)
        const initialJob = await getPrintJobById(res.jobId)
        if (initialJob) {
          setTrackedJob(initialJob)
        }
      } else {
        setPrintStatus({
          type: 'error',
          message: res.message,
        })
      }
    } catch (err: any) {
      setPrintStatus({
        type: 'error',
        message: `Failed to queue thermal job: ${err?.message || err}`,
      })
    } finally {
      setThermalQueueing(false)
    }
  }

  // Confirm Physical Print (Verified paper output)
  const handleConfirmPaperPrinted = async () => {
    if (!trackedJob?.id) return
    setIsConfirmingPrint(true)
    try {
      const res = await confirmPhysicalPrint(trackedJob.id, 'operator_confirmed')
      if (res.success) {
        setTrackedJob(prev => prev ? {
          ...prev,
          status: 'PRINTED',
          verification_method: 'operator_confirmed',
          printed_at: new Date().toISOString()
        } : null)
        if (onPrint) {
          await onPrint(copyType)
        }
      } else {
        setPrintStatus({ type: 'error', message: res.message })
      }
    } catch (err: any) {
      setPrintStatus({ type: 'error', message: `Confirmation failed: ${err?.message || err}` })
    } finally {
      setIsConfirmingPrint(false)
    }
  }

  // Manual Retry for FAILED or UNKNOWN_OUTCOME jobs
  const handleManualRetry = async () => {
    if (!trackedJob?.id) return
    setIsRetrying(true)
    try {
      const res = await retryPrintJob(trackedJob.id, 'Operator')
      if (res.success) {
        setTrackedJob(prev => prev ? {
          ...prev,
          status: 'PENDING',
          claimed_by: null,
          claimed_at: null,
          error_message: null
        } : null)
      } else {
        setPrintStatus({ type: 'error', message: res.message })
      }
    } catch (err: any) {
      setPrintStatus({ type: 'error', message: `Retry failed: ${err?.message || err}` })
    } finally {
      setIsRetrying(false)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f4f4f5', margin: 0 }}>
                Print Bill ({copyType.toUpperCase()} — {formatMode})
              </h3>
            </div>

            {/* Android Bridge Heartbeat Pill */}
            {bridgeWorker && (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.35rem', 
                  backgroundColor: bridgeWorker.isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${bridgeWorker.isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem'
                }}
                title={`Worker: ${bridgeWorker.worker_id} (${bridgeWorker.device_name}) - Last seen ${bridgeWorker.last_heartbeat}`}
              >
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: bridgeWorker.isOnline ? '#10b981' : '#ef4444' 
                }} />
                <span style={{ color: bridgeWorker.isOnline ? '#34d399' : '#f87171', fontWeight: 700 }}>
                  Bridge {bridgeWorker.isOnline ? 'Online' : 'Offline'}
                </span>
                <span style={{ color: '#71717a' }}>
                  ({Math.max(1, Math.round((Date.now() - new Date(bridgeWorker.last_heartbeat).getTime()) / 1000))}s ago)
                </span>
              </div>
            )}
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
                      {isInterstate ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                          <span>IGST (Inter-State Tax):</span>
                          <span>₹{igstAmount.toFixed(2)}</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                            <span>CGST:</span>
                            <span>₹{cgstAmount.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                            <span>SGST:</span>
                            <span>₹{sgstAmount.toFixed(2)}</span>
                          </div>
                        </>
                      )}
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
                    {isInterstate ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>IGST:</span>
                        <span>₹{igstAmount.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>CGST:</span>
                          <span>₹{cgstAmount.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>SGST:</span>
                          <span>₹{sgstAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
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

          {/* Real-time Thermal Print Lifecycle Tracker */}
          {trackedJob && (
            <div
              className="no-print"
              style={{
                marginTop: '1rem',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                backgroundColor: 
                  trackedJob.status === 'PRINTED' || trackedJob.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.12)' :
                  trackedJob.status === 'SENT' ? 'rgba(14, 165, 233, 0.12)' :
                  trackedJob.status === 'SENDING' ? 'rgba(99, 102, 241, 0.12)' :
                  trackedJob.status === 'CLAIMED' ? 'rgba(59, 130, 246, 0.12)' :
                  trackedJob.status === 'UNKNOWN_OUTCOME' ? 'rgba(245, 158, 11, 0.14)' :
                  trackedJob.status === 'FAILED' ? 'rgba(239, 68, 68, 0.14)' :
                  'rgba(251, 191, 36, 0.1)',
                border: `1px solid ${
                  trackedJob.status === 'PRINTED' || trackedJob.status === 'COMPLETED' ? '#10b981' :
                  trackedJob.status === 'SENT' ? '#0284c7' :
                  trackedJob.status === 'SENDING' ? '#6366f1' :
                  trackedJob.status === 'CLAIMED' ? '#3b82f6' :
                  trackedJob.status === 'UNKNOWN_OUTCOME' ? '#f59e0b' :
                  trackedJob.status === 'FAILED' ? '#ef4444' :
                  '#fbbf24'
                }`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {trackedJob.status === 'PRINTED' || trackedJob.status === 'COMPLETED' ? (
                    <CheckCircle style={{ width: '18px', height: '18px', color: '#10b981' }} />
                  ) : trackedJob.status === 'SENT' ? (
                    <Check style={{ width: '18px', height: '18px', color: '#0284c7' }} />
                  ) : trackedJob.status === 'SENDING' ? (
                    <Send style={{ width: '18px', height: '18px', color: '#6366f1' }} />
                  ) : trackedJob.status === 'CLAIMED' ? (
                    <RefreshCw style={{ width: '18px', height: '18px', color: '#3b82f6', animation: 'spin 1.5s linear infinite' }} />
                  ) : trackedJob.status === 'FAILED' ? (
                    <AlertTriangle style={{ width: '18px', height: '18px', color: '#ef4444' }} />
                  ) : trackedJob.status === 'UNKNOWN_OUTCOME' ? (
                    <AlertTriangle style={{ width: '18px', height: '18px', color: '#f59e0b' }} />
                  ) : (
                    <Clock style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
                  )}
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: 
                      trackedJob.status === 'PRINTED' || trackedJob.status === 'COMPLETED' ? '#34d399' :
                      trackedJob.status === 'SENT' ? '#38bdf8' :
                      trackedJob.status === 'SENDING' ? '#818cf8' :
                      trackedJob.status === 'CLAIMED' ? '#60a5fa' :
                      trackedJob.status === 'UNKNOWN_OUTCOME' ? '#fbbf24' :
                      trackedJob.status === 'FAILED' ? '#f87171' :
                      '#fbbf24'
                  }}>
                    {trackedJob.status === 'PRINTED' || trackedJob.status === 'COMPLETED' ? 'PRINTED — PAPER OUTPUT CONFIRMED' :
                     trackedJob.status === 'SENT' ? 'SENT — DATA TRANSMITTED TO PRINTER BUFFER' :
                     trackedJob.status === 'SENDING' ? 'SENDING — TRANSMITTING TO TVS RP 3230 ABW...' :
                     trackedJob.status === 'CLAIMED' ? 'CLAIMED — ANDROID BRIDGE PROCESSING' :
                     trackedJob.status === 'UNKNOWN_OUTCOME' ? 'UNKNOWN OUTCOME — CONNECTION INTERRUPTED' :
                     trackedJob.status === 'FAILED' ? 'PRINT FAILED' :
                     'PENDING — QUEUED IN CLOUD'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: '#18181b',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    TRANSPORT: {(trackedJob.actual_transport || trackedJob.connection_type || selectedTransport).toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#d4d4d8', lineHeight: 1.4 }}>
                {trackedJob.status === 'PRINTED' || trackedJob.status === 'COMPLETED' ? (
                  <>
                    ✅ Receipt printed physically on TVS RP 3230 ABW.
                    {trackedJob.verification_method && (
                      <span style={{ color: '#a1a1aa' }}> (Verification: {trackedJob.verification_method})</span>
                    )}
                  </>
                ) : trackedJob.status === 'SENT' ? (
                  <div>
                    <span>
                      ℹ️ Data received by TVS print buffer over {(trackedJob.actual_transport || selectedTransport).toUpperCase()}. Awaiting physical paper exit.
                    </span>
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={handleConfirmPaperPrinted}
                        disabled={isConfirmingPrint}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          backgroundColor: '#10b981',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          border: 'none',
                          cursor: isConfirmingPrint ? 'wait' : 'pointer'
                        }}
                      >
                        {isConfirmingPrint ? 'Confirming...' : '✓ Confirm Paper Printed'}
                      </button>
                      <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Click when paper emerges from printer</span>
                    </div>
                  </div>
                ) : trackedJob.status === 'SENDING' ? (
                  <span>Streaming binary ESC/POS payload to printer...</span>
                ) : trackedJob.status === 'CLAIMED' ? (
                  <span>Claimed by worker <code style={{ color: '#fbbf24' }}>{trackedJob.claimed_by || 'Android Bridge'}</code>. Opening hardware socket...</span>
                ) : trackedJob.status === 'UNKNOWN_OUTCOME' ? (
                  <div>
                    <span style={{ color: '#f87171', fontWeight: 600 }}>
                      ⚠️ Transmission was interrupted mid-flight. The ticket may have partially printed or aborted.
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#a1a1aa', marginTop: '2px' }}>
                      Automatic retry is strictly disabled to prevent duplicate bills. Check physical printer paper first.
                    </div>
                    <div style={{ marginTop: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={handleManualRetry}
                        disabled={isRetrying}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          backgroundColor: '#f59e0b',
                          color: '#000',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          border: 'none',
                          cursor: isRetrying ? 'wait' : 'pointer'
                        }}
                      >
                        {isRetrying ? 'Re-queueing...' : '⚠️ Confirm & Manual Reprint'}
                      </button>
                    </div>
                  </div>
                ) : trackedJob.status === 'FAILED' ? (
                  <div>
                    <span style={{ color: '#f87171' }}>
                      ❌ Error: {trackedJob.error_message || 'Socket or transmission failure.'}
                    </span>
                    <div style={{ marginTop: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={handleManualRetry}
                        disabled={isRetrying}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          border: 'none',
                          cursor: isRetrying ? 'wait' : 'pointer'
                        }}
                      >
                        {isRetrying ? 'Re-queueing...' : '🔄 Retry Print Job'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <span>
                    Waiting for Android Print Bridge to claim job from Supabase queue. 
                    {bridgeWorker?.isOnline ? (
                      <span style={{ color: '#34d399' }}> Bridge is online and listening.</span>
                    ) : (
                      <span style={{ color: '#f87171' }}> (Bridge is currently offline — launch Royal Kissan Print Bridge on Android device).</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          {!trackedJob && printStatus && (
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Transport Selector */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setSelectedTransport('wifi')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: selectedTransport === 'wifi' ? '#10b981' : 'transparent',
                  color: selectedTransport === 'wifi' ? '#fff' : '#a1a1aa',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Wifi style={{ width: '12px', height: '12px' }} />
                Wi-Fi
              </button>
              <button
                type="button"
                onClick={() => setSelectedTransport('bluetooth')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: selectedTransport === 'bluetooth' ? '#3b82f6' : 'transparent',
                  color: selectedTransport === 'bluetooth' ? '#fff' : '#a1a1aa',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Bluetooth style={{ width: '12px', height: '12px' }} />
                BT
              </button>
            </div>

            {/* Universal Browser Print Fallback */}
            <button
              onClick={handleSystemPrint}
              disabled={printing}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '6px',
                backgroundColor: '#27272a',
                color: '#fff',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: printing ? 'wait' : 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              title="Prints using operating system dialog (macOS/Windows/PDF)"
            >
              <Printer style={{ width: '15px', height: '15px', color: '#a1a1aa' }} />
              {printing ? 'Opening...' : 'Browser Print / PDF'}
            </button>

            {/* Prominent WhatsApp Share Action */}
            <button
              onClick={() => setIsWhatsAppOpen(true)}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: '6px',
                backgroundColor: '#25D366',
                color: '#000',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 10px rgba(37, 211, 102, 0.25)'
              }}
              title="Send bill document & invoice summary on WhatsApp"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.223-.559-1.848-.767-3.037-2.656-3.129-2.78-.093-.123-.746-.991-.746-1.888 0-.898.469-1.339.636-1.52.167-.182.366-.228.487-.228.121 0 .243.002.348.006.111.005.26-.042.407.311.152.365.518 1.265.564 1.357.045.092.076.2.015.322-.061.122-.092.199-.183.307-.091.107-.191.24-.273.322-.091.091-.186.19-.08.373.106.183.473.78 1.016 1.263.699.623 1.288.816 1.472.907.183.092.29.077.397-.046.107-.123.456-.533.578-.716.121-.183.243-.153.407-.092.164.061 1.042.492 1.22.583.178.091.297.137.34.213.045.076.045.441-.099.846z"/>
              </svg>
              SEND BILL ON WHATSAPP
            </button>

            {/* Primary TVS Thermal Print Bridge Action */}
            <button
              onClick={handleThermalBridgePrint}
              disabled={thermalQueueing}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '6px',
                backgroundColor: '#fbbf24',
                color: '#000',
                fontWeight: 800,
                border: 'none',
                cursor: thermalQueueing ? 'wait' : 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 10px rgba(251, 191, 36, 0.2)'
              }}
            >
              <Send style={{ width: '15px', height: '15px' }} />
              {thermalQueueing ? 'Dispatching...' : `Print to TVS (${selectedTransport.toUpperCase()})`}
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Document Sharing Modal */}
      {isWhatsAppOpen && bill && (
        <WhatsAppShareModal
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
          bill={bill}
        />
      )}
    </div>
  )
}
