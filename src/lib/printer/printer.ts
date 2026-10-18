import { PrinterSettings, DEFAULT_PRINTER_SETTINGS, PrintJobOptions, PrintResult } from './printer-config'
import { generateReceiptBuffer, BillData } from './receipt'

export type PrintEngine = 'browser' | 'native_bridge' | 'auto'

export interface CrossPlatformPrintOptions extends PrintJobOptions {
  engine?: PrintEngine
}

/**
 * Triggers standard system/browser print dialog (window.print()).
 * The device operating system (macOS / Windows / Linux / Android) handles
 * printer selection, driver spooling, and dispatch to installed printers (including TVS-E RP3230ABW).
 */
export function triggerSystemPrint(): PrintResult {
  if (typeof window === 'undefined') {
    return {
      success: false,
      message: 'Printing is only supported in a browser environment.',
      error_code: 'OFFLINE',
    }
  }

  try {
    window.print()
    return {
      success: true,
      message: 'Device print dialog opened. Select your TVS-E RP3230ABW (or system printer) to complete printing. Note: The operating system handles physical print spooling.',
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to open system print dialog: ${err?.message || err}`,
      error_code: 'UNKNOWN',
    }
  }
}

/**
 * Main Cross-Platform Print Dispatcher
 * Dispatches standard system print dialog with extensibility for future native printer bridges.
 */
export async function executePrintJob(
  bill: BillData,
  options: CrossPlatformPrintOptions = {},
  config: PrinterSettings = DEFAULT_PRINTER_SETTINGS
): Promise<PrintResult> {
  // Check for future native bridge if present in environment (e.g. Android WebView bridge or Electron)
  if (typeof window !== 'undefined' && options.engine !== 'browser') {
    const win = window as any
    const nativeBridge = win.RoyalKissanNativePrinter || win.AndroidPrinterBridge
    if (nativeBridge && typeof nativeBridge.printRawEscpos === 'function') {
      try {
        const buffer = generateReceiptBuffer(bill, options, config)
        const res = await nativeBridge.printRawEscpos(buffer, `Bill-${bill.invoice_number}`)
        if (res?.success) {
          return {
            success: true,
            message: res.message || 'Printed via native printer bridge.',
          }
        }
      } catch (err) {
        console.warn('Native bridge error, falling back to system print:', err)
      }
    }
  }

  // Standard browser printing is the universal, zero-dependency foundation
  return triggerSystemPrint()
}
