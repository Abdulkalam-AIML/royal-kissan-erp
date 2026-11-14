'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import { 
  Store, 
  Plus, 
  Phone, 
  MapPin, 
  DollarSign, 
  ArrowLeft, 
  CheckCircle, 
  CreditCard, 
  FileText, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  Share2, 
  TrendingUp, 
  Boxes, 
  RotateCcw, 
  AlertTriangle,
  User,
  Building,
  Calendar,
  Save,
  Eye,
  Trash2,
  Layers,
  ShoppingBag,
  Receipt,
  Truck,
  CheckCircle2,
  ShieldCheck,
  Scale
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton'
import ReceiptPreviewModal from '@/components/printer/ReceiptPreviewModal'
import WhatsAppShareModal from '@/components/whatsapp/WhatsAppShareModal'
import { BillData } from '@/lib/printer/receipt'
import { round2 } from '@/lib/pricing/pricing-engine'
import {
  validateGSTIN,
  calculateDealerGSTBreakdown,
  createDealerDispatch,
  getDealerDispatches,
  recordDealerReturnAndLeakage,
  getDealerReturns,
  calculateDealerDailySettlement,
  confirmDealerDailySettlement,
  getDealerUnappliedCredits,
  applyDealerCreditsToBill,
  ROYAL_KISSAN_STATE_CODE
} from '@/lib/services/dealer-service'
import {
  Dealer,
  DealerDispatchWithItems,
  DealerReturnEntryWithItems,
  DealerDailySettlement
} from '@/lib/types/database'

// Master Products List for Dealer Product-Wise Sales Matrix
const MASTER_PRODUCTS = [
  { id: 'p1', name: 'Water Can (20L)', default_rate: 18, unit: 'cans', category: 'can' },
  { id: 'p2', name: 'Cooling Can (20L)', default_rate: 30, unit: 'cans', category: 'can' },
  { id: 'p3', name: 'Bags (100 Pack)', default_rate: 80, unit: 'pkts', category: 'bag' },
  { id: 'p4', name: '500ml Bottle Case', default_rate: 140, unit: 'cases', category: 'bottle' },
  { id: 'p5', name: '1L Bottle Case', default_rate: 120, unit: 'cases', category: 'bottle' },
  { id: 'p6', name: '2L Bottle Case', default_rate: 150, unit: 'cases', category: 'bottle' },
  { id: 'p7', name: 'Empty Cans (20L)', default_rate: 150, unit: 'pcs', category: 'raw' },
  { id: 'p8', name: 'Caps (Pack of 1000)', default_rate: 250, unit: 'pkts', category: 'raw' },
]

// Fallback dealers data
const INITIAL_DEALERS: any[] = [
  { 
    id: 'd1', 
    dealer_code: 'DLR-1001',
    name: 'Babu Water Supplying', 
    area: 'Kamavarapukota', 
    route: 'Nuzvid - Eluru Highway',
    phone: '9347662554', 
    gst_number: '37BABS2021G1Z3',
    is_gst_enabled: true,
    default_gst_rate: 18,
    state_code: '37',
    address: 'Main Road, Kamavarapukota, AP',
    outstanding_amount: 14500, 
    credit_limit: 50000, 
    is_active: true,
    total_purchases: 185000,
    last_purchase_date: '2026-08-02'
  },
  { 
    id: 'd2', 
    dealer_code: 'DLR-1002',
    name: 'Bobby Wine Shop & Retail', 
    area: 'Nuzvid', 
    route: 'Local Town Route',
    phone: '9393064848', 
    gst_number: '37BOBBY9921K1Z2',
    is_gst_enabled: true,
    default_gst_rate: 18,
    state_code: '37',
    address: 'Bus Stand Road, Nuzvid',
    outstanding_amount: 8200, 
    credit_limit: 30000, 
    is_active: true,
    total_purchases: 94000,
    last_purchase_date: '2026-08-01'
  },
  { 
    id: 'd3', 
    dealer_code: 'DLR-1003',
    name: 'Vissannapeta Water Junction', 
    area: 'Vissannapeta', 
    route: 'Vissannapeta Route',
    phone: '9849072413', 
    gst_number: '37VISSAN8812L1Z9',
    is_gst_enabled: false,
    default_gst_rate: 18,
    state_code: '37',
    address: 'Market Yard, Vissannapeta',
    outstanding_amount: 0, 
    credit_limit: 25000, 
    is_active: true,
    total_purchases: 62000,
    last_purchase_date: '2026-07-28'
  }
]

interface ProductRow {
  product_id: string
  product_name: string
  unit: string
  qty: number
  rate: number
  discount: number
  remarks: string
}

export default function DealersPage() {
  const [dealers, setDealers] = useState<any[]>(INITIAL_DEALERS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterArea, setFilterArea] = useState('all')
  const [selectedDealer, setSelectedDealer] = useState<any | null>(INITIAL_DEALERS[0])
  
  // Navigation Tabs inside Dealer Workspace
  const [activeTab, setActiveTab] = useState<
    'sales_matrix' | 'load_dispatches' | 'returns_leakages' | 'daily_settlement' | 'history' | 'due_ledger' | 'analytics'
  >('sales_matrix')
  
  const [previewBill, setPreviewBill] = useState<BillData | null>(null)
  const [whatsAppBill, setWhatsAppBill] = useState<any | null>(null)

  // Dispatches & Returns Data State
  const [dispatchesList, setDispatchesList] = useState<DealerDispatchWithItems[]>([])
  const [returnsList, setReturnsList] = useState<DealerReturnEntryWithItems[]>([])
  const [settlementData, setSettlementData] = useState<DealerDailySettlement | null>(null)
  const [settlementDate, setSettlementDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [confirmingSettlement, setConfirmingSettlement] = useState(false)

  // Dealer Creation Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDealerForm, setNewDealerForm] = useState({
    name: '',
    phone: '',
    address: '',
    area: '',
    route: '',
    gst_number: '',
    is_gst_enabled: true,
    default_gst_rate: 18,
    state_code: '37',
    credit_limit: 50000
  })
  const [savingDealer, setSavingDealer] = useState(false)

  // Due Collection Modal
  const [showCollectModal, setShowCollectModal] = useState(false)
  const [collectForm, setCollectForm] = useState({
    amount: 0,
    mode: 'cash' as 'cash' | 'upi' | 'bank',
    notes: 'Dealer Due Payment'
  })
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // ── LOAD DISPATCH MODAL STATE ──
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0])
  const [dispatchStaff, setDispatchStaff] = useState('Operations Staff')
  const [dispatchNotes, setDispatchNotes] = useState('')
  const [dispatchItems, setDispatchItems] = useState([
    { product_id: 'p3', product_name: 'Bags (100 Pack)', unit: 'pkts', quantity: 100, rate: 70, amount: 7000 }
  ])
  const [savingDispatch, setSavingDispatch] = useState(false)

  // ── NEXT-DAY RETURNS & LEAKAGE MODAL STATE ──
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedDispatchForReturn, setSelectedDispatchForReturn] = useState<DealerDispatchWithItems | null>(null)
  const [returnReportingDate, setReturnReportingDate] = useState(new Date().toISOString().split('T')[0])
  const [returnCondition, setReturnCondition] = useState<'good' | 'damaged' | 'leaked' | 'unsellable'>('good')
  const [returnNotes, setReturnNotes] = useState('')
  const [returnItemsState, setReturnItemsState] = useState<any[]>([])
  const [savingReturn, setSavingReturn] = useState(false)

  // ── PRODUCT-WISE SALES MATRIX STATE ──
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [applyGstOnMatrix, setApplyGstOnMatrix] = useState<boolean>(true)
  const [productRows, setProductRows] = useState<ProductRow[]>(
    MASTER_PRODUCTS.map(p => ({
      product_id: p.id,
      product_name: p.name,
      unit: p.unit,
      qty: p.name.includes('Water Can') ? 15 : p.name.includes('Cooling') ? 10 : p.name.includes('Bags') ? 5 : 0,
      rate: p.default_rate,
      discount: 0,
      remarks: ''
    }))
  )

  // Split Payments State
  const [payments, setPayments] = useState({
    cash: 0,
    upi: 0,
    bank: 0,
    advance: 0
  })

  // Dealer Invoices & Ledgers History State
  const [dealerBills, setDealerBills] = useState<any[]>([])
  const [dealerLedger, setDealerLedger] = useState<any[]>([])
  const [savingBill, setSavingBill] = useState(false)
  const [unappliedCredits, setUnappliedCredits] = useState<{
    dealerId: string
    returnCreditTotal: number
    leakageCreditTotal: number
    otherCreditTotal: number
    totalAvailableCredit: number
    adjustments: any[]
  }>({
    dealerId: '',
    returnCreditTotal: 0,
    leakageCreditTotal: 0,
    otherCreditTotal: 0,
    totalAvailableCredit: 0,
    adjustments: []
  })

  const supabase = createClient()

  useDataSyncListener(['dealers', 'bills', 'dues', 'collections', 'stock', 'all'], () => { 
    loadDealers() 
    if (selectedDealer?.id) {
      loadDealerHistory(selectedDealer.id)
      loadDispatchesAndReturns(selectedDealer.id)
    }
  })

  useEffect(() => {
    loadDealers()
  }, [])

  useEffect(() => {
    if (selectedDealer?.id) {
      loadDealerHistory(selectedDealer.id)
      loadDispatchesAndReturns(selectedDealer.id)
      setApplyGstOnMatrix(selectedDealer.is_gst_enabled !== false && Boolean(selectedDealer.gst_number))
    }
  }, [selectedDealer?.id])

  useEffect(() => {
    if (selectedDealer?.id && activeTab === 'daily_settlement') {
      loadSettlementBreakdown(selectedDealer.id, settlementDate)
    }
  }, [selectedDealer?.id, activeTab, settlementDate])

  async function loadDealers() {
    setLoading(true)
    try {
      const { data } = await supabase.from('dealers').select('*').order('name')
      const list = (data && data.length > 0) ? data : INITIAL_DEALERS
      setDealers(list)
      if (!selectedDealer) setSelectedDealer(list[0])
    } catch {
      setDealers(INITIAL_DEALERS)
      if (!selectedDealer) setSelectedDealer(INITIAL_DEALERS[0])
    } finally {
      setLoading(false)
    }
  }

  async function loadDispatchesAndReturns(dealerId: string) {
    try {
      const [dispatches, returns, credits] = await Promise.all([
        getDealerDispatches(dealerId),
        getDealerReturns(dealerId),
        getDealerUnappliedCredits(dealerId)
      ])
      setDispatchesList(dispatches)
      setReturnsList(returns)
      setUnappliedCredits(credits)
    } catch (e) {
      console.warn('Failed to load dealer dispatches/returns/credits:', e)
    }
  }

  async function loadSettlementBreakdown(dealerId: string, date: string) {
    try {
      const st = await calculateDealerDailySettlement(dealerId, date)
      setSettlementData(st)
    } catch (e) {
      console.warn('Failed to load settlement:', e)
    }
  }

  async function loadDealerHistory(dealerId: string) {
    try {
      const [{ data: bills }, { data: ledger }] = await Promise.all([
        supabase.from('bills').select('*').or(`dealer_id.eq.${dealerId},customer_name.eq.${selectedDealer?.name}`).order('date', { ascending: false }),
        supabase.from('dealer_ledger').select('*').eq('dealer_id', dealerId).order('created_at', { ascending: false })
      ])
      
      setDealerBills(bills || [])
      setDealerLedger(ledger || [])
    } catch {
      // Fallback
    }
  }

  // Handle GSTIN input change in add modal with instant validation
  const gstValidation = validateGSTIN(newDealerForm.gst_number)

  async function handleCreateDealer() {
    if (!newDealerForm.name.trim()) {
      alert('Dealer Name is required')
      return
    }
    setSavingDealer(true)
    try {
      const dealerCode = `DLR-${Math.floor(1000 + Math.random() * 9000)}`
      const stateCode = newDealerForm.gst_number ? newDealerForm.gst_number.slice(0, 2) : '37'

      const payload = { 
        ...newDealerForm, 
        dealer_code: dealerCode, 
        state_code: stateCode,
        outstanding_amount: 0, 
        is_active: true 
      }
      
      const { data, error } = await supabase.from('dealers').insert([payload]).select().single()
      if (error) throw error
      setDealers(prev => [data, ...prev])
      setSelectedDealer(data)
      setShowAddModal(false)
      setNewDealerForm({ 
        name: '', 
        phone: '', 
        address: '', 
        area: '', 
        route: '', 
        gst_number: '', 
        is_gst_enabled: true, 
        default_gst_rate: 18, 
        state_code: '37', 
        credit_limit: 50000 
      })
      emitDataChange('dealers')
      alert('✅ New Dealer account created successfully!')
    } catch (e: any) {
      alert(`Error saving dealer: ${e.message}`)
    } finally {
      setSavingDealer(false)
    }
  }

  async function handleCollectDue() {
    if (!selectedDealer || collectForm.amount <= 0) {
      alert('Please enter a valid collection amount')
      return
    }
    setSubmittingPayment(true)
    try {
      const newDue = Math.max(0, (selectedDealer.outstanding_amount || 0) - collectForm.amount)

      await supabase.from('dealers').update({ outstanding_amount: newDue }).eq('id', selectedDealer.id)

      const todayDate = new Date().toISOString().split('T')[0]
      await supabase.from('dealer_collections').insert([{
        dealer_id: selectedDealer.id,
        amount: collectForm.amount,
        payment_mode: collectForm.mode,
        collected_date: todayDate,
        date: todayDate,
        notes: collectForm.notes || `Dealer Due Payment for ${selectedDealer.name}`,
        collected_by: 'Dealer Admin'
      }])

      await supabase.from('collections').insert([{
        customer_name: selectedDealer.name,
        amount: collectForm.amount,
        payment_mode: collectForm.mode,
        date: todayDate,
        notes: `Dealer Due Collection - ${selectedDealer.name}`
      }])

      const updated = { ...selectedDealer, outstanding_amount: newDue }
      setDealers(prev => prev.map(d => d.id === selectedDealer.id ? updated : d))
      setSelectedDealer(updated)
      setShowCollectModal(false)
      setCollectForm({ amount: 0, mode: 'cash', notes: 'Dealer Due Payment' })
      emitDataChange('dealers')
      emitDataChange('collections')
      emitDataChange('dues')
      loadDealerHistory(selectedDealer.id)
      alert('✅ Payment collected successfully!')
    } catch (e: any) {
      alert(`Error collecting payment: ${e.message}`)
    } finally {
      setSubmittingPayment(false)
    }
  }

  // ── AUTO CALCULATIONS FOR PRODUCT MATRIX WITH GST BREAKDOWN ──
  const updateProductRow = (index: number, field: keyof ProductRow, value: any) => {
    const next = [...productRows]
    next[index] = { ...next[index], [field]: value }
    setProductRows(next)
  }

  const grossTotal = productRows.reduce((sum, row) => sum + (row.qty * row.rate), 0)
  const totalDiscount = productRows.reduce((sum, row) => sum + Number(row.discount || 0), 0)
  const netTaxableAmount = Math.max(0, grossTotal - totalDiscount)

  // GST Calculation
  const isDealerGstValid = selectedDealer?.gst_number ? validateGSTIN(selectedDealer.gst_number) : null
  const isInterstate = isDealerGstValid ? isDealerGstValid.isInterstate : false
  const dealerGstRate = Number(selectedDealer?.default_gst_rate || 18)
  const gstBreakdown = calculateDealerGSTBreakdown({
    taxableAmount: netTaxableAmount,
    gstRate: applyGstOnMatrix ? dealerGstRate : 0,
    isInterstate,
    isGstEnabled: applyGstOnMatrix
  })

  const subtotalWithGst = applyGstOnMatrix ? gstBreakdown.grandTotal : netTaxableAmount
  const creditDeduction = Math.min(unappliedCredits.totalAvailableCredit, subtotalWithGst)
  const netBillAmount = Math.max(0, round2(subtotalWithGst - creditDeduction))
  const totalPaid = Number(payments.cash || 0) + Number(payments.upi || 0) + Number(payments.bank || 0) + Number(payments.advance || 0)
  const pendingDue = Math.max(0, netBillAmount - totalPaid)
  const previousDue = selectedDealer?.outstanding_amount || 0
  const grandTotalDue = previousDue + pendingDue
  const totalQtySold = productRows.reduce((sum, r) => sum + Number(r.qty || 0), 0)

  // Save Dealer GST Invoice
  async function handleSaveBill(shouldPrint = false) {
    if (netBillAmount <= 0 && grossTotal <= 0) {
      alert('Please add at least one product quantity to generate bill')
      return
    }
    if (!selectedDealer) {
      alert('Please select a dealer')
      return
    }
    setSavingBill(true)
    try {
      const invNo = `RK-DLR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const activeRows = productRows.filter(r => r.qty > 0)
      
      const billPayload = {
        invoice_number: invNo,
        customer_name: selectedDealer.name,
        dealer_id: selectedDealer.id,
        customer_phone: selectedDealer.phone || null,
        customer_address: selectedDealer.address || null,
        customer_gstin: selectedDealer.gst_number || null,
        date: saleDate,
        subtotal: grossTotal,
        discount_amount: totalDiscount,
        taxable_amount: gstBreakdown.taxableAmount,
        gst_amount: gstBreakdown.gstAmount,
        cgst_amount: gstBreakdown.cgstAmount,
        sgst_amount: gstBreakdown.sgstAmount,
        igst_amount: gstBreakdown.igstAmount,
        return_credit: unappliedCredits.returnCreditTotal,
        leakage_credit: unappliedCredits.leakageCreditTotal,
        credit_adjusted: creditDeduction,
        total_amount: netBillAmount,
        grand_total: netBillAmount,
        paid_amount: totalPaid,
        due_amount: pendingDue,
        cash_amount: Number(payments.cash || 0),
        upi_amount: Number(payments.upi || 0),
        bank_amount: Number(payments.bank || 0),
        bill_type: applyGstOnMatrix && gstBreakdown.gstAmount > 0 ? 'gst_invoice' : 'dealer_invoice',
        payment_mode: totalPaid >= netBillAmount ? 'cash' : totalPaid > 0 ? 'mixed' : 'due',
        payment_status: totalPaid >= netBillAmount ? 'paid' : totalPaid > 0 ? 'partial' : 'due',
        items_count: activeRows.length,
        notes: `Dealer Invoice for ${selectedDealer.name}${creditDeduction > 0 ? ` (Deducted ₹${creditDeduction} Prev. Return/Leakage Credits)` : ''}`,
        created_by: 'Dealer Workspace'
      }

      const itemsPayload = activeRows.map(r => ({
        product_name: r.product_name,
        quantity: r.qty,
        rate: r.rate,
        item_discount: Number(r.discount || 0),
        discount_type: 'flat',
        amount: Math.max(0, (r.qty * r.rate) - Number(r.discount || 0)),
        total: Math.max(0, (r.qty * r.rate) - Number(r.discount || 0)),
        gst_rate: applyGstOnMatrix ? dealerGstRate : 0,
        gst_amount: applyGstOnMatrix ? round2(((r.qty * r.rate) * dealerGstRate) / 100) : 0
      }))

      const { data: dData, error: dErr } = await supabase.from('bills').insert([billPayload]).select().single()
      if (!dErr && dData) {
        const childItems = itemsPayload.map(i => ({ ...i, bill_id: dData.id }))
        await supabase.from('bill_items').insert(childItems)

        // Apply unapplied return & leakage credits to link them permanently to this invoice
        if (unappliedCredits.adjustments && unappliedCredits.adjustments.length > 0) {
          await applyDealerCreditsToBill({
            dealerId: selectedDealer.id,
            billId: dData.id,
            invoiceNumber: invNo,
            creditAdjustmentIds: unappliedCredits.adjustments.map(a => a.id)
          })
          loadDispatchesAndReturns(selectedDealer.id)
        }
      }

      // Update dealer balance
      const newOut = (selectedDealer.outstanding_amount || 0) + pendingDue
      await supabase.from('dealers').update({
        outstanding_amount: newOut,
        total_purchases: (selectedDealer.total_purchases || 0) + netBillAmount,
        last_purchase_date: saleDate
      }).eq('id', selectedDealer.id)

      setSelectedDealer({ ...selectedDealer, outstanding_amount: newOut })
      emitDataChange('dealers')
      emitDataChange('bills')
      emitDataChange('dues')

      if (shouldPrint) {
        setPreviewBill({
          invoice_number: invNo,
          customer_name: selectedDealer.name,
          customer_phone: selectedDealer.phone,
          customer_address: selectedDealer.address,
          customer_gstin: selectedDealer.gst_number,
          dealer_name: selectedDealer.name,
          dealer_gstin: selectedDealer.gst_number,
          dealer_address: selectedDealer.address,
          date: saleDate,
          subtotal: grossTotal,
          today_dispatch: grossTotal,
          return_credit: unappliedCredits.returnCreditTotal,
          leakage_credit: unappliedCredits.leakageCreditTotal,
          credit_adjusted: creditDeduction,
          taxable_amount: gstBreakdown.taxableAmount,
          gst_amount: gstBreakdown.gstAmount,
          cgst_amount: gstBreakdown.cgstAmount,
          sgst_amount: gstBreakdown.sgstAmount,
          igst_amount: gstBreakdown.igstAmount,
          discount_amount: totalDiscount,
          total_amount: netBillAmount,
          paid_amount: totalPaid,
          due_amount: pendingDue,
          bill_type: applyGstOnMatrix ? 'gst_invoice' : 'dealer_invoice',
          payment_method: totalPaid >= netBillAmount ? 'CASH' : 'MIXED/CREDIT',
          items: itemsPayload
        })
      } else {
        alert('✅ Dealer Invoice saved successfully!')
      }

      loadDealerHistory(selectedDealer.id)
    } catch (e: any) {
      alert(`Error saving invoice: ${e.message}`)
    } finally {
      setSavingBill(false)
    }
  }

  // ── SUBMIT LOAD DISPATCH ──
  async function handleCreateDispatch() {
    if (!selectedDealer) return
    setSavingDispatch(true)

    const totalVal = dispatchItems.reduce((s, it) => s + (it.quantity * it.rate), 0)

    try {
      const res = await createDealerDispatch({
        dealer_id: selectedDealer.id,
        dealer_name: selectedDealer.name,
        dealer_gstin: selectedDealer.gst_number,
        is_gst_enabled: selectedDealer.is_gst_enabled ?? false,
        is_interstate: isInterstate,
        dispatch_date: dispatchDate,
        subtotal: totalVal,
        total_value: totalVal,
        responsible_staff: dispatchStaff,
        notes: dispatchNotes,
        items: dispatchItems
      })

      if (!res.success) {
        alert(res.message)
        return
      }

      alert(`✅ Load Dispatch #${res.dispatch?.dispatch_number} recorded! Warehouse stock deducted.`)
      setShowDispatchModal(false)
      loadDispatchesAndReturns(selectedDealer.id)
      loadDealerHistory(selectedDealer.id)
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setSavingDispatch(false)
    }
  }

  // ── OPEN RETURN & LEAKAGE MODAL ──
  function openReturnEntryModal(dispatch: DealerDispatchWithItems) {
    setSelectedDispatchForReturn(dispatch)
    setReturnReportingDate(new Date().toISOString().split('T')[0])
    setReturnCondition('good')
    setReturnNotes('')

    const initRows = (dispatch.items || []).map(it => ({
      dispatch_item_id: it.id,
      product_id: it.product_id,
      product_name: it.product_name,
      unit: it.unit,
      original_quantity: it.quantity,
      previously_returned: it.returned_quantity || 0,
      previously_leaked: it.leaked_quantity || 0,
      remaining_qty: Math.max(0, it.quantity - ((it.returned_quantity || 0) + (it.leaked_quantity || 0))),
      new_returned_qty: 0,
      new_leaked_qty: 0,
      original_rate: it.rate,
      adjustment_rate: it.rate, // Preserves original dispatch rate by default
      override_reason: ''
    }))

    setReturnItemsState(initRows)
    setShowReturnModal(true)
  }

  // ── SUBMIT RETURN & LEAKAGE (NEXT-DAY ADJUSTMENT) ──
  async function handleSubmitReturnAndLeakage() {
    if (!selectedDispatchForReturn || !selectedDealer) return

    // Validation
    let hasAnyReturn = false
    for (const r of returnItemsState) {
      if (r.new_returned_qty > 0 || r.new_leaked_qty > 0) hasAnyReturn = true
      if (r.new_returned_qty + r.new_leaked_qty > r.remaining_qty) {
        alert(`Validation error: Returned (${r.new_returned_qty}) + Leaked (${r.new_leaked_qty}) exceeds remaining dispatch qty (${r.remaining_qty}) for ${r.product_name}!`)
        return
      }
    }

    if (!hasAnyReturn) {
      alert('Please enter at least one returned or leaked quantity.')
      return
    }

    setSavingReturn(true)
    try {
      const itemsPayload = returnItemsState.map(r => ({
        dispatch_item_id: r.dispatch_item_id,
        product_id: r.product_id,
        product_name: r.product_name,
        unit: r.unit,
        original_quantity: r.original_quantity,
        returned_quantity: Number(r.new_returned_qty) || 0,
        leaked_quantity: Number(r.new_leaked_qty) || 0,
        original_rate: r.original_rate,
        adjustment_rate: Number(r.adjustment_rate) || r.original_rate,
        override_reason: r.override_reason || null
      }))

      const res = await recordDealerReturnAndLeakage({
        dealer_id: selectedDealer.id,
        dispatch_id: selectedDispatchForReturn.id,
        dispatch_date: selectedDispatchForReturn.dispatch_date,
        return_date: returnReportingDate, // Key: dated the reporting day!
        condition: returnCondition,
        notes: returnNotes,
        items: itemsPayload
      })

      if (!res.success) {
        alert(res.message)
        return
      }

      alert(`✅ Next-Day Return & Leakage recorded!\nCredit of ₹${res.returnEntry?.total_credit_amount} applied to ${returnReportingDate} account.\nOriginal dispatch (${selectedDispatchForReturn.dispatch_date}) preserved unchanged.`)
      setShowReturnModal(false)
      loadDispatchesAndReturns(selectedDealer.id)
      loadDealerHistory(selectedDealer.id)
    } catch (e: any) {
      alert(`Error saving return: ${e.message}`)
    } finally {
      setSavingReturn(false)
    }
  }

  // ── CONFIRM DAILY SETTLEMENT ──
  async function handleConfirmDailySettlement() {
    if (!settlementData || !selectedDealer) return
    setConfirmingSettlement(true)
    try {
      const res = await confirmDealerDailySettlement(settlementData)
      if (res.success) {
        alert(`✅ Daily Account Settlement confirmed for ${settlementDate}!`)
        loadSettlementBreakdown(selectedDealer.id, settlementDate)
        loadDealerHistory(selectedDealer.id)
      } else {
        alert(res.message)
      }
    } catch (e: any) {
      alert(`Error confirming settlement: ${e.message}`)
    } finally {
      setConfirmingSettlement(false)
    }
  }

  // Print Load Dispatch Note
  function printLoadDispatchNote(dispatch: DealerDispatchWithItems) {
    setPreviewBill({
      invoice_number: dispatch.dispatch_number,
      customer_name: dispatch.dealer_name,
      dealer_name: dispatch.dealer_name,
      dealer_gstin: dispatch.dealer_gstin,
      date: dispatch.dispatch_date,
      subtotal: dispatch.subtotal,
      taxable_amount: dispatch.taxable_amount,
      gst_amount: dispatch.gst_amount,
      cgst_amount: dispatch.cgst_amount,
      sgst_amount: dispatch.sgst_amount,
      igst_amount: dispatch.igst_amount,
      total_amount: dispatch.total_value,
      paid_amount: 0,
      due_amount: dispatch.total_value,
      bill_type: 'LOAD DISPATCH NOTE (NOT A SALES INVOICE)' as any,
      items: (dispatch.items || []).map(it => ({
        product_name: it.product_name,
        quantity: it.quantity,
        rate: it.rate,
        amount: it.amount
      }))
    })
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', color: '#f4f4f5' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '10px', color: '#fbbf24' }}>
              <Store style={{ width: 22, height: 22 }} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
              Dealer Management &amp; Next-Day Reconciliation
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#a1a1aa', margin: 0 }}>
            GST-compliant billing, daily load dispatches, next-day return &amp; leakage adjustments, and daily account settlements.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button variant="secondary" onClick={() => setShowAddModal(true)} icon={<Plus style={{ width: 16, height: 16 }} />}>
            Create Dealer
          </Button>
          <Button variant="primary" onClick={() => setShowDispatchModal(true)} icon={<Truck style={{ width: 16, height: 16 }} />}>
            Issue Load Dispatch
          </Button>
        </div>
      </div>

      {/* Main Dealer Workspace Layout (Sidebar List + 360 Workspace) */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* LEFT COLUMN: DEALER DIRECTORY LIST */}
        <Card style={{ padding: '1rem', backgroundColor: '#121215', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Input
              placeholder="Search dealers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {dealers
              .filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.area?.toLowerCase().includes(search.toLowerCase()))
              .map(d => {
                const isSelected = selectedDealer?.id === d.id
                const isDue = (d.outstanding_amount || 0) > 0

                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDealer(d)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.06)',
                      backgroundColor: isSelected ? 'rgba(251, 191, 36, 0.08)' : '#18181b',
                      transition: 'all 150ms'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, color: isSelected ? '#fbbf24' : '#fff', fontSize: '0.9rem' }}>
                        {d.name}
                      </div>
                      {d.gst_number && (
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderRadius: '4px', fontWeight: 700 }}>
                          GST
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.2rem' }}>
                      📍 {d.area || 'General Area'} &bull; 📞 {d.phone || 'No phone'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                      <span style={{ color: '#71717a' }}>Balance Due:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, color: isDue ? '#f87171' : '#34d399' }}>
                          ₹{Number(d.outstanding_amount || 0).toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          title="WhatsApp Bill / Statement"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDealer(d)
                            setWhatsAppBill({
                              id: `STMT-${d.id}`,
                              invoice_number: `STMT-${d.id.slice(0, 8).toUpperCase()}`,
                              dealer_name: d.name,
                              dealer_phone: d.phone,
                              dealer_gstin: d.gst_number,
                              dealer_address: d.address,
                              date: new Date().toISOString().split('T')[0],
                              bill_type: 'ACCOUNT STATEMENT',
                              subtotal: Number(d.total_purchases || 0),
                              total_amount: Number(d.outstanding_amount || 0),
                              grand_total: Number(d.outstanding_amount || 0),
                              paid_amount: 0,
                              due_amount: Number(d.outstanding_amount || 0),
                              previous_balance: Number(d.outstanding_amount || 0),
                              items: [
                                { product_name: 'Current Outstanding Balance', quantity: 1, rate: Number(d.outstanding_amount || 0), amount: Number(d.outstanding_amount || 0) }
                              ]
                            })
                          }}
                          style={{
                            background: 'rgba(37, 211, 102, 0.12)',
                            border: '1px solid rgba(37, 211, 102, 0.3)',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#25D366">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.223-.559-1.848-.767-3.037-2.656-3.129-2.78-.093-.123-.746-.991-.746-1.888 0-.898.469-1.339.636-1.52.167-.182.366-.228.487-.228.121 0 .243.002.348.006.111.005.26-.042.407.311.152.365.518 1.265.564 1.357.045.092.076.2.015.322-.061.122-.092.199-.183.307-.091.107-.191.24-.273.322-.091.091-.186.19-.08.373.106.183.473.78 1.016 1.263.699.623 1.288.816 1.472.907.183.092.29.077.397-.046.107-.123.456-.533.578-.716.121-.183.243-.153.407-.092.164.061 1.042.492 1.22.583.178.091.297.137.34.213.045.076.045.441-.099.846z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>

        {/* RIGHT COLUMN: DEALER 360 WORKSPACE */}
        {selectedDealer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Dealer Profile & GST Banner */}
            <Card style={{ padding: '1.5rem', backgroundColor: '#121215' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                      {selectedDealer.name}
                    </h2>
                    <Badge variant="neutral">{selectedDealer.dealer_code || 'DLR-ACTIVE'}</Badge>
                    {selectedDealer.gst_number ? (
                      <Badge variant="success" icon={<ShieldCheck style={{ width: 12, height: 12 }} />}>
                        GST Registered ({selectedDealer.gst_number})
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Non-GST Account</Badge>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '0.4rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <span>📍 Area: <strong style={{ color: '#fff' }}>{selectedDealer.area || 'N/A'}</strong></span>
                    <span>🛣️ Route: <strong style={{ color: '#fff' }}>{selectedDealer.route || 'General Route'}</strong></span>
                    <span>📞 Phone: <strong style={{ color: '#fff' }}>{selectedDealer.phone || 'N/A'}</strong></span>
                    <span>🏢 Tax Regime: <strong style={{ color: '#60a5fa' }}>{isInterstate ? 'Inter-State (IGST)' : 'Intra-State AP (CGST + SGST)'}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    style={{ color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.3)' }}
                    icon={
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.223-.559-1.848-.767-3.037-2.656-3.129-2.78-.093-.123-.746-.991-.746-1.888 0-.898.469-1.339.636-1.52.167-.182.366-.228.487-.228.121 0 .243.002.348.006.111.005.26-.042.407.311.152.365.518 1.265.564 1.357.045.092.076.2.015.322-.061.122-.092.199-.183.307-.091.107-.191.24-.273.322-.091.091-.186.19-.08.373.106.183.473.78 1.016 1.263.699.623 1.288.816 1.472.907.183.092.29.077.397-.046.107-.123.456-.533.578-.716.121-.183.243-.153.407-.092.164.061 1.042.492 1.22.583.178.091.297.137.34.213.045.076.045.441-.099.846z"/>
                      </svg>
                    }
                    onClick={async () => {
                      if (dealerBills.length > 0) {
                        const latestBill = dealerBills[0]
                        const { data: itemRows } = await supabase.from('bill_items').select('*').eq('bill_id', latestBill.id)
                        const items = itemRows && itemRows.length > 0 ? itemRows : (latestBill.items || [
                          { product_name: 'Water Can (20L)', quantity: 1, rate: Number(latestBill.total_amount) || 0, amount: Number(latestBill.total_amount) || 0 }
                        ])
                        setWhatsAppBill({
                          ...latestBill,
                          dealer_name: selectedDealer.name,
                          dealer_phone: selectedDealer.phone,
                          dealer_gstin: selectedDealer.gst_number,
                          dealer_address: selectedDealer.address,
                          previous_balance: selectedDealer.outstanding_amount || 0,
                          items
                        })
                      } else {
                        setWhatsAppBill({
                          id: `STMT-${selectedDealer.id}`,
                          invoice_number: `STMT-${selectedDealer.id.slice(0, 8).toUpperCase()}`,
                          dealer_name: selectedDealer.name,
                          dealer_phone: selectedDealer.phone,
                          dealer_gstin: selectedDealer.gst_number,
                          dealer_address: selectedDealer.address,
                          date: new Date().toISOString().split('T')[0],
                          bill_type: 'ACCOUNT STATEMENT',
                          subtotal: Number(selectedDealer.total_purchases || 0),
                          total_amount: Number(selectedDealer.outstanding_amount || 0),
                          grand_total: Number(selectedDealer.outstanding_amount || 0),
                          paid_amount: 0,
                          due_amount: Number(selectedDealer.outstanding_amount || 0),
                          previous_balance: Number(selectedDealer.outstanding_amount || 0),
                          items: [
                            { product_name: 'Current Outstanding Balance', quantity: 1, rate: Number(selectedDealer.outstanding_amount || 0), amount: Number(selectedDealer.outstanding_amount || 0) }
                          ]
                        })
                      }
                    }}
                  >
                    WhatsApp Bill / Statement
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowCollectModal(true)} icon={<CreditCard style={{ width: 14, height: 14 }} />}>
                    Collect Payment
                  </Button>
                </div>
              </div>

              {/* Financial KPI Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Closing Balance Due</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: (selectedDealer.outstanding_amount || 0) > 0 ? '#f87171' : '#34d399' }}>
                    ₹{Number(selectedDealer.outstanding_amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Credit Limit</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24' }}>
                    ₹{Number(selectedDealer.credit_limit || 50000).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Lifetime Purchases</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#60a5fa' }}>
                    ₹{Number(selectedDealer.total_purchases || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Last Purchase Date</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
                    {selectedDealer.last_purchase_date || 'N/A'}
                  </div>
                </div>
              </div>
            </Card>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
              <Button variant={activeTab === 'sales_matrix' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('sales_matrix')}>
                🛒 Product-Wise Sales &amp; GST Billing
              </Button>
              <Button variant={activeTab === 'load_dispatches' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('load_dispatches')}>
                🚚 Daily Load Dispatches ({dispatchesList.length})
              </Button>
              <Button variant={activeTab === 'returns_leakages' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('returns_leakages')}>
                📦 Returns &amp; Leakage Log ({returnsList.length})
              </Button>
              <Button variant={activeTab === 'daily_settlement' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('daily_settlement')}>
                ⚖️ Daily Account Settlement
              </Button>
              <Button variant={activeTab === 'history' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('history')}>
                📜 Billing History
              </Button>
              <Button variant={activeTab === 'due_ledger' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('due_ledger')}>
                🔴 Running Due Ledger
              </Button>
            </div>

            {/* TAB 1: PRODUCT-WISE SALES MATRIX & GST BILLING */}
            {activeTab === 'sales_matrix' && (
              <Card style={{ padding: '1.5rem', backgroundColor: '#121215' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingBag style={{ color: '#fbbf24', width: '18px', height: '18px' }} />
                    Dealer Sales Ledger &amp; GST Invoice ({selectedDealer.name})
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#fff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={applyGstOnMatrix}
                        onChange={e => setApplyGstOnMatrix(e.target.checked)}
                        style={{ accentColor: '#fbbf24', cursor: 'pointer' }}
                      />
                      <span>Apply GST ({dealerGstRate}%)</span>
                    </label>

                    <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} style={{ width: 'auto', marginBottom: 0 }} />
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Product Name</th>
                        <th style={{ padding: '0.75rem', width: '70px' }}>Unit</th>
                        <th style={{ padding: '0.75rem', width: '90px' }}>Sold Qty</th>
                        <th style={{ padding: '0.75rem', width: '100px' }}>Rate (₹)</th>
                        <th style={{ padding: '0.75rem', width: '90px' }}>Discount (₹)</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '120px' }}>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productRows.map((row, idx) => {
                        const lineTotal = (row.qty * row.rate) - Number(row.discount || 0)
                        return (
                          <tr key={row.product_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: row.qty > 0 ? 'rgba(251, 191, 36, 0.03)' : 'transparent' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#fff' }}>{row.product_name}</td>
                            <td style={{ padding: '0.75rem', color: '#a1a1aa' }}>{row.unit}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <input
                                type="number"
                                min="0"
                                value={row.qty || ''}
                                onChange={e => updateProductRow(idx, 'qty', Number(e.target.value))}
                                style={{ width: '100%', backgroundColor: '#09090b', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '0.4rem', borderRadius: '6px', textAlign: 'center', fontWeight: 800 }}
                              />
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <input
                                type="number"
                                min="0"
                                value={row.rate}
                                onChange={e => updateProductRow(idx, 'rate', Number(e.target.value))}
                                style={{ width: '100%', backgroundColor: '#09090b', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fbbf24', padding: '0.4rem', borderRadius: '6px', textAlign: 'center', fontWeight: 800 }}
                              />
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <input
                                type="number"
                                min="0"
                                value={row.discount || ''}
                                onChange={e => updateProductRow(idx, 'discount', Number(e.target.value))}
                                style={{ width: '100%', backgroundColor: '#09090b', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#34d399', padding: '0.4rem', borderRadius: '6px', textAlign: 'center' }}
                              />
                            </td>
                            <td className="num" style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: lineTotal > 0 ? '#fbbf24' : '#a1a1aa' }}>
                              ₹{lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* GST & Next-Day Credit Financial Breakdown Summary Box */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.25rem', padding: '1.25rem', backgroundColor: '#09090b', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Today&apos;s New Dispatch</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>₹{grossTotal.toFixed(2)}</div>
                  </div>

                  {applyGstOnMatrix && (
                    <>
                      {isInterstate ? (
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#60a5fa', textTransform: 'uppercase' }}>IGST ({dealerGstRate}%)</span>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa' }}>₹{gstBreakdown.igstAmount.toFixed(2)}</div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: '#60a5fa', textTransform: 'uppercase' }}>CGST ({dealerGstRate / 2}%)</span>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa' }}>₹{gstBreakdown.cgstAmount.toFixed(2)}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: '#60a5fa', textTransform: 'uppercase' }}>SGST ({dealerGstRate / 2}%)</span>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa' }}>₹{gstBreakdown.sgstAmount.toFixed(2)}</div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {unappliedCredits.returnCreditTotal > 0 && (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#34d399', textTransform: 'uppercase' }}>Prev. Dispatch Returns</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>-₹{unappliedCredits.returnCreditTotal.toFixed(2)}</div>
                    </div>
                  )}

                  {unappliedCredits.leakageCreditTotal > 0 && (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#f87171', textTransform: 'uppercase' }}>Prev. Dispatch Leakage</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>-₹{unappliedCredits.leakageCreditTotal.toFixed(2)}</div>
                    </div>
                  )}

                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#fbbf24', textTransform: 'uppercase' }}>Net Payable (After Credits)</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24' }}>₹{netBillAmount.toFixed(2)}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: pendingDue > 0 ? '#f87171' : '#34d399', textTransform: 'uppercase' }}>Pending Due</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: pendingDue > 0 ? '#f87171' : '#34d399' }}>₹{pendingDue.toFixed(2)}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <Button variant="secondary" onClick={() => handleSaveBill(true)} icon={<Printer style={{ width: 15, height: 15 }} />}>
                    Print GST Bill
                  </Button>
                  <Button variant="primary" loading={savingBill} onClick={() => handleSaveBill(false)} icon={<Save style={{ width: 15, height: 15 }} />}>
                    Save Dealer Invoice
                  </Button>
                </div>
              </Card>
            )}

            {/* TAB 2: DEALER LOAD DISPATCHES */}
            {activeTab === 'load_dispatches' && (
              <Card style={{ padding: '1.5rem', backgroundColor: '#121215' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Truck style={{ color: '#fbbf24', width: '18px', height: '18px' }} />
                      Dealer Load Dispatches (Goods Issued)
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '0.2rem 0 0' }}>
                      Issued loads deduct warehouse stock and generate Load Dispatch Notes (Distinct from Sales Invoices).
                    </p>
                  </div>

                  <Button variant="primary" size="sm" onClick={() => setShowDispatchModal(true)} icon={<Plus style={{ width: 14, height: 14 }} />}>
                    Issue New Load Dispatch
                  </Button>
                </div>

                {dispatchesList.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#a1a1aa' }}>
                    <Truck style={{ width: 36, height: 36, margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No dispatches recorded for this dealer yet.</p>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: '#71717a' }}>Issue a load dispatch to track goods issued and enable next-day return logging.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>Dispatch #</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Items Issued</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Qty</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Value (₹)</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dispatchesList.map(disp => (
                          <tr key={disp.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                              {disp.dispatch_number}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: '#fff' }}>{disp.dispatch_date}</td>
                            <td style={{ padding: '0.85rem 1rem', color: '#a1a1aa' }}>
                              {(disp.items || []).map(it => `${it.product_name} (${it.quantity} ${it.unit})`).join(', ') || 'General load'}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                              {disp.total_quantity}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#fbbf24' }}>
                              ₹{Number(disp.total_value).toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <Badge variant={disp.status === 'SETTLED' ? 'success' : 'info'}>{disp.status}</Badge>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <Button variant="secondary" size="sm" onClick={() => printLoadDispatchNote(disp)} icon={<Printer style={{ width: 12, height: 12 }} />}>
                                  Note
                                </Button>
                                <Button variant="primary" size="sm" onClick={() => openReturnEntryModal(disp)} icon={<RotateCcw style={{ width: 12, height: 12 }} />}>
                                  Returns
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* TAB 3: DEALER RETURNS & LEAKAGE LOG */}
            {activeTab === 'returns_leakages' && (
              <Card style={{ padding: '1.5rem', backgroundColor: '#121215' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <RotateCcw style={{ color: '#60a5fa', width: '18px', height: '18px' }} />
                      Dealer Next-Day Returns &amp; Leakage Log
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '0.2rem 0 0' }}>
                      Credits are applied to the reporting day&apos;s account at original dispatch rates, leaving historical dispatches unchanged.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus style={{ width: 14, height: 14 }} />}
                    onClick={() => {
                      if (dispatchesList.length === 0) {
                        alert('No load dispatches recorded for this dealer yet. Please issue a load dispatch first.')
                        return
                      }
                      openReturnEntryModal(dispatchesList[0])
                    }}
                  >
                    + Log Previous Dispatch Return &amp; Leakage
                  </Button>
                </div>

                {returnsList.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#a1a1aa' }}>
                    <RotateCcw style={{ width: 36, height: 36, margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No return entries logged yet.</p>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: '#71717a' }}>To log returns, open the Daily Load Dispatches tab and click &quot;Returns&quot; on any dispatch.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>Return #</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Reporting Date</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Orig. Dispatch Date</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Returned (Good)</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Leaked / Damaged</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Credit Adjustment (₹)</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Condition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnsList.map(ret => (
                          <tr key={ret.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                              {ret.return_number}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: '#34d399', fontWeight: 600 }}>
                              {ret.return_date}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: '#a1a1aa' }}>
                              {ret.dispatch_date}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <Badge variant="info">{ret.total_returned_qty} Units</Badge>
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <Badge variant="danger">{ret.total_leaked_qty} Leaks</Badge>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#34d399' }}>
                              -₹{Number(ret.total_credit_amount).toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textTransform: 'uppercase', fontSize: '0.75rem', color: '#a1a1aa' }}>
                              {ret.condition}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* TAB 4: DEALER DAILY SETTLEMENT */}
            {activeTab === 'daily_settlement' && (
              <Card style={{ padding: '1.5rem', backgroundColor: '#121215' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Scale style={{ color: '#fbbf24', width: '18px', height: '18px' }} />
                      Dealer Daily Account &amp; Outstanding Settlement
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '0.2rem 0 0' }}>
                      Reconcile opening balance, dispatches, next-day returns, leakage credits, and collections.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Input
                      type="date"
                      value={settlementDate}
                      onChange={e => setSettlementDate(e.target.value)}
                      style={{ marginBottom: 0, width: 'auto' }}
                    />
                    <Button variant="primary" size="sm" loading={confirmingSettlement} onClick={handleConfirmDailySettlement} icon={<CheckCircle2 style={{ width: 14, height: 14 }} />}>
                      Confirm Daily Settlement
                    </Button>
                  </div>
                </div>

                {/* Formula Breakdown Card */}
                <div style={{ background: '#09090b', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.25)', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1rem' }}>
                    Settlement Equation ({settlementDate})
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Opening Balance</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>₹{settlementData?.opening_balance?.toLocaleString('en-IN') || 0}</div>
                    </div>

                    <div style={{ fontSize: '1.2rem', color: '#a1a1aa', textAlign: 'center' }}>+</div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#fbbf24', textTransform: 'uppercase' }}>Today Dispatches</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>₹{settlementData?.today_dispatches_amount?.toLocaleString('en-IN') || 0}</div>
                    </div>

                    <div style={{ fontSize: '1.2rem', color: '#a1a1aa', textAlign: 'center' }}>-</div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#60a5fa', textTransform: 'uppercase' }}>Returns Credit</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>₹{settlementData?.previous_returns_credit?.toLocaleString('en-IN') || 0}</div>
                    </div>

                    <div style={{ fontSize: '1.2rem', color: '#a1a1aa', textAlign: 'center' }}>-</div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#f87171', textTransform: 'uppercase' }}>Leakage Credit</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171' }}>₹{settlementData?.previous_leakage_credit?.toLocaleString('en-IN') || 0}</div>
                    </div>

                    <div style={{ fontSize: '1.2rem', color: '#a1a1aa', textAlign: 'center' }}>-</div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#34d399', textTransform: 'uppercase' }}>Collections</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>₹{settlementData?.collections_received?.toLocaleString('en-IN') || 0}</div>
                    </div>

                    <div style={{ fontSize: '1.2rem', color: '#a1a1aa', textAlign: 'center' }}>=</div>

                    <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>Closing Balance Due</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24' }}>₹{settlementData?.closing_balance?.toLocaleString('en-IN') || 0}</div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* TAB 5: BILLING HISTORY */}
            {activeTab === 'history' && (
              <Card style={{ padding: '1.5rem', backgroundColor: '#121215' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>Billing &amp; Invoice History</h3>
                <DataTable
                  columns={[
                    { key: 'invoice_number', title: 'Invoice #', render: r => <span style={{ fontWeight: 800, color: '#fbbf24' }}>{r.invoice_number}</span> },
                    { key: 'date', title: 'Date' },
                    { key: 'bill_type', title: 'Type', render: r => <Badge variant="info">{r.bill_type}</Badge> },
                    { key: 'taxable_amount', title: 'Taxable (₹)', render: r => <span>₹{Number(r.taxable_amount || r.total_amount).toFixed(2)}</span> },
                    { key: 'gst_amount', title: 'GST (₹)', render: r => <span>₹{Number(r.gst_amount || 0).toFixed(2)}</span> },
                    { key: 'grand_total', title: 'Total (₹)', render: r => <span style={{ fontWeight: 800, color: '#fff' }}>₹{Number(r.grand_total || r.total_amount).toFixed(2)}</span> },
                    { key: 'paid_amount', title: 'Paid (₹)', render: r => <span style={{ color: '#34d399' }}>₹{Number(r.paid_amount || 0).toFixed(2)}</span> },
                    { key: 'due_amount', title: 'Due (₹)', render: r => <span style={{ color: Number(r.due_amount) > 0 ? '#f87171' : '#a1a1aa' }}>₹{Number(r.due_amount || 0).toFixed(2)}</span> },
                    { key: 'payment_status', title: 'Status', render: r => <Badge variant={r.payment_status === 'paid' ? 'success' : 'warning'}>{r.payment_status}</Badge> },
                    {
                      key: 'actions',
                      title: 'Actions',
                      align: 'center',
                      render: r => (
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              const { data: itemRows } = await supabase.from('bill_items').select('*').eq('bill_id', r.id)
                              const items = itemRows && itemRows.length > 0 ? itemRows : [
                                { product_name: 'Water Can 20L', quantity: 1, rate: Number(r.total_amount) || 0, amount: Number(r.total_amount) || 0 }
                              ]
                              setPreviewBill({
                                ...r,
                                dealer_name: selectedDealer?.name || r.customer_name,
                                dealer_gstin: selectedDealer?.gst_number || r.customer_gstin,
                                dealer_phone: selectedDealer?.phone || r.customer_phone,
                                dealer_address: selectedDealer?.address || r.customer_address,
                                previous_balance: selectedDealer?.outstanding_amount || 0,
                                items
                              })
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.3)' }}
                            icon={
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.223-.559-1.848-.767-3.037-2.656-3.129-2.78-.093-.123-.746-.991-.746-1.888 0-.898.469-1.339.636-1.52.167-.182.366-.228.487-.228.121 0 .243.002.348.006.111.005.26-.042.407.311.152.365.518 1.265.564 1.357.045.092.076.2.015.322-.061.122-.092.199-.183.307-.091.107-.191.24-.273.322-.091.091-.186.19-.08.373.106.183.473.78 1.016 1.263.699.623 1.288.816 1.472.907.183.092.29.077.397-.046.107-.123.456-.533.578-.716.121-.183.243-.153.407-.092.164.061 1.042.492 1.22.583.178.091.297.137.34.213.045.076.045.441-.099.846z"/>
                              </svg>
                            }
                            onClick={async () => {
                              const { data: itemRows } = await supabase.from('bill_items').select('*').eq('bill_id', r.id)
                              const items = itemRows && itemRows.length > 0 ? itemRows : [
                                { product_name: 'Water Can 20L', quantity: 1, rate: Number(r.total_amount) || 0, amount: Number(r.total_amount) || 0 }
                              ]
                              setWhatsAppBill({
                                ...r,
                                dealer_name: selectedDealer?.name || r.customer_name,
                                dealer_gstin: selectedDealer?.gst_number || r.customer_gstin,
                                dealer_phone: selectedDealer?.phone || r.customer_phone,
                                dealer_address: selectedDealer?.address || r.customer_address,
                                previous_balance: selectedDealer?.outstanding_amount || 0,
                                items
                              })
                            }}
                          >
                            WhatsApp
                          </Button>
                        </div>
                      )
                    }
                  ]}
                  data={dealerBills}
                />
              </Card>
            )}

            {/* TAB 6: RUNNING DUE LEDGER */}
            {activeTab === 'due_ledger' && (
              <Card style={{ padding: '1.5rem', backgroundColor: '#121215' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>Running Ledger Audit</h3>
                <DataTable
                  columns={[
                    { key: 'created_at', title: 'Timestamp', render: r => <span>{new Date(r.created_at).toLocaleString('en-IN')}</span> },
                    { key: 'transaction_type', title: 'Type', render: r => <Badge variant={r.transaction_type === 'dispatch' ? 'warning' : 'success'}>{r.transaction_type}</Badge> },
                    { key: 'amount', title: 'Amount (₹)', render: r => <span style={{ fontWeight: 800, color: '#fff' }}>₹{Number(r.amount).toLocaleString('en-IN')}</span> },
                    { key: 'reference_id', title: 'Reference ID', render: r => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#a1a1aa' }}>{r.reference_id?.slice(0, 18)}...</span> }
                  ]}
                  data={dealerLedger}
                />
              </Card>
            )}
          </div>
        ) : (
          <Card style={{ padding: '3rem', textAlign: 'center', color: '#a1a1aa' }}>
            Select a dealer from the directory list to open the workspace.
          </Card>
        )}
      </div>

      {/* MODAL 1: CREATE DEALER */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '640px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Create New Dealer Account</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
              <Input label="Dealer Business / Contact Name *" placeholder="e.g. Ramesh Water Traders" value={newDealerForm.name} onChange={e => setNewDealerForm({ ...newDealerForm, name: e.target.value })} />
              <Input label="Phone Number" placeholder="10-digit mobile" value={newDealerForm.phone} onChange={e => setNewDealerForm({ ...newDealerForm, phone: e.target.value })} />
              
              {/* GST Configuration */}
              <div style={{ background: '#09090b', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>GST Configuration</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#fff', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newDealerForm.is_gst_enabled}
                      onChange={e => setNewDealerForm({ ...newDealerForm, is_gst_enabled: e.target.checked })}
                      style={{ accentColor: '#fbbf24' }}
                    />
                    <span>GST Enabled</span>
                  </label>
                </div>

                <Input
                  label="GSTIN Number (15-digit)"
                  placeholder="37AAAAA0000A1Z5"
                  value={newDealerForm.gst_number}
                  onChange={e => setNewDealerForm({ ...newDealerForm, gst_number: e.target.value.toUpperCase() })}
                  helperText={
                    newDealerForm.gst_number 
                      ? gstValidation.isValid 
                        ? `Valid GSTIN: State ${gstValidation.stateCode} (${gstValidation.isInterstate ? 'Inter-State IGST' : 'Intra-State AP CGST+SGST'})`
                        : gstValidation.error
                      : 'Optional for unregistered dealers'
                  }
                />

                <Select
                  label="Applicable GST Rate"
                  value={newDealerForm.default_gst_rate}
                  onChange={e => setNewDealerForm({ ...newDealerForm, default_gst_rate: Number(e.target.value) })}
                  options={[
                    { value: 0, label: '0% (Exempt)' },
                    { value: 5, label: '5% GST' },
                    { value: 12, label: '12% GST' },
                    { value: 18, label: '18% GST (Standard Packaged Water)' }
                  ]}
                />
              </div>

              <Input label="Area / Region" placeholder="e.g. Kamavarapukota" value={newDealerForm.area} onChange={e => setNewDealerForm({ ...newDealerForm, area: e.target.value })} />
              <Input label="Assigned Route" placeholder="e.g. Nuzvid Highway" value={newDealerForm.route} onChange={e => setNewDealerForm({ ...newDealerForm, route: e.target.value })} />
              <Input label="Credit Limit Amount (₹)" type="number" value={newDealerForm.credit_limit} onChange={e => setNewDealerForm({ ...newDealerForm, credit_limit: Number(e.target.value) })} />
              <Input label="Full Address" placeholder="Street / Landmark..." value={newDealerForm.address} onChange={e => setNewDealerForm({ ...newDealerForm, address: e.target.value })} />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button variant="primary" loading={savingDealer} onClick={handleCreateDealer}>Create Dealer Account</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ISSUE LOAD DISPATCH */}
      {showDispatchModal && selectedDealer && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '720px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                  Issue Daily Load Dispatch ({selectedDealer.name})
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '0.2rem 0 0' }}>
                  Generates Load Dispatch Note and deducts stock from warehouse inventory
                </p>
              </div>
              <button onClick={() => setShowDispatchModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="Dispatch Date" type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} />
                <Input label="Responsible Staff" value={dispatchStaff} onChange={e => setDispatchStaff(e.target.value)} />
              </div>

              {/* Items */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>Products to Dispatch</label>
                {dispatchItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <Input
                      label={idx === 0 ? 'Product Name' : undefined}
                      value={item.product_name}
                      onChange={e => {
                        const copy = [...dispatchItems]
                        copy[idx].product_name = e.target.value
                        setDispatchItems(copy)
                      }}
                    />
                    <Input
                      label={idx === 0 ? 'Quantity' : undefined}
                      type="number"
                      value={item.quantity}
                      onChange={e => {
                        const copy = [...dispatchItems]
                        const q = Number(e.target.value)
                        copy[idx].quantity = q
                        copy[idx].amount = q * copy[idx].rate
                        setDispatchItems(copy)
                      }}
                    />
                    <Input
                      label={idx === 0 ? 'Rate (₹)' : undefined}
                      type="number"
                      value={item.rate}
                      onChange={e => {
                        const copy = [...dispatchItems]
                        const r = Number(e.target.value)
                        copy[idx].rate = r
                        copy[idx].amount = copy[idx].quantity * r
                        setDispatchItems(copy)
                      }}
                    />
                    <div>
                      {idx === 0 && <label style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', marginBottom: '0.35rem' }}>Amount</label>}
                      <div style={{ padding: '0.65rem', fontWeight: 800, color: '#fbbf24' }}>₹{item.amount}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Input label="Dispatch Notes / Truck Details" placeholder="Vehicle number, batch info..." value={dispatchNotes} onChange={e => setDispatchNotes(e.target.value)} />
            </div>

            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowDispatchModal(false)}>Cancel</Button>
              <Button variant="primary" loading={savingDispatch} onClick={handleCreateDispatch}>Issue Load Dispatch</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD NEXT-DAY RETURN & LEAKAGE */}
      {showReturnModal && selectedDispatchForReturn && selectedDealer && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '780px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                  Record Next-Day Returns &amp; Leakage
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '0.2rem 0 0' }}>
                  Dispatch Ref: <strong style={{ color: '#fbbf24' }}>{selectedDispatchForReturn.dispatch_number}</strong> (Issued: {selectedDispatchForReturn.dispatch_date})
                </p>
              </div>
              <button onClick={() => setShowReturnModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
              {dispatchesList.length > 1 && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Select Load Dispatch Reference:
                  </label>
                  <select
                    value={selectedDispatchForReturn.id}
                    onChange={e => {
                      const d = dispatchesList.find(x => x.id === e.target.value)
                      if (d) openReturnEntryModal(d)
                    }}
                    style={{ width: '100%', padding: '0.5rem', backgroundColor: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  >
                    {dispatchesList.map(disp => (
                      <option key={disp.id} value={disp.id}>
                        {disp.dispatch_number} ({disp.dispatch_date}) — {disp.total_quantity} units (₹{Number(disp.total_value).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="Return Reporting Date *" type="date" value={returnReportingDate} onChange={e => setReturnReportingDate(e.target.value)} helperText="The day returns are reported (e.g. 14-11-2026)" />
                <Select
                  label="Product Condition"
                  value={returnCondition}
                  onChange={e => setReturnCondition(e.target.value as any)}
                  options={[
                    { value: 'good', label: 'Good condition (Return to Sellable Stock)' },
                    { value: 'damaged', label: 'Damaged (Loss / Quarantine)' },
                    { value: 'leaked', label: 'Leaked (Loss / Quarantine)' },
                    { value: 'unsellable', label: 'Unsellable (Scrap)' }
                  ]}
                />
              </div>

              {/* Items Return Table */}
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#09090b', color: '#a1a1aa', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Product</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Issued Qty</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Remaining</th>
                      <th style={{ padding: '0.6rem 0.75rem', width: '90px' }}>Return (Good)</th>
                      <th style={{ padding: '0.6rem 0.75rem', width: '90px' }}>Leak/Damaged</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Rate (₹)</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItemsState.map((r, i) => {
                      const lineCredit = ((Number(r.new_returned_qty) || 0) + (Number(r.new_leaked_qty) || 0)) * (Number(r.adjustment_rate) || r.original_rate)
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#fff' }}>{r.product_name}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{r.original_quantity}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: '#fbbf24', fontWeight: 700 }}>{r.remaining_qty}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <input
                              type="number"
                              min="0"
                              max={r.remaining_qty}
                              value={r.new_returned_qty || ''}
                              onChange={e => {
                                const copy = [...returnItemsState]
                                copy[i].new_returned_qty = Number(e.target.value)
                                setReturnItemsState(copy)
                              }}
                              style={{ width: '100%', padding: '0.35rem', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff' }}
                            />
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <input
                              type="number"
                              min="0"
                              max={r.remaining_qty}
                              value={r.new_leaked_qty || ''}
                              onChange={e => {
                                const copy = [...returnItemsState]
                                copy[i].new_leaked_qty = Number(e.target.value)
                                setReturnItemsState(copy)
                              }}
                              style={{ width: '100%', padding: '0.35rem', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#f87171' }}
                            />
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <input
                              type="number"
                              value={r.adjustment_rate}
                              onChange={e => {
                                const copy = [...returnItemsState]
                                copy[i].adjustment_rate = Number(e.target.value)
                                setReturnItemsState(copy)
                              }}
                              style={{ width: '80px', padding: '0.35rem', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fbbf24' }}
                            />
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#34d399' }}>
                            ₹{lineCredit.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <Input label="Remarks / Return Reason" placeholder="Inspection notes..." value={returnNotes} onChange={e => setReturnNotes(e.target.value)} />
            </div>

            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowReturnModal(false)}>Cancel</Button>
              <Button variant="primary" loading={savingReturn} onClick={handleSubmitReturnAndLeakage}>
                Record Return &amp; Apply Credit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: COLLECT DUE PAYMENT */}
      {showCollectModal && selectedDealer && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Record Dealer Due Payment</h3>
              <button onClick={() => setShowCollectModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>Dealer Account: <span style={{ color: '#fff', fontWeight: 700 }}>{selectedDealer.name}</span></div>
              <div>Current Balance Due: <span style={{ color: '#f87171', fontWeight: 800 }}>₹{Number(selectedDealer.outstanding_amount || 0).toLocaleString('en-IN')}</span></div>
              <Input label="Collection Payment Amount (₹)" type="number" value={collectForm.amount || ''} onChange={e => setCollectForm({ ...collectForm, amount: Number(e.target.value) })} />
              <Select label="Payment Mode" value={collectForm.mode} onChange={e => setCollectForm({ ...collectForm, mode: e.target.value as any })} options={[{ value: 'cash', label: 'Cash Deposit' }, { value: 'upi', label: 'UPI / PhonePe / GPay' }, { value: 'bank', label: 'Bank Transfer (NEFT/RTGS)' }]} />
              <Input label="Payment Notes / Reference" value={collectForm.notes} onChange={e => setCollectForm({ ...collectForm, notes: e.target.value })} />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowCollectModal(false)}>Cancel</Button>
              <Button variant="primary" loading={submittingPayment} onClick={handleCollectDue}>Record Collection</Button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW & PRINT MODAL */}
      {previewBill && (
        <ReceiptPreviewModal
          isOpen={!!previewBill}
          onClose={() => setPreviewBill(null)}
          bill={previewBill}
          initialFormat="80mm"
        />
      )}

      {/* WHATSAPP INVOICE SHARE MODAL */}
      {whatsAppBill && (
        <WhatsAppShareModal
          isOpen={!!whatsAppBill}
          onClose={() => setWhatsAppBill(null)}
          bill={whatsAppBill}
        />
      )}
    </div>
  )
}
