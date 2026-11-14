import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface BillPDFResult {
  doc: jsPDF
  blob: Blob
  base64: string
  filename: string
}

/**
 * Builds a standardized, professional Royal Kissan invoice document using jsPDF
 * Supports Customer, Counter, Route, and Dealer bills, including GST breakdown and dues.
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
  const isDealer = bill.dealer_name || bill.dealer_id || String(bill.bill_type || '').includes('dealer')
  const recipientName = bill.dealer_name || bill.customer_name || 'Valued Customer'
  const recipientPhone = bill.dealer_phone || bill.customer_phone || ''
  const recipientGstin = bill.dealer_gstin || bill.customer_gstin || ''
  const recipientAddress = bill.dealer_address || bill.customer_address || ''

  // 1. Header Box
  doc.setFillColor(24, 24, 27) // Dark Slate
  doc.rect(0, 0, 210, 34, 'F')

  // Business Branding
  doc.setFontSize(17)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(251, 191, 36) // Gold
  doc.text('ROYAL KISSAN PACKAGED DRINKING WATER', 14, 13)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(212, 212, 216)
  doc.text('Plant & Office: Guntur Highway, Andhra Pradesh | Customer Support: +91 93476 62554', 14, 20)
  doc.text('GSTIN: 37BABS2021G1Z3 | FSSAI Lic: 10121000000000 | State: Andhra Pradesh (37)', 14, 26)

  // Invoice Title Pill
  const invoiceTypeTitle = isDispatchNote
    ? 'LOAD DISPATCH NOTE'
    : isDealer
    ? ((bill.is_gst_enabled || bill.gst_amount > 0 || bill.bill_type === 'gst_invoice') ? 'DEALER TAX INVOICE' : 'DEALER BILL')
    : (bill.bill_type === 'non_gst_invoice' ? 'RETAIL INVOICE' : 'TAX INVOICE')

  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(isDispatchNote ? 239 : 251, isDispatchNote ? 68 : 191, isDispatchNote ? 68 : 36)
  doc.text(invoiceTypeTitle, 196, 13, { align: 'right' })

  if (isDispatchNote) {
    doc.setFontSize(7.5)
    doc.setTextColor(248, 113, 113)
    doc.text('* NOT A FINAL SALES INVOICE *', 196, 18, { align: 'right' })
  }

  // 2. Customer / Dealer & Bill Details Box
  doc.setDrawColor(228, 228, 231)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(14, 38, 182, 34, 2, 2, 'FD')

  doc.setFontSize(9)
  doc.setTextColor(39, 39, 42)

  // Left Side: Billed To
  doc.setFont('helvetica', 'bold')
  doc.text(isDealer ? 'DEALER / RECIPIENT:' : 'BILLED TO (CUSTOMER):', 18, 44)
  doc.setFont('helvetica', 'normal')
  doc.text(`Name    : ${recipientName}`, 18, 50)
  if (recipientPhone) doc.text(`Phone   : ${recipientPhone}`, 18, 55)
  if (recipientGstin) {
    doc.setFont('helvetica', 'bold')
    doc.text(`GSTIN   : ${recipientGstin}`, 18, 60)
    doc.setFont('helvetica', 'normal')
  } else if (recipientAddress) {
    doc.text(`Address : ${recipientAddress.slice(0, 36)}`, 18, 60)
  }
  if (recipientGstin && recipientAddress) {
    doc.text(`Address : ${recipientAddress.slice(0, 36)}`, 18, 65)
  }

  // Right Side: Invoice Meta
  doc.setFont('helvetica', 'bold')
  doc.text(`Invoice No : ${invoiceNumber}`, 125, 44)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date       : ${bill.date || bill.dispatch_date || new Date().toISOString().split('T')[0]}`, 125, 50)
  doc.text(`Payment    : ${String(bill.payment_mode || 'cash').toUpperCase()}`, 125, 55)
  
  const paymentStatus = String(bill.payment_status || (Number(bill.due_amount) > 0 ? 'PARTIAL/DUE' : 'PAID')).toUpperCase()
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(paymentStatus.includes('PAID') ? 16 : 220, paymentStatus.includes('PAID') ? 185 : 38, paymentStatus.includes('PAID') ? 129 : 38)
  doc.text(`Status     : ${paymentStatus}`, 125, 60)
  doc.setTextColor(39, 39, 42)

  // 3. Items Table
  const rawItems = bill.items || [
    {
      product_name: bill.product_name || 'Packaged Drinking Water (20L Can)',
      quantity: bill.quantity || 1,
      unit: bill.unit || 'can',
      rate: bill.rate || bill.total_amount || 0,
      item_discount: bill.discount_amount || 0,
      gst_amount: bill.gst_amount || 0,
      amount: bill.total_amount || 0,
    },
  ]

  const tableData = rawItems.map((item: any, idx: number) => {
    const qty = Number(item.quantity) || 1
    const unit = item.unit || 'pcs'
    const rate = Number(item.rate || item.unit_price) || 0
    const disc = Number(item.item_discount || item.discount) || 0
    const gst = Number(item.gst_amount) || 0
    const total = Number(item.amount || (qty * rate - disc + gst))

    return [
      idx + 1,
      item.product_name,
      `${qty} ${unit}`,
      `₹${rate.toFixed(2)}`,
      disc > 0 ? `₹${disc.toFixed(2)}` : '-',
      gst > 0 ? `₹${gst.toFixed(2)}` : '0%',
      `₹${total.toFixed(2)}`,
    ]
  })

  autoTable(doc, {
    startY: 76,
    margin: { left: 14, right: 14 },
    head: [['#', 'Item Description', 'Qty / Unit', 'Rate (₹)', 'Disc (₹)', 'GST (₹)', 'Total (₹)']],
    body: tableData,
    headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    styles: { fontSize: 8.5, cellPadding: 2.8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 68 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 6

  // 4. Financial Breakdown
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')

  const subtotal = Number(bill.subtotal || bill.taxable_amount || bill.total_amount || 0)
  const discount = Number(bill.discount_amount || 0)
  const gstAmount = Number(bill.gst_amount || 0)
  const cgstAmount = Number(bill.cgst_amount || (bill.is_interstate ? 0 : gstAmount / 2))
  const sgstAmount = Number(bill.sgst_amount || (bill.is_interstate ? 0 : gstAmount / 2))
  const igstAmount = Number(bill.igst_amount || (bill.is_interstate ? gstAmount : 0))
  const grandTotal = Number(bill.grand_total || bill.total_amount || (subtotal - discount + gstAmount))
  const paidAmount = Number(bill.paid_amount || 0)
  const dueAmount = Number(bill.due_amount || Math.max(0, grandTotal - paidAmount))
  const previousBalance = Number(bill.previous_balance || bill.opening_balance || bill.outstanding_balance || 0)

  let summaryY = finalY
  doc.text('Subtotal:', 130, summaryY)
  doc.text(`₹${subtotal.toFixed(2)}`, 194, summaryY, { align: 'right' })

  if (discount > 0) {
    summaryY += 4.5
    doc.text('Discount:', 130, summaryY)
    doc.text(`-₹${discount.toFixed(2)}`, 194, summaryY, { align: 'right' })
  }

  if (gstAmount > 0) {
    if (igstAmount > 0) {
      summaryY += 4.5
      doc.text('IGST (18%):', 130, summaryY)
      doc.text(`₹${igstAmount.toFixed(2)}`, 194, summaryY, { align: 'right' })
    } else {
      summaryY += 4.5
      doc.text('CGST (9%):', 130, summaryY)
      doc.text(`₹${cgstAmount.toFixed(2)}`, 194, summaryY, { align: 'right' })
      summaryY += 4.5
      doc.text('SGST (9%):', 130, summaryY)
      doc.text(`₹${sgstAmount.toFixed(2)}`, 194, summaryY, { align: 'right' })
    }
  }

  summaryY += 5
  doc.setDrawColor(24, 24, 27)
  doc.setLineWidth(0.3)
  doc.line(130, summaryY - 1, 196, summaryY - 1)

  // Grand Total Line
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(24, 24, 27)
  doc.text('GRAND TOTAL:', 130, summaryY + 3.5)
  doc.text(`₹${grandTotal.toFixed(2)}`, 194, summaryY + 3.5, { align: 'right' })

  summaryY += 8
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(39, 39, 42)

  // Previous Balance (if any)
  if (previousBalance > 0) {
    doc.text('Previous Outstanding:', 130, summaryY)
    doc.text(`₹${previousBalance.toFixed(2)}`, 194, summaryY, { align: 'right' })
    summaryY += 4.5
    doc.setFont('helvetica', 'bold')
    doc.text('Total Account Payable:', 130, summaryY)
    doc.text(`₹${(grandTotal + previousBalance).toFixed(2)}`, 194, summaryY, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    summaryY += 4.5
  }

  // Amount Paid & Remaining Due
  doc.text('Amount Paid:', 130, summaryY)
  doc.text(`₹${paidAmount.toFixed(2)}`, 194, summaryY, { align: 'right' })

  summaryY += 4.5
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(dueAmount > 0 ? 220 : 16, dueAmount > 0 ? 38 : 185, dueAmount > 0 ? 38 : 129)
  doc.text('Remaining Due:', 130, summaryY)
  doc.text(`₹${dueAmount.toFixed(2)}`, 194, summaryY, { align: 'right' })

  // 5. Terms & Signatures Box
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(113, 113, 122)

  const footerY = 254
  doc.setDrawColor(228, 228, 231)
  doc.line(14, footerY, 196, footerY)

  doc.text('Terms & Conditions:', 14, footerY + 5)
  doc.text('1. All sales are final. Empty water cans/crates must be returned in undamaged condition.', 14, footerY + 9)
  doc.text('2. Payments via UPI/Cash/Bank transfer must reference this Invoice Number.', 14, footerY + 13)
  doc.text('3. For support or queries, contact Royal Kissan ERP desk: +91 93476 62554.', 14, footerY + 17)

  // Authorised Signatory Box
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(39, 39, 42)
  doc.text('For ROYAL KISSAN PACKAGED DRINKING WATER', 125, footerY + 5)
  doc.setFont('helvetica', 'normal')
  doc.text('Authorised Signatory / Billing Officer', 135, footerY + 20)

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
