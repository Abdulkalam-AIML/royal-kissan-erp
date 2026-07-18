'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { 
  Receipt, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
  Smartphone, 
  Send, 
  X, 
  Settings, 
  User, 
  CreditCard, 
  Package, 
  Coins, 
  Shuffle, 
  AlertCircle, 
  Truck, 
  Building2, 
  Store, 
  FileCheck, 
  FileText, 
  AlertTriangle 
} from 'lucide-react'

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
  { id: 'p1', name: 'Water Can (20L)', rate: 15, gst_rate: 18, category: 'can' },
  { id: 'p2', name: 'Cooling Can (20L)', rate: 30, gst_rate: 18, category: 'can' },
  { id: 'p3', name: 'Bags (100 Pack)', rate: 80, gst_rate: 12, category: 'bag' },
  { id: 'p4', name: '500ml Bottle Case', rate: 140, gst_rate: 18, category: 'bottle' },
  { id: 'p5', name: '1L Bottle Case', rate: 120, gst_rate: 18, category: 'bottle' },
  { id: 'p6', name: '2L Bottle Case', rate: 150, gst_rate: 18, category: 'bottle' },
]

const BILL_TYPE_LABELS: Record<BillType, string> = {
  driver_sale:    'Driver Sale',
  company_sale:   'Company Sale',
  dealer_invoice: 'Dealer Invoice',
  gst_invoice:    'GST Invoice',
  non_gst_invoice:'Non-GST Invoice',
}

const BILL_TYPE_ICONS: Record<BillType, any> = {
  driver_sale:    Truck,
  company_sale:   Building2,
  dealer_invoice: Store,
  gst_invoice:    FileCheck,
  non_gst_invoice:FileText,
}

const PAYMENT_ICONS: Record<PaymentMode, any> = {
  cash:  Coins,
  upi:   Smartphone,
  mixed: Shuffle,
  due:   AlertCircle,
}

const PAYMENT_STATUS = (total: number, paid: number) => {
  if (paid <= 0) return { label: 'Due', color: '#f87171', badge: 'badge-danger' }
  if (paid >= total) return { label: 'Paid', color: '#34d399', badge: 'badge-success' }
  return { label: 'Partial', color: '#fbbf24', badge: 'badge-warning' }
}

// ── Logo component (works in both print and screen) ──────────
function RKLogo({ size = 60, forPrint = false }: { size?: number; forPrint?: boolean }) {
  return (
    <Image
      src="/royal-kissan-logo.png"
      alt="Royal Kissan Packaged Drinking Water"
      width={size}
      height={size}
      priority
      unoptimized
      style={{
        objectFit: 'contain',
        borderRadius: forPrint ? '4px' : '0',
        display: 'block',
      }}
    />
  )
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
  const [cashAmount, setCashAmount] = useState(0)
  const [upiAmount, setUpiAmount] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    const d = new Date()
    return `RK-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`
  })
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [savedSale, setSavedSale] = useState<any>(null)
  const [dbProducts, setDbProducts] = useState<any[]>(PRODUCTS)
  const [dealers, setDealers] = useState<any[]>([])
  const [selectedDealerId, setSelectedDealerId] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [saveStatus, setSaveStatus] = useState<string[]>([])
  const [printFormat, setPrintFormat] = useState<'a4' | '58mm' | '80mm'>('a4')
  const [isAutoPrint, setIsAutoPrint] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({
    company_name: 'ROYAL KISSAN',
    company_address: 'Guntur Highway Road, Guntur, AP',
    company_phone: '81849 18757',
    company_email: 'royalkissan@gmail.com',
    company_gst: '37BABS2021G1Z3'
  })
  const printRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Computed totals
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const totalGst = items.reduce((sum, item) => sum + item.gst_amount, 0)
  const totalAmount = subtotal + totalGst

  useEffect(() => {
    fetchProducts()
    fetchDealers()
    fetchCustomers()
    fetchSettings()
  }, [])

  useEffect(() => { setIsGst(billType !== 'non_gst_invoice') }, [billType])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + I -> Add Item
      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault()
        addItem()
      }
      // Ctrl + S -> Save Bill
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        saveBill()
      }
      // F2 -> Focus Customer Name
      if (e.key === 'F2') {
        e.preventDefault()
        const el = document.getElementById('billing-customer-name')
        if (el) (el as HTMLInputElement).focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items, customerName, paidAmount, cashAmount, upiAmount, paymentMode, selectedDealerId, invoiceNumber, date, notes, subtotal, totalGst, totalAmount])

  useEffect(() => {
    if (paymentMode === 'cash') {
      setCashAmount(totalAmount)
      setUpiAmount(0)
      setPaidAmount(totalAmount)
    } else if (paymentMode === 'upi') {
      setUpiAmount(totalAmount)
      setCashAmount(0)
      setPaidAmount(totalAmount)
    } else if (paymentMode === 'due') {
      setCashAmount(0)
      setUpiAmount(0)
      setPaidAmount(0)
    }
  }, [totalAmount, paymentMode])

  useEffect(() => {
    if (paymentMode === 'mixed') {
      setPaidAmount(cashAmount + upiAmount)
    }
  }, [cashAmount, upiAmount, paymentMode])

  async function fetchProducts() {
    try {
      const { data } = await supabase.from('products').select('id, name, default_rate, gst_rate, category').eq('is_active', true)
      if (data && data.length > 0) {
        const seen = new Set()
        const unique: any[] = []
        data.forEach(p => {
          if (!seen.has(p.name)) {
            seen.add(p.name)
            unique.push({ id: p.id, name: p.name, rate: Number(p.default_rate) || 0, gst_rate: Number(p.gst_rate) || 18, category: p.category || 'bottle' })
          }
        })
        if (unique.length > 0) setDbProducts(unique)
      }
    } catch (err) { console.error('Failed to load products:', err) }
  }

  async function fetchDealers() {
    try {
      const { data } = await supabase.from('dealers').select('id, name, area').order('name')
      if (data && data.length > 0) setDealers(data)
    } catch (err) { console.error('Failed to load dealers:', err) }
  }

  async function fetchCustomers() {
    try {
      const { data } = await supabase.from('customers').select('id, name, phone, address, gst_number').order('name')
      if (data) setCustomers(data)
    } catch (err) { console.error('Failed to load customers:', err) }
  }

  async function fetchSettings() {
    try {
      const { data } = await supabase.from('settings').select('key, value')
      if (data && data.length > 0) {
        const loaded: Record<string, string> = {}
        data.forEach(s => {
          loaded[s.key] = s.value
        })
        setSettings(prev => ({ ...prev, ...loaded }))
      }
    } catch (err) { console.error('Failed to load settings:', err) }
  }

  const dueAmount = Math.max(0, totalAmount - paidAmount)
  const payStatus = PAYMENT_STATUS(totalAmount, paidAmount)

  function addItem() {
    const defaultProd = dbProducts[0] || PRODUCTS[0]
    const newItem: SaleItem = {
      id: Date.now().toString() + Math.random(),
      product_id: defaultProd.id,
      product_name: defaultProd.name,
      quantity: 1,
      rate: defaultProd.rate,
      gst_rate: defaultProd.gst_rate,
      amount: defaultProd.rate,
      gst_amount: isGst ? (defaultProd.rate * defaultProd.gst_rate) / 100 : 0,
      total: isGst ? defaultProd.rate + (defaultProd.rate * defaultProd.gst_rate) / 100 : defaultProd.rate,
    }
    setItems([...items, newItem])
  }

  function updateItem(id: string, field: string, value: string | number) {
    setItems(items.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'product_id') {
        const product = dbProducts.find(p => p.id === value) || PRODUCTS.find(p => p.id === value)
        if (product) { updated.product_name = product.name; updated.rate = product.rate; updated.gst_rate = product.gst_rate }
      }
      const amount = updated.quantity * updated.rate
      const gstAmount = isGst ? (amount * updated.gst_rate) / 100 : 0
      return { ...updated, amount, gst_amount: gstAmount, total: amount + gstAmount }
    }))
  }

  function removeItem(id: string) { setItems(items.filter(item => item.id !== id)) }

  async function saveBill() {
    if (!customerName || items.length === 0) {
      alert('Please fill customer name and add at least one item')
      return
    }

    setSaving(true)
    setSaveStatus([])
    const statusLog: string[] = []

    try {
      // 1. Resolve dealer_id
      let dealerId = selectedDealerId || null
      if (!dealerId && billType === 'dealer_invoice') {
        const { data: dData } = await supabase.from('dealers').select('id').ilike('name', `%${customerName}%`).limit(1).maybeSingle()
        dealerId = dData?.id || null
      }

      // 2. Resolve driver_id + route_id for driver_sale
      let driverId = null
      let routeId = null
      if (billType === 'driver_sale') {
        const { data: drData } = await supabase.from('drivers').select('id').order('created_at').limit(1).maybeSingle()
        driverId = drData?.id || null
        const { data: rtData } = await supabase.from('routes').select('id').limit(1).maybeSingle()
        routeId = rtData?.id || null
      }

      const paymentStatus = paidAmount <= 0 ? 'due' : paidAmount >= totalAmount ? 'paid' : 'partial'

      let finalInvoiceNumber = invoiceNumber.trim()
      if (!finalInvoiceNumber) {
        const d = new Date()
        finalInvoiceNumber = `RK-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`
      }

      // 3. Build complete bills payload — all columns must match DB schema
      const payload = {
        invoice_number:   finalInvoiceNumber,
        bill_type:        billType,
        customer_name:    customerName,
        customer_phone:   customerPhone || null,
        customer_address: customerAddress || null,
        dealer_id:        dealerId,
        driver_id:        driverId,
        route_id:         routeId,
        subtotal:         subtotal,
        gst_amount:       totalGst,
        total_amount:     totalAmount,
        payment_method:   paymentMode,
        cash_amount:      cashAmount,
        upi_amount:       upiAmount,
        paid_amount:      paidAmount,
        due_amount:       dueAmount,
        payment_status:   paymentStatus,
        date:             date,
        notes:            notes || null,
      }

      // 4. Insert main bill
      const { data: bill, error: billError } = await supabase.from('bills').insert(payload).select().single()

      if (billError) {
        console.error('Bill insert error:', billError)
        throw new Error(`Failed to save bill: ${billError.message}`)
      }

      statusLog.push('✅ Bill saved to database')

      if (bill) {
        // 5. Insert bill items
        const billItemsPayload = items.map(item => ({
          bill_id:      bill.id,
          product_id:   item.product_id.startsWith('p') ? null : item.product_id, // fallback products have fake IDs
          product_name: item.product_name,
          quantity:     item.quantity,
          rate:         item.rate,
          amount:       item.amount,
          gst_rate:     item.gst_rate,
          gst_amount:   item.gst_amount,
          total:        item.total,
        }))

        const { error: itemsErr } = await supabase.from('bill_items').insert(billItemsPayload)
        if (itemsErr) {
          console.error('Bill items insert error:', itemsErr)
          statusLog.push(`⚠️ Bill items warning: ${itemsErr.message}`)
        } else {
          statusLog.push('✅ Bill items saved')
        }

        // 6. Deduct stock (uses product_id FK, skip for fallback products)
        try {
          const stockTxs = items
            .filter(item => !item.product_id.startsWith('p')) // skip fake IDs
            .map(item => ({
              product_id:       item.product_id,
              transaction_type: 'out' as const,
              quantity:         Number(item.quantity),
              reason:           `Bill #${invoiceNumber}`,
              reference_type:   'sale',
              reference_id:     bill.id,
              notes:            `Auto-deducted on billing for ${item.product_name}`,
            }))

          if (stockTxs.length > 0) {
            const { error: stockErr } = await supabase.from('stock_transactions').insert(stockTxs)
            if (stockErr) {
              console.warn('Stock transactions warning:', stockErr.message)
            } else {
              statusLog.push('✅ Inventory stock deducted')
            }
          }
        } catch (stockEx) {
          console.warn('Stock deduction skipped:', stockEx)
        }

        // 7. Dealer outstanding — handled by DB trigger sync_bills_data()
        if (billType === 'dealer_invoice' && dealerId) {
          statusLog.push('✅ Dealer outstanding updated (via trigger)')
        }

        // 8. Customer ledger
        try {
          const { error: ledgerErr } = await supabase.from('customer_ledger').insert({
            customer_name:    customerName,
            transaction_type: 'bill',
            bill_id:          bill.id,
            debit:            totalAmount,
            credit:           paidAmount,
            balance:          dueAmount,
            description:      `Bill #${invoiceNumber} — ${BILL_TYPE_LABELS[billType]}`,
            transaction_date: date,
          })
          if (ledgerErr) console.warn('Ledger warning:', ledgerErr.message)
          else statusLog.push('✅ Customer ledger updated')
        } catch (ledgerEx) {
          console.warn('Ledger insert skipped:', ledgerEx)
        }

        // 9. Driver route sales
        if (billType === 'driver_sale' && driverId) {
          try {
            const { error: rsErr } = await supabase.from('route_sales').insert({
              invoice_number: invoiceNumber,
              driver_id:      driverId,
              route_id:       routeId,
              customer_name:  customerName,
              product_name:   items.map(i => i.product_name).join(', '),
              quantity:       items.reduce((s, i) => s + i.quantity, 0),
              rate:           items[0]?.rate || 0,
              total_amount:   totalAmount,
              cash_paid:      cashAmount,
              upi_paid:       upiAmount,
              due_amount:     dueAmount,
              payment_status: paymentStatus,
              sale_date:      date,
            })
            if (rsErr) console.warn('Route sales warning:', rsErr.message)
            else statusLog.push('✅ Driver route sales recorded')
          } catch (rsEx) {
            console.warn('Route sales skipped:', rsEx)
          }
        }

        setSaveStatus(statusLog)
        setSavedSale(bill)
        setShowPrint(true)
        if (isAutoPrint) {
          setTimeout(() => window.print(), 300)
        }
      }
    } catch (err: any) {
      console.error('saveBill error:', err)
      alert(`❌ Error saving bill:\n\n${err?.message || JSON.stringify(err)}\n\nCheck browser console for details.`)
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelBill() {
    if (!savedSale) return
    if (!confirm('⚠️ Are you sure you want to cancel and void this bill?')) return

    setSaving(true)
    try {
      const { error } = await supabase.rpc('cancel_and_archive_bill', { p_bill_id: savedSale.id })
      if (error) {
        // Function may not exist; fallback: just delete the bill
        const { error: delErr } = await supabase.from('bills').delete().eq('id', savedSale.id)
        if (delErr) alert(`❌ Cancellation failed: ${delErr.message}`)
        else { alert('✅ Invoice cancelled'); newBill() }
      } else {
        alert('✅ Invoice successfully cancelled and archived!')
        newBill()
      }
    } catch (e: any) {
      alert(`Error: ${e?.message}`)
    } finally {
      setSaving(false)
    }
  }

  function newBill() {
    setCustomerName(''); setCustomerPhone(''); setCustomerAddress('')
    setCustomerGst(''); setShippedTo('')
    setItems([]); setPaymentMode('cash'); setPaidAmount(0); setCashAmount(0); setUpiAmount(0)
    setNotes(''); setSelectedDealerId(''); setSaveStatus([])
    const d = new Date()
    setInvoiceNumber(`RK-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`)
    setShowPrint(false); setSavedSale(null)
  }

  // ── PDF download via print ────────────────────────────────
  function handleDownloadPDF() {
    const style = document.createElement('style')
    style.id = 'pdf-print-override'
    style.innerHTML = `@page { size: A4; margin: 10mm; } .no-print { display: none !important; }`
    document.head.appendChild(style)
    window.print()
    setTimeout(() => { const el = document.getElementById('pdf-print-override'); if (el) el.remove() }, 1000)
  }

  // ── PRINT / INVOICE VIEW ──────────────────────────────────
  if (showPrint && savedSale) {
    const isThermal = printFormat !== 'a4'
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const formattedTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

    return (
      <div className="animate-fade-in" style={{ padding: '0.25rem' }}>
        {/* ── Control Bar ── */}
        <div className="no-print bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="page-title" style={{ fontSize: '1.5rem', margin: 0 }}>Invoice Generated Successfully</h2>
              </div>
              <p className="page-subtitle">Invoice #{invoiceNumber} saved to database</p>
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {saveStatus.map((s, i) => <span key={i} style={{ fontSize: '0.75rem', color: '#34d399' }}>{s}</span>)}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={isAutoPrint} onChange={e => setIsAutoPrint(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                <span>Auto-Print</span>
              </label>
              <button onClick={newBill} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Plus className="w-4 h-4" />
                <span>New Invoice</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.375rem', marginRight: '0.5rem' }}>
              {(['a4', '58mm', '80mm'] as const).map(fmt => (
                <button key={fmt} type="button" onClick={() => setPrintFormat(fmt)}
                  className={printFormat === fmt ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={() => window.print()} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button onClick={handleDownloadPDF} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button onClick={() => window.open(`https://wa.me/?text=Invoice%20${invoiceNumber}%20Total:%20Rs.${totalAmount}`, '_blank')} className="btn btn-sm" style={{ background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Smartphone className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
            <button onClick={handleCancelBill} className="btn btn-sm" style={{ background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Trash2 className="w-4 h-4" />
              <span>Cancel Bill</span>
            </button>
          </div>
        </div>

        {/* ── INVOICE TEMPLATE ── */}
        <div
          ref={printRef}
          id="printable-invoice"
          className={printFormat === 'a4' ? 'print-a4' : printFormat === '80mm' ? 'print-80mm' : 'print-58mm'}
          style={{
            background: 'white',
            color: 'black',
            padding: printFormat === 'a4' ? '12mm 15mm' : printFormat === '80mm' ? '4mm' : '3mm',
            maxWidth: printFormat === 'a4' ? '210mm' : printFormat === '80mm' ? '80mm' : '58mm',
            margin: '0 auto',
            fontFamily: printFormat === 'a4' ? "'Arial', sans-serif" : 'monospace',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            borderRadius: printFormat === 'a4' ? '0.5rem' : '0',
            minHeight: printFormat === 'a4' ? '297mm' : 'auto',
          }}
        >
          {/* ════════════════════════════════════════
              A4 INVOICE TEMPLATE
          ════════════════════════════════════════ */}
          {printFormat === 'a4' ? (
            <div>
              {/* Logo block centered at the top */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                paddingBottom: '5mm',
                marginBottom: '5mm',
                borderBottom: '1px dashed #e5e7eb'
              }}>
                <Image
                  src="/royal-kissan-logo.png"
                  alt="Royal Kissan Logo"
                  width={90}
                  height={90}
                  priority
                  unoptimized
                  style={{
                    objectFit: 'contain',
                    borderRadius: '8px',
                    display: 'block'
                  }}
                />
              </div>

              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '3px solid #1e3a8a',
                paddingBottom: '8mm',
                marginBottom: '6mm',
              }}>
                {/* Left: Company details from database settings */}
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#1e3a8a', margin: '0 0 2px', letterSpacing: '-0.5px' }}>
                    {settings.company_name}
                  </h1>
                  <p style={{ fontSize: '11px', color: '#4b5563', margin: '0 0 4px', fontWeight: '700', letterSpacing: '1px' }}>
                    PACKAGED DRINKING WATER
                  </p>
                  <p style={{ fontSize: '9.5px', color: '#6b7280', margin: '2px 0' }}>📍 {settings.company_address}</p>
                  <p style={{ fontSize: '9.5px', color: '#6b7280', margin: '2px 0' }}>📞 +91 {settings.company_phone} &nbsp;|&nbsp; ✉ {settings.company_email}</p>
                  {settings.company_gst && <p style={{ fontSize: '9.5px', color: '#6b7280', margin: '2px 0', fontWeight: '700' }}>GSTIN: {settings.company_gst}</p>}
                </div>
                {/* Right: Invoice Badge */}
                <div style={{ textAlign: 'right', minWidth: '160px' }}>
                  <div style={{
                    display: 'inline-block',
                    background: isGst ? '#1e3a8a' : '#374151',
                    color: 'white',
                    padding: '6px 18px',
                    borderRadius: '6px',
                    marginBottom: '8px',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '1.5px' }}>
                      {isGst ? 'TAX INVOICE' : 'BILL OF SUPPLY'}
                    </div>
                    <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
                      {BILL_TYPE_LABELS[billType]}
                    </div>
                  </div>
                  <div style={{ fontSize: '10.5px', margin: '3px 0' }}>
                    Invoice: <strong style={{ color: '#1e3a8a' }}>#{invoiceNumber}</strong>
                  </div>
                  <div style={{ fontSize: '10.5px', margin: '3px 0' }}>Date: {formattedDate}</div>
                  <div style={{ fontSize: '10px', margin: '3px 0', color: '#6b7280' }}>Time: {formattedTime}</div>
                </div>
              </div>

              {/* Billed To / Shipped To */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginBottom: '6mm' }}>
                <div style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', borderLeft: '4px solid #1e3a8a' }}>
                  <p style={{ fontSize: '9px', fontWeight: '900', color: '#1e3a8a', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    BILLED TO
                  </p>
                  <p style={{ fontWeight: '800', fontSize: '13px', margin: '0 0 3px', color: '#111827' }}>{customerName || 'Walk-In Customer'}</p>
                  {customerAddress && <p style={{ fontSize: '10px', color: '#374151', margin: '2px 0' }}>{customerAddress}</p>}
                  {customerPhone && <p style={{ fontSize: '10px', color: '#374151', margin: '2px 0' }}>📞 {customerPhone}</p>}
                  {customerGst && <p style={{ fontSize: '10px', color: '#374151', margin: '2px 0', fontWeight: '700' }}>GSTIN: {customerGst}</p>}
                </div>
                <div style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <p style={{ fontSize: '9px', fontWeight: '900', color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    SHIPPED TO
                  </p>
                  <p style={{ fontWeight: '800', fontSize: '13px', margin: '0 0 3px', color: '#111827' }}>{customerName || 'Walk-In Customer'}</p>
                  <p style={{ fontSize: '10px', color: '#374151', margin: '2px 0' }}>{shippedTo || customerAddress || 'Same as billing address'}</p>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginBottom: '6mm' }}>
                <thead>
                  <tr style={{ background: '#1e3a8a', color: 'white' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '4%' }}>#</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '38%' }}>Product / Description</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '10%' }}>HSN</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '8%' }}>Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', width: '12%' }}>Rate (₹)</th>
                    {isGst && <th style={{ padding: '9px 10px', textAlign: 'right', width: '12%' }}>Taxable (₹)</th>}
                    {isGst && <th style={{ padding: '9px 10px', textAlign: 'center', width: '8%' }}>GST%</th>}
                    <th style={{ padding: '9px 10px', textAlign: 'right', width: '14%' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td style={{ padding: '8px 10px', color: '#6b7280' }}>{i + 1}</td>
                      <td style={{ padding: '8px 10px', fontWeight: '700', color: '#1f2937' }}>{item.product_name}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#6b7280' }}>2201</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹{item.rate.toFixed(2)}</td>
                      {isGst && <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹{item.amount.toFixed(2)}</td>}
                      {isGst && <td style={{ padding: '8px 10px', textAlign: 'center', color: '#6b7280' }}>{item.gst_rate}%</td>}
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '800', color: '#111827' }}>₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {/* Empty rows for aesthetics if few items */}
                  {items.length < 3 && Array.from({ length: 3 - items.length }).map((_, i) => (
                    <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 10px', color: 'transparent' }}>-</td>
                      <td colSpan={isGst ? 6 : 3} style={{ padding: '8px 10px' }}></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals + Amount in Words */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm' }}>
                <div style={{ width: '50%' }}>
                  <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '1px' }}>
                      AMOUNT IN WORDS
                    </p>
                    <p style={{ margin: 0, fontWeight: '700', color: '#1e3a8a', fontSize: '11px', lineHeight: 1.5 }}>
                      {numberToWords(totalAmount)}
                    </p>
                    {notes && <p style={{ margin: '8px 0 0', color: '#4b5563', fontSize: '10px' }}><strong>Notes:</strong> {notes}</p>}
                  </div>
                </div>

                <div style={{ width: '220px', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '7px 10px', color: '#6b7280' }}>Subtotal</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700' }}>₹{subtotal.toFixed(2)}</td>
                      </tr>
                      {isGst && <>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '7px 10px', color: '#6b7280' }}>CGST (9%)</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right' }}>₹{(totalGst / 2).toFixed(2)}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '7px 10px', color: '#6b7280' }}>SGST (9%)</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right' }}>₹{(totalGst / 2).toFixed(2)}</td>
                        </tr>
                      </>}
                      <tr style={{ background: '#1e3a8a', color: 'white' }}>
                        <td style={{ padding: '9px 10px', fontWeight: '900', fontSize: '12px' }}>GRAND TOTAL</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '900', fontSize: '14px' }}>₹{totalAmount.toFixed(2)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f0fdf4' }}>
                        <td style={{ padding: '7px 10px', color: '#059669', fontSize: '10px' }}>💵 Cash Paid</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: '#059669', fontWeight: '700' }}>₹{cashAmount.toFixed(2)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#faf5ff' }}>
                        <td style={{ padding: '7px 10px', color: '#7c3aed', fontSize: '10px' }}>📱 UPI Paid</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: '#7c3aed', fontWeight: '700' }}>₹{upiAmount.toFixed(2)}</td>
                      </tr>
                      {dueAmount > 0 && (
                        <tr style={{ background: '#fef2f2' }}>
                          <td style={{ padding: '7px 10px', color: '#dc2626', fontWeight: '800', fontSize: '11px' }}>⚠️ OUTSTANDING</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', color: '#dc2626', fontWeight: '900', fontSize: '13px' }}>₹{dueAmount.toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8mm', paddingTop: '6mm', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '9px', color: '#9ca3af' }}>
                  <p style={{ margin: '0 0 2px' }}>Computer generated {isGst ? 'tax invoice' : 'bill of supply'}.</p>
                  <p style={{ margin: '0 0 2px' }}>Subject to Guntur jurisdiction. E&OE.</p>
                  <p style={{ margin: 0, fontWeight: '700', color: '#1e3a8a' }}>Thank You! Visit Again. 🙏</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ borderTop: '1px solid #374151', width: '140px', marginBottom: '4px' }} />
                  <p style={{ fontSize: '9px', color: '#6b7280', margin: 0 }}>Authorized Signatory</p>
                  <p style={{ fontSize: '11px', fontWeight: '900', color: '#1e3a8a', margin: '2px 0 0' }}>Royal Kissan Drinking Water</p>
                </div>
              </div>
            </div>

          ) : (
            /* ════════════════════════════════════════
                THERMAL RECEIPT (58mm / 80mm)
            ════════════════════════════════════════ */
            <div style={{ fontFamily: 'monospace', fontSize: printFormat === '80mm' ? '11px' : '9px', color: '#000', lineHeight: 1.4 }}>
              {/* Thermal Header with Logo */}
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                  <Image
                    src="/royal-kissan-logo.png"
                    alt="Royal Kissan"
                    width={printFormat === '80mm' ? 70 : 52}
                    height={printFormat === '80mm' ? 70 : 52}
                    priority
                    unoptimized
                    style={{
                      objectFit: 'contain',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div style={{ fontWeight: '900', fontSize: printFormat === '80mm' ? '14px' : '11px', letterSpacing: '1px' }}>{settings.company_name}</div>
                <div style={{ fontSize: printFormat === '80mm' ? '10px' : '8px', margin: '1px 0' }}>Packaged Drinking Water</div>
                <div style={{ fontSize: printFormat === '80mm' ? '9px' : '8px' }}>Ph: {settings.company_phone}</div>
                {isGst && settings.company_gst && <div style={{ fontSize: printFormat === '80mm' ? '9px' : '7.5px' }}>GSTIN: {settings.company_gst}</div>}
                <div style={{ fontSize: printFormat === '80mm' ? '9px' : '7.5px', marginTop: '2px', fontWeight: '700' }}>
                  {isGst ? '— TAX INVOICE —' : '— BILL OF SUPPLY —'}
                </div>
              </div>

              {/* Bill Info */}
              <div style={{ marginBottom: '5px', fontSize: printFormat === '80mm' ? '10px' : '8.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bill#</span><span><strong>{invoiceNumber}</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Date</span><span>{formattedDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Time</span><span>{formattedTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cust</span><span>{customerName || 'Walk-in'}</span>
                </div>
                {customerPhone && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ph</span><span>{customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', margin: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: printFormat === '80mm' ? '9px' : '8px', fontWeight: '700', marginBottom: '3px' }}>
                  <span style={{ flex: 2 }}>Item</span>
                  <span style={{ textAlign: 'center', width: '30px' }}>Qty</span>
                  <span style={{ textAlign: 'right', width: '50px' }}>Rate</span>
                  <span style={{ textAlign: 'right', width: '50px' }}>Amt</span>
                </div>
                <div style={{ borderTop: '1px solid #000', marginBottom: '3px' }} />
                {items.map(item => (
                  <div key={item.id} style={{ marginBottom: '4px' }}>
                    <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product_name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ flex: 2 }}></span>
                      <span style={{ textAlign: 'center', width: '30px' }}>{item.quantity}</span>
                      <span style={{ textAlign: 'right', width: '50px' }}>₹{item.rate}</span>
                      <span style={{ textAlign: 'right', width: '50px' }}>₹{item.total.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ fontSize: printFormat === '80mm' ? '10px' : '8.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                </div>
                {isGst && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>GST (CGST+SGST)</span><span>₹{totalGst.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: printFormat === '80mm' ? '13px' : '11px', borderTop: '1px solid #000', marginTop: '3px', paddingTop: '3px' }}>
                  <span>TOTAL</span><span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cash</span><span>₹{cashAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>UPI</span><span>₹{upiAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Paid</span><span>₹{paidAmount.toFixed(2)}</span>
                </div>
                {dueAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', color: '#000', borderTop: '1px solid #000', marginTop: '2px', paddingTop: '2px' }}>
                    <span>DUE BALANCE</span><span>₹{dueAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', marginTop: '8px', borderTop: '1px dashed #000', paddingTop: '6px', fontSize: printFormat === '80mm' ? '10px' : '8px' }}>
                <div style={{ fontWeight: '700' }}>Thank You! Visit Again. 🙏</div>
                <div style={{ marginTop: '2px', fontSize: '8px', color: '#333' }}>royalkissan@gmail.com</div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── BILLING FORM ──────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ padding: '0.25rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Receipt className="w-6 h-6 text-sky-500" />
            <span>Smart Billing System</span>
          </h2>
          <p className="page-subtitle">Generate bills — auto-updates dealer ledger, driver sales & dashboard</p>
        </div>
        <a href="/sales" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Sales History</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        {/* LEFT PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Bill Configuration */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings className="w-5 h-5 text-sky-400" />
              <span>Bill Configuration</span>
            </h3>

            <div className="form-group">
              <label className="form-label">Bill Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                {(Object.entries(BILL_TYPE_LABELS) as [BillType, string][]).map(([type, label]) => {
                  const IconComponent = BILL_TYPE_ICONS[type]
                  return (
                    <button key={type} type="button" onClick={() => setBillType(type)}
                      className={billType === type ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                      style={{ fontSize: '0.75rem', borderRadius: '0.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'center', padding: '0.5rem 0.75rem' }}>
                      {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem', background: isGst ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
              borderRadius: '0.75rem', border: `1px solid ${isGst ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
              marginBottom: '1.25rem'
            }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.875rem', color: '#fff' }}>GST Status</div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', marginTop: '0.125rem' }}>
                  {isGst ? 'Auto-calculating 18% CGST & SGST' : 'GST excluded'}
                </div>
              </div>
              <button type="button" onClick={() => setIsGst(!isGst)}
                style={{ borderRadius: '99px', background: isGst ? '#10b981' : 'rgba(255,255,255,0.05)', color: '#fff', padding: '0.375rem 1rem', fontSize: '0.75rem', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <FileCheck className="w-4 h-4" />
                <span>{isGst ? 'GST ACTIVE' : 'EXEMPTED'}</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Invoice Number</label>
                <input className="form-input font-mono" style={{ fontWeight: '700' }} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User className="w-5 h-5 text-sky-400" />
              <span>Customer Information</span>
            </h3>

            {billType === 'dealer_invoice' && dealers.length > 0 && (
              <div className="form-group">
                <label className="form-label">Select Dealer</label>
                <select className="form-input" value={selectedDealerId} onChange={e => {
                  setSelectedDealerId(e.target.value)
                  const dealer = dealers.find(d => d.id === e.target.value)
                  if (dealer) setCustomerName(dealer.name)
                }}>
                  <option value="">— Select Dealer —</option>
                  {dealers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.area})</option>)}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input
                id="billing-customer-name"
                className="form-input"
                placeholder="Customer / Business Name"
                value={customerName}
                list="customers-list"
                onChange={e => {
                  const val = e.target.value
                  setCustomerName(val)
                  const matched = customers.find(c => c.name.toLowerCase() === val.toLowerCase())
                  if (matched) {
                    setCustomerPhone(matched.phone || '')
                    setCustomerAddress(matched.address || '')
                    setCustomerGst(matched.gst_number || '')
                  }
                }}
              />
              <datalist id="customers-list">
                {customers.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.phone ? `${c.name} (${c.phone})` : c.name}
                  </option>
                ))}
              </datalist>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input className="form-input" placeholder="GSTIN (optional)" value={customerGst} onChange={e => setCustomerGst(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" placeholder="Billing Address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
            </div>
          </div>

          {/* Payment */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard className="w-5 h-5 text-sky-400" />
              <span>Payment Details</span>
            </h3>

            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(Object.keys(PAYMENT_ICONS) as PaymentMode[]).map(mode => {
                  const IconComponent = PAYMENT_ICONS[mode]
                  const modeLabels: Record<PaymentMode, string> = {
                    cash: 'Cash',
                    upi: 'UPI',
                    mixed: 'Cash+UPI',
                    due: 'Due'
                  }
                  return (
                    <button key={mode} type="button" onClick={() => setPaymentMode(mode)}
                      className={paymentMode === mode ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                      style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                      <span>{modeLabels[mode]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {paymentMode === 'mixed' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">💵 Cash Amount</label>
                  <input type="number" className="form-input font-mono" value={cashAmount === 0 ? '' : cashAmount} onChange={e => setCashAmount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">📱 UPI Amount</label>
                  <input type="number" className="form-input font-mono" value={upiAmount === 0 ? '' : upiAmount} onChange={e => setUpiAmount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} placeholder="0" />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', padding: '0.875rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase' }}>Total Bill</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', fontFamily: 'monospace' }}>{formatCurrency(totalAmount)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase' }}>Paid</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#34d399', fontFamily: 'monospace' }}>{formatCurrency(paidAmount)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase' }}>Due</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: dueAmount > 0 ? '#f87171' : '#34d399', fontFamily: 'monospace' }}>{formatCurrency(dueAmount)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={`badge ${payStatus.badge}`} style={{ fontSize: '0.75rem', fontWeight: '800' }}>{payStatus.label}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Notes</label>
              <input className="form-input" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package className="w-5 h-5 text-sky-400" />
                <span>Line Items</span>
              </h3>
              <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={addItem}>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)', border: '2px dashed rgba(255,255,255,0.06)', borderRadius: '0.75rem' }}>
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
                <p style={{ margin: 0 }}>Click "+ Add Item" to start billing</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {items.map((item, i) => (
                  <div key={item.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', fontWeight: '700' }}>Item #{i + 1}</span>
                      <button className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem', borderRadius: '0.375rem' }} onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Product</label>
                      <select className="form-input" value={item.product_id} onChange={e => updateItem(item.id, 'product_id', e.target.value)} style={{ fontSize: '0.8125rem' }}>
                        {dbProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Quantity</label>
                        <input type="number" className="form-input font-mono" value={item.quantity === 0 ? '' : item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} style={{ fontSize: '0.875rem' }} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Rate (₹)</label>
                        <input type="number" className="form-input font-mono" value={item.rate === 0 ? '' : item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} style={{ fontSize: '0.875rem' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '0.25rem', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'hsl(215 20% 55%)' }}>Amt: <span className="font-mono">₹{item.amount.toFixed(0)}</span></span>
                      {isGst && <span style={{ color: 'hsl(215 20% 55%)' }}>GST: <span className="font-mono">₹{item.gst_amount.toFixed(0)}</span></span>}
                      <span style={{ fontWeight: '800', color: '#fff' }}>Total: <span className="font-mono">₹{item.total.toFixed(0)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: 'hsl(215 20% 55%)' }}>Subtotal</span>
                  <span style={{ color: '#fff', fontWeight: '700', fontFamily: 'monospace' }}>₹{subtotal.toFixed(2)}</span>
                </div>
                {isGst && (<>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'hsl(215 20% 55%)' }}>CGST (9%)</span>
                    <span style={{ color: '#fff', fontFamily: 'monospace' }}>₹{(totalGst / 2).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'hsl(215 20% 55%)' }}>SGST (9%)</span>
                    <span style={{ color: '#fff', fontFamily: 'monospace' }}>₹{(totalGst / 2).toFixed(2)}</span>
                  </div>
                </>)}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '1.1rem', fontWeight: '900' }}>
                  <span style={{ color: '#fff' }}>GRAND TOTAL</span>
                  <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>₹{totalAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ color: '#34d399', fontFamily: 'monospace' }}>Paid: ₹{paidAmount.toFixed(2)}</span>
                  <span style={{ color: dueAmount > 0 ? '#f87171' : '#34d399', fontWeight: '700', fontFamily: 'monospace' }}>Due: ₹{dueAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.875rem', fontSize: '1rem', fontWeight: '800', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={saveBill}
              disabled={saving || items.length === 0 || !customerName}
            >
              <Receipt className="w-5 h-5" />
              <span>{saving ? 'Saving Bill...' : 'Save & Generate Bill'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
