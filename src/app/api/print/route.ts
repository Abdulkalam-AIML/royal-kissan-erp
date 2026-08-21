import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { sendToNetworkPrinterServer } from '@/lib/printer/server-printer'
import { generateReceiptBuffer, BillData } from '@/lib/printer/receipt'
import { DEFAULT_PRINTER_SETTINGS, PrinterSettings, PrintJobOptions } from '@/lib/printer/printer-config'

export async function POST(req: Request) {
  const startTime = Date.now()
  try {
    const body = await req.json()
    const { bill_id, bill_data, options = {}, customConfig = {} } = body

    const supabase = createClient()

    // 1. Fetch Printer Settings from DB if available
    let settings: PrinterSettings = { ...DEFAULT_PRINTER_SETTINGS, ...customConfig }
    try {
      const { data: dbSettings } = await supabase
        .from('printer_settings')
        .select('*')
        .eq('is_default', true)
        .limit(1)
        .maybeSingle()

      if (dbSettings) {
        settings = {
          ...settings,
          printer_name: dbSettings.printer_name || settings.printer_name,
          printer_ip: dbSettings.printer_ip || settings.printer_ip,
          printer_port: Number(dbSettings.printer_port) || settings.printer_port,
          paper_width: dbSettings.paper_width || settings.paper_width,
          character_width: Number(dbSettings.character_width) || settings.character_width,
          auto_cut: dbSettings.auto_cut ?? settings.auto_cut,
          drawer_enabled: dbSettings.drawer_enabled ?? settings.drawer_enabled,
          local_agent_url: dbSettings.local_agent_url || settings.local_agent_url,
          use_local_agent: dbSettings.use_local_agent ?? settings.use_local_agent,
        }
      }
    } catch (e) {
      console.warn('[Print API] Could not load printer_settings from DB, using defaults:', e)
    }

    // 2. Resolve Bill Data
    let bill: BillData | null = bill_data || null

    if (!bill && bill_id) {
      const { data: dbBill, error: billErr } = await supabase
        .from('bills')
        .select('*')
        .eq('id', bill_id)
        .single()

      if (billErr || !dbBill) {
        return NextResponse.json(
          { success: false, message: `Bill not found: ${billErr?.message || bill_id}` },
          { status: 404 }
        )
      }

      const { data: dbItems } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', bill_id)

      bill = {
        id: dbBill.id,
        invoice_number: dbBill.invoice_number,
        bill_type: dbBill.bill_type,
        customer_name: dbBill.customer_name,
        customer_phone: dbBill.customer_phone,
        customer_address: dbBill.customer_address,
        subtotal: Number(dbBill.subtotal) || 0,
        gst_amount: Number(dbBill.gst_amount) || 0,
        total_amount: Number(dbBill.total_amount) || 0,
        payment_method: dbBill.payment_method,
        cash_amount: Number(dbBill.cash_amount) || 0,
        upi_amount: Number(dbBill.upi_amount) || 0,
        paid_amount: Number(dbBill.paid_amount) || 0,
        due_amount: Number(dbBill.due_amount) || 0,
        date: dbBill.date,
        created_at: dbBill.created_at,
        notes: dbBill.notes,
        items: (dbItems || []).map((it: any) => ({
          product_name: it.product_name,
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0,
          amount: Number(it.amount) || 0,
          gst_rate: Number(it.gst_rate) || 0,
          gst_amount: Number(it.gst_amount) || 0,
          total: Number(it.total) || 0,
        })),
      }
    }

    if (!bill) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload: bill_data or bill_id required' },
        { status: 400 }
      )
    }

    // 3. Generate ESC/POS Buffer
    const escposBuffer = generateReceiptBuffer(bill, options as PrintJobOptions, settings)

    // 4. Send to Network Printer over Server TCP Socket (192.168.0.2:9100)
    const printResult = await sendToNetworkPrinterServer(settings.printer_ip, settings.printer_port, escposBuffer)

    const durationMs = Date.now() - startTime

    // 5. Audit Log to print_logs table
    try {
      await supabase.from('print_logs').insert({
        invoice_number: bill.invoice_number,
        bill_id: bill.id || null,
        copy_type: options.copyType || 'customer',
        status: printResult.success ? 'success' : 'failed',
        error_message: printResult.success ? null : printResult.message,
        duration_ms: durationMs,
        bytes_sent: escposBuffer.length,
      })
    } catch (logErr) {
      console.warn('[Print API] Could not write print log:', logErr)
    }

    return NextResponse.json({
      ...printResult,
      duration_ms: durationMs,
      bytes_sent: escposBuffer.length,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Server printing exception' },
      { status: 500 }
    )
  }
}
