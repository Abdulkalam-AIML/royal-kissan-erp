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
 * Validates transaction and invoice completeness before transmission
 * Rejects corrupted, negative, or incomplete records
 */
export interface InvoiceCompletenessValidation {
  isValid: boolean
  errors: string[]
}

export function validateInvoiceDataCompleteness(bill: any): InvoiceCompletenessValidation {
  const errors: string[] = []

  if (!bill || typeof bill !== 'object') {
    return { isValid: false, errors: ['Invoice data object is missing or null.'] }
  }

  // Invoice Number
  const invNo = bill.invoice_number || bill.bill_number || bill.id
  if (!invNo || String(invNo).trim() === '') {
    errors.push('Invoice number is missing.')
  }

  // Recipient Name
  const recipientName = bill.dealer_name || bill.customer_name || bill.recipient_name
  if (!recipientName || String(recipientName).trim() === '') {
    errors.push('Recipient name is missing.')
  }

  // Bill type check
  const billType = String(bill.bill_type || '').toUpperCase()
  const isStatement = billType.includes('STATEMENT')
  const isSettlement = billType.includes('SETTLEMENT')

  // Items completeness (required for standard invoices and dispatches)
  if (!isStatement && !isSettlement) {
    const rawItems = bill.items || bill.bill_items
    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      errors.push('Invoice contains no line items.')
    } else {
      rawItems.forEach((it: any, idx: number) => {
        const pName = it.product_name || it.name
        if (!pName || String(pName).trim() === '') {
          errors.push(`Line item #${idx + 1} has no product name.`)
        }
        const qty = Number(it.quantity)
        if (isNaN(qty) || qty <= 0) {
          errors.push(`Line item #${idx + 1} has an invalid quantity (${it.quantity}).`)
        }
        const rate = Number(it.rate ?? it.unit_price)
        if (isNaN(rate) || rate < 0) {
          errors.push(`Line item #${idx + 1} has an invalid rate (₹${it.rate}).`)
        }
      })
    }
  }

  // Financial sanity checks
  const grandTotal = Number(bill.grand_total ?? bill.total_amount ?? 0)
  if (isNaN(grandTotal) || grandTotal < 0) {
    errors.push(`Invoice total amount is invalid (₹${grandTotal}).`)
  }

  const subtotal = Number(bill.subtotal ?? bill.taxable_amount ?? 0)
  if (isNaN(subtotal) || subtotal < 0) {
    errors.push(`Invoice subtotal is invalid (₹${subtotal}).`)
  }

  const paidAmount = Number(bill.paid_amount ?? 0)
  if (isNaN(paidAmount) || paidAmount < 0) {
    errors.push(`Paid amount cannot be negative (₹${paidAmount}).`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generates the professional WhatsApp Invoice / Bill Confirmation text message
 * Strict compliance with Royal Kissan standard template for Customers and Dealers
 * Includes complete itemized purchase details, units, rates, discounts, GST, and dealer reconciliation
 */
export function formatInvoiceWhatsAppMessage(bill: any): string {
  const isDispatchNote = String(bill.bill_type || '').toUpperCase().includes('DISPATCH NOTE')
  const isSettlementSummary = String(bill.bill_type || '').toUpperCase().includes('SETTLEMENT')
  const isAccountStatement = String(bill.bill_type || '').toUpperCase().includes('STATEMENT')
  const isDealer = !!(bill.dealer_name || bill.dealer_id || String(bill.bill_type || '').toLowerCase().includes('dealer'))

  const recipientName = bill.dealer_name || bill.customer_name || 'Valued Customer'
  const invoiceNumber = bill.invoice_number || bill.bill_number || `INV-${bill.id ? String(bill.id).slice(0, 8).toUpperCase() : 'NEW'}`
  const invoiceDate = bill.date || bill.dispatch_date || new Date().toISOString().split('T')[0]

  const rawItems = bill.items || bill.bill_items || [
    {
      product_name: bill.product_name || 'Packaged Drinking Water (20L Can)',
      quantity: bill.quantity || 1,
      unit: bill.unit || 'can',
      rate: bill.rate || bill.total_amount || 0,
      amount: bill.total_amount || 0
    }
  ]

  // Format Itemized Purchase Details:
  // e.g. "1. Water Can 20L — 10 Cans × ₹15 = ₹150"
  const itemsText = rawItems.map((item: any, idx: number) => {
    const num = idx + 1
    const name = item.product_name || item.name || 'Product'
    const qty = Number(item.quantity) || 1
    const unit = item.unit ? ` ${item.unit}` : ''
    const rate = Number(item.rate || item.unit_price) || 0
    const amt = Number(item.amount || item.total || (qty * rate))
    return `${num}. ${name} — ${qty}${unit} × ₹${rate.toFixed(0)} = ₹${amt.toFixed(0)}`
  }).join('\n')

  const subtotal = Number(bill.subtotal || bill.taxable_amount || bill.total_amount || 0)
  const discount = Number(bill.discount_amount || 0)
  const gst = Number(bill.gst_amount || 0)
  const returnCredit = Number(bill.return_credit || 0)
  const leakageCredit = Number(bill.leakage_credit || 0)
  const totalCredits = returnCredit + leakageCredit
  const grandTotal = Number(bill.grand_total || bill.total_amount || (subtotal - discount + gst - totalCredits))
  const previousBalance = Number(bill.previous_balance || bill.opening_balance || bill.outstanding_balance || 0)
  const finalPayable = grandTotal + previousBalance
  const paid = Number(bill.paid_amount || 0)
  const due = Number(bill.due_amount || Math.max(0, finalPayable - paid))
  const paymentMethod = (bill.payment_mode || bill.payment_method || 'CASH').toUpperCase()

  // 1. ROUTE SETTLEMENT SUMMARY
  if (isSettlementSummary) {
    return `*ROYAL KISSAN — ROUTE SETTLEMENT SUMMARY*

Hello ${recipientName},

Your route settlement record has been confirmed.

*Settlement Details:*
Settlement Ref: ${invoiceNumber}
Date: ${invoiceDate}
Net Collections: ₹${grandTotal.toFixed(2)}
Cash Handed Over: ₹${paid.toFixed(2)}

*Reconciliation Summary:*
${(bill.items || []).map((it: any, idx: number) => `${idx + 1}. ${it.product_name}: ${it.quantity} units (₹${Number(it.amount || 0).toFixed(2)})`).join('\n') || 'Route inventory successfully reconciled.'}

Thank you.
*ROYAL KISSAN ERP*`
  }

  // 2. ACCOUNT STATEMENT
  if (isAccountStatement) {
    return `*ROYAL KISSAN — ACCOUNT LEDGER STATEMENT*

Hello ${recipientName},

Here is your current Royal Kissan account statement:

*Statement Details:*
Account: ${recipientName}
Date: ${invoiceDate}
Current Closing Due: ₹${due.toFixed(2)}
Lifetime Purchases: ₹${subtotal.toFixed(2)}

Thank you for your valued partnership.
*ROYAL KISSAN ERP*`
  }

  // 3. LOAD DISPATCH NOTE
  if (isDispatchNote) {
    const totalQty = bill.total_quantity || rawItems.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 0), 0)
    return `*ROYAL KISSAN — LOAD DISPATCH NOTE*

Hello ${recipientName},

Your Royal Kissan daily load dispatch record is ready.

*Dispatch Details:*
Dispatch Number: ${invoiceNumber}
Dispatch Date: ${invoiceDate}
Total Quantity: ${totalQty} units
Load Value: ₹${grandTotal.toFixed(2)}

*Dispatched Items:*
${itemsText}

*Note: This is an inventory load dispatch record, NOT a finalized sales tax invoice. Return and leakage adjustments will be applied upon settlement.*

Please find your dispatch document attached as a PDF.

Thank you.
*ROYAL KISSAN ERP*`
  }

  // 4. DEALER BILL / INVOICE WITH NEXT-DAY RECONCILIATION
  if (isDealer) {
    const todayDispatchQty = bill.today_dispatch_quantity || rawItems.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0)
    const primaryUnit = rawItems[0]?.unit || 'Units'
    const returnedQty = bill.returned_quantity ?? bill.return_qty ?? 0
    const leakedQty = bill.leaked_quantity ?? bill.leakage_qty ?? 0
    const origRef = bill.original_dispatch_reference || bill.dispatch_reference || 'N/A'

    const reconBlock = `*Dealer Dispatch & Return Reconciliation:*
Today's Dispatch Quantity: ${todayDispatchQty} ${primaryUnit}
Original Dispatch Ref: ${origRef}
Previous-Day Returns: ${returnedQty} ${primaryUnit} (Credit: -₹${returnCredit.toFixed(0)})
Previous-Day Leakage: ${leakedQty} ${primaryUnit} (Credit: -₹${leakageCredit.toFixed(0)})
Return Credit Amount: -₹${returnCredit.toFixed(0)}
Leakage Credit Amount: -₹${leakageCredit.toFixed(0)}
Net Amount (After Credits): ₹${grandTotal.toFixed(0)}`

    let financialBlock = `*Financial Summary:*
Subtotal: ₹${subtotal.toFixed(0)}`
    if (discount > 0) financialBlock += `\nDiscount: -₹${discount.toFixed(0)}`
    if (gst > 0) financialBlock += `\nGST Included: ₹${gst.toFixed(0)}`
    if (totalCredits > 0) financialBlock += `\nTotal Return/Leakage Credits: -₹${totalCredits.toFixed(0)}`
    financialBlock += `\nNet Dispatch Amount: ₹${grandTotal.toFixed(0)}`
    if (previousBalance > 0) {
      financialBlock += `\nPrevious Outstanding: ₹${previousBalance.toFixed(0)}
Final Payable Amount: ₹${finalPayable.toFixed(0)}`
    }
    financialBlock += `\nAmount Paid: ₹${paid.toFixed(0)}
Remaining Due: ₹${due.toFixed(0)}
Payment Method: ${paymentMethod}`

    return `*ROYAL KISSAN — DEALER INVOICE & DISPATCH*

Hello ${recipientName},

Thank you for your valued partnership with Royal Kissan!

*Dispatch & Billing Details:*
Invoice No: ${invoiceNumber}
Date: ${invoiceDate}

*Items purchased:*
${itemsText}

${reconBlock}

${financialBlock}

Please find your detailed invoice attached.

Thank you for choosing Royal Kissan.
*ROYAL KISSAN ERP*`
  }

  // 5. STANDARD CUSTOMER INVOICE
  let financialBlock = `*Financial Summary:*
Subtotal: ₹${subtotal.toFixed(0)}`
  if (discount > 0) financialBlock += `\nDiscount: -₹${discount.toFixed(0)}`
  if (gst > 0) financialBlock += `\nGST Included: ₹${gst.toFixed(0)}`
  if (previousBalance > 0) {
    financialBlock += `\nInvoice Total: ₹${grandTotal.toFixed(0)}
Previous Outstanding: ₹${previousBalance.toFixed(0)}
Final Payable Amount: ₹${finalPayable.toFixed(0)}`
  } else {
    financialBlock += `\nGrand Total: ₹${grandTotal.toFixed(0)}`
  }
  financialBlock += `\nAmount Paid: ₹${paid.toFixed(0)}
Remaining Due: ₹${due.toFixed(0)}
Payment Method: ${paymentMethod}`

  return `*ROYAL KISSAN — INVOICE CONFIRMATION*

Hello ${recipientName},

Thank you for purchasing from Royal Kissan!

*Your purchase details:*

Invoice No: ${invoiceNumber}
Date: ${invoiceDate}

*Items purchased:*
${itemsText}

${financialBlock}

Please find your detailed invoice attached.

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
    // Validate transaction data completeness before transmission
    if (payload.billData) {
      const completeness = validateInvoiceDataCompleteness(payload.billData)
      if (!completeness.isValid) {
        return {
          success: false,
          status: 'INCOMPLETE_DATA',
          message: `Cannot send incomplete invoice record: ${completeness.errors.join('; ')}`
        }
      }
    }

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

