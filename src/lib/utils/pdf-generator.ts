import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface BillPDFResult {
  doc: jsPDF
  blob: Blob
  base64: string
  filename: string
}

/**
 * Draws the official Royal Kissan golden royal crown & emblem vector logo
 * Pure vector rendering in jsPDF: razor-sharp, zero-latency, zero-network-dependency
 */
function drawRoyalKissanLogo(doc: jsPDF, x: number, y: number) {
  // Outer golden crest circle
  doc.setFillColor(251, 191, 36) // Gold (#FBBF24)
  doc.circle(x + 10, y + 10, 10, 'F')

  // Inner deep-slate circle
  doc.setFillColor(24, 24, 27) // Dark Slate (#18181B)
  doc.circle(x + 10, y + 10, 8.8, 'F')

  // Golden Royal Crown Base
  doc.setFillColor(251, 191, 36)
  doc.rect(x + 5.5, y + 13, 9, 1.2, 'F')

  // Crown Peaks (3 regal triangular peaks)
  // Center Peak (tallest)
  doc.triangle(x + 7.5, y + 13, x + 12.5, y + 13, x + 10, y + 6.8, 'F')
  // Left Peak
  doc.triangle(x + 5.5, y + 13, x + 9.5, y + 13, x + 6.5, y + 8.2, 'F')
  // Right Peak
  doc.triangle(x + 10.5, y + 13, x + 14.5, y + 13, x + 13.5, y + 8.2, 'F')

  // Royal Jewels / Pearls (White accent circles atop crown peaks)
  doc.setFillColor(255, 255, 255)
  doc.circle(x + 10, y + 6.6, 0.55, 'F')
  doc.circle(x + 6.5, y + 8.0, 0.45, 'F')
  doc.circle(x + 13.5, y + 8.0, 0.45, 'F')

  // Golden Droplet / Monogram Emblem below crown
  doc.setFillColor(251, 191, 36)
  doc.circle(x + 10, y + 11.5, 0.8, 'F')
}

/**
 * Formats invoice date and time
 */
function formatInvoiceDateTime(dateStr?: string, timeStr?: string, createdAt?: string): string {
  let d = dateStr || ''
  let t = timeStr || ''

  if (createdAt) {
    try {
      const dt = new Date(createdAt)
      if (!isNaN(dt.getTime())) {
        if (!d) d = dt.toLocaleDateString('en-GB').replace(/\//g, '-')
        if (!t) t = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      }
    } catch {}
  }

  if (!d) d = new Date().toISOString().split('T')[0]
  if (!t) t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  return `${d} ${t}`
}

/**
 * Builds a standardized, professional Royal Kissan invoice document using jsPDF
 * Supports Customer, Counter, Route, and Dealer bills, including GST breakdown,
 * itemized purchase details, next-day returns/leakage reconciliation, and dues.
 */
export function buildBillPDFDoc(bill: any): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const invoiceNumber = bill.invoice_number || bill.bill_number || `RK-${bill.id ? String(bill.id).slice(0, 8).toUpperCase() : 'INV'}`
  const filename = `Royal_Kissan_Invoice_${invoiceNumber.replace(/[^\w-]/g, '_')}.pdf`

  const isDispatchNote = String(bill.bill_type || '').toUpperCase().includes('DISPATCH NOTE')
  const isDealer = !!(bill.dealer_name || bill.dealer_id || String(bill.bill_type || '').toLowerCase().includes('dealer'))
  const recipientName = bill.dealer_name || bill.customer_name || 'Valued Customer'
  const recipientPhone = bill.dealer_phone || bill.customer_phone || bill.phone || ''
  const recipientGstin = bill.dealer_gstin || bill.customer_gstin || bill.gst_number || ''
  const recipientAddress = bill.dealer_address || bill.customer_address || bill.address || ''
  const formattedDateTime = formatInvoiceDateTime(bill.date || bill.dispatch_date, bill.time || bill.invoice_time, bill.created_at)

  // 1. Header Box
  doc.setFillColor(24, 24, 27) // Dark Slate
  doc.rect(0, 0, 210, 36, 'F')

  // Draw Royal Kissan Gold Vector Crest Emblem Logo
  drawRoyalKissanLogo(doc, 12, 8)

  // Business Branding & Details
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(251, 191, 36) // Gold
  doc.text('ROYAL KISSAN PACKAGED DRINKING WATER', 36, 14)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(244, 244, 245)
  doc.text('PURE HYDRATION • PREMIUM QUALITY • ISI & FSSAI CERTIFIED', 36, 19)

  doc.setFontSize(7.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(212, 212, 216)
  doc.text('Plant & Office: Guntur Highway, Andhra Pradesh | Customer Support: +91 93476 62554', 36, 24)
  doc.text('GSTIN: 37BABS2021G1Z3 | FSSAI Lic: 10121000000000 | State: Andhra Pradesh (37)', 36, 29)

  // Invoice Title Pill
  const invoiceTypeTitle = isDispatchNote
    ? 'LOAD DISPATCH NOTE'
    : isDealer
    ? ((bill.is_gst_enabled || bill.gst_amount > 0 || bill.bill_type === 'gst_invoice') ? 'DEALER TAX INVOICE' : 'DEALER BILL')
    : (bill.bill_type === 'non_gst_invoice' ? 'RETAIL INVOICE' : 'TAX INVOICE')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(isDispatchNote ? 239 : 251, isDispatchNote ? 68 : 191, isDispatchNote ? 68 : 36)
  doc.text(invoiceTypeTitle, 196, 14, { align: 'right' })

  if (isDispatchNote) {
    doc.setFontSize(7.5)
    doc.setTextColor(248, 113, 113)
    doc.text('* NOT A FINAL SALES INVOICE *', 196, 19, { align: 'right' })
  }

  // 2. Customer / Dealer & Bill Details Box
  doc.setDrawColor(228, 228, 231)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(14, 40, 182, 34, 2, 2, 'FD')

  doc.setFontSize(8.5)
  doc.setTextColor(39, 39, 42)

  // Left Side: Billed To
  doc.setFont('helvetica', 'bold')
  doc.text(isDealer ? 'DEALER / RECIPIENT:' : 'BILLED TO (CUSTOMER):', 18, 46)
  doc.setFont('helvetica', 'normal')
  doc.text(`Name    : ${recipientName}`, 18, 51.5)
  if (recipientPhone) {
    doc.text(`Phone   : ${recipientPhone}`, 18, 56.5)
  }
  if (recipientGstin) {
    doc.setFont('helvetica', 'bold')
    doc.text(`GSTIN   : ${recipientGstin}`, 18, 61.5)
    doc.setFont('helvetica', 'normal')
  } else if (recipientAddress) {
    doc.text(`Address : ${recipientAddress.slice(0, 38)}`, 18, 61.5)
  }
  if (recipientGstin && recipientAddress) {
    doc.text(`Address : ${recipientAddress.slice(0, 38)}`, 18, 66.5)
  }

  // Right Side: Invoice Meta
  doc.setFont('helvetica', 'bold')
  doc.text(`Invoice No  : ${invoiceNumber}`, 120, 46)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date & Time : ${formattedDateTime}`, 120, 51.5)
  
  const paymentMethod = String(bill.payment_mode || bill.payment_method || 'CASH').toUpperCase()
  doc.text(`Payment     : ${paymentMethod}`, 120, 56.5)
  
  const paymentStatus = String(bill.payment_status || (Number(bill.due_amount) > 0 ? 'PARTIAL/DUE' : 'PAID')).toUpperCase()
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(paymentStatus.includes('PAID') ? 16 : 220, paymentStatus.includes('PAID') ? 185 : 38, paymentStatus.includes('PAID') ? 129 : 38)
  doc.text(`Status      : ${paymentStatus}`, 120, 61.5)
  doc.setTextColor(39, 39, 42)

  // 3. Items Table
  const rawItems = bill.items || bill.bill_items || [
    {
      product_name: bill.product_name || 'Packaged Drinking Water (20L Can)',
      description: bill.product_description || '',
      quantity: bill.quantity || 1,
      unit: bill.unit || 'can',
      rate: bill.rate || bill.total_amount || 0,
      item_discount: bill.discount_amount || 0,
      gst_rate: bill.gst_rate || 0,
      gst_amount: bill.gst_amount || 0,
      amount: bill.total_amount || 0,
    },
  ]

  const tableData = rawItems.map((item: any, idx: number) => {
    const name = item.product_name || item.name || 'Product'
    const desc = item.description || item.product_description || ''
    const itemTitle = desc ? `${name}\n${desc}` : name
    const qty = Number(item.quantity) || 1
    const unit = item.unit || 'pcs'
    const rate = Number(item.rate || item.unit_price) || 0
    const disc = Number(item.item_discount || item.discount) || 0
    const taxable = Number(item.taxable_amount || (qty * rate - disc))
    const gstRate = Number(item.gst_rate || bill.gst_percentage || (item.gst_amount > 0 && taxable > 0 ? ((item.gst_amount / taxable) * 100).toFixed(0) : 0))
    const gst = Number(item.gst_amount) || 0
    const total = Number(item.amount || item.total || (taxable + gst))

    const gstDisplay = gst > 0 ? `${gstRate > 0 ? `${gstRate}% ` : ''}(₹${gst.toFixed(2)})` : '0%'

    return [
      idx + 1,
      itemTitle,
      `${qty} ${unit}`,
      `₹${rate.toFixed(2)}`,
      disc > 0 ? `₹${disc.toFixed(2)}` : '-',
      gstDisplay,
      `₹${total.toFixed(2)}`,
    ]
  })

  autoTable(doc, {
    startY: 78,
    margin: { left: 14, right: 14 },
    head: [['#', 'Product & Description', 'Qty / Unit', 'Rate (₹)', 'Disc (₹)', 'GST % & Amt', 'Item Total (₹)']],
    body: tableData,
    headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.2 },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    styles: { fontSize: 8.2, cellPadding: 2.6 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 66 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
    },
  })

  let summaryY = (doc as any).lastAutoTable.finalY + 6

  // If table runs close to bottom, add page to keep financial & reconciliation clean
  if (summaryY + 55 > 275) {
    doc.addPage()
    summaryY = 16
  }

  // 4. Financial Calculations
  const subtotal = Number(bill.subtotal || bill.taxable_amount || bill.total_amount || 0)
  const discount = Number(bill.discount_amount || 0)
  const gstAmount = Number(bill.gst_amount || 0)
  const cgstAmount = Number(bill.cgst_amount || (bill.is_interstate ? 0 : gstAmount / 2))
  const sgstAmount = Number(bill.sgst_amount || (bill.is_interstate ? 0 : gstAmount / 2))
  const igstAmount = Number(bill.igst_amount || (bill.is_interstate ? gstAmount : 0))
  const returnCredit = Number(bill.return_credit || 0)
  const leakageCredit = Number(bill.leakage_credit || 0)
  const totalCredits = returnCredit + leakageCredit
  const grandTotal = Number(bill.grand_total || bill.total_amount || (subtotal - discount + gstAmount - totalCredits))
  const paidAmount = Number(bill.paid_amount || 0)
  const previousBalance = Number(bill.previous_balance || bill.opening_balance || bill.outstanding_balance || 0)
  const finalPayable = grandTotal + previousBalance
  const dueAmount = Number(bill.due_amount || Math.max(0, finalPayable - paidAmount))

  let leftBoxBottomY = summaryY

  // 5. Dealer Dispatch & Return Reconciliation Box (Rendered on Left Side)
  if (isDealer || returnCredit > 0 || leakageCredit > 0 || bill.today_dispatch_quantity) {
    const todayDispatchQty = bill.today_dispatch_quantity || rawItems.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0)
    const primaryUnit = rawItems[0]?.unit || 'Units'
    const returnedQty = bill.returned_quantity ?? bill.return_qty ?? 0
    const leakedQty = bill.leaked_quantity ?? bill.leakage_qty ?? 0
    const origRef = bill.original_dispatch_reference || bill.dispatch_reference || 'N/A'

    doc.setDrawColor(251, 191, 36)
    doc.setFillColor(254, 252, 232) // Warm Amber Tint
    doc.roundedRect(14, summaryY, 98, 42, 1.5, 1.5, 'FD')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 83, 9) // Amber-700
    doc.text('DEALER DISPATCH & RETURN RECONCILIATION', 18, summaryY + 5.5)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(55, 65, 81)
    doc.text(`Today's Dispatch Qty : ${todayDispatchQty} ${primaryUnit}`, 18, summaryY + 11)
    doc.text(`Original Dispatch Ref : ${origRef}`, 18, summaryY + 16)
    doc.text(`Prev. Returns Qty     : ${returnedQty} ${primaryUnit} (Credit: -₹${returnCredit.toFixed(2)})`, 18, summaryY + 21)
    doc.text(`Prev. Leakage Qty     : ${leakedQty} ${primaryUnit} (Credit: -₹${leakageCredit.toFixed(2)})`, 18, summaryY + 26)
    doc.text(`Total Credits Deducted: -₹${totalCredits.toFixed(2)}`, 18, summaryY + 31)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 83, 9)
    doc.text(`Net Dispatch Payable  : ₹${grandTotal.toFixed(2)}`, 18, summaryY + 37.5)

    leftBoxBottomY = summaryY + 44
  }

  // 6. Financial Breakdown (Rendered on Right Side)
  doc.setFontSize(8.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(39, 39, 42)

  let rightY = summaryY
  doc.text('Subtotal:', 125, rightY)
  doc.text(`₹${subtotal.toFixed(2)}`, 194, rightY, { align: 'right' })

  if (discount > 0) {
    rightY += 4.5
    doc.text('Discount:', 125, rightY)
    doc.text(`-₹${discount.toFixed(2)}`, 194, rightY, { align: 'right' })
  }

  if (gstAmount > 0) {
    if (igstAmount > 0) {
      rightY += 4.5
      doc.text('IGST (18%):', 125, rightY)
      doc.text(`₹${igstAmount.toFixed(2)}`, 194, rightY, { align: 'right' })
    } else {
      rightY += 4.5
      doc.text('CGST (9%):', 125, rightY)
      doc.text(`₹${cgstAmount.toFixed(2)}`, 194, rightY, { align: 'right' })
      rightY += 4.5
      doc.text('SGST (9%):', 125, rightY)
      doc.text(`₹${sgstAmount.toFixed(2)}`, 194, rightY, { align: 'right' })
    }
  }

  if (returnCredit > 0) {
    rightY += 4.5
    doc.text('Prev. Returns Credit:', 125, rightY)
    doc.text(`-₹${returnCredit.toFixed(2)}`, 194, rightY, { align: 'right' })
  }

  if (leakageCredit > 0) {
    rightY += 4.5
    doc.text('Prev. Leakage Credit:', 125, rightY)
    doc.text(`-₹${leakageCredit.toFixed(2)}`, 194, rightY, { align: 'right' })
  }

  rightY += 5
  doc.setDrawColor(24, 24, 27)
  doc.setLineWidth(0.3)
  doc.line(125, rightY - 1, 196, rightY - 1)

  // Grand Total Line
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(24, 24, 27)
  doc.text('GRAND TOTAL:', 125, rightY + 3.5)
  doc.text(`₹${grandTotal.toFixed(2)}`, 194, rightY + 3.5, { align: 'right' })

  rightY += 7.5
  doc.setFontSize(8.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(39, 39, 42)

  // Previous Balance (if any)
  if (previousBalance > 0) {
    doc.text('Previous Outstanding:', 125, rightY)
    doc.text(`₹${previousBalance.toFixed(2)}`, 194, rightY, { align: 'right' })
    rightY += 4.5
    doc.setFont('helvetica', 'bold')
    doc.text('FINAL PAYABLE:', 125, rightY)
    doc.text(`₹${finalPayable.toFixed(2)}`, 194, rightY, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    rightY += 4.5
  } else {
    doc.setFont('helvetica', 'bold')
    doc.text('FINAL PAYABLE:', 125, rightY)
    doc.text(`₹${finalPayable.toFixed(2)}`, 194, rightY, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    rightY += 4.5
  }

  // Amount Paid & Remaining Due
  doc.text('Amount Paid:', 125, rightY)
  doc.text(`₹${paidAmount.toFixed(2)}`, 194, rightY, { align: 'right' })

  rightY += 4.5
  doc.text('Payment Method:', 125, rightY)
  doc.text(paymentMethod, 194, rightY, { align: 'right' })

  rightY += 4.5
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(dueAmount > 0 ? 220 : 16, dueAmount > 0 ? 38 : 185, dueAmount > 0 ? 38 : 129)
  doc.text('Remaining Due:', 125, rightY)
  doc.text(`₹${dueAmount.toFixed(2)}`, 194, rightY, { align: 'right' })

  // 7. Terms & Conditions and Signatures Box
  const maxY = Math.max(leftBoxBottomY, rightY)
  let footerY = maxY + 8

  if (footerY + 28 > 285) {
    doc.addPage()
    footerY = 16
  } else {
    footerY = Math.max(footerY, 252)
  }

  doc.setFontSize(7.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(113, 113, 122)

  doc.setDrawColor(228, 228, 231)
  doc.line(14, footerY, 196, footerY)

  doc.text('Terms & Conditions:', 14, footerY + 4.5)
  doc.text('1. All sales are final. Empty water cans/crates must be returned in undamaged condition.', 14, footerY + 8.5)
  doc.text('2. Payments via UPI/Cash/Bank transfer must reference this Invoice Number.', 14, footerY + 12.5)
  doc.text('3. For support or queries, contact Royal Kissan ERP desk: +91 93476 62554.', 14, footerY + 16.5)

  // Authorised Signatory Box
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(39, 39, 42)
  doc.text('For ROYAL KISSAN PACKAGED DRINKING WATER', 120, footerY + 4.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Authorised Signatory / Billing Officer', 130, footerY + 18)

  return { doc, filename }
}

/**
 * Downloads the PDF directly to the browser (backward compatible)
 */
export function generateBillPDF(bill: any) {
  const { doc, filename } = buildBillPDFDoc(bill)
  doc.save(filename)
}

/**
 * Generates the PDF and returns its Blob and base64 string for WhatsApp document attachment
 */
export function generateBillPDFBlob(bill: any): BillPDFResult {
  const { doc, filename } = buildBillPDFDoc(bill)
  const blob = doc.output('blob')
  const dataUri = doc.output('datauristring')
  const base64 = dataUri.split(',')[1] || ''

  return {
    doc,
    blob,
    base64,
    filename
  }
}
