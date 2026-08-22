'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/formatters'
import { generateBillPDF } from '@/lib/utils/pdf-generator'
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Printer, 
  Clock, 
  Bluetooth, 
  Zap, 
  Package, 
  RotateCcw, 
  Eye, 
  Save,
  Search,
  CheckCircle,
  AlertTriangle,
  FileText,
  Share2,
  X,
  CreditCard,
  Percent,
  ShoppingCart,
  UserCheck,
  Truck,
  Building2,
  Barcode,
  Settings2,
  Sliders,
  DollarSign
} from 'lucide-react'
import ReceiptPreviewModal from '@/components/printer/ReceiptPreviewModal'
import { executePrintJob } from '@/lib/printer/printer'
import { BillData } from '@/lib/printer/receipt'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'

type BillType = 'driver_sale' | 'company_sale' | 'dealer_invoice' | 'gst_invoice' | 'non_gst_invoice' | 'dealer_sale'
type PaymentMode = 'cash' | 'upi' | 'card' | 'due' | 'mixed'
type InvoiceFormat = '80mm' | '58mm' | 'A4'
type PrintMode = 'auto' | 'preview' | 'save_only'

interface SaleItem {
  id: string
  product_name: string
  product_id?: string
  quantity: number
  rate: number // Editable Selling Price per item
  mrp?: number
  item_discount: number
  discount_type: 'flat' | 'percent'
  gst_rate: number
  taxable_amount: number
  gst_amount: number
  amount: number
}

const DEFAULT_PRODUCTS = [
  { id: 'p1', name: 'Water Can (20L)', rate: 15, mrp: 20, gst_rate: 18, category: 'can' },
  { id: 'p2', name: 'Cooling Can (20L)', rate: 30, mrp: 35, gst_rate: 18, category: 'can' },
  { id: 'p3', name: 'Bags (100 Pack)', rate: 80, mrp: 100, gst_rate: 12, category: 'bag' },
  { id: 'p4', name: '500ml Bottle Case', rate: 140, mrp: 160, gst_rate: 18, category: 'bottle' },
  { id: 'p5', name: '1L Bottle Case', rate: 120, mrp: 140, gst_rate: 18, category: 'bottle' },
  { id: 'p6', name: '2L Bottle Case', rate: 150, mrp: 180, gst_rate: 18, category: 'bottle' },
]

export default function BillingPage() {
  // Settings Panel State
  const [showSettings, setShowSettings] = useState(false)
  const [askCustomerName, setAskCustomerName] = useState(true)
  const [isGstOn, setIsGstOn] = useState(true)
  const [invoiceFormat, setInvoiceFormat] = useState<InvoiceFormat>('80mm')
  const [printMode, setPrintMode] = useState<PrintMode>('preview')
  const [enabledPayments, setEnabledPayments] = useState<Record<PaymentMode, boolean>>({
    cash: true,
    upi: true,
    card: true,
    mixed: true,
    due: true,
  })

  // Bill Core State
  const [billType, setBillType] = useState<BillType>('company_sale')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerGstin, setCustomerGstin] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedDealerId, setSelectedDealerId] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState('')
  
  const [items, setItems] = useState<SaleItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  
  // Overall Bill Discount
  const [billDiscountValue, setBillDiscountValue] = useState(0)
  const [billDiscountType, setBillDiscountType] = useState<'flat' | 'percent'>('flat')
  const [couponCode, setCouponCode] = useState('')
  
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
  const [cashAmount, setCashAmount] = useState(0)
  const [upiAmount, setUpiAmount] = useState(0)
  const [cardAmount, setCardAmount] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [notes, setNotes] = useState('')

  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    const d = new Date()
    return `RK-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`
  })
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [currentTime, setCurrentTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedSale, setSavedSale] = useState<any>(null)
  
  const [dbProducts, setDbProducts] = useState<any[]>(DEFAULT_PRODUCTS)
  const [customers, setCustomers] = useState<any[]>([])
  const [dealers, setDealers] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [printingThermal, setPrintingThermal] = useState(false)
  const [recentBills, setRecentBills] = useState<any[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    return () => clearInterval(timer)
  }, [])

  // Load Initial Data
  useEffect(() => {
    loadBillingInitialData()
  }, [])

  async function loadBillingInitialData() {
    try {
      const fetchPromise = Promise.all([
        supabase.from('products').select('id, name, default_rate, gst_rate, category').eq('is_active', true),
        supabase.from('customers').select('id, name, phone, address, gstin').limit(100),
        supabase.from('dealers').select('id, name, phone, address, gstin, dealer_code').order('name'),
        supabase.from('drivers').select('id, name, phone').order('name'),
        supabase.from('bills').select('id, invoice_number, date, customer_name, total_amount, paid_amount, due_amount, payment_status, bill_type').order('created_at', { ascending: false }).limit(20),
        supabase.from('printer_settings').select('paper_width').eq('is_default', true).maybeSingle()
      ])

      const timeoutPromise = new Promise<any>((resolve) =>
        setTimeout(() => resolve([{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: null }]), 2500)
      )

      const [productsRes, customersRes, dealersRes, driversRes, billsRes, printerRes] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ])

      if (productsRes?.data && productsRes.data.length > 0) {
        const seen = new Set()
        const unique: any[] = []
        productsRes.data.forEach((p: any) => {
          if (!seen.has(p.name)) {
            seen.add(p.name)
            unique.push({ id: p.id, name: p.name, rate: Number(p.default_rate) || 0, mrp: (Number(p.default_rate) || 0) + 5, gst_rate: Number(p.gst_rate) || 18, category: p.category || 'bottle' })
          }
        })
        if (unique.length > 0) setDbProducts(unique)
      }

      if (customersRes?.data) setCustomers(customersRes.data)
      if (dealersRes?.data) setDealers(dealersRes.data)
      if (driversRes?.data) setDrivers(driversRes.data)
      if (billsRes?.data) setRecentBills(billsRes.data)
      if (printerRes?.data?.paper_width) setInvoiceFormat(printerRes.data.paper_width as InvoiceFormat)
    } catch {
      // Fallback
    }
  }

  // Keyboard Shortcuts (F2: Search focus, F8: Save, F9: Save & Print, Esc: Clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'F8') {
        e.preventDefault()
        saveBill(false)
      }
      if (e.key === 'F9') {
        e.preventDefault()
        saveBill(true)
      }
      if (e.key === 'Escape') {
        if (items.length > 0 && confirm('Clear cart items?')) {
          setItems([])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items, customerName, paidAmount, cashAmount, upiAmount, paymentMode, invoiceNumber, date, billDiscountValue])

  // Live Item & Financial Calculations
  const rawSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
  const itemDiscountsTotal = items.reduce((sum, item) => {
    if (item.discount_type === 'percent') {
      return sum + ((item.quantity * item.rate) * item.item_discount) / 100
    }
    return sum + (item.item_discount * item.quantity)
  }, 0)

  const subtotalAfterItemDiscounts = Math.max(0, rawSubtotal - itemDiscountsTotal)

  const overallDiscountAmount = billDiscountType === 'percent'
    ? (subtotalAfterItemDiscounts * billDiscountValue) / 100
    : billDiscountValue

  const totalDiscountAmount = itemDiscountsTotal + overallDiscountAmount
  const taxableAmount = Math.max(0, rawSubtotal - totalDiscountAmount)

  // GST Calculation (0 if GST is OFF)
  const totalGst = isGstOn ? items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.rate
    const itemDisc = item.discount_type === 'percent' ? (itemSubtotal * item.item_discount) / 100 : item.item_discount * item.quantity
    const itemTaxable = Math.max(0, itemSubtotal - itemDisc)
    return sum + (itemTaxable * item.gst_rate) / 100
  }, 0) : 0

  const cgstAmount = isGstOn ? totalGst / 2 : 0
  const sgstAmount = isGstOn ? totalGst / 2 : 0
  const igstAmount = 0

  const unroundedTotal = taxableAmount + totalGst
  const grandTotal = Math.round(unroundedTotal)
  const roundOff = Math.round((grandTotal - unroundedTotal) * 100) / 100

  // Payment Auto Synchronizer
  useEffect(() => {
    if (paymentMode === 'cash') {
      setCashAmount(grandTotal)
      setUpiAmount(0)
      setCardAmount(0)
      setPaidAmount(grandTotal)
    } else if (paymentMode === 'upi') {
      setUpiAmount(grandTotal)
      setCashAmount(0)
      setCardAmount(0)
      setPaidAmount(grandTotal)
    } else if (paymentMode === 'card') {
      setCardAmount(grandTotal)
      setCashAmount(0)
      setUpiAmount(0)
      setPaidAmount(grandTotal)
    } else if (paymentMode === 'due') {
      setCashAmount(0)
      setUpiAmount(0)
      setCardAmount(0)
      setPaidAmount(0)
    }
  }, [grandTotal, paymentMode])

  useEffect(() => {
    if (paymentMode === 'mixed') {
      setPaidAmount(cashAmount + upiAmount + cardAmount)
    }
  }, [cashAmount, upiAmount, cardAmount, paymentMode])

  const dueAmount = Math.max(0, grandTotal - paidAmount)

  // Cart Handlers
  function addQuickProduct(prod: any, addQty = 1) {
    const existingIndex = items.findIndex(i => i.product_name === prod.name)
    if (existingIndex >= 0) {
      const updated = [...items]
      const curr = updated[existingIndex]
      const newQty = curr.quantity + addQty
      const amount = newQty * curr.rate
      const gstAmount = isGstOn ? (amount * curr.gst_rate) / 100 : 0
      updated[existingIndex] = { ...curr, quantity: newQty, amount, gst_amount: gstAmount }
      setItems(updated)
    } else {
      const newItem: SaleItem = {
        id: Date.now().toString() + Math.random(),
        product_id: prod.id,
        product_name: prod.name,
        quantity: addQty,
        rate: prod.rate,
        mrp: prod.mrp || prod.rate,
        item_discount: 0,
        discount_type: 'flat',
        gst_rate: prod.gst_rate,
        taxable_amount: prod.rate * addQty,
        gst_amount: isGstOn ? ((prod.rate * addQty) * prod.gst_rate) / 100 : 0,
        amount: prod.rate * addQty,
      }
      setItems([...items, newItem])
    }
  }

  function updateItem(id: string, field: string, value: any) {
    setItems(items.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      const qty = Number(updated.quantity) || 1
      const rate = Number(updated.rate) || 0
      const disc = Number(updated.item_discount) || 0
      const itemSubtotal = qty * rate
      const itemDiscVal = updated.discount_type === 'percent' ? (itemSubtotal * disc) / 100 : disc * qty
      const taxable = Math.max(0, itemSubtotal - itemDiscVal)
      const gstAmount = isGstOn ? (taxable * (Number(updated.gst_rate) || 0)) / 100 : 0
      
      return { 
        ...updated, 
        quantity: qty, 
        rate: rate, 
        taxable_amount: taxable, 
        gst_amount: gstAmount, 
        amount: taxable + gstAmount 
      }
    }))
  }

  function removeItem(id: string) { setItems(items.filter(item => item.id !== id)) }

  function resetForm() {
    const d = new Date()
    setInvoiceNumber(`RK-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`)
    setCustomerName('')
    setCustomerPhone('')
    setCustomerGstin('')
    setCustomerAddress('')
    setSelectedCustomerId('')
    setSelectedDealerId('')
    setSelectedDriverId('')
    setItems([])
    setBillDiscountValue(0)
    setCouponCode('')
    setNotes('')
    setPaymentMode('cash')
    setCashAmount(0)
    setUpiAmount(0)
    setCardAmount(0)
    setPaidAmount(0)
    setSavedSale(null)
    setErrorMessage(null)
  }

  function getCurrentBillDataObject(): BillData {
    const selectedDealer = dealers.find(d => d.id === selectedDealerId)
    return {
      id: savedSale?.id,
      invoice_number: savedSale?.invoice_number || invoiceNumber,
      bill_type: isGstOn ? billType : 'non_gst_invoice',
      customer_name: customerName || 'Walk-in Customer',
      customer_phone: customerPhone || null,
      customer_address: customerAddress || null,
      customer_gstin: customerGstin || null,
      dealer_id: selectedDealerId || null,
      dealer_name: selectedDealer ? selectedDealer.name : (selectedDealerId ? customerName : null),
      dealer_phone: selectedDealer ? selectedDealer.phone : (selectedDealerId ? customerPhone : null),
      dealer_address: selectedDealer ? selectedDealer.address : (selectedDealerId ? customerAddress : null),
      dealer_gstin: selectedDealer ? selectedDealer.gstin : (selectedDealerId ? customerGstin : null),
      dealer_code: selectedDealer ? selectedDealer.dealer_code : null,
      subtotal: rawSubtotal,
      gst_amount: totalGst,
      total_amount: grandTotal,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      payment_method: paymentMode,
      payment_status: paidAmount >= grandTotal ? 'paid' : (paidAmount > 0 ? 'partial' : 'due'),
      date: date,
      items: items.map(i => ({
        product_name: i.product_name,
        quantity: i.quantity,
        rate: i.rate,
        amount: i.amount,
        gst_rate: isGstOn ? i.gst_rate : 0,
        gst_amount: isGstOn ? i.gst_amount : 0,
        total: i.amount,
      })),
    }
  }

  // Transactional Bill Save
  async function saveBill(shouldPrint = false) {
    if (items.length === 0) {
      alert('Please add at least one product to the POS bill cart.')
      return
    }
    setSaving(true)
    setErrorMessage(null)
    try {
      const salePayload = {
        invoice_number: invoiceNumber,
        bill_type: isGstOn ? billType : 'non_gst_invoice',
        customer_name: askCustomerName ? (customerName || 'Walk-in Customer') : 'Walk-in Customer',
        customer_phone: customerPhone || null,
        customer_address: customerAddress || null,
        customer_gstin: customerGstin || null,
        customer_id: selectedCustomerId || null,
        dealer_id: selectedDealerId || null,
        driver_id: selectedDriverId || null,
        subtotal: rawSubtotal,
        taxable_amount: taxableAmount,
        gst_amount: totalGst,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        discount_amount: totalDiscountAmount,
        round_off: roundOff,
        grand_total: grandTotal,
        total_amount: grandTotal,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        cash_amount: cashAmount,
        upi_amount: upiAmount,
        card_amount: cardAmount,
        wallet_amount: 0,
        bank_amount: 0,
        mixed_amount: paymentMode === 'mixed' ? paidAmount : 0,
        payment_mode: paymentMode,
        payment_status: paidAmount >= grandTotal ? 'paid' : (paidAmount > 0 ? 'partial' : 'due'),
        status: 'active',
        invoice_type: invoiceFormat,
        date: date,
        items_count: items.length,
        coupon_code: couponCode || null,
        notes: notes || null,
        created_by: 'POS Cashier',
      }

      const itemsPayload = items.map(i => ({
        product_id: i.product_id || null,
        product_name: i.product_name,
        quantity: i.quantity,
        rate: i.rate,
        item_discount: i.item_discount || 0,
        discount_type: i.discount_type || 'flat',
        gst_rate: isGstOn ? i.gst_rate : 0,
        gst_amount: isGstOn ? i.gst_amount : 0,
        amount: i.amount,
      }))

      let createdBill: any = null
      let isOfflineSaved = false

      // 1. Try atomic PostgreSQL RPC process_pos_bill
      try {
        const rpcResult = await supabase.rpc('process_pos_bill', {
          p_bill: salePayload,
          p_items: itemsPayload,
        })
        if (!rpcResult.error && rpcResult.data) {
          createdBill = rpcResult.data
        }
      } catch (rpcErr) {
        console.warn('RPC process_pos_bill offline fallback:', rpcErr)
      }

      // 2. Direct insert fallback if RPC was not invoked or unavailable
      if (!createdBill) {
        try {
          const { data, error } = await supabase.from('bills').insert([salePayload]).select().single()
          if (!error && data) {
            createdBill = data
            if (itemsPayload.length > 0 && createdBill?.id) {
              const itemsWithBillId = itemsPayload.map(i => ({ ...i, bill_id: createdBill.id }))
              await supabase.from('bill_items').insert(itemsWithBillId)
            }
          }
        } catch (dbErr) {
          console.warn('Supabase DB unreachable, activating Fail-Safe Local POS Mode:', dbErr)
        }
      }

      // 3. Fail-Safe Offline POS Save Mode (Zero Block / Zero Cashier Freeze)
      if (!createdBill) {
        isOfflineSaved = true
        createdBill = {
          id: `local-${Date.now()}`,
          ...salePayload,
          is_offline: true,
          sync_status: 'pending',
          created_at: new Date().toISOString(),
        }

        // Store in localStorage queue for automatic background sync when DB reconnects
        try {
          const existingQueue = JSON.parse(localStorage.getItem('rk_offline_bills_queue') || '[]')
          existingQueue.push({ bill: salePayload, items: itemsPayload, saved_at: new Date().toISOString() })
          localStorage.setItem('rk_offline_bills_queue', JSON.stringify(existingQueue))
        } catch (storageErr) {
          console.error('LocalStorage queue error:', storageErr)
        }
      }

      setSavedSale(createdBill)
      setRecentBills(prev => [createdBill, ...prev.slice(0, 19)])

      if (printMode === 'preview' || shouldPrint) {
        setIsPreviewOpen(true)
      }

      // Non-blocking separate thermal printing step
      if (shouldPrint && printMode === 'auto') {
        try {
          setPrintingThermal(true)
          const billDataObj = getCurrentBillDataObject()
          await executePrintJob(billDataObj, { copyType: 'customer' })
        } catch (printErr) {
          console.warn('Printer offline, bill remains saved:', printErr)
        } finally {
          setPrintingThermal(false)
        }
      }

      if (isOfflineSaved) {
        alert(`⚡ Bill ${invoiceNumber} saved in POS Local Mode! (Queued to auto-sync to cloud when online)`)
      } else {
        alert(`✅ Bill ${invoiceNumber} saved successfully!`)
      }
    } catch (e: any) {
      console.error('POS Bill Save Error:', e)
      const rawMsg = e?.message || e?.toString() || ''
      let userFriendlyMsg = 'Unable to save bill. Database is currently unavailable. Please try again.'

      if (rawMsg.includes('Failed to fetch') || rawMsg.includes('FetchError') || rawMsg.includes('NetworkError') || rawMsg.includes('ENOTFOUND')) {
        userFriendlyMsg = 'Database network currently unreachable. Bill has been saved in Local POS Mode.'
      } else if (rawMsg.includes('JWT') || rawMsg.includes('auth') || rawMsg.includes('session')) {
        userFriendlyMsg = 'Your authentication session expired. Please refresh the page or sign in again.'
      } else if (rawMsg.includes('duplicate key') || rawMsg.includes('unique constraint')) {
        userFriendlyMsg = `Invoice ${invoiceNumber} already exists. A new invoice number has been generated. Please try saving again.`
        const d = new Date()
        setInvoiceNumber(`RK-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`)
      } else if (rawMsg) {
        userFriendlyMsg = `Bill save error: ${rawMsg}`
      }
      setErrorMessage(userFriendlyMsg)
    } finally {
      setSaving(false)
    }
  }

  // Filter products
  const filteredProducts = dbProducts.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 'calc(100vh - 80px)' }}>
      
      {/* ── TOP STATUS & CONTROLS HEADER BAR ── */}
      <Card style={{ padding: '0.75rem 1.25rem', backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap style={{ color: '#fbbf24', width: '22px', height: '22px' }} />
              Enterprise POS Billing Operator
            </h2>
            <Badge variant="neutral" style={{ fontFamily: 'monospace', fontWeight: 800, color: '#fbbf24' }}>
              {invoiceNumber}
            </Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: '#a1a1aa' }}>
            
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: showSettings ? '#fbbf24' : '#27272a',
                color: showSettings ? '#000' : '#fff',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Settings2 style={{ width: '15px', height: '15px' }} />
              Invoice Settings
            </button>

            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
              <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{currentTime}</strong>
            </span>

            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Bluetooth style={{ width: '14px', height: '14px', color: '#34d399' }} />
              Printer: <strong style={{ color: '#34d399' }}>TVS RP3230ABW ({invoiceFormat})</strong>
            </span>

            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw style={{ width: '14px', height: '14px' }} />}
              onClick={() => setIsHistoryOpen(true)}
            >
              History ({recentBills.length})
            </Button>
          </div>

        </div>
      </Card>

      {/* ── EXPANDABLE INVOICE SETTINGS PANEL ── */}
      {showSettings && (
        <Card style={{ padding: '1rem 1.25rem', backgroundColor: '#09090b', border: '1px solid #fbbf24' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fbbf24', margin: '0 0 0.85rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders style={{ width: '16px', height: '16px' }} />
            POS & Invoice Configuration Settings
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            
            {/* Customer Toggle */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '0.35rem' }}>
                Customer Preference
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={askCustomerName}
                  onChange={(e) => setAskCustomerName(e.target.checked)}
                />
                ☑ Ask Customer Name
              </label>
            </div>

            {/* GST ON/OFF Toggle */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '0.35rem' }}>
                Tax Regime
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsGstOn(true)}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: isGstOn ? '#34d399' : '#27272a', color: isGstOn ? '#000' : '#a1a1aa', border: 'none', cursor: 'pointer' }}
                >
                  GST ON
                </button>
                <button
                  type="button"
                  onClick={() => setIsGstOn(false)}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: !isGstOn ? '#f87171' : '#27272a', color: !isGstOn ? '#000' : '#a1a1aa', border: 'none', cursor: 'pointer' }}
                >
                  GST OFF (Non-GST)
                </button>
              </div>
            </div>

            {/* Invoice Layout Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '0.35rem' }}>
                Default Invoice Layout
              </label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {(['80mm', '58mm', 'A4'] as InvoiceFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setInvoiceFormat(fmt)}
                    style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: invoiceFormat === fmt ? '#fbbf24' : '#27272a', color: invoiceFormat === fmt ? '#000' : '#a1a1aa', border: 'none', cursor: 'pointer' }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Print Mode */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '0.35rem' }}>
                Print Execution Mode
              </label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[
                  { id: 'preview', label: 'Preview then Print' },
                  { id: 'auto', label: 'Print Automatically' },
                  { id: 'save_only', label: 'Save Only' },
                ].map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPrintMode(pm.id as PrintMode)}
                    style={{ padding: '0.35rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: printMode === pm.id ? '#60a5fa' : '#27272a', color: printMode === pm.id ? '#000' : '#a1a1aa', border: 'none', cursor: 'pointer' }}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </Card>
      )}

      {/* Error Alert Message */}
      {errorMessage && (
        <Card style={{ padding: '0.85rem 1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle style={{ width: '18px', height: '18px' }} />
              {errorMessage}
            </span>
            <button type="button" onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </Card>
      )}

      {/* ── MAIN 12-COLUMN POS GRID LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.25rem', flex: 1 }}>
        
        {/* ── LEFT 7 COLUMNS: PRODUCT CATALOG & SELECTION GRID ── */}
        <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <Card style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#71717a' }} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search product (Press F2) or scan barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && filteredProducts.length > 0) {
                        addQuickProduct(filteredProducts[0])
                        setSearchQuery('')
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.5rem',
                      borderRadius: '8px',
                      backgroundColor: '#09090b',
                      border: '1px solid #27272a',
                      color: '#fff',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <Badge variant="neutral" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0 0.75rem' }}>
                  <Barcode style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
                  SCAN READY
                </Badge>
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                {[
                  { id: 'all', label: 'All Products' },
                  { id: 'can', label: 'Water Cans (20L)' },
                  { id: 'bottle', label: 'Cases & Bottles' },
                  { id: 'bag', label: 'Packs & Bags' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: activeCategory === cat.id ? '#fbbf24' : '#27272a',
                      color: activeCategory === cat.id ? '#000' : '#a1a1aa',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Product Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
            {filteredProducts.map((prod) => (
              <Card
                key={prod.id}
                style={{
                  padding: '1rem',
                  backgroundColor: '#18181b',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                onClick={() => addQuickProduct(prod)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <Badge variant="neutral" style={{ fontSize: '0.65rem' }}>
                      {prod.category?.toUpperCase() || 'ITEM'}
                    </Badge>
                    {prod.mrp && (
                      <span style={{ fontSize: '0.7rem', color: '#71717a', textDecoration: 'line-through' }}>
                        MRP ₹{prod.mrp}
                      </span>
                    )}
                  </div>
                  
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem 0' }}>
                    {prod.name}
                  </h4>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                    {formatCurrency(prod.rate)}
                  </span>

                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); addQuickProduct(prod, 1) }}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); addQuickProduct(prod, 5) }}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      +5
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

        </div>

        {/* ── RIGHT 5 COLUMNS: CART, EDITABLE PRICES & BILL SUMMARY ── */}
        <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#18181b' }}>
            
            {/* Header: Sale Type & Item Count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  POS Billing Cart
                </h3>
              </div>
              <Badge variant="neutral">{items.length} items</Badge>
            </div>

            {/* Customer & Dealer Selection Inputs */}
            {askCustomerName && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {/* Dealer Select Dropdown */}
                {dealers.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Select Dealer (Optional for Dealer Copy)
                    </label>
                    <select
                      value={selectedDealerId}
                      onChange={(e) => {
                        const dId = e.target.value
                        setSelectedDealerId(dId)
                        if (dId) {
                          const d = dealers.find(item => item.id === dId)
                          if (d) {
                            setCustomerName(d.name || '')
                            setCustomerPhone(d.phone || '')
                            setCustomerGstin(d.gstin || '')
                            setCustomerAddress(d.address || '')
                            setBillType('dealer_sale')
                          }
                        } else {
                          setBillType('company_sale')
                        }
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: '#09090b',
                        color: '#fff',
                        border: '1px solid #3f3f46',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      <option value="">-- Direct Retail Customer --</option>
                      {dealers.map(d => (
                        <option key={d.id} value={d.id}>
                          🏢 {d.name} {d.phone ? `(${d.phone})` : ''} {d.dealer_code ? `[${d.dealer_code}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: isGstOn ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0.5rem' }}>
                  <Input
                    label={selectedDealerId ? "Dealer / Business Name" : "Customer Name"}
                    value={customerName}
                    placeholder={selectedDealerId ? "Dealer Name" : "Walk-in Customer"}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <Input
                    label="Phone Number"
                    value={customerPhone}
                    placeholder="9876543210"
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                  {isGstOn && (
                    <Input
                      label="GSTIN"
                      value={customerGstin}
                      placeholder="37ABC..."
                      onChange={(e) => setCustomerGstin(e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Cart Items List with Editable Price & Item Discount */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#71717a' }}>
                  <Package style={{ width: '36px', height: '36px', margin: '0 auto 0.5rem auto', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Cart is empty. Click products on left to add.</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#09090b',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{item.product_name}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>

                    {/* Editable Price, Qty & Item Discount Controls */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.5rem', alignItems: 'center' }}>
                      {/* Qty Modifier */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button
                          type="button"
                          onClick={() => updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                          style={{ padding: '0.2rem 0.4rem', borderRadius: '4px', backgroundColor: '#27272a', border: 'none', color: '#fff', cursor: 'pointer' }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, Number(e.target.value)))}
                          style={{ width: '38px', textAlign: 'center', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', padding: '2px' }}
                        />
                        <button
                          type="button"
                          onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)}
                          style={{ padding: '0.2rem 0.4rem', borderRadius: '4px', backgroundColor: '#27272a', border: 'none', color: '#fff', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>

                      {/* Editable Selling Price Rate */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Rate ₹:</span>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', Math.max(0, Number(e.target.value)))}
                          style={{ width: '54px', backgroundColor: '#18181b', border: '1px solid #fbbf24', borderRadius: '4px', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700, padding: '2px 4px' }}
                        />
                      </div>

                      {/* Item Total */}
                      <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                        {formatCurrency(item.amount)}
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Invoice Level Discount & Bill Summary */}
            <div style={{ backgroundColor: '#09090b', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              
              {/* Bill Discount Input */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Bill Discount:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input
                    type="number"
                    value={billDiscountValue}
                    placeholder="0"
                    onChange={(e) => setBillDiscountValue(Math.max(0, Number(e.target.value)))}
                    style={{ width: '60px', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', padding: '2px 4px', textAlign: 'right' }}
                  />
                  <select
                    value={billDiscountType}
                    onChange={(e) => setBillDiscountType(e.target.value as any)}
                    style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '4px', color: '#fff', fontSize: '0.75rem', padding: '2px' }}
                  >
                    <option value="flat">₹ Flat</option>
                    <option value="percent">% Off</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#a1a1aa' }}>
                <span>Subtotal:</span>
                <span style={{ fontFamily: 'monospace', color: '#fff' }}>{formatCurrency(rawSubtotal)}</span>
              </div>

              {totalDiscountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#f87171' }}>
                  <span>Total Discount:</span>
                  <span style={{ fontFamily: 'monospace' }}>-{formatCurrency(totalDiscountAmount)}</span>
                </div>
              )}

              {isGstOn ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#a1a1aa' }}>
                    <span>CGST (9%):</span>
                    <span style={{ fontFamily: 'monospace', color: '#fff' }}>{formatCurrency(cgstAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#a1a1aa' }}>
                    <span>SGST (9%):</span>
                    <span style={{ fontFamily: 'monospace', color: '#fff' }}>{formatCurrency(sgstAmount)}</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontStyle: 'italic' }}>
                  Non-GST Invoice Mode Active
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24', paddingTop: '0.4rem', borderTop: '1px dashed #3f3f46' }}>
                <span>Grand Total:</span>
                <span style={{ fontFamily: 'monospace' }}>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.35rem' }}>
                {(['cash', 'upi', 'card', 'mixed', 'due'] as PaymentMode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    style={{
                      padding: '0.55rem 0.2rem',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      backgroundColor: paymentMode === mode ? '#fbbf24' : '#09090b',
                      color: paymentMode === mode ? '#000' : '#a1a1aa',
                      border: `1px solid ${paymentMode === mode ? '#fbbf24' : '#27272a'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Button
                variant="secondary"
                size="lg"
                icon={<Save style={{ width: '18px', height: '18px' }} />}
                loading={saving && !printingThermal}
                onClick={() => saveBill(false)}
              >
                Save Bill (F8)
              </Button>

              <Button
                variant="primary"
                size="lg"
                icon={<Printer style={{ width: '18px', height: '18px' }} />}
                loading={saving || printingThermal}
                onClick={() => saveBill(true)}
              >
                Save & Print (F9)
              </Button>
            </div>

          </Card>
        </div>

      </div>

      {/* Bill Preview Modal */}
      {isPreviewOpen && (
        <ReceiptPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          bill={getCurrentBillDataObject()}
          initialFormat={invoiceFormat}
          onPrint={async (copyType) => {
            setPrintingThermal(true)
            await executePrintJob(getCurrentBillDataObject(), { copyType })
            setPrintingThermal(false)
          }}
        />
      )}

      {/* Bill History Drawer Modal */}
      {isHistoryOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
          <div style={{ width: '500px', backgroundColor: '#18181b', borderLeft: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>Recent Bill History</h3>
              <button type="button" onClick={() => setIsHistoryOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentBills.map((b) => (
                <Card key={b.id || b.invoice_number} style={{ padding: '0.85rem', backgroundColor: '#09090b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <Badge variant="neutral">{b.invoice_number}</Badge>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                      {formatCurrency(Number(b.grand_total || b.total_amount) || 0)}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.75rem' }}>
                    {b.customer_name || 'Walk-in'} | {b.date || 'Today'}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Printer style={{ width: '12px', height: '12px' }} />}
                      onClick={() => executePrintJob({
                        invoice_number: b.invoice_number,
                        date: b.date,
                        customer_name: b.customer_name,
                        subtotal: Number(b.subtotal) || Number(b.total_amount),
                        gst_amount: Number(b.gst_amount) || 0,
                        total_amount: Number(b.grand_total || b.total_amount),
                        paid_amount: Number(b.paid_amount) || Number(b.total_amount),
                        due_amount: Number(b.due_amount) || 0,
                        payment_method: b.payment_mode || 'cash',
                        items: [{ product_name: 'Water Can / Bottle', quantity: 1, rate: Number(b.total_amount), amount: Number(b.total_amount) }]
                      })}
                    >
                      Reprint
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<FileText style={{ width: '12px', height: '12px' }} />}
                      onClick={() => generateBillPDF(b)}
                    >
                      A4 PDF
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Share2 style={{ width: '12px', height: '12px' }} />}
                      onClick={() => {
                        const url = `https://wa.me/?text=Invoice%20${b.invoice_number}%20Amount:%20₹${b.total_amount}`
                        window.open(url, '_blank')
                      }}
                    >
                      Share
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
