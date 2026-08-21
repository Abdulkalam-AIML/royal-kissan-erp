import { NextResponse } from 'next/server'
import { generateReceiptBuffer, generateTestReceiptBuffer, BillData } from '@/lib/printer/receipt'
import { DEFAULT_PRINTER_SETTINGS, PrinterSettings } from '@/lib/printer/printer-config'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { bill_data, is_test, customConfig } = body

    const config: PrinterSettings = { ...DEFAULT_PRINTER_SETTINGS, ...customConfig }
    
    let buffer: Uint8Array
    if (is_test) {
      buffer = generateTestReceiptBuffer(config)
    } else if (bill_data) {
      buffer = generateReceiptBuffer(bill_data as BillData, {}, config)
    } else {
      return NextResponse.json({ success: false, error: 'Missing bill_data or is_test parameter' }, { status: 400 })
    }

    // Convert Uint8Array to base64
    let binary = ''
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i])
    }
    const base64Data = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(buffer).toString('base64')

    return NextResponse.json({
      success: true,
      message: 'ESC/POS Mobile raw buffer generated successfully',
      base64_payload: base64Data,
      byte_length: buffer.length,
      printer_ip: config.printer_ip,
      printer_port: config.printer_port,
      paper_width: config.paper_width,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate mobile ESC/POS print payload' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Royal Kissan Mobile Printing API',
    supported_protocols: ['ESC/POS', 'WebBluetooth', 'WiFi', 'USB-OTG'],
  })
}
