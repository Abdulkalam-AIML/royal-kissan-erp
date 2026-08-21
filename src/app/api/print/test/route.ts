import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { sendToNetworkPrinterServer } from '@/lib/printer/server-printer'
import { generateTestReceiptBuffer } from '@/lib/printer/receipt'
import { DEFAULT_PRINTER_SETTINGS, PrinterSettings } from '@/lib/printer/printer-config'

export async function POST(req: Request) {
  const startTime = Date.now()
  try {
    const body = await req.json().catch(() => ({}))
    const { customConfig = {} } = body

    const supabase = createClient()
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
        }
      }
    } catch (e) {
      console.warn('[Print Test API] Could not load printer_settings from DB:', e)
    }

    const testBuffer = generateTestReceiptBuffer(settings)
    const result = await sendToNetworkPrinterServer(settings.printer_ip, settings.printer_port, testBuffer)

    const durationMs = Date.now() - startTime

    try {
      await supabase.from('print_logs').insert({
        invoice_number: 'TEST-PRINT',
        copy_type: 'test',
        status: result.success ? 'success' : 'failed',
        error_message: result.success ? null : result.message,
        duration_ms: durationMs,
        bytes_sent: testBuffer.length,
      })
    } catch (e) {
      // ignore
    }

    return NextResponse.json({
      ...result,
      duration_ms: durationMs,
      bytes_sent: testBuffer.length,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Test print execution error' },
      { status: 500 }
    )
  }
}
