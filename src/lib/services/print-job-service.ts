import { createClient } from '@/lib/supabase/client'
import { BillData } from '@/lib/printer/receipt'
import { CopyType } from '@/lib/printer/printer-config'

export interface EnqueuePrintJobResult {
  success: boolean
  jobId?: string
  status?: string
  message: string
  isDuplicate?: boolean
}

export interface PrintJobRecord {
  id: string
  invoice_number: string
  invoice_id?: string
  connection_type: 'bluetooth' | 'wifi' | 'auto'
  status: 'PENDING' | 'CLAIMED' | 'SENDING' | 'SENT' | 'COMPLETED' | 'FAILED' | 'UNKNOWN_OUTCOME'
  idempotency_key: string
  payload_json: any
  copy_type: CopyType
  retry_count: number
  error_message?: string
  created_by?: string
  claimed_by?: string
  created_at: string
  claimed_at?: string
  completed_at?: string
}

export interface PrinterDeviceRecord {
  id: string
  device_name: string
  printer_model: string
  connection_type: 'bluetooth' | 'wifi' | 'auto'
  bluetooth_mac?: string
  bluetooth_device_name?: string
  wifi_ip?: string
  wifi_port: number
  is_default: boolean
  is_active: boolean
  last_seen_at?: string
  registered_device_id?: string
}

/**
 * Enqueues a thermal print job into the Supabase cloud queue for TVS RP 3230 ABW.
 * Includes client-side idempotency protection to prevent rapid double-clicks.
 */
export async function enqueueThermalPrintJob(
  bill: BillData,
  copyType: CopyType = 'customer',
  connectionType: 'bluetooth' | 'wifi' | 'auto' = 'bluetooth'
): Promise<EnqueuePrintJobResult> {
  const supabase = createClient()

  // 5-second idempotency window per invoice & copy type
  const timeBucket = Math.floor(Date.now() / 5000)
  const idempotencyKey = `print_${bill.invoice_number}_${copyType}_${timeBucket}`

  // Build immutable invoice snapshot payload
  const payloadSnapshot = {
    invoice_number: bill.invoice_number,
    bill_type: bill.bill_type || 'counter',
    customer_name: bill.customer_name || 'Walk-in Customer',
    customer_phone: bill.customer_phone || null,
    customer_address: bill.customer_address || null,
    customer_gstin: bill.customer_gstin || null,
    dealer_name: bill.dealer_name || null,
    dealer_phone: bill.dealer_phone || null,
    dealer_address: bill.dealer_address || null,
    dealer_gstin: bill.dealer_gstin || null,
    items: (bill.items || []).map(i => ({
      product_name: i.product_name,
      quantity: Number(i.quantity) || 1,
      rate: Number(i.rate) || 0,
      amount: Number(i.amount ?? i.total ?? (i.quantity * i.rate)) || 0
    })),
    subtotal: Number(bill.subtotal) || 0,
    gst_amount: Number(bill.gst_amount) || 0,
    discount_amount: Number(bill.discount_amount) || 0,
    total_amount: Number(bill.total_amount) || 0,
    paid_amount: Number(bill.paid_amount) || 0,
    due_amount: Number(bill.due_amount) || 0,
    payment_method: (bill.payment_method || 'CASH').toUpperCase(),
    date: bill.date || new Date().toISOString().split('T')[0],
    copy_type: copyType,
    notes: bill.notes || null
  }

  try {
    // Check if duplicate active job already exists within window
    const { data: existing } = await supabase
      .from('print_jobs')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existing) {
      return {
        success: true,
        jobId: existing.id,
        status: existing.status,
        isDuplicate: true,
        message: `Print request already queued (Status: ${existing.status}). Avoiding duplicate ticket.`
      }
    }

    const { data: inserted, error } = await supabase
      .from('print_jobs')
      .insert({
        invoice_id: bill.id || null,
        invoice_number: bill.invoice_number,
        connection_type: connectionType,
        status: 'PENDING',
        idempotency_key: idempotencyKey,
        payload_json: payloadSnapshot,
        copy_type: copyType,
        created_by: 'ERP Web POS'
      })
      .select('id, status')
      .single()

    if (error) {
      // If table doesn't exist yet, return soft failure with advice
      return {
        success: false,
        message: `Cloud queue insert failed: ${error.message}. Ensure migration 005_thermal_print_queue.sql is applied.`
      }
    }

    return {
      success: true,
      jobId: inserted.id,
      status: inserted.status,
      message: `Print job #${bill.invoice_number} successfully queued for TVS RP 3230 ABW!`
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to queue print job: ${err?.message || err}`
    }
  }
}

/**
 * Fetch recent print jobs for queue inspection in ERP UI
 */
export async function getRecentPrintJobs(limit: number = 20): Promise<PrintJobRecord[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []
    return data as PrintJobRecord[]
  } catch {
    return []
  }
}

/**
 * Fetch registered printer devices
 */
export async function getPrinterDevices(): Promise<PrinterDeviceRecord[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('printer_devices')
      .select('*')
      .order('is_default', { ascending: false })

    if (error || !data) return []
    return data as PrinterDeviceRecord[]
  } catch {
    return []
  }
}

/**
 * Save or update printer device
 */
export async function savePrinterDevice(device: Partial<PrinterDeviceRecord>): Promise<boolean> {
  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('printer_devices')
      .upsert({
        ...device,
        updated_at: new Date().toISOString()
      })

    return !error
  } catch {
    return false
  }
}
