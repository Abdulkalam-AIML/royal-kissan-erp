import { createClient } from '@/lib/supabase/client'
import { emitDataChange } from '@/lib/events/data-sync'
import {
  Purchase,
  PurchaseItem,
  PurchaseWithItems,
  Supplier
} from '@/lib/types/database'

export interface CreatePurchaseItemInput {
  product_id?: string | null
  product_name: string
  quantity: number
  unit: string
  rate: number
  amount: number
  gst_rate?: number
  gst_amount?: number
}

export interface CreatePurchasePayload {
  purchase_number?: string
  supplier_id?: string | null
  supplier_name: string
  supplier_phone?: string | null
  supplier_invoice_number?: string | null
  purchase_date?: string
  subtotal: number
  discount_amount?: number
  gst_amount?: number
  grand_total: number
  paid_amount: number
  due_amount?: number
  payment_method?: string
  purchase_status?: string
  notes?: string | null
  created_by?: string
  items: CreatePurchaseItemInput[]
  sendWhatsAppNotification?: boolean
}

export interface PurchaseResponse {
  success: boolean
  purchase?: PurchaseWithItems
  message?: string
  whatsAppStatus?: {
    triggered: boolean
    status?: string
    recipient?: string
    message?: string
  }
}

/**
 * Creates and records a new purchase atomically in Supabase,
 * synchronizing inventory and triggering automatic WhatsApp notification.
 */
export async function createPurchase(payload: CreatePurchasePayload): Promise<PurchaseResponse> {
  if (!payload.items || payload.items.length === 0) {
    return { success: false, message: 'A purchase must have at least one product item.' }
  }

  const supabase = createClient()

  // Format purchase header for PostgreSQL RPC
  const purchaseHeader = {
    purchase_number: payload.purchase_number || null,
    supplier_id: payload.supplier_id || null,
    supplier_name: payload.supplier_name.trim(),
    supplier_phone: payload.supplier_phone || null,
    supplier_invoice_number: payload.supplier_invoice_number || null,
    purchase_date: payload.purchase_date || new Date().toISOString().split('T')[0],
    subtotal: payload.subtotal,
    discount_amount: payload.discount_amount || 0,
    gst_amount: payload.gst_amount || 0,
    grand_total: payload.grand_total,
    paid_amount: payload.paid_amount || 0,
    due_amount: payload.due_amount ?? Math.max(0, payload.grand_total - (payload.paid_amount || 0)),
    payment_method: payload.payment_method || 'CASH',
    purchase_status: payload.purchase_status || 'COMPLETED',
    notes: payload.notes || null,
    created_by: payload.created_by || 'Admin'
  }

  try {
    // 1. Execute Atomic RPC Transaction
    const { data: createdPurchase, error: rpcError } = await supabase.rpc(
      'record_purchase_with_inventory',
      {
        p_purchase: purchaseHeader,
        p_items: payload.items
      }
    )

    if (rpcError) {
      return { success: false, message: `Database transaction failed: ${rpcError.message}` }
    }

    if (!createdPurchase || !createdPurchase.id) {
      return { success: false, message: 'Purchase transaction returned empty result.' }
    }

    // 2. Fetch full purchase with items
    const { data: itemsData } = await supabase
      .from('purchase_items')
      .select('*')
      .eq('purchase_id', createdPurchase.id)

    const fullPurchase: PurchaseWithItems = {
      ...createdPurchase,
      items: itemsData || payload.items
    }

    // 3. Emit real-time synchronization events
    emitDataChange('purchases')
    emitDataChange('stock')
    emitDataChange('products')

    // 4. Trigger Automatic WhatsApp Notification (if not explicitly disabled)
    let whatsAppResult: {
      triggered: boolean
      status?: string
      recipient?: string
      message?: string
    } = { triggered: false, status: 'SKIPPED', message: 'Notification not requested' }
    if (payload.sendWhatsAppNotification !== false) {
      try {
        const notifRes = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purchaseId: fullPurchase.id,
            purchaseData: fullPurchase
          })
        })
        const notifJson = await notifRes.json()
        whatsAppResult = {
          triggered: true,
          status: notifJson.status || (notifJson.success ? 'SENT' : 'FAILED'),
          recipient: notifJson.recipient,
          message: notifJson.message
        }
      } catch (err: any) {
        whatsAppResult = {
          triggered: true,
          status: 'FAILED',
          message: `Network error triggering WhatsApp: ${err?.message || err}`
        }
      }
    }

    return {
      success: true,
      purchase: fullPurchase,
      message: `Purchase #${fullPurchase.purchase_number} recorded successfully!`,
      whatsAppStatus: whatsAppResult
    }
  } catch (err: any) {
    return { success: false, message: `Failed to record purchase: ${err?.message || err}` }
  }
}

/**
 * Fetch list of purchases with items
 */
export async function getPurchases(limit: number = 50): Promise<PurchaseWithItems[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, purchase_items(*)')
      .order('purchase_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    return data.map(p => ({
      ...p,
      items: p.purchase_items || []
    })) as PurchaseWithItems[]
  } catch {
    return []
  }
}

/**
 * Fetch single purchase by ID with items
 */
export async function getPurchaseById(id: string): Promise<PurchaseWithItems | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, purchase_items(*)')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) return null

    return {
      ...data,
      items: data.purchase_items || []
    } as PurchaseWithItems
  } catch {
    return null
  }
}

/**
 * Fetch all registered suppliers
 */
export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true })

    if (error || !data) return []
    return data as Supplier[]
  } catch {
    return []
  }
}

/**
 * Create or update a supplier
 */
export async function saveSupplier(supplier: Partial<Supplier>): Promise<Supplier | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .upsert({
        ...supplier,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error || !data) return null
    return data as Supplier
  } catch {
    return null
  }
}
