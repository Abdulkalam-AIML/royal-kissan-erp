'use client'

import { useState, useEffect } from 'react'
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
  sendInvoiceWhatsApp
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

  // Initialize recipient phone on open
  useEffect(() => {
    if (!isOpen || !bill) {
      setStatusResult(null)
      return
    }

    const defaultPhone =
      bill.customer_phone ||
      bill.dealer_phone ||
      bill.phone ||
      ''

    setRecipientPhone(defaultPhone)
    setPhoneError(null)
    setStatusResult(null)
  }, [isOpen, bill])

  if (!isOpen || !bill) return null

  const isDispatchNote = String(bill.bill_type || '').toUpperCase().includes('DISPATCH NOTE')
  const recipientName = bill.dealer_name || bill.customer_name || 'Valued Customer'
  const invoiceNumber = bill.invoice_number || bill.bill_number || `INV-${bill.id ? String(bill.id).slice(0, 8).toUpperCase() : 'NEW'}`
  const invoiceDate = bill.date || bill.dispatch_date || new Date().toISOString().split('T')[0]
  const grandTotal = Number(bill.grand_total || bill.total_amount || 0)
  const paidAmount = Number(bill.paid_amount || 0)
  const dueAmount = Number(bill.due_amount || Math.max(0, grandTotal - paidAmount))

  // Validate phone input live
  const handlePhoneChange = (val: string) => {
    setRecipientPhone(val)
    if (!val.trim()) {
      setPhoneError('Recipient phone number is required.')
    } else {
      const v = validateAndFormatIndianPhone(val)
      setPhoneError(v.isValid ? null : v.error || 'Invalid Indian mobile number')
    }
  }

  // Handle direct send via Meta WhatsApp Cloud API with PDF document
  const handleSendBill = async (force: boolean = false) => {
    const validation = validateAndFormatIndianPhone(recipientPhone)
    if (!validation.isValid) {
      setPhoneError(validation.error || 'Please enter a valid 10-digit Indian mobile number.')
      return
    }

    setSending(true)
    setStatusResult(null)

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
        const validation = validateAndFormatIndianPhone(recipientPhone)
        const digits = validation.isValid ? validation.e164Digits : '919347662554'
        const link = `https://wa.me/${digits}?text=${encodeURIComponent(messageText)}`
        window.open(link, '_blank')
      }
    } catch (shareErr) {
      console.warn('Web share cancelled or unsupported:', shareErr)
    }
  }

  // Quick WhatsApp Web / Direct Chat link fallback
  const handleOpenWhatsAppWeb = () => {
    const validation = validateAndFormatIndianPhone(recipientPhone)
    const digits = validation.isValid ? validation.e164Digits : '919347662554'
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

            <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.06)', margin: '0.25rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: 600 }}>Grand Total</span>
              <span style={{ fontWeight: 800, color: '#f4f4f5', fontSize: '1.05rem' }}>
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span style={{ color: '#34d399' }}>Amount Paid: ₹{paidAmount.toFixed(2)}</span>
              <span style={{ color: dueAmount > 0 ? '#f87171' : '#34d399', fontWeight: 700 }}>
                {dueAmount > 0 ? `Remaining Due: ₹${dueAmount.toFixed(2)}` : 'Full Paid'}
              </span>
            </div>
          </div>

          {/* Recipient WhatsApp Phone Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#d4d4d8',
                marginBottom: '0.4rem'
              }}
            >
              Recipient WhatsApp Mobile (+91)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="e.g. 9347662554 or +919347662554"
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
              <p style={{ color: '#f87171', fontSize: '0.75rem', margin: '0.3rem 0 0 0' }}>
                {phoneError}
              </p>
            )}
            <p style={{ color: '#71717a', fontSize: '0.72rem', margin: '0.3rem 0 0 0' }}>
              Format: 10-digit Indian mobile number. You can edit the number before sending.
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
            disabled={sending || !!phoneError}
            onClick={() => handleSendBill(false)}
            style={{
              backgroundColor: '#25D366',
              color: '#000',
              fontWeight: 800,
              border: 'none',
              borderRadius: '6px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.9rem',
              cursor: sending || phoneError ? 'not-allowed' : 'pointer',
              opacity: sending || phoneError ? 0.6 : 1,
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
