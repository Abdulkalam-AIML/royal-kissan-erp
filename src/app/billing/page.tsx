'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type BillType = 'driver_sale' | 'company_sale' | 'dealer_invoice' | 'gst_invoice' | 'non_gst_invoice'
type PaymentMode = 'cash' | 'upi' | 'due' | 'mixed'

interface SaleItem {
  id: string
  product_name: string
  product_id: string
  quantity: number
  rate: number
  gst_rate: number
  amount: number
  gst_amount: number
  total: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (num === 0) return 'Zero Rupees Only'

  function convert(n: number): string {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }

  const integer = Math.floor(num)
  const decimal = Math.round((num - integer) * 100)
  let result = convert(integer) + ' Rupees'
  if (decimal > 0) result += ' and ' + convert(decimal) + ' Paise'
  return result + ' Only'
}

const PRODUCTS = [
  { id: 'p1', name: 'Water Can (20L)',    rate: 15,  gst_rate: 18, category: 'can'    },
  { id: 'p2', name: 'Cooling Can (20L)',  rate: 30,  gst_rate: 18, category: 'can'    },
  { id: 'p3', name: 'Water Packets',      rate: 0,   gst_rate: 12, category: 'packet' },
  { id: 'p4', name: '500ml Bottle Case', rate: 140, gst_rate: 18, category: 'bottle' },
  { id: 'p5', name: '250ml Bottle Case', rate: 150, gst_rate: 18, category: 'bottle' },
  { id: 'p6', name: '1L Bottle Case',    rate: 120, gst_rate: 18, category: 'bottle' },
  { id: 'p7', name: '2L Bottle Case',    rate: 150, gst_rate: 18, category: 'bottle' },
]

const INVOICE_TYPE_LABELS: Record<BillType, string> = {
  driver_sale:    '🚛 Driver Sales',
  company_sale:   '🏢 Company Sale',
  dealer_invoice: '🤝 Dealer Invoice',
  gst_invoice:    '📋 GST Invoice',
  non_gst_invoice:'📄 Non-GST Invoice',
}

export default function BillingPage() {
  const [billType, setBillType] = useState<BillType>('company_sale')
  const [isGst, setIsGst] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [shippedTo, setShippedTo] = useState('')
  const [customerGst, setCustomerGst] = useState('')
  const [items, setItems] = useState<SaleItem[]>([])
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
  const [paidAmount, setPaidAmount] = useState(0)
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    const d = new Date()
    return `RK-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`
  })
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [savedSale, setSavedSale] = useState<any>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // When billType changes, auto-set GST toggle
  useEffect(() => {
    setIsGst(billType !== 'non_gst_invoice')
  }, [billType])

  // Totals
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const totalGst = items.reduce((sum, item) => sum + item.gst_amount, 0)
  const totalAmount = subtotal + totalGst
  const dueAmount = totalAmount - paidAmount

  // Sync paid amount for non-mixed payments
  useEffect(() => {
    if (paymentMode === 'cash' || paymentMode === 'upi') {
      setPaidAmount(totalAmount)
    } else if (paymentMode === 'due') {
      setPaidAmount(0)
    }
  }, [totalAmount, paymentMode])

  function addItem() {
    const newItem: SaleItem = {
      id: Date.now().toString() + Math.random(),
      product_id: PRODUCTS[0].id,
      product_name: PRODUCTS[0].name,
      quantity: 1,
      rate: PRODUCTS[0].rate,
      gst_rate: PRODUCTS[0].gst_rate,
      amount: PRODUCTS[0].rate,
      gst_amount: isGst ? (PRODUCTS[0].rate * PRODUCTS[0].gst_rate) / 100 : 0,
      total: isGst ? PRODUCTS[0].rate + (PRODUCTS[0].rate * PRODUCTS[0].gst_rate) / 100 : PRODUCTS[0].rate,
    }
    setItems([...items, newItem])
  }

  function updateItem(id: string, field: string, value: string | number) {
    setItems(items.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }

      if (field === 'product_id') {
        const product = PRODUCTS.find(p => p.id === value)
        if (product) {
          updated.product_name = product.name
          updated.rate = product.rate
          updated.gst_rate = product.gst_rate
        }
      }

      // Recalculate
      const amount = updated.quantity * updated.rate
      const gstAmount = isGst ? (amount * updated.gst_rate) / 100 : 0
      return { ...updated, amount, gst_amount: gstAmount, total: amount + gstAmount }
    }))
  }

  function removeItem(id: string) {
    setItems(items.filter(item => item.id !== id))
  }

  async function saveBill() {
    if (!customerName || items.length === 0) {
      alert('Please fill customer name and add at least one item')
      return
    }

    setSaving(true)
    try {
      // Resolve dealer_id and driver_id in the background based on names entered
      let dealerId = null
      if (billType === 'dealer_invoice') {
        const { data: dData } = await supabase
          .from('dealers')
          .select('id')
          .ilike('name', `%${customerName}%`)
          .limit(1)
          .maybeSingle()
        dealerId = dData?.id || null
      }

      let driverId = null
      let routeId = null
      if (billType === 'driver_sale') {
        // Find Nagaraju or Mallaya
        const { data: drData } = await supabase
          .from('drivers')
          .select('id')
          .ilike('name', '%Nagaraju%')
          .limit(1)
          .maybeSingle()
        driverId = drData?.id || null

        // Default route match
        const { data: rtData } = await supabase
          .from('routes')
          .select('id')
          .ilike('name', '%Local%')
          .limit(1)
          .maybeSingle()
        routeId = rtData?.id || null
      }

      const payload = {
        invoice_number: invoiceNumber,
        bill_type: billType,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        dealer_id: dealerId,
        driver_id: driverId,
        route_id: routeId,
        subtotal: subtotal,
        gst_amount: totalGst,
        total_amount: totalAmount,
        payment_method: paymentMode,
        due_amount: dueAmount,
        date: date
      }

      console.log("Payload:", payload)

      const { data: bill, error } = await supabase
        .from('bills')
        .insert(payload)
        .select()
        .single()

      console.log("Supabase Response:", bill)
      console.log("Supabase Error:", error)

      if (error) {
        console.error("Full Error:", JSON.stringify(error, null, 2));
        console.error("Message:", error?.message);
        console.error("Details:", error?.details);
        console.error("Hint:", error?.hint);
        console.error("Code:", error?.code);
        throw error
      }

      if (bill) {
        const { error: itemsErr } = await supabase.from('bill_items').insert(
          items.map(item => ({
            bill_id: bill.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            gst_rate: item.gst_rate,
            gst_amount: item.gst_amount,
            total: item.total
          }))
        )

        if (itemsErr) {
          console.error("Items Insert Error:", itemsErr)
        }

        setSavedSale(bill)
        setShowPrint(true)
      }
    } catch (err: any) {
      console.error(err)
      console.error(JSON.stringify(err, null, 2))
      console.error(err?.message)
      console.error(err?.details)
      console.error(err?.hint)
      console.error(err?.code)
      alert(`Error saving bill: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setSaving(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function newBill() {
    setCustomerName('')
    setCustomerPhone('')
    setCustomerAddress('')
    setCustomerGst('')
    setShippedTo('')
    setItems([])
    setPaymentMode('cash')
    setPaidAmount(0)
    setNotes('')
    const d = new Date()
    setInvoiceNumber(`RK-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`)
    setShowPrint(false)
    setSavedSale(null)
  }

  if (showPrint && savedSale) {
    const isThermal = billType !== 'gst_invoice'
    return (
      <div className="animate-fade-in" style={{ padding: '0.25rem' }}>
        <div className="no-print page-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h2 className="page-title">✅ Bill Registered Successfully</h2>
            <p className="page-subtitle">Invoice #{invoiceNumber} has been logged in database</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handlePrint} className="btn btn-primary">
              🖨️ Print Invoice / Receipt
            </button>
            <button onClick={newBill} className="btn btn-secondary">
              ➕ Generate New Bill
            </button>
          </div>
        </div>

        {/* Invoice Printing View */}
        <div 
          ref={printRef} 
          className={!isThermal ? 'invoice-container' : 'thermal-bill'}
          style={{
            background: 'white',
            color: 'black',
            padding: !isThermal ? '20mm 15mm' : '4mm',
            maxWidth: !isThermal ? '210mm' : '58mm',
            margin: '0 auto',
            fontFamily: !isThermal ? 'Arial, sans-serif' : 'monospace',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            borderRadius: !isThermal ? '0.5rem' : '0'
          }}
        >
          {!isThermal ? (
            // Professional A4 Tax Invoice
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1e3a8a', paddingBottom: '6mm', marginBottom: '6mm' }}>
                <div>
                  <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#1e3a8a', margin: 0, letterSpacing: '-1px' }}>
                    ROYAL KISSAN
                  </h1>
                  <p style={{ fontSize: '11px', color: '#4b5563', margin: '2px 0 0', fontWeight: '700' }}>PACKAGED DRINKING WATER</p>
                  <p style={{ fontSize: '10px', color: '#6b7280', margin: '6px 0 2px' }}>GSTIN: 37BABS2021G1Z3</p>
                  <p style={{ fontSize: '10px', color: '#6b7280', margin: '2px 0' }}>📍 Guntur Highway Road, Guntur, AP</p>
                  <p style={{ fontSize: '10px', color: '#6b7280', margin: '2px 0' }}>📞 Phone: +91 81849 18757</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ background: '#1e3a8a', color: 'white', padding: '6px 16px', borderRadius: '6px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>TAX INVOICE</div>
                  </div>
                  <p style={{ fontSize: '11px', margin: '4px 0' }}>Invoice No: <strong>{invoiceNumber}</strong></p>
                  <p style={{ fontSize: '11px', margin: '4px 0' }}>Date: {new Date(date).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8mm', marginBottom: '8mm' }}>
                <div style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#1e3a8a', margin: '0 0 6px', textTransform: 'uppercase' }}>Billed To</p>
                  <p style={{ fontWeight: '800', fontSize: '14px', margin: '0 0 4px', color: '#111827' }}>{customerName || 'Walk-In Customer'}</p>
                  {customerAddress && <p style={{ fontSize: '11px', color: '#374151', margin: '2px 0' }}>{customerAddress}</p>}
                  {customerPhone && <p style={{ fontSize: '11px', color: '#374151', margin: '2px 0' }}>📞 {customerPhone}</p>}
                  {customerGst && <p style={{ fontSize: '11px', color: '#374151', margin: '2px 0', fontWeight: '600' }}>GSTIN: {customerGst}</p>}
                </div>
                <div style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#1e3a8a', margin: '0 0 6px', textTransform: 'uppercase' }}>Shipped To</p>
                  <p style={{ fontWeight: '800', fontSize: '14px', margin: '0 0 4px', color: '#111827' }}>{customerName || 'Walk-In Customer'}</p>
                  <p style={{ fontSize: '11px', color: '#374151', margin: '2px 0' }}>{shippedTo || customerAddress || 'Same as Billing Address'}</p>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '8mm' }}>
                <thead>
                  <tr style={{ background: '#1e3a8a', color: 'white' }}>
                    <th style={{ padding: '10px', textAlign: 'left', width: '5%' }}>#</th>
                    <th style={{ padding: '10px', textAlign: 'left', width: '40%' }}>Product Description</th>
                    <th style={{ padding: '10px', textAlign: 'center', width: '10%' }}>Qty</th>
                    <th style={{ padding: '10px', textAlign: 'right', width: '15%' }}>Rate</th>
                    {isGst && <th style={{ padding: '10px', textAlign: 'right', width: '10%' }}>GST</th>}
                    <th style={{ padding: '10px', textAlign: 'right', width: '20%' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={{ padding: '9px 10px' }}>{i + 1}</td>
                      <td style={{ padding: '9px 10px', fontWeight: '700', color: '#1f2937' }}>{item.product_name}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>₹{item.rate.toFixed(2)}</td>
                      {isGst && <td style={{ padding: '9px 10px', textAlign: 'right' }}>{item.gst_rate}%</td>
                      }
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '700', color: '#111827' }}>₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ padding: '10px 14px', background: '#f3f4f6', borderRadius: '8px', fontSize: '11px', width: '55%' }}>
                  <p style={{ margin: '0 0 4px' }}><strong>Amount in Words:</strong></p>
                  <p style={{ margin: 0, fontWeight: '700', color: '#1e3a8a' }}>{numberToWords(totalAmount)}</p>
                  {notes && <p style={{ margin: '8px 0 0', color: '#4b5563' }}><strong>Notes:</strong> {notes}</p>}
                </div>
                <div style={{ width: '240px' }}>
                  {[
                    { label: 'Subtotal', value: `₹${subtotal.toFixed(2)}` },
                    ...(isGst ? [
                      { label: 'CGST (9%)', value: `₹${(totalGst / 2).toFixed(2)}` },
                      { label: 'SGST (9%)', value: `₹${(totalGst / 2).toFixed(2)}` }
                    ] : [])
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px' }}>
                      <span style={{ color: '#4b5563' }}>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #1e3a8a', marginTop: '6px', fontSize: '15px', fontWeight: '900', color: '#1e3a8a' }}>
                    <span>GRAND TOTAL</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px', borderTop: '1px dashed #ccc', marginTop: '4px' }}>
                    <span style={{ color: '#059669' }}>Paid Amount</span>
                    <span style={{ color: '#059669', fontWeight: '700' }}>₹{paidAmount.toFixed(2)}</span>
                  </div>
                  {dueAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px', color: '#dc2626' }}>
                      <span>Outstanding Due</span>
                      <span style={{ fontWeight: '700' }}>₹{dueAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15mm', paddingTop: '6mm', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                  <p style={{ margin: '0 0 2px' }}>This is an official computer generated tax invoice.</p>
                  <p style={{ margin: 0 }}>Please review invoice balances on delivery.</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ height: '14mm' }}></div>
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: 0 }}>Authorized Representative</p>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: '#1e3a8a', margin: '2px 0 0' }}>Royal Kissan Drinking Water</p>
                </div>
              </div>
            </div>
          ) : (
            // Thermal Delivery Bill
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
                <div style={{ fontWeight: '900', fontSize: '14px', letterSpacing: '0.5px' }}>ROYAL KISSAN</div>
                <div style={{ fontSize: '10px', margin: '2px 0' }}>Packaged Drinking Water</div>
                <div style={{ fontSize: '9px' }}>Ph: 81849 18757</div>
              </div>
              <div style={{ marginBottom: '6px', lineHeight: 1.3 }}>
                <div>Bill No: {invoiceNumber}</div>
                <div>Date: {new Date(date).toLocaleDateString('en-IN')}</div>
                <div>Cust: {customerName}</div>
              </div>
              <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', margin: '4px 0' }}>
                {items.map((item) => (
                  <div key={item.id} style={{ marginBottom: '4px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700' }}>{item.product_name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span>{item.quantity} pcs x ₹{item.rate}</span>
                      <span>₹{item.total.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '12px', padding: '2px 0' }}>
                <span>TOTAL AMOUNT:</span>
                <span>₹{totalAmount.toFixed(0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span>Paid ({paymentMode.toUpperCase()}):</span>
                <span>₹{paidAmount.toFixed(0)}</span>
              </div>
              {dueAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '11px', color: '#000', marginTop: '2px' }}>
                  <span>OUTSTANDING DUE:</span>
                  <span>₹{dueAmount.toFixed(0)}</span>
                </div>
              )}
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '9px', borderTop: '1px dashed #000', paddingTop: '6px' }}>
                Thank You for Your Patronage!
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ padding: '0.25rem' }}>
      
      {/* PAGE HEADER */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">🧾 Smart Invoicing Ledger</h2>
          <p className="page-subtitle">Configure invoice structures, select split payments, and print templates</p>
        </div>
        <a href="/sales" className="btn btn-secondary">
          📋 Invoice Sales Logs →
        </a>
      </div>

      {/* DUAL-PANEL EDITOR LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        
        {/* LEFT COLUMN: CUSTOMER AND BILLING DETAILS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Bill Info Card */}
          <div className="glass-card-3d" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>📋 Billing Configuration</h3>
            
            {/* Invoice Types Grid */}
            <div className="form-group">
              <label className="form-label">Invoice Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                {(Object.entries(INVOICE_TYPE_LABELS) as [BillType, string][]).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBillType(type)}
                    className={billType === type ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                    style={{ fontSize: '0.75rem', borderRadius: '0.5rem', fontWeight: '700' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* GST Indicator Switch */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '1rem', 
              background: isGst ? 'rgba(52, 211, 153, 0.05)' : 'rgba(255,255,255,0.02)', 
              borderRadius: '0.75rem', 
              border: `1px solid ${isGst ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)'}`,
              marginBottom: '1.25rem'
            }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.875rem', color: '#fff' }}>GST Tax Toggle</div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', marginTop: '0.125rem' }}>
                  {isGst ? 'Auto-calculating 18% CGST & SGST' : 'GST billing excluded'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGst(!isGst)}
                className="btn btn-sm"
                style={{ 
                  borderRadius: '99px',
                  background: isGst ? '#10b981' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  padding: '0.375rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: '800'
                }}
              >
                {isGst ? '✅ GST ACTIVE' : '⭕ EXEMPTED'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Invoice Number</label>
                <input className="form-input" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Billing Date</label>
                <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Customer details card */}
          <div className="glass-card-3d" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>👤 Customer Information</h3>
            
            <div className="form-group">
              <label className="form-label">Billed To (Customer Name) *</label>
              <input className="form-input" placeholder="Business Name or Walk-in Customer" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Customer Mobile</label>
                <input className="form-input" placeholder="10-digit phone number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              {isGst && (
                <div className="form-group">
                  <label className="form-label">Customer GSTIN</label>
                  <input className="form-input" placeholder="15-digit GSTIN number" value={customerGst} onChange={e => setCustomerGst(e.target.value)} />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: 0 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Billing Address</label>
                <input className="form-input" placeholder="Registered office address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Shipped To Address</label>
                <input className="form-input" placeholder="Delivery site address" value={shippedTo} onChange={e => setShippedTo(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Payment Card */}
          <div className="glass-card-3d" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>💳 Ledger & Payment Options</h3>
            
            <div className="form-group">
              <label className="form-label">Payment Mode Selection</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {(['cash', 'upi', 'due', 'mixed'] as PaymentMode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setPaymentMode(mode)
                    }}
                    className={paymentMode === mode ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                    style={{ textTransform: 'capitalize', fontWeight: '800', fontSize: '0.75rem', borderRadius: '0.5rem' }}
                  >
                    {mode === 'cash' ? '💵 Cash' : mode === 'upi' ? '📱 UPI' : mode === 'due' ? '🔴 Due' : '🔀 Mixed'}
                  </button>
                ))}
              </div>
            </div>

            {/* Split billing amount */}
            {(paymentMode === 'mixed' || paymentMode === 'cash' || paymentMode === 'upi') && (
              <div className="form-group">
                <label className="form-label">Collected Amount (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={paidAmount || ''}
                  onChange={e => setPaidAmount(Number(e.target.value))}
                  placeholder="Paid amount"
                />
              </div>
            )}

            {dueAmount > 0 && (
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(239, 68, 68, 0.05)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                borderRadius: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem'
              }}>
                <span style={{ fontSize: '0.875rem', color: '#f87171', fontWeight: '700' }}>Logged Outstanding Balance</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f87171' }}>{formatCurrency(dueAmount)}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Invoice Remarks</label>
              <input className="form-input" placeholder="Invoice reference notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ITEMS TABLE AND TICKET PREVIEW */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card-3d" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>📦 Cart Items</h3>
              <button className="btn btn-primary btn-sm" onClick={addItem}>➕ Add Row</button>
            </div>

            {/* TAPIOCA QUICK-ADD PRODUCTS SELECTOR GRID */}
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'hsl(215 20% 60%)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              Quick Add Tap Board
            </div>
            
            {/* Quick Add Product Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {PRODUCTS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '0.75rem', height: '100%', gap: '0.25rem' }}
                  onClick={() => {
                    const existing = items.find(item => item.product_id === p.id)
                    if (existing) {
                      updateItem(existing.id, 'quantity', existing.quantity + 1)
                    } else {
                      const newItem: SaleItem = {
                        id: Date.now().toString() + Math.random(),
                        product_id: p.id,
                        product_name: p.name,
                        quantity: 1,
                        rate: p.rate,
                        gst_rate: p.gst_rate,
                        amount: p.rate,
                        gst_amount: isGst ? (p.rate * p.gst_rate) / 100 : 0,
                        total: isGst ? p.rate + (p.rate * p.gst_rate) / 100 : p.rate
                      }
                      setItems([...items, newItem])
                    }
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>
                    {p.category === 'can' ? '💧' : p.category === 'packet' ? '🛍️' : '🍾'}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', textAlign: 'center', whiteSpace: 'normal', lineHeight: 1.1 }}>{p.name.replace(' Bottle Case', '').replace(' Can', '')}</span>
                  <span style={{ fontSize: '0.65rem', color: 'hsl(142 71% 45%)', fontWeight: '800' }}>₹{p.rate}</span>
                </button>
              ))}
            </div>

            {/* Items billing table */}
            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
              {items.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'hsl(215 20% 45%)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '0.75rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛒</div>
                  <p>Billing cart is empty.<br />Tap any product above to add.</p>
                </div>
              ) : (
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ width: '70px' }}>Qty</th>
                      <th style={{ width: '80px' }}>Rate</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>
                          <select
                            className="form-input"
                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem', minWidth: '130px' }}
                            value={item.product_id}
                            onChange={e => updateItem(item.id, 'product_id', e.target.value)}
                          >
                            {PRODUCTS.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem', textAlign: 'center' }}
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}
                            min="0"
                            value={item.rate}
                            onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#fff' }}>
                          ₹{item.total.toFixed(0)}
                        </td>
                        <td>
                          <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => removeItem(item.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Totals Summary Panel */}
            {items.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(215 20% 55%)' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {isGst && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(215 20% 55%)' }}>
                    <span>CGST + SGST (18%):</span>
                    <span>{formatCurrency(totalGst)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', fontWeight: '700' }}>GRAND TOTAL</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', marginTop: '0.125rem' }}>
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={newBill}>Clear</button>
                    <button className="btn btn-primary" onClick={saveBill} disabled={saving}>
                      {saving ? 'Saving...' : '💾 Lock & Print'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  )
}
