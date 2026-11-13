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

export type PrintJobStatus = 
  | 'PENDING' 
  | 'CLAIMED' 
  | 'SENDING' 
  | 'SENT' 
  | 'PRINTED' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'UNKNOWN_OUTCOME'

export interface PrintJobRecord {
  id: string
  invoice_number: string
  invoice_id?: string | null
  connection_type: 'bluetooth' | 'wifi' | 'auto'
  actual_transport?: 'wifi' | 'bluetooth' | null
  status: PrintJobStatus
  idempotency_key: string
  payload_json: any
  copy_type: CopyType
  retry_count: number
  error_message?: string | null
  verification_method?: 'hardware_status' | 'operator_confirmed' | 'transmission_ack' | string | null
  created_by?: string | null
  claimed_by?: string | null
  created_at: string
  claimed_at?: string | null
  completed_at?: string | null
  printed_at?: string | null
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

export interface PrintBridgeWorkerRecord {
  worker_id: string
  device_name: string
  app_version: string
  preferred_transport: 'wifi' | 'bluetooth' | 'auto'
  status: 'ONLINE' | 'OFFLINE' | 'BUSY'
  ip_address?: string
  last_heartbeat: string
  created_at: string
  updated_at: string
  isOnline?: boolean
}

export interface PrinterSettingsRecord {
  id: string
  organization_id: string
  preferred_connection: 'wifi' | 'bluetooth' | 'auto'
  automatic_fallback: boolean
  receipt_width: string
  character_width: number
  print_logo: boolean
  print_qr: boolean
  auto_cut: boolean
  cash_drawer: boolean
  updated_at?: string
}

/**
 * Enqueues a thermal print job into the Supabase cloud queue for TVS RP 3230 ABW.
 * Includes client-side idempotency protection to prevent rapid double-clicks.
 * Defaults to Wi-Fi RAW socket transport as requested.
 */
export async function enqueueThermalPrintJob(
  bill: BillData,
  copyType: CopyType = 'customer',
  connectionType: 'bluetooth' | 'wifi' | 'auto' = 'wifi'
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
      return {
        success: false,
        message: `Cloud queue insert failed: ${error.message}. Ensure migration 005_thermal_print_queue.sql is applied.`
      }
    }

    return {
      success: true,
      jobId: inserted.id,
      status: inserted.status,
      message: `Print job #${bill.invoice_number} queued for TVS RP 3230 ABW via ${connectionType.toUpperCase()}!`
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
export async function getRecentPrintJobs(limit: number = 25): Promise<PrintJobRecord[]> {
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

/**
 * Fetch latest Android Print Bridge worker heartbeat & online/offline status
 */
export async function getBridgeWorkerStatus(): Promise<PrintBridgeWorkerRecord | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('print_bridge_workers')
      .select('*')
      .order('last_heartbeat', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return null

    const diffMs = Date.now() - new Date(data.last_heartbeat).getTime()
    // Worker is considered online if heartbeat was within last 30 seconds
    const isOnline = diffMs < 30000

    return {
      ...data,
      isOnline,
      status: isOnline ? 'ONLINE' : 'OFFLINE'
    }
  } catch {
    return null
  }
}

/**
 * Fetch global printer settings from Supabase
 */
export async function getPrinterSettings(): Promise<PrinterSettingsRecord | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('printer_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return null
    return data as PrinterSettingsRecord
  } catch {
    return null
  }
}

/**
 * Save or update printer settings
 */
export async function savePrinterSettings(settings: Partial<PrinterSettingsRecord>): Promise<boolean> {
  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('printer_settings')
      .upsert({
        organization_id: 'default_org',
        ...settings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id' })

    return !error
  } catch {
    return false
  }
}

/**
 * Fetch a specific print job by ID for live status tracking
 */
export async function getPrintJobById(jobId: string): Promise<PrintJobRecord | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle()

    if (error || !data) return null
    return data as PrintJobRecord
  } catch {
    return null
  }
}

/**
 * Confirm physical print verification (by operator or hardware status)
 * Transitions status to PRINTED
 */
export async function confirmPhysicalPrint(
  jobId: string, 
  verificationMethod: string = 'operator_confirmed'
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase.rpc('confirm_physical_print', {
      p_job_id: jobId,
      p_verification_method: verificationMethod
    })

    if (error) {
      // Fallback direct table update if RPC not accessible
      const { error: patchError } = await supabase
        .from('print_jobs')
        .update({
          status: 'PRINTED',
          verification_method: verificationMethod,
          printed_at: new Date().toISOString(),
          error_message: null
        })
        .eq('id', jobId)

      if (patchError) {
        return { success: false, message: patchError.message }
      }
      return { success: true, message: 'Physical print confirmed!' }
    }

    return {
      success: data?.success ?? true,
      message: data?.message || 'Physical print verified and confirmed.'
    }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to confirm print' }
  }
}

/**
 * Manual retry for a FAILED or UNKNOWN_OUTCOME print job.
 * Strictly requires explicit operator action to avoid duplicate ticket generation.
 */
export async function retryPrintJob(
  jobId: string,
  requestedBy: string = 'Operator'
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase.rpc('retry_print_job', {
      p_job_id: jobId,
      p_requested_by: requestedBy
    })

    if (error) {
      // Fallback direct table update
      const { error: patchError } = await supabase
        .from('print_jobs')
        .update({
          status: 'PENDING',
          claimed_by: null,
          claimed_at: null,
          error_message: null,
          verification_method: null,
          printed_at: null
        })
        .eq('id', jobId)

      if (patchError) {
        return { success: false, message: patchError.message }
      }
      return { success: true, message: 'Job reset to PENDING for reprint.' }
    }

    return {
      success: data?.success ?? true,
      message: data?.message || 'Print job re-queued in PENDING state.'
    }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to retry job' }
  }
}
