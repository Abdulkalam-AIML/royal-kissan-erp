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
      error: 'Phone number is required.'
    }
  }

  const raw = phoneInput.trim()
  // Remove all non-digit characters except leading plus
  let cleaned = raw.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // Handle leading 0
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

  // If 12 digits starting with 91
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const subscriber = cleaned.substring(2)
    if (!/^[6-9]\d{9}$/.test(subscriber)) {
      return {
        isValid: false,
        formattedPhone: `+${cleaned}`,
        e164Digits: cleaned,
        raw,
        error: 'Invalid Indian mobile number format after country code 91.'
      }
    }
    return {
      isValid: true,
      formattedPhone: `+${cleaned}`,
      e164Digits: cleaned,
      raw
    }
  }

  return {
    isValid: false,
    formattedPhone: raw,
    e164Digits: cleaned,
    raw,
    error: 'Invalid phone number. Please enter a 10-digit Indian mobile number (e.g. 93476 62554 or +919347662554).'
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
 * Retrieves notification delivery audit history
 */
export async function getNotificationHistory(limit: number = 50): Promise<WhatsAppNotification[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('whatsapp_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []
    return data as WhatsAppNotification[]
  } catch {
    return []
  }
}

