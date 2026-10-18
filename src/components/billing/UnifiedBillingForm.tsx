'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  UnifiedBillType, 
  PaymentMode, 
  PaymentStatus, 
  Product, 
  Customer, 
  Dealer, 
  Driver, 
  Route, 
  RouteCustomer 
} from '@/lib/types/database'
import { saveUnifiedBill, UnifiedBillResponse } from '@/lib/services/billing-service'
import BillingCustomerSelector from './BillingCustomerSelector'
import BillingDealerSelector from './BillingDealerSelector'
import BillingRouteSelector from './BillingRouteSelector'
import BillingProductTable, { BillingCartItem } from './BillingProductTable'
import BillingPaymentPanel from './BillingPaymentPanel'
import BillingSummary from './BillingSummary'
import { 
  Receipt, 
  Users, 
  Building2, 
  Truck, 
  Printer, 
  Save, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BillData } from '@/lib/printer/receipt'
import ReceiptPreviewModal from '@/components/printer/ReceiptPreviewModal'

interface UnifiedBillingFormProps {
  initialBillType?: UnifiedBillType
  initialCustomerId?: string
  initialDealerId?: string
  initialDriverId?: string
  initialRouteId?: string
  onSuccess?: (createdBill: UnifiedBillResponse) => void
  isModalMode?: boolean
}

const FALLBACK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Water Can (20L)', category: 'Can', default_rate: 15, gst_rate: 18, hsn_code: '2201', is_active: true, cost_price: 8, unit: 'piece', created_at: '' },
  { id: 'p2', name: 'Cooling Can (20L)', category: 'Can', default_rate: 30, gst_rate: 18, hsn_code: '2201', is_active: true, cost_price: 15, unit: 'piece', created_at: '' },
  { id: 'p3', name: 'Water Packets (Box)', category: 'Packet', default_rate: 80, gst_rate: 12, hsn_code: '2201', is_active: true, cost_price: 50, unit: 'box', created_at: '' },
  { id: 'p4', name: '500ml Bottle Case (24)', category: 'Bottle', default_rate: 140, gst_rate: 18, hsn_code: '2201', is_active: true, cost_price: 90, unit: 'case', created_at: '' },
  { id: 'p5', name: '1L Bottle Case (12)', category: 'Bottle', default_rate: 120, gst_rate: 18, hsn_code: '2201', is_active: true, cost_price: 75, unit: 'case', created_at: '' },
  { id: 'p6', name: '2L Bottle Case (9)', category: 'Bottle', default_rate: 150, gst_rate: 18, hsn_code: '2201', is_active: true, cost_price: 95, unit: 'case', created_at: '' },
]

const FALLBACK_DEALERS: Dealer[] = [
  { id: 'd1', dealer_code: 'DLR-1001', name: 'Babu Water Supplying', area: 'Kamavarapukota', route: 'Nuzvid - Eluru Highway', phone: '9347662554', gst_number: '37BABS2021G1Z3', address: 'Main Road, Kamavarapukota, AP', outstanding_amount: 14500, credit_limit: 50000, is_active: true, created_at: '' },
  { id: 'd2', dealer_code: 'DLR-1002', name: 'Bobby Wine Shop & Retail', area: 'Nuzvid', route: 'Local Town Route', phone: '9393064848', gst_number: '37BOBBY9921K1Z2', address: 'Bus Stand Road, Nuzvid', outstanding_amount: 8200, credit_limit: 30000, is_active: true, created_at: '' },
  { id: 'd3', dealer_code: 'DLR-1003', name: 'Vissannapeta Water Junction', area: 'Vissannapeta', route: 'Vissannapeta Route', phone: '9849072413', gst_number: '37VISSAN8812L1Z9', address: 'Market Yard, Vissannapeta', outstanding_amount: 0, credit_limit: 25000, is_active: true, created_at: '' }
]

const FALLBACK_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Srinivasa Tiffins & Hotel', phone: '9848123456', address: 'Main Bazar, Nuzvid', area: 'Nuzvid', outstanding_amount: 1250, is_active: true, created_at: '' },
  { id: 'c2', name: 'Sri Rama Nilayam Residency', phone: '9989012345', address: 'Gandhi Chowk', area: 'Nuzvid', outstanding_amount: 450, is_active: true, created_at: '' },
  { id: 'c3', name: 'Vijayadurga Medical Agencies', phone: '9440112233', address: 'Station Road', area: 'Nuzvid', outstanding_amount: 0, is_active: true, created_at: '' }
]

export default function UnifiedBillingForm({
  initialBillType = 'counter',
  initialCustomerId,
  initialDealerId,
  initialDriverId,
  initialRouteId,
  onSuccess,
  isModalMode = false
}: UnifiedBillingFormProps) {
  const [billType, setBillType] = useState<UnifiedBillType>(initialBillType)
  
  // Master Master Invoices Info (avoid hydration mismatch by setting in useEffect)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [isGstEnabled, setIsGstEnabled] = useState(true)

  // Context Entities Data with instant fallback availability
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS)
  const [customers, setCustomers] = useState<Customer[]>(FALLBACK_CUSTOMERS)
  const [dealers, setDealers] = useState<Dealer[]>(FALLBACK_DEALERS)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routes, setRoutes] = useState<Route[]>([])

  // Entity Selections
  const [walkinName, setWalkinName] = useState('')
  const [walkinPhone, setWalkinPhone] = useState('')
  const [walkinAddress, setWalkinAddress] = useState('')
  const [walkinGstin, setWalkinGstin] = useState('')

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState(initialDriverId || '')
  const [selectedRouteId, setSelectedRouteId] = useState(initialRouteId || '')
  const [selectedRouteCustomerId, setSelectedRouteCustomerId] = useState('')

  // Product Cart State
  const [cartItems, setCartItems] = useState<BillingCartItem[]>([])

  // Extra Discount
  const [billDiscountValue, setBillDiscountValue] = useState(0)
  const [billDiscountType, setBillDiscountType] = useState<'flat' | 'percent'>('flat')

  // Payment State
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
  const [paidAmount, setPaidAmount] = useState(0)
  const [cashAmount, setCashAmount] = useState(0)
  const [upiAmount, setUpiAmount] = useState(0)
  const [cardAmount, setCardAmount] = useState(0)
  const [bankAmount, setBankAmount] = useState(0)
  const [walletAmount, setWalletAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [reference, setReference] = useState('')

  // UI Processing State
  const [saving, setSaving] = useState(false)
  const [lastSavedBill, setLastSavedBill] = useState<any | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [savedBillForPrint, setSavedBillForPrint] = useState<BillData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const supabase = createClient()

  // Generate unique invoice number on client mount to eliminate hydration mismatch
  useEffect(() => {
    const d = new Date()
    setInvoiceNumber(`RK-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`)
  }, [])

  // Preselect dealer/customer if provided via query params
  useEffect(() => {
    if (initialDealerId && dealers.length > 0) {
      const found = dealers.find(d => d.id === initialDealerId)
      if (found) setSelectedDealer(found)
    }
    if (initialCustomerId && customers.length > 0) {
      const found = customers.find(c => c.id === initialCustomerId)
      if (found) setSelectedCustomer(found)
    }
  }, [initialDealerId, initialCustomerId, dealers, customers])

  // Load catalog entities
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [prodRes, custRes, dlrRes, drvRes, rteRes] = await Promise.all([
          supabase.from('products').select('*').eq('is_active', true).order('name'),
          supabase.from('customers').select('*').order('name'),
          supabase.from('dealers').select('*').order('name'),
          supabase.from('drivers').select('*').eq('is_active', true).order('name'),
          supabase.from('routes').select('*').eq('is_active', true).order('name')
        ])

        if (prodRes.data && prodRes.data.length > 0) setProducts(prodRes.data)
        if (custRes.data && custRes.data.length > 0) {
          setCustomers(custRes.data)
          if (initialCustomerId) {
            const found = custRes.data.find(c => c.id === initialCustomerId)
            if (found) setSelectedCustomer(found)
          }
        }
        if (dlrRes.data && dlrRes.data.length > 0) {
          setDealers(dlrRes.data)
          if (initialDealerId) {
            const found = dlrRes.data.find(d => d.id === initialDealerId)
            if (found) setSelectedDealer(found)
          }
        }
        if (drvRes.data && drvRes.data.length > 0) setDrivers(drvRes.data)
        if (rteRes.data && rteRes.data.length > 0) setRoutes(rteRes.data)
      } catch (err) {
        console.warn('Error loading billing entities:', err)
      }
    }

    loadMasterData()
  }, [])

  // Auto calculate financial totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const itemDiscounts = cartItems.reduce((sum, item) => {
    if (item.discount_type === 'percent') {
      return sum + (item.quantity * item.rate * (item.item_discount || 0)) / 100
    }
    return sum + (item.item_discount || 0)
  }, 0)

  let extraDiscount = 0
  if (billDiscountType === 'percent') {
    extraDiscount = (Math.max(0, subtotal - itemDiscounts) * Math.min(100, billDiscountValue)) / 100
  } else {
    extraDiscount = Math.min(Math.max(0, subtotal - itemDiscounts), billDiscountValue)
  }

  const totalDiscount = Math.round((itemDiscounts + extraDiscount) * 100) / 100
  const taxableAmount = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100)
  
  const totalGst = isGstEnabled ? cartItems.reduce((sum, item) => sum + (item.gst_amount || 0), 0) : 0
  const cgstAmount = Math.round((totalGst / 2) * 100) / 100
  const sgstAmount = Math.round((totalGst / 2) * 100) / 100
  const igstAmount = 0

  const calculatedGrandTotal = Math.round((taxableAmount + totalGst) * 100) / 100
  const roundOff = 0
  const grandTotal = calculatedGrandTotal

  const totalCogs = cartItems.reduce((sum, item) => sum + (item.cost_price || 0) * item.quantity, 0)
  const dueAmount = Math.max(0, Math.round((grandTotal - paidAmount) * 100) / 100)

  // Auto update paid amount when total changes if non-due/mixed
  useEffect(() => {
    if (paymentMode === 'cash') {
      setPaidAmount(grandTotal)
      setCashAmount(grandTotal)
    } else if (paymentMode === 'upi') {
      setPaidAmount(grandTotal)
      setUpiAmount(grandTotal)
    } else if (paymentMode === 'card') {
      setPaidAmount(grandTotal)
      setCardAmount(grandTotal)
    } else if (paymentMode === 'bank') {
      setPaidAmount(grandTotal)
      setBankAmount(grandTotal)
    } else if (paymentMode === 'wallet') {
      setPaidAmount(grandTotal)
      setWalletAmount(grandTotal)
    } else if (paymentMode === 'due') {
      setPaidAmount(0)
    }
  }, [grandTotal, paymentMode])

  // Handle Preset Stop item
  function handlePresetItem(preset: { productName: string; rate: number; quantity: number }) {
    const matchedProd = products.find(p => p.name.toLowerCase() === preset.productName.toLowerCase())
    const newItem: BillingCartItem = {
      id: `cart-stop-${Date.now()}`,
      product_id: matchedProd?.id || null,
      product_name: matchedProd?.name || preset.productName,
      quantity: preset.quantity,
      rate: preset.rate,
      mrp: matchedProd?.mrp || preset.rate,
      cost_price: matchedProd?.cost_price || 0,
      item_discount: 0,
      discount_type: 'flat',
      gst_rate: isGstEnabled ? (matchedProd?.gst_rate || 0) : 0,
      taxable_amount: preset.quantity * preset.rate,
      gst_amount: 0,
      amount: preset.quantity * preset.rate,
      total: preset.quantity * preset.rate,
      return_qty: 0,
      leak_qty: 0
    }
    setCartItems(prev => [...prev, newItem])
  }

  // Transactional Save Execution
  async function handleSave(shouldPrint = false) {
    if (cartItems.length === 0) {
      alert('⚠️ Please add at least one product line item to this bill.')
      return
    }

    if (billType === 'customer' && !selectedCustomer) {
      alert('⚠️ Please select a customer account or add a new customer.')
      return
    }

    if (billType === 'dealer' && !selectedDealer) {
      alert('⚠️ Please select a dealer account or add a new dealer.')
      return
    }

    if (billType === 'route' && (!selectedDriverId || !selectedRouteId)) {
      alert('⚠️ Please select both a Driver and a Route for this Route Bill.')
      return
    }

    setSaving(true)
    setErrorMessage(null)

    try {
      // Determine customer name & info
      let effectiveCustName = 'Walk-in Customer'
      let effectivePhone: string | null = null
      let effectiveAddress: string | null = null
      let effectiveGstin: string | null = null

      if (billType === 'counter') {
        effectiveCustName = walkinName.trim() || 'Walk-in Customer'
        effectivePhone = walkinPhone.trim() || null
        effectiveAddress = walkinAddress.trim() || null
        effectiveGstin = walkinGstin.trim() || null
      } else if (billType === 'customer' && selectedCustomer) {
        effectiveCustName = selectedCustomer.name
        effectivePhone = selectedCustomer.phone || selectedCustomer.mobile || null
        effectiveAddress = selectedCustomer.address || null
        effectiveGstin = selectedCustomer.gst_number || selectedCustomer.gstin || null
      } else if (billType === 'dealer' && selectedDealer) {
        effectiveCustName = selectedDealer.name
        effectivePhone = selectedDealer.phone || null
        effectiveAddress = selectedDealer.address || null
        effectiveGstin = selectedDealer.gst_number || selectedDealer.gstin || null
      } else if (billType === 'route') {
        const stopObj = customers.find(c => c.id === selectedRouteCustomerId)
        effectiveCustName = stopObj?.name || walkinName.trim() || 'Route Customer'
        effectivePhone = stopObj?.phone || walkinPhone.trim() || null
        effectiveAddress = stopObj?.address || null
      }

      // Collect returns & leakages
      const returns = cartItems
        .filter(i => Number(i.return_qty) > 0)
        .map(i => ({
          product_id: i.product_id || null,
          product_name: i.product_name,
          quantity: Number(i.return_qty),
          reason: 'Can / Empty Return'
        }))

      const leakages = cartItems
        .filter(i => Number(i.leak_qty) > 0)
        .map(i => ({
          product_id: i.product_id || null,
          product_name: i.product_name,
          quantity: Number(i.leak_qty),
          financial_loss: Number(i.leak_qty) * (i.cost_price || i.rate * 0.7)
        }))

      const finalInvoiceNumber = invoiceNumber || `RK-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`
      const payload = {
        invoice_number: finalInvoiceNumber,
        bill_type: billType,
        customer_name: effectiveCustName,
        customer_phone: effectivePhone,
        customer_address: effectiveAddress,
        customer_gstin: effectiveGstin,
        customer_id: billType === 'customer' ? selectedCustomer?.id : null,
        dealer_id: billType === 'dealer' ? selectedDealer?.id : null,
        driver_id: billType === 'route' ? selectedDriverId : null,
        route_id: billType === 'route' ? selectedRouteId : null,
        route_customer_id: billType === 'route' ? selectedRouteCustomerId || null : null,
        subtotal: subtotal,
        taxable_amount: taxableAmount,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        gst_amount: totalGst,
        discount_amount: totalDiscount,
        round_off: roundOff,
        grand_total: grandTotal,
        total_amount: grandTotal,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        cash_amount: cashAmount,
        upi_amount: upiAmount,
        card_amount: cardAmount,
        wallet_amount: walletAmount,
        bank_amount: bankAmount,
        mixed_amount: paymentMode === 'mixed' ? paidAmount : 0,
        payment_mode: paymentMode,
        payment_status: paidAmount >= grandTotal ? ('paid' as PaymentStatus) : (paidAmount > 0 ? ('partial' as PaymentStatus) : ('due' as PaymentStatus)),
        date: date,
        notes: notes.trim() || null,
        created_by: `Unified POS (${billType.toUpperCase()})`,
        items: cartItems.map(i => ({
          product_id: i.product_id || null,
          product_name: i.product_name,
          quantity: i.quantity,
          rate: i.rate,
          mrp: i.mrp ?? i.rate,
          cost_price: i.cost_price || 0,
          cost_per_unit_at_sale: i.cost_price || 0,
          item_discount: i.item_discount || 0,
          discount_type: i.discount_type || 'flat',
          gst_rate: isGstEnabled ? i.gst_rate : 0,
          taxable_amount: i.taxable_amount,
          gst_amount: isGstEnabled ? i.gst_amount : 0,
          amount: i.amount,
          total: i.total
        })),
        returns,
        leakages
      }

      const savedResult = await saveUnifiedBill(payload)
      setLastSavedBill(savedResult)

      if (onSuccess) {
        onSuccess(savedResult)
      }

      // Handle Print Workflow
      if (shouldPrint) {
        const billDataObj: BillData = {
          id: savedResult.id,
          invoice_number: savedResult.invoice_number,
          bill_type: savedResult.bill_type,
          customer_name: savedResult.customer_name,
          customer_phone: effectivePhone,
          customer_address: effectiveAddress,
          customer_gstin: effectiveGstin,
          subtotal: subtotal,
          gst_amount: totalGst,
          discount_amount: totalDiscount,
          total_amount: grandTotal,
          payment_method: paymentMode,
          cash_amount: cashAmount,
          upi_amount: upiAmount,
          paid_amount: paidAmount,
          due_amount: dueAmount,
          payment_status: savedResult.payment_status,
          date: date,
          items: cartItems.map(i => ({
            product_name: i.product_name,
            quantity: i.quantity,
            rate: i.rate,
            amount: i.total,
            item_discount: i.item_discount,
            gst_rate: isGstEnabled ? i.gst_rate : 0,
            gst_amount: isGstEnabled ? i.gst_amount : 0,
            total: i.total
          }))
        }
        setSavedBillForPrint(billDataObj)
      } else {
        alert(`✅ ${billType.toUpperCase()} Bill #${savedResult.invoice_number} saved successfully! Amount: ₹${savedResult.total_amount}`)
      }

      // Reset form for next invoice
      setCartItems([])
      setPaidAmount(0)
      setCashAmount(0)
      setUpiAmount(0)
      setCardAmount(0)
      setBankAmount(0)
      setWalletAmount(0)
      setNotes('')
      setReference('')
      setWalkinName('')
      setWalkinPhone('')
      setWalkinAddress('')
      setWalkinGstin('')
      setSelectedCustomer(null)
      setSelectedDealer(null)
      setSelectedRouteCustomerId('')

      const nextD = new Date()
      setInvoiceNumber(`RK-${nextD.getFullYear()}${String(nextD.getMonth()+1).padStart(2,'0')}${String(nextD.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`)

    } catch (err: any) {
      console.error('Unified bill save failure:', err)
      setErrorMessage(err.message || 'An unexpected error occurred while saving the bill.')
      alert(`❌ Failed to save bill: ${err.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  const billTypes: { type: UnifiedBillType; label: string; icon: any; desc: string }[] = [
    { type: 'counter', label: 'Counter Bill', icon: Receipt, desc: 'Quick POS walk-in sale' },
    { type: 'customer', label: 'Customer Bill', icon: Users, desc: 'Registered customer account & balance' },
    { type: 'dealer', label: 'Dealer Bill', icon: Building2, desc: 'Dealer wholesale with code & credit' },
    { type: 'route', label: 'Route Bill', icon: Truck, desc: 'Driver truck run & customer stops' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. PROMINENT BILL TYPE SELECTOR AT TOP */}
      <div style={{
        background: '#121214',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '0.75rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
          SELECT BILLING TYPE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
          {billTypes.map(bt => {
            const Icon = bt.icon
            const isSelected = billType === bt.type
            return (
              <button
                type="button"
                key={bt.type}
                onClick={() => setBillType(bt.type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: `1.5px solid ${isSelected ? '#fbbf24' : 'rgba(255,255,255,0.06)'}`,
                  background: isSelected ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255,255,255,0.02)',
                  color: isSelected ? '#fbbf24' : '#a1a1aa',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                  color: isSelected ? '#000' : '#d4d4d8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? '#fff' : '#e4e4e7' }}>
                    {bt.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: isSelected ? 'rgba(251,191,36,0.8)' : '#71717a' }}>
                    {bt.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Invoice Meta Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: '#121214',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '0.75rem 1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Invoice:</span>
          <span suppressHydrationWarning style={{ fontFamily: 'monospace', fontWeight: 800, color: '#fbbf24', fontSize: '1rem' }}>
            {invoiceNumber || 'RK-NEW'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Date:</span>
            <input 
              type="date" 
              suppressHydrationWarning
              value={date} 
              onChange={e => setDate(e.target.value)}
              style={{
                background: '#18181b',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                color: '#fff',
                padding: '0.3rem 0.5rem',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', color: isGstEnabled ? '#34d399' : '#a1a1aa' }}>
            <input 
              type="checkbox" 
              checked={isGstEnabled} 
              onChange={e => setIsGstEnabled(e.target.checked)} 
            />
            <span>GST Tax Invoice (18% / 12%)</span>
          </label>
        </div>
      </div>

      {/* 2. DYNAMIC CONTEXT SECTION BASED ON BILL TYPE */}
      <div style={{
        background: '#121214',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '1.25rem'
      }}>
        {billType === 'counter' && (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Counter Walk-In Customer Information (Optional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <Input 
                label="Customer Name" 
                placeholder="Walk-in Customer" 
                value={walkinName} 
                onChange={e => setWalkinName(e.target.value)} 
              />
              <Input 
                label="Phone Number" 
                placeholder="Mobile number (optional)" 
                value={walkinPhone} 
                onChange={e => setWalkinPhone(e.target.value)} 
              />
              <Input 
                label="Customer Address" 
                placeholder="Local address" 
                value={walkinAddress} 
                onChange={e => setWalkinAddress(e.target.value)} 
              />
              <Input 
                label="Customer GSTIN" 
                placeholder="GSTIN if tax bill" 
                value={walkinGstin} 
                onChange={e => setWalkinGstin(e.target.value)} 
              />
            </div>
          </div>
        )}

        {billType === 'customer' && (
          <BillingCustomerSelector
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onCustomerCreated={newCust => setCustomers(prev => [newCust, ...prev])}
          />
        )}

        {billType === 'dealer' && (
          <BillingDealerSelector
            dealers={dealers}
            selectedDealer={selectedDealer}
            onSelectDealer={setSelectedDealer}
            onDealerCreated={newDlr => setDealers(prev => [newDlr, ...prev])}
          />
        )}

        {billType === 'route' && (
          <BillingRouteSelector
            drivers={drivers}
            routes={routes}
            selectedDriverId={selectedDriverId}
            selectedRouteId={selectedRouteId}
            selectedRouteCustomerId={selectedRouteCustomerId}
            deliveryDate={date}
            onDriverChange={setSelectedDriverId}
            onRouteChange={setSelectedRouteId}
            onRouteCustomerSelect={stop => setSelectedRouteCustomerId(stop?.id || '')}
            onDeliveryDateChange={setDate}
            onApplyPresetItem={handlePresetItem}
          />
        )}
      </div>

      {/* 3. SHARED PRODUCT CART TABLE */}
      <div style={{
        background: '#121214',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '1.25rem'
      }}>
        <BillingProductTable
          items={cartItems}
          availableProducts={products}
          isGstEnabled={isGstEnabled}
          showReturnsAndLeakages={billType === 'route' || billType === 'dealer'}
          onItemsChange={setCartItems}
        />
      </div>

      {/* 4. PAYMENT & FINANCIAL SUMMARY GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Payment Panel */}
        <div style={{
          background: '#121214',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '1.25rem'
        }}>
          <BillingPaymentPanel
            grandTotal={grandTotal}
            paidAmount={paidAmount}
            paymentMode={paymentMode}
            cashAmount={cashAmount}
            upiAmount={upiAmount}
            cardAmount={cardAmount}
            bankAmount={bankAmount}
            walletAmount={walletAmount}
            notes={notes}
            reference={reference}
            onPaidAmountChange={setPaidAmount}
            onPaymentModeChange={setPaymentMode}
            onCashChange={setCashAmount}
            onUpiChange={setUpiAmount}
            onCardChange={setCardAmount}
            onBankChange={setBankAmount}
            onWalletChange={setWalletAmount}
            onNotesChange={setNotes}
            onReferenceChange={setReference}
          />
        </div>

        {/* Financial Summary */}
        <div style={{
          background: '#121214',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '1.25rem'
        }}>
          <BillingSummary
            subtotal={subtotal}
            taxableAmount={taxableAmount}
            cgstAmount={cgstAmount}
            sgstAmount={sgstAmount}
            igstAmount={igstAmount}
            gstAmount={totalGst}
            discountAmount={totalDiscount}
            roundOff={roundOff}
            grandTotal={grandTotal}
            paidAmount={paidAmount}
            dueAmount={dueAmount}
            totalCogs={totalCogs}
            isGstEnabled={isGstEnabled}
            billDiscountValue={billDiscountValue}
            billDiscountType={billDiscountType}
            onBillDiscountValueChange={setBillDiscountValue}
            onBillDiscountTypeChange={setBillDiscountType}
          />

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1.25rem' }}>
            <Button
              type="button"
              variant="primary"
              size="lg"
              loading={saving}
              onClick={() => handleSave(false)}
              icon={<Save style={{ width: '18px', height: '18px' }} />}
              style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}
            >
              Post & Save {billType.toUpperCase()} Bill
            </Button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={saving}
                onClick={() => handleSave(true)}
                icon={<Printer style={{ width: '15px', height: '15px', color: '#fbbf24' }} />}
              >
                Save & Print Bill
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  if (cartItems.length === 0) {
                    alert('Please add items first to preview bill receipt.')
                    return
                  }
                  setIsPreviewOpen(true)
                }}
                icon={<FileText style={{ width: '15px', height: '15px' }} />}
              >
                Receipt Preview
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preview for Saved Bill (Save & Print) */}
      {savedBillForPrint && (
        <ReceiptPreviewModal
          isOpen={!!savedBillForPrint}
          onClose={() => setSavedBillForPrint(null)}
          bill={savedBillForPrint}
          initialFormat="80mm"
        />
      )}

      {/* Modal Preview for Draft Bill */}
      {isPreviewOpen && (
        <ReceiptPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          initialFormat="80mm"
          bill={{
            invoice_number: invoiceNumber,
            bill_type: billType,
            customer_name: billType === 'customer' ? selectedCustomer?.name || 'Customer' : billType === 'dealer' ? selectedDealer?.name || 'Dealer' : walkinName || 'Walk-in Customer',
            customer_phone: walkinPhone || selectedCustomer?.phone || selectedDealer?.phone || null,
            customer_address: walkinAddress || selectedCustomer?.address || selectedDealer?.address || null,
            subtotal: subtotal,
            gst_amount: totalGst,
            discount_amount: totalDiscount,
            total_amount: grandTotal,
            paid_amount: paidAmount,
            due_amount: dueAmount,
            payment_method: paymentMode,
            date: date,
            items: cartItems.map(i => ({
              product_name: i.product_name,
              quantity: i.quantity,
              rate: i.rate,
              amount: i.total,
              total: i.total
            }))
          }}
        />
      )}
    </div>
  )
}
