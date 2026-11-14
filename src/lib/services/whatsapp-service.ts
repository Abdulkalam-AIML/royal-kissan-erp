import { createClient } from '@/lib/supabase/client'
import {
  PurchaseWithItems,
  WhatsAppSettings,
  WhatsAppNotification,
  WhatsAppNotificationStatus
} from '@/lib/types/database'

export interface PhoneValidationResult {
  isValid: boolean
  formattedPhone: string // With +91
  e164Digits: string // Digits only e.g. 919347662554
  raw: string
  error?: string
}

/**
 * Validates and formats Indian phone numbers for WhatsApp messaging (+91)
 */
export function validateAndFormatIndianPhone(phoneInput: string): PhoneValidationResult {
  if (!phoneInput || typeof phoneInput !== 'string') {
    return {
      isValid: false,
      formattedPhone: '',
      e164Digits: '',
      raw: phoneInput || '',
      error: 'Recipient WhatsApp mobile number is required.'
    }
  }

  const raw = phoneInput.trim()
  if (!raw) {
    return {
      isValid: false,
      formattedPhone: '',
      e164Digits: '',
      raw: '',
      error: 'Recipient WhatsApp mobile number is required.'
    }
  }

  // Remove all non-digit characters except leading plus
  let cleaned = raw.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // Handle leading 00 (international prefix e.g. 0091)
  if (cleaned.startsWith('0091') && cleaned.length === 14) {
    cleaned = cleaned.substring(2)
  }

  // Handle country code 91 with a leading 0 (e.g. +91 09391234567 or 9109391234567)
  if (cleaned.startsWith('910') && cleaned.length === 13) {
    cleaned = '91' + cleaned.substring(3)
  }

  // Handle leading 0 (STD mobile dialing within India, e.g. 09391234567)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1)
  }

  // If 10 digits (Standard Indian mobile)
  if (cleaned.length === 10) {
    // Indian mobiles start with 6, 7, 8, 9
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return {
        isValid: false,
        formattedPhone: `+91${cleaned}`,
        e164Digits: `91${cleaned}`,
        raw,
        error: 'Indian mobile numbers must begin with 6, 7, 8, or 9.'
      }
    }
    return {
      isValid: true,
      formattedPhone: `+91${cleaned}`,
      e164Digits: `91${cleaned}`,
      raw
    }
  }

  // If 12 digits starting with 91 (with or without + prefix originally)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const subscriber = cleaned.substring(2)
    if (!/^[6-9]\d{9}$/.test(subscriber)) {
      return {
        isValid: false,
        formattedPhone: `+${cleaned}`,
        e164Digits: cleaned,
        raw,
        error: 'Indian mobile numbers must begin with 6, 7, 8, or 9.'
      }
    }
    return {
      isValid: true,
      formattedPhone: `+${cleaned}`,
      e164Digits: cleaned,
      raw
    }
  }

  // Incomplete number check
  if (cleaned.length < 10) {
    return {
      isValid: false,
      formattedPhone: raw,
      e164Digits: cleaned,
      raw,
      error: 'Please enter a complete 10-digit Indian mobile number.'
    }
  }

  return {
    isValid: false,
    formattedPhone: raw,
    e164Digits: cleaned,
    raw,
    error: 'Invalid phone number. Please enter a 10-digit Indian mobile number (e.g. 9391234567 or +919391234567).'
  }
}

/**
 * Generates the professional WhatsApp Purchase Confirmation text message
 * Strict compliance with the Royal Kissan standard template
 */
export function formatPurchaseWhatsAppMessage(purchase: PurchaseWithItems): string {
  const purchaseId = purchase.purchase_number || purchase.id.slice(0, 8).toUpperCase()
  const purchaseDate = purchase.purchase_date || new Date().toISOString().split('T')[0]
  const supplierName = purchase.supplier_name || 'General Supplier'
  const supplierInvoice = purchase.supplier_invoice_number || 'N/A'

  // Format Items list
  const itemsText = (purchase.items || []).map((item, index) => {
    const num = index + 1
    const name = item.product_name
    const qty = Number(item.quantity) || 1
    const unit = item.unit || 'pcs'
    const rate = Number(item.rate) || 0
    const amount = Number(item.amount) || (qty * rate)

    return `${num}. ${name}\n   Quantity: ${qty}\n   Unit: ${unit}\n   Rate: ₹${rate}\n   Amount: ₹${amount}`
  }).join('\n\n')

  const subtotal = Number(purchase.subtotal) || 0
  const discount = Number(purchase.discount_amount) || 0
  const gst = Number(purchase.gst_amount) || 0
  const grandTotal = Number(purchase.grand_total) || (subtotal - discount + gst)
  const paid = Number(purchase.paid_amount) || 0
  const due = Number(purchase.due_amount) || Math.max(0, grandTotal - paid)
  const paymentMethod = (purchase.payment_method || 'CASH').toUpperCase()
  const purchaseStatus = (purchase.purchase_status || 'COMPLETED').toUpperCase()

  return `*ROYAL KISSAN — PURCHASE CONFIRMATION*

Hello,

A new purchase has been recorded successfully.

*Purchase Details:*

Purchase ID: ${purchaseId}
Date: ${purchaseDate}
Supplier: ${supplierName}
Invoice Number: ${supplierInvoice}

*Purchased Items:*

${itemsText || '1. General Materials\n   Quantity: 1\n   Unit: lot\n   Rate: ₹' + grandTotal + '\n   Amount: ₹' + grandTotal}

*Financial Summary:*

Subtotal: ₹${subtotal}
Discount: ₹${discount}
GST: ₹${gst}
Grand Total: ₹${grandTotal}
Amount Paid: ₹${paid}
Remaining Due: ₹${due}

Payment Method: ${paymentMethod}

Purchase Status: ${purchaseStatus}

Thank you.
*ROYAL KISSAN ERP*`
}

/**
 * Retrieves the current WhatsApp settings from Supabase
 */
export async function getWhatsAppSettings(): Promise<WhatsAppSettings | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('organization_id', 'default_org')
      .maybeSingle()

    if (error || !data) {
      return {
        enabled: true,
        default_recipient_phone: '+919347662554',
        recipient_type: 'owner',
        send_to_supplier: false,
        webhook_verify_token: 'royal_kissan_webhook_token_2026'
      }
    }

    return data as WhatsAppSettings
  } catch {
    return null
  }
}

/**
 * Updates WhatsApp configuration settings
 */
export async function saveWhatsAppSettings(
  settings: Partial<WhatsAppSettings>
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('whatsapp_settings')
      .upsert({
        organization_id: 'default_org',
        ...settings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id' })

    if (error) throw error
    return { success: true, message: 'WhatsApp settings saved successfully!' }
  } catch (err: any) {
    return { success: false, message: `Failed to save settings: ${err?.message || err}` }
  }
}

/**
 * Generates the professional WhatsApp Invoice / Bill Confirmation text message
 * Strict compliance with Royal Kissan standard template for Customers and Dealers
 */
export function formatInvoiceWhatsAppMessage(bill: any): string {
  const isDispatchNote = String(bill.bill_type || '').toUpperCase().includes('DISPATCH NOTE')
  const recipientName = bill.dealer_name || bill.customer_name || 'Valued Customer'
  const invoiceNumber = bill.invoice_number || bill.bill_number || `INV-${bill.id ? String(bill.id).slice(0, 8).toUpperCase() : 'NEW'}`
  const invoiceDate = bill.date || bill.dispatch_date || new Date().toISOString().split('T')[0]
  
  const subtotal = Number(bill.subtotal || bill.taxable_amount || bill.total_amount || 0)
  const gst = Number(bill.gst_amount || 0)
  const grandTotal = Number(bill.grand_total || bill.total_amount || (subtotal + gst))
  const paid = Number(bill.paid_amount || 0)
  const due = Number(bill.due_amount || Math.max(0, grandTotal - paid))
  const previousBalance = Number(bill.previous_balance || bill.opening_balance || bill.outstanding_balance || 0)

  if (isDispatchNote) {
    const totalQty = bill.total_quantity || (bill.items || []).reduce((acc: number, i: any) => acc + (Number(i.quantity) || 0), 0)
    return `*ROYAL KISSAN — LOAD DISPATCH NOTE*

Hello ${recipientName},

Your Royal Kissan daily load dispatch record is ready.

*Dispatch Details:*
Dispatch Number: ${invoiceNumber}
Dispatch Date: ${invoiceDate}
Total Quantity: ${totalQty} units
Load Value: ₹${grandTotal.toFixed(2)}

*Note: This is an inventory load dispatch record, NOT a finalized sales tax invoice. Return and leakage adjustments will be applied upon settlement.*

Please find your dispatch document attached as a PDF.

Thank you.
*ROYAL KISSAN ERP*`
  }

  let financialSummary = `Invoice Number: ${invoiceNumber}
Invoice Date: ${invoiceDate}
Total Amount: ₹${grandTotal.toFixed(2)}`

  if (gst > 0) {
    financialSummary += `\nGST Included: ₹${gst.toFixed(2)}`
  }

  financialSummary += `\nAmount Paid: ₹${paid.toFixed(2)}
Remaining Due: ₹${due.toFixed(2)}`

  if (previousBalance > 0) {
    financialSummary += `\nPrevious Outstanding: ₹${previousBalance.toFixed(2)}
Total Outstanding: ₹${(grandTotal + previousBalance).toFixed(2)}`
  }

  const paymentMethod = bill.payment_mode ? `\nPayment Method: ${String(bill.payment_mode).toUpperCase()}` : ''

  return `*ROYAL KISSAN — INVOICE CONFIRMATION*

Hello ${recipientName},

Your Royal Kissan invoice is ready.

*Invoice Details:*
${financialSummary}${paymentMethod}

Please find your official invoice attached as a PDF.

Thank you for choosing Royal Kissan.
*ROYAL KISSAN ERP*`
}

/**
 * Sends an invoice on WhatsApp via the backend API endpoint
 */
export async function sendInvoiceWhatsApp(payload: {
  invoiceId?: string
  billData: any
  recipientPhone?: string
  forceResend?: boolean
  pdfBase64?: string
  pdfFilename?: string
}): Promise<{
  success: boolean
  status?: string
  isDuplicate?: boolean
  messageId?: string
  mediaId?: string
  hasDocumentAttachment?: boolean
  recipient?: string
  waLink?: string
  message: string
}> {
  try {
    const res = await fetch('/api/whatsapp/send-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return await res.json()
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to WhatsApp API: ${err?.message || err}`
    }
  }
}

/**
 * Retrieves notification delivery audit history
 */
export async function getNotificationHistory(limit: number = 50, filterType?: 'all' | 'invoice' | 'purchase'): Promise<WhatsAppNotification[]> {
  const supabase = createClient()
  try {
    let query = supabase
      .from('whatsapp_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filterType === 'invoice') {
      query = query.eq('message_type', 'invoice_document')
    } else if (filterType === 'purchase') {
      query = query.eq('message_type', 'purchase_confirmation')
    }

    const { data, error } = await query
    if (error || !data) return []
    return data as WhatsAppNotification[]
  } catch {
    return []
  }
}

