import { PrinterSettings, DEFAULT_PRINTER_SETTINGS, PrintJobOptions, PrintResult } from './printer-config'
import { generateReceiptBuffer, BillData } from './receipt'

/**
 * Triggers standard system/browser print dialog (window.print()).
 * The device operating system (macOS / Android) handles printer selection,
 * driver spooling, and dispatch to installed printers (including TVS-E RP3230ABW).
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
      message: 'Print dialog opened. Select your TVS-E RP3230ABW (or system printer) to complete printing. Note: The operating system handles physical print spooling.',
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
 * Main Print Dispatcher
 * Dispatches standard system print dialog for the invoice.
 */
export async function executePrintJob(
  bill: BillData,
  options: PrintJobOptions = {},
  config: PrinterSettings = DEFAULT_PRINTER_SETTINGS
): Promise<PrintResult> {
  return triggerSystemPrint()
}
