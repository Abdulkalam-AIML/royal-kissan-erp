import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateBillPDF(bill: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Header Box
  doc.setFillColor(24, 24, 27)
  doc.rect(0, 0, 210, 32, 'F')

  // Business Branding
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(251, 191, 36) // Gold
  doc.text('ROYAL KISSAN PACKAGED DRINKING WATER', 14, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(212, 212, 216)
  doc.text('Plant & Office: Guntur Highway, Andhra Pradesh | Ph: +91 93476 62554', 14, 22)
  doc.text('GSTIN: 37BABS2021G1Z3 | FSSAI Lic: 10121000000000', 14, 27)

  // Invoice Title Pill
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text((bill.bill_type === 'non_gst_invoice' ? 'RETAIL INVOICE' : 'TAX INVOICE').toUpperCase(), 150, 16)

  // Customer & Bill Details Box
  doc.setDrawColor(228, 228, 231)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(14, 38, 182, 30, 2, 2, 'FD')

  doc.setFontSize(10)
  doc.setTextColor(39, 39, 42)

  // Left Side: Billed To
  doc.setFont('helvetica', 'bold')
  doc.text('BILLED TO:', 18, 45)
  doc.setFont('helvetica', 'normal')
  doc.text(`Customer: ${bill.customer_name || 'Walk-in Customer'}`, 18, 51)
  if (bill.customer_phone) doc.text(`Phone   : ${bill.customer_phone}`, 18, 56)
  if (bill.customer_gstin) doc.text(`GSTIN   : ${bill.customer_gstin}`, 18, 61)
  if (bill.customer_address) doc.text(`Address : ${bill.customer_address}`, 18, 66)

  // Right Side: Invoice Meta
  doc.setFont('helvetica', 'bold')
  doc.text(`Invoice No : ${bill.invoice_number || 'RK-2026-001'}`, 125, 45)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date       : ${bill.date || new Date().toISOString().split('T')[0]}`, 125, 51)
  doc.text(`Payment    : ${(bill.payment_mode || 'cash').toUpperCase()}`, 125, 56)
  doc.text(`Status     : ${(bill.payment_status || 'paid').toUpperCase()}`, 125, 61)

  // Items Table
  const tableItems = bill.items || [
    {
      product_name: bill.product_name || 'Water Can (20L)',
      quantity: bill.quantity || 1,
      rate: bill.rate || bill.total_amount || 0,
      item_discount: bill.discount_amount || 0,
      gst_amount: bill.gst_amount || 0,
      amount: bill.total_amount || 0,
    },
  ]

  const tableData = tableItems.map((item: any, idx: number) => {
    const qty = Number(item.quantity) || 1
    const rate = Number(item.rate) || 0
    const disc = Number(item.item_discount) || 0
    const gst = Number(item.gst_amount) || 0
    const total = Number(item.amount || (qty * rate - disc + gst))

    return [
      idx + 1,
      item.product_name,
      qty,
      `₹${rate.toFixed(2)}`,
      disc > 0 ? `₹${disc.toFixed(2)}` : '-',
      gst > 0 ? `₹${gst.toFixed(2)}` : 'Non-GST',
      `₹${total.toFixed(2)}`,
    ]
  })

  autoTable(doc, {
    startY: 74,
    head: [['#', 'Item Description', 'Qty', 'Unit Rate', 'Discount', 'GST', 'Total Amount']],
    body: tableData,
    headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 26, halign: 'right' },
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 8

  // Financial Breakdown (Subtotal, GST, Discounts, Grand Total)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  doc.text(`Subtotal Amount:`, 130, finalY)
  doc.text(`₹${Number(bill.subtotal || bill.total_amount).toFixed(2)}`, 185, finalY, { align: 'right' })

  let currentY = finalY
  if (bill.discount_amount && Number(bill.discount_amount) > 0) {
    currentY += 5
    doc.text(`Invoice Discount:`, 130, currentY)
    doc.text(`-₹${Number(bill.discount_amount).toFixed(2)}`, 185, currentY, { align: 'right' })
  }

  if (bill.gst_amount && Number(bill.gst_amount) > 0) {
    currentY += 5
    const cgst = Number(bill.cgst_amount || bill.gst_amount / 2).toFixed(2)
    const sgst = Number(bill.sgst_amount || bill.gst_amount / 2).toFixed(2)
    doc.text(`CGST (9%):`, 130, currentY)
    doc.text(`₹${cgst}`, 185, currentY, { align: 'right' })
    currentY += 5
    doc.text(`SGST (9%):`, 130, currentY)
    doc.text(`₹${sgst}`, 185, currentY, { align: 'right' })
  }

  currentY += 6
  doc.setDrawColor(24, 24, 27)
  doc.setLineWidth(0.4)
  doc.line(130, currentY - 2, 196, currentY - 2)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(220, 38, 38)
  doc.text(`GRAND TOTAL:`, 130, currentY + 3)
  doc.text(`₹${Number(bill.grand_total || bill.total_amount).toFixed(2)}`, 185, currentY + 3, { align: 'right' })

  // Footer: Terms & Signature Box
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(113, 113, 122)

  const footerY = 250
  doc.line(14, footerY, 196, footerY)

  doc.text('Terms & Conditions:', 14, footerY + 5)
  doc.text('1. All sales are final. Empty water cans must be returned in good condition.', 14, footerY + 9)
  doc.text('2. Goods once sold will not be taken back or refunded.', 14, footerY + 13)

  // Authorised Signatory Box
  doc.text('For ROYAL KISSAN PACKAGED DRINKING WATER', 130, footerY + 5)
  doc.text('Authorised Signatory', 145, footerY + 22)

  doc.save(`${bill.invoice_number || 'Royal_Kissan_Invoice'}.pdf`)
}
