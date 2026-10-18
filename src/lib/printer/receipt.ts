import { EscPosBuilder } from './escpos-builder'
import { getRoyalKissanLogoRaster } from './print-logo'
import { PrintJobOptions, PrinterSettings, DEFAULT_PRINTER_SETTINGS } from './printer-config'

export interface BillItemData {
  product_name: string
  quantity: number
  rate: number
  amount: number
  item_discount?: number
  gst_rate?: number
  gst_amount?: number
  total?: number
}

export interface BillData {
  id?: string
  invoice_number: string
  bill_type?: string
  customer_name: string
  customer_phone?: string | null
  customer_address?: string | null
  customer_gstin?: string | null
  dealer_id?: string | null
  dealer_name?: string | null
  dealer_phone?: string | null
  dealer_address?: string | null
  dealer_gstin?: string | null
  dealer_code?: string | null
  subtotal: number
  gst_amount: number
  discount_amount?: number
  total_amount: number
  payment_method?: string
  cash_amount?: number
  upi_amount?: number
  paid_amount: number
  due_amount: number
  payment_status?: string
  date: string
  created_at?: string
  items: BillItemData[]
  notes?: string | null
}

/**
 * Generate full binary ESC/POS Uint8Array receipt buffer for TVS RP3230ABW
 */
export function generateReceiptBuffer(
  bill: BillData,
  options: PrintJobOptions = {},
  config: PrinterSettings = DEFAULT_PRINTER_SETTINGS
): Uint8Array {
  const charWidth = config.character_width || 48
  const builder = new EscPosBuilder(charWidth)
  const copyType = options.copyType || 'customer'
  const triggerDrawer = options.triggerDrawer ?? config.drawer_enabled
  const cutPaper = options.cutPaper ?? config.auto_cut

  // 1. Trigger Cash Drawer if configured
  if (triggerDrawer) {
    builder.cashDrawer()
  }

  // 2. Logo Header
  if (options.includeLogo !== false) {
    builder.align('center')
    const logo = getRoyalKissanLogoRaster()
    builder.rasterImage(logo.widthDots, logo.heightDots, logo.data)
  }

  // 3. Header Text
  builder.align('center')
  builder.bold(true)
  builder.size('double_both')
  builder.line('ROYAL KISSAN')
  builder.size('normal')
  builder.bold(false)
  builder.line('Packaged Drinking Water')
  builder.line('BASHU ABBAS BEVERAGES')
  builder.line('15-2 Behind AnjaneyaSwami Temple, Sri Ram Nagar')
  builder.line('Chintalapudi, Elure-534460')
  builder.line('Phone: +91 93476 62554')
  builder.line('GSTIN: 37BABS2021G1Z3')

  // Copy Type Header Badge
  const isDealerCopy = copyType === 'dealer' || Boolean(bill.dealer_name || bill.dealer_id)
  builder.bold(true)
  const copyLabel = isDealerCopy ? 'DEALER COPY' : copyType.toUpperCase() + ' COPY'
  builder.line(`*** ${copyLabel} ***`)
  builder.bold(false)

  // 4. Metadata
  builder.divider('-')
  builder.align('left')
  builder.twoColumn('Invoice #:', bill.invoice_number)
  
  const timeStr = bill.created_at
    ? new Date(bill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  builder.twoColumn('Date:', bill.date)
  builder.twoColumn('Time:', timeStr)

  if (isDealerCopy) {
    const dName = bill.dealer_name || bill.customer_name || 'Dealer'
    builder.twoColumn('Dealer:', dName)
    if (bill.dealer_phone || bill.customer_phone) {
      builder.twoColumn('Phone:', bill.dealer_phone || bill.customer_phone || '')
    }
    if (bill.dealer_address || bill.customer_address) {
      builder.twoColumn('Address:', bill.dealer_address || bill.customer_address || '')
    }
    if (bill.dealer_gstin || bill.customer_gstin) {
      builder.twoColumn('GSTIN:', bill.dealer_gstin || bill.customer_gstin || '')
    }
  } else {
    builder.twoColumn('Customer:', bill.customer_name || 'Walk-in Customer')
    if (bill.customer_phone) {
      builder.twoColumn('Phone:', bill.customer_phone)
    }
  }

  if (bill.bill_type) {
    const formattedType = bill.bill_type.replace('_', ' ').toUpperCase()
    builder.twoColumn('Bill Type:', formattedType)
  }

  // 5. Items Table
  builder.divider('-')
  builder.bold(true)
  // Table Width Allocation (48 chars total): Item (24), Qty (6), Rate (8), Amount (10)
  builder.tableRow([
    { text: 'Item', width: 24, align: 'left' },
    { text: 'Qty', width: 6, align: 'right' },
    { text: 'Rate', width: 8, align: 'right' },
    { text: 'Amount', width: 10, align: 'right' },
  ])
  builder.bold(false)
  builder.divider('-')

  // Item Rows
  if (bill.items && bill.items.length > 0) {
    for (const item of bill.items) {
      const name = item.product_name || 'Water Can'
      const qtyStr = String(item.quantity)
      const rateStr = `Rs.${Number(item.rate).toFixed(0)}`
      const amtStr = `Rs.${Number(item.amount || item.quantity * item.rate).toFixed(0)}`

      // Auto-wrap long item names > 24 chars
      if (name.length > 24) {
        builder.line(name)
        builder.tableRow([
          { text: '', width: 24, align: 'left' },
          { text: qtyStr, width: 6, align: 'right' },
          { text: rateStr, width: 8, align: 'right' },
          { text: amtStr, width: 10, align: 'right' },
        ])
      } else {
        builder.tableRow([
          { text: name, width: 24, align: 'left' },
          { text: qtyStr, width: 6, align: 'right' },
          { text: rateStr, width: 8, align: 'right' },
          { text: amtStr, width: 10, align: 'right' },
        ])
      }
    }
  } else {
    builder.line('No items listed')
  }

  // 6. Totals Breakdown
  builder.divider('-')
  builder.twoColumn('Subtotal:', `Rs.${Number(bill.subtotal).toFixed(2)}`)
  if (bill.gst_amount > 0) {
    builder.twoColumn('GST Amount:', `Rs.${Number(bill.gst_amount).toFixed(2)}`)
  }
  if (bill.discount_amount && bill.discount_amount > 0) {
    builder.twoColumn('Discount:', `-Rs.${Number(bill.discount_amount).toFixed(2)}`)
  }

  builder.divider('=')
  builder.bold(true)
  builder.size('double_height')
  builder.twoColumn('GRAND TOTAL:', `Rs.${Number(bill.total_amount).toFixed(2)}`)
  builder.size('normal')
  builder.bold(false)
  builder.divider('=')

  // 7. Payment Status Breakdown
  const method = (bill.payment_method || 'cash').toUpperCase()
  builder.twoColumn('Payment Mode:', method)
  if (bill.cash_amount && bill.cash_amount > 0) {
    builder.twoColumn('Cash Paid:', `Rs.${Number(bill.cash_amount).toFixed(2)}`)
  }
  if (bill.upi_amount && bill.upi_amount > 0) {
    builder.twoColumn('UPI Paid:', `Rs.${Number(bill.upi_amount).toFixed(2)}`)
  }
  builder.twoColumn('Total Paid:', `Rs.${Number(bill.paid_amount).toFixed(2)}`)

  if (bill.due_amount > 0) {
    builder.bold(true)
    builder.twoColumn('BALANCE DUE:', `Rs.${Number(bill.due_amount).toFixed(2)}`)
    builder.bold(false)
  } else {
    builder.twoColumn('Payment Status:', 'PAID IN FULL')
  }

  if (bill.notes) {
    builder.divider('-')
    builder.line(`Notes: ${bill.notes}`)
  }

  // 8. Footer
  builder.divider('-')
  builder.align('center')
  builder.bold(true)
  builder.line('Thank You! Visit Again')
  builder.bold(false)
  builder.line('royalkissan@gmail.com')
  builder.feed(1)

  // 9. QR Code
  if (options.includeQr !== false) {
    builder.qrCode(bill.invoice_number, 6)
    builder.line(bill.invoice_number)
  }

  // 10. Cut paper
  if (cutPaper) {
    builder.cut('full')
  } else {
    builder.feed(4)
  }

  return builder.build()
}


