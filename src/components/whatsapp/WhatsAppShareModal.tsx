'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X,
  Send,
  FileText,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Download,
  Share2,
  RefreshCw,
  Phone,
  ShieldCheck,
  Clock
} from 'lucide-react'
import {
  validateAndFormatIndianPhone,
  formatInvoiceWhatsAppMessage,
  sendInvoiceWhatsApp,
  validateInvoiceDataCompleteness
} from '@/lib/services/whatsapp-service'
import { generateBillPDFBlob, generateBillPDF } from '@/lib/utils/pdf-generator'

interface WhatsAppShareModalProps {
  isOpen: boolean
  onClose: () => void
  bill: any
  onSuccess?: () => void
}

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  bill,
  onSuccess
}: WhatsAppShareModalProps) {
  const [recipientPhone, setRecipientPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [statusResult, setStatusResult] = useState<{
    type: 'success' | 'error' | 'duplicate'
    message: string
    waLink?: string
    simulated?: boolean
    hasAttachment?: boolean
  } | null>(null)

  // Track modal open lifecycle to initialize recipient phone ONCE per open session
  const prevIsOpenRef = useRef(false)
  const phoneInputRef = useRef<HTMLInputElement>(null)

  // Initialize recipient phone ONLY when modal opens
  useEffect(() => {
    // Only initialize when modal transitions from closed to open
    if (isOpen && !prevIsOpenRef.current) {
      prevIsOpenRef.current = true
      const defaultPhone = String(
        bill?.customer_phone ||
        bill?.dealer_phone ||
        bill?.phone ||
        ''
      ).trim()

      setRecipientPhone(defaultPhone)
      setPhoneError(null)
      setStatusResult(null)
    } else if (!isOpen && prevIsOpenRef.current) {
      prevIsOpenRef.current = false
      setPhoneError(null)
      setStatusResult(null)
    }
  }, [isOpen, bill?.customer_phone, bill?.dealer_phone, bill?.phone])

  if (!isOpen || !bill) return null

  const isDispatchNote = String(bill.bill_type || '').toUpperCase().includes('DISPATCH NOTE')
  const isDealer = !!(bill.dealer_name || bill.dealer_id || String(bill.bill_type || '').toLowerCase().includes('dealer'))
  const recipientName = bill.dealer_name || bill.customer_name || 'Valued Customer'
  const invoiceNumber = bill.invoice_number || bill.bill_number || `INV-${bill.id ? String(bill.id).slice(0, 8).toUpperCase() : 'NEW'}`
  const invoiceDate = bill.date || bill.dispatch_date || new Date().toISOString().split('T')[0]
  
  const rawItems = bill.items || bill.bill_items || []
  const subtotal = Number(bill.subtotal || bill.taxable_amount || bill.total_amount || 0)
  const discount = Number(bill.discount_amount || 0)
  const gst = Number(bill.gst_amount || 0)
  const returnCredit = Number(bill.return_credit || 0)
  const leakageCredit = Number(bill.leakage_credit || 0)
  const totalCredits = returnCredit + leakageCredit
  const grandTotal = Number(bill.grand_total || bill.total_amount || (subtotal - discount + gst - totalCredits))
  const previousBalance = Number(bill.previous_balance || bill.opening_balance || bill.outstanding_balance || 0)
  const finalPayable = grandTotal + previousBalance
  const paidAmount = Number(bill.paid_amount || 0)
  const dueAmount = Number(bill.due_amount || Math.max(0, finalPayable - paidAmount))
  const paymentMethod = String(bill.payment_mode || bill.payment_method || 'CASH').toUpperCase()

  // Validate transaction completeness
  const completeness = validateInvoiceDataCompleteness(bill)

  // Detect walk-in customer without registered phone
  const isWalkin = !bill.dealer_name && (
    !bill.customer_name ||
    bill.customer_name.toLowerCase().includes('walk-in') ||
    bill.customer_name.toLowerCase().includes('walk in') ||
    bill.customer_name.toLowerCase().includes('counter') ||
    !bill.customer_phone
  )

  // Direct keystroke handler: updates React state directly without resetting or stripping digits
  const handlePhoneChange = (val: string) => {
    setRecipientPhone(val)
    // Clear validation error when user types, so they aren't blocked while editing
    if (phoneError) {
      setPhoneError(null)
    }
  }

  // Handle direct send via Meta WhatsApp Cloud API with PDF document
  // Validates data completeness and the completed phone number ONLY when user presses Send
  const handleSendBill = async (force: boolean = false) => {
    // 1. Transaction completeness check
    if (!completeness.isValid) {
      setStatusResult({
        type: 'error',
        message: `Cannot transmit incomplete invoice: ${completeness.errors.join('; ')}`
      })
      return
    }

    const currentInputVal = phoneInputRef.current?.value ?? recipientPhone
    const trimmed = (currentInputVal || recipientPhone || '').trim()

    if (!trimmed) {
      setPhoneError('Recipient WhatsApp mobile number is required.')
      return
    }

    const validation = validateAndFormatIndianPhone(trimmed)
    if (!validation.isValid) {
      // PRESERVE the entered number in state! Do not clear it.
      setRecipientPhone(currentInputVal)
      setPhoneError(validation.error || 'Please enter a valid 10-digit Indian mobile number.')
      return
    }

    // Keep state in sync with valid value
    setRecipientPhone(currentInputVal)
    setSending(true)
    setStatusResult(null)
    setPhoneError(null)

    try {
      // 1. Generate actual PDF Document Blob and Base64
      const pdfRes = generateBillPDFBlob(bill)

      // 2. Dispatch via Backend API with PDF base64
      const response = await sendInvoiceWhatsApp({
        invoiceId: bill.id,
        billData: bill,
        recipientPhone: validation.formattedPhone,
        forceResend: force,
        pdfBase64: pdfRes.base64,
        pdfFilename: pdfRes.filename
      })

      if (response.success) {
        if (response.isDuplicate) {
          setStatusResult({
            type: 'duplicate',
            message: response.message,
            waLink: response.waLink
          })
        } else {
          setStatusResult({
            type: 'success',
            message: response.message,
            waLink: response.waLink,
            simulated: (response as any).simulated,
            hasAttachment: response.hasDocumentAttachment
          })
          if (onSuccess) onSuccess()
        }
      } else {
        setStatusResult({
          type: 'error',
          message: response.message || 'Failed to dispatch WhatsApp message.',
          waLink: response.waLink
        })
      }
    } catch (err: any) {
      setStatusResult({
        type: 'error',
        message: `An unexpected error occurred: ${err?.message || err}`
      })
    } finally {
      setSending(false)
    }
  }

  // Native Web Share API (Android Tablet / Mobile phone share sheet with attached PDF file)
  const handleWebSharePDF = async () => {
    try {
      const pdfRes = generateBillPDFBlob(bill)
      const pdfFile = new File([pdfRes.blob], pdfRes.filename, { type: 'application/pdf' })
      const messageText = formatInvoiceWhatsAppMessage(bill)

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Royal Kissan Invoice #${invoiceNumber}`,
          text: messageText,
          files: [pdfFile]
        })
      } else {
        // Fallback: download PDF and open WhatsApp Web
        generateBillPDF(bill)
        const currentInputVal = phoneInputRef.current?.value ?? recipientPhone
        const trimmed = (currentInputVal || recipientPhone || '').trim()
        const validation = validateAndFormatIndianPhone(trimmed)
        if (!validation.isValid) {
          setPhoneError(validation.error || 'Please enter a valid 10-digit Indian mobile number.')
          return
        }
        const digits = validation.e164Digits
        const link = `https://wa.me/${digits}?text=${encodeURIComponent(messageText)}`
        window.open(link, '_blank')
      }
    } catch (shareErr) {
      console.warn('Web share cancelled or unsupported:', shareErr)
    }
  }

  // Quick WhatsApp Web / Direct Chat link fallback
  const handleOpenWhatsAppWeb = () => {
    const currentInputVal = phoneInputRef.current?.value ?? recipientPhone
    const trimmed = (currentInputVal || recipientPhone || '').trim()
    const validation = validateAndFormatIndianPhone(trimmed)
    if (!validation.isValid) {
      setPhoneError(validation.error || 'Please enter a valid 10-digit Indian mobile number.')
      return
    }
    const digits = validation.e164Digits
    const messageText = formatInvoiceWhatsAppMessage(bill)
    // Download PDF for the operator to drag into WhatsApp chat if needed
    generateBillPDF(bill)
    const link = `https://wa.me/${digits}?text=${encodeURIComponent(messageText)}`
    window.open(link, '_blank')
  }

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        className="modal-container"
        style={{
          backgroundColor: '#18181b',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.12), rgba(24, 24, 27, 0.9))',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#25D366',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
              }}
            >
              {/* Official WhatsApp SVG Logo */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.223-.559-1.848-.767-3.037-2.656-3.129-2.78-.093-.123-.746-.991-.746-1.888 0-.898.469-1.339.636-1.52.167-.182.366-.228.487-.228.121 0 .243.002.348.006.111.005.26-.042.407.311.152.365.518 1.265.564 1.357.045.092.076.2.015.322-.061.122-.092.199-.183.307-.091.107-.191.24-.273.322-.091.091-.186.19-.08.373.106.183.473.78 1.016 1.263.699.623 1.288.816 1.472.907.183.092.29.077.397-.046.107-.123.456-.533.578-.716.121-.183.243-.153.407-.092.164.061 1.042.492 1.22.583.178.091.297.137.34.213.045.076.045.441-.099.846z"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f4f4f5' }}>
                Share Bill on WhatsApp
              </h3>
              <p style={{ color: '#a1a1aa', fontSize: '0.78rem', margin: '2px 0 0 0' }}>
                Send official PDF document &amp; invoice summary
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Data Completeness Alert Banner */}
          {!completeness.isValid && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: '#fca5a5',
                fontSize: '0.8rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                <AlertCircle style={{ width: '15px', height: '15px', color: '#ef4444' }} />
                <span>Incomplete Transaction Record:</span>
              </div>
              <ul style={{ margin: '0.35rem 0 0 1.2rem', padding: 0 }}>
                {completeness.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Dispatch Note Warning Notice */}
          {isDispatchNote && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.8rem',
                color: '#fca5a5'
              }}
            >
              <strong>Notice:</strong> This document is a <em>Load Dispatch Note</em>. It will be explicitly transmitted as an inventory dispatch record, not a finalized sales tax invoice.
            </div>
          )}

          {/* Bill Summary Card */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Invoice Number</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>
                {invoiceNumber}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Recipient</span>
              <span style={{ fontWeight: 600, color: '#f4f4f5', fontSize: '0.88rem' }}>
                {recipientName}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Invoice Date</span>
              <span style={{ color: '#d4d4d8', fontSize: '0.85rem' }}>{invoiceDate}</span>
            </div>

            {/* Items Purchased Preview */}
            {rawItems.length > 0 && (
              <div
                style={{
                  marginTop: '0.25rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '6px',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.35rem', letterSpacing: '0.5px' }}>
                  PURCHASED ITEMS ({rawItems.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '110px', overflowY: 'auto' }}>
                  {rawItems.map((it: any, idx: number) => {
                    const name = it.product_name || it.name || 'Product'
                    const qty = Number(it.quantity) || 1
                    const unit = it.unit ? ` ${it.unit}` : ''
                    const rate = Number(it.rate || it.unit_price) || 0
                    const amt = Number(it.amount || it.total || (qty * rate))
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#d4d4d8' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                          {idx + 1}. {name} <span style={{ color: '#a1a1aa' }}>({qty}{unit} × ₹{rate.toFixed(0)})</span>
                        </span>
                        <span style={{ fontWeight: 700, color: '#f4f4f5' }}>₹{amt.toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Dealer Dispatch & Return Reconciliation Box */}
            {(isDealer || totalCredits > 0 || bill.today_dispatch_quantity) && (
              <div
                style={{
                  marginTop: '0.2rem',
                  backgroundColor: 'rgba(251, 191, 36, 0.07)',
                  borderRadius: '6px',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid rgba(251, 191, 36, 0.2)'
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.3rem' }}>
                  DEALER DISPATCH &amp; RETURN RECONCILIATION:
                </div>
                <div style={{ fontSize: '0.75rem', color: '#d4d4d8', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#a1a1aa' }}>Today Dispatch Qty:</span>
                    <strong>{bill.today_dispatch_quantity || rawItems.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0)} {rawItems[0]?.unit || 'Units'}</strong>
                  </div>
                  {bill.original_dispatch_reference && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#a1a1aa' }}>Original Dispatch Ref:</span>
                      <strong>{bill.original_dispatch_reference}</strong>
                    </div>
                  )}
                  {(bill.returned_quantity > 0 || returnCredit > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                      <span>Prev-Day Returns ({bill.returned_quantity || 0} {rawItems[0]?.unit || 'Units'}):</span>
                      <strong>-₹{returnCredit.toFixed(2)}</strong>
                    </div>
                  )}
                  {(bill.leaked_quantity > 0 || leakageCredit > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                      <span>Prev-Day Leakage ({bill.leaked_quantity || 0} {rawItems[0]?.unit || 'Units'}):</span>
                      <strong>-₹{leakageCredit.toFixed(2)}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#fbbf24', marginTop: '0.2rem' }}>
                    <span>Net Dispatch Payable:</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.06)', margin: '0.25rem 0' }} />

            {/* Financial Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#a1a1aa' }}>Subtotal:</span>
                <span style={{ color: '#d4d4d8' }}>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                  <span>Discount:</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              {gst > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d4d4d8' }}>
                  <span>GST Included:</span>
                  <span>₹{gst.toFixed(2)}</span>
                </div>
              )}
              {totalCredits > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                  <span>Return/Leakage Credits:</span>
                  <span>-₹{totalCredits.toFixed(2)}</span>
                </div>
              )}
              {previousBalance > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                  <span>Previous Outstanding:</span>
                  <span>₹{previousBalance.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.2rem' }}>
                <span>Final Payable Amount:</span>
                <span>₹{finalPayable.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399', fontSize: '0.8rem' }}>
                <span>Amount Paid ({paymentMethod}):</span>
                <span>₹{paidAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: dueAmount > 0 ? '#f87171' : '#34d399' }}>
                <span>Remaining Due:</span>
                <span>₹{dueAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Recipient WhatsApp Phone Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label
                htmlFor="whatsapp-recipient-phone"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#d4d4d8'
                }}
              >
                {isWalkin ? 'Walk-in Customer WhatsApp Mobile (+91)' : 'Recipient WhatsApp Mobile (+91)'}
              </label>
              {isWalkin && (
                <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>
                  Manual Entry Supported
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                ref={phoneInputRef}
                id="whatsapp-recipient-phone"
                name="recipient_phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={recipientPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onInput={(e) => {
                  // Capture Chrome native autofill without dropping digits
                  const target = e.target as HTMLInputElement
                  if (target && target.value !== recipientPhone) {
                    handlePhoneChange(target.value)
                  }
                }}
                onBlur={(e) => {
                  // Guarantee any autofilled or edited DOM value is retained in state
                  const target = e.target as HTMLInputElement
                  if (target && target.value && target.value !== recipientPhone) {
                    handlePhoneChange(target.value)
                  }
                }}
                onAnimationStart={(e) => {
                  // Chrome fires animationstart when :-webkit-autofill is applied
                  if (e.animationName && (e.animationName.includes('autofill') || e.animationName.includes('auto-fill'))) {
                    const target = e.target as HTMLInputElement
                    if (target && target.value && target.value !== recipientPhone) {
                      handlePhoneChange(target.value)
                    }
                  }
                }}
                placeholder={isWalkin ? "Enter 10-digit mobile number (e.g. 9391234567)" : "e.g. 9391234567 or +919391234567"}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                  backgroundColor: '#27272a',
                  border: phoneError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Phone
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '15px',
                  height: '15px',
                  color: '#a1a1aa'
                }}
              />
            </div>
            {phoneError && (
              <p style={{ color: '#f87171', fontSize: '0.75rem', margin: '0.3rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertCircle style={{ width: '13px', height: '13px', flexShrink: 0 }} />
                <span>{phoneError}</span>
              </p>
            )}
            <p style={{ color: '#71717a', fontSize: '0.72rem', margin: '0.3rem 0 0 0' }}>
              {isWalkin 
                ? 'Enter the customer mobile number (10-digit Indian mobile, +91, or 91 prefix). No registered customer account needed.'
                : 'Format: 10-digit Indian mobile number (+91). You can edit the number before sending.'}
            </p>
          </div>

          {/* Attachment Info Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              borderRadius: '6px',
              padding: '0.6rem 0.85rem'
            }}
          >
            <FileText style={{ width: '18px', height: '18px', color: '#fbbf24', flexShrink: 0 }} />
            <div style={{ fontSize: '0.78rem', color: '#d4d4d8' }}>
              <strong>Document Attachment:</strong> The actual PDF invoice with complete GST breakdown, dues, and Royal Kissan branding is generated and attached automatically.
            </div>
          </div>

          {/* Status Alert Banner */}
          {statusResult && (
            <div
              style={{
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                backgroundColor:
                  statusResult.type === 'success'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : statusResult.type === 'duplicate'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                border:
                  statusResult.type === 'success'
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : statusResult.type === 'duplicate'
                    ? '1px solid rgba(245, 158, 11, 0.3)'
                    : '1px solid rgba(239, 68, 68, 0.3)',
                color:
                  statusResult.type === 'success'
                    ? '#6ee7b7'
                    : statusResult.type === 'duplicate'
                    ? '#fcd34d'
                    : '#fca5a5'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {statusResult.type === 'success' ? (
                  <CheckCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                ) : (
                  <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                )}
                <span>{statusResult.message}</span>
              </div>

              {/* Force Resend Action on Duplicate */}
              {statusResult.type === 'duplicate' && (
                <div style={{ marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => handleSendBill(true)}
                    style={{
                      background: 'none',
                      border: '1px solid #f59e0b',
                      borderRadius: '4px',
                      color: '#f59e0b',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <RefreshCw style={{ width: '12px', height: '12px' }} />
                    Force Resend Anyway
                  </button>
                </div>
              )}

              {/* Fallback WhatsApp Web Action Button */}
              {statusResult.waLink && (
                <div style={{ marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={handleOpenWhatsAppWeb}
                    style={{
                      backgroundColor: '#25D366',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#000',
                      fontWeight: 700,
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <ExternalLink style={{ width: '12px', height: '12px' }} />
                    Open WhatsApp Web / Chat directly
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#1f1f23',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          {/* Secondary Fallback Actions: Download & Share */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => generateBillPDF(bill)}
              style={{
                backgroundColor: '#27272a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#d4d4d8',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Download PDF to device"
            >
              <Download style={{ width: '14px', height: '14px' }} />
              PDF
            </button>

            <button
              type="button"
              onClick={handleWebSharePDF}
              style={{
                backgroundColor: '#27272a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#d4d4d8',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Share via device app (Android/Tablet Share Sheet)"
            >
              <Share2 style={{ width: '14px', height: '14px' }} />
              Share...
            </button>
          </div>

          {/* Primary Action Button: [ SEND BILL ON WHATSAPP ] */}
          <button
            type="button"
            disabled={sending || !completeness.isValid}
            onClick={() => handleSendBill(false)}
            title={!completeness.isValid ? `Incomplete transaction: ${completeness.errors.join('; ')}` : 'Send bill document on WhatsApp'}
            style={{
              backgroundColor: '#25D366',
              color: '#000',
              fontWeight: 800,
              border: 'none',
              borderRadius: '6px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.9rem',
              cursor: sending || !completeness.isValid ? 'not-allowed' : 'pointer',
              opacity: sending || !completeness.isValid ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)'
            }}
          >
            {sending ? (
              <>
                <RefreshCw className="animate-spin" style={{ width: '16px', height: '16px' }} />
                Transmitting Document...
              </>
            ) : (
              <>
                {/* Official WhatsApp Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.223-.559-1.848-.767-3.037-2.656-3.129-2.78-.093-.123-.746-.991-.746-1.888 0-.898.469-1.339.636-1.52.167-.182.366-.228.487-.228.121 0 .243.002.348.006.111.005.26-.042.407.311.152.365.518 1.265.564 1.357.045.092.076.2.015.322-.061.122-.092.199-.183.307-.091.107-.191.24-.273.322-.091.091-.186.19-.08.373.106.183.473.78 1.016 1.263.699.623 1.288.816 1.472.907.183.092.29.077.397-.046.107-.123.456-.533.578-.716.121-.183.243-.153.407-.092.164.061 1.042.492 1.22.583.178.091.297.137.34.213.045.076.045.441-.099.846z"/>
                </svg>
                SEND BILL ON WHATSAPP
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

