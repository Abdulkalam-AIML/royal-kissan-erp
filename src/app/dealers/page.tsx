'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  ShoppingBag
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton'

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
const INITIAL_DEALERS = [
  { 
    id: 'd1', 
    dealer_code: 'DLR-1001',
    name: 'Babu Water Supplying', 
    area: 'Kamavarapukota', 
    route: 'Nuzvid - Eluru Highway',
    phone: '9347662554', 
    gst_number: '37BABS2021G1Z3',
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
    address: 'Market Yard, Vissannapeta',
    outstanding_amount: 0, 
    credit_limit: 25000, 
    is_active: true,
    total_purchases: 62000,
    last_purchase_date: '2026-07-28'
  },
  { 
    id: 'd4', 
    dealer_code: 'DLR-1004',
    name: 'Narsayapuram Traders', 
    area: 'Narsayapuram', 
    route: 'Dammapeta Route',
    phone: '9640352593', 
    gst_number: '37NARSAY7712M1Z0',
    address: 'Narsayapuram Center',
    outstanding_amount: 12000, 
    credit_limit: 40000, 
    is_active: true,
    total_purchases: 112000,
    last_purchase_date: '2026-07-30'
  },
  { 
    id: 'd5', 
    dealer_code: 'DLR-1005',
    name: 'Kranthi Cool Drinks', 
    area: 'Kunavaram', 
    route: 'Kunavaram Highway',
    phone: '8464969797', 
    gst_number: '37KRANTHI6612N1Z4',
    address: 'Kunavaram Cross Road',
    outstanding_amount: 15400, 
    credit_limit: 60000, 
    is_active: true,
    total_purchases: 210000,
    last_purchase_date: '2026-08-03'
  },
]

interface ProductRow {
  product_id: string
  product_name: string
  unit: string
  qty: number
  rate: number // manual override
  return_qty: number
  leak_qty: number
  free_qty: number
  discount: number
  remarks: string
}

export default function DealersPage() {
  const [dealers, setDealers] = useState<any[]>(INITIAL_DEALERS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterArea, setFilterArea] = useState('all')
  const [selectedDealer, setSelectedDealer] = useState<any | null>(INITIAL_DEALERS[0])
  const [activeTab, setActiveTab] = useState<'sales_matrix' | 'history' | 'due_ledger' | 'payments' | 'returns_leakages' | 'analytics'>('sales_matrix')

  // Dealer Creation Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDealerForm, setNewDealerForm] = useState({
    name: '',
    phone: '',
    address: '',
    area: '',
    route: '',
    gst_number: '',
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

  // ── PRODUCT-WISE SALES MATRIX STATE ──
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [productRows, setProductRows] = useState<ProductRow[]>(
    MASTER_PRODUCTS.map(p => ({
      product_id: p.id,
      product_name: p.name,
      unit: p.unit,
      qty: p.name.includes('Water Can') ? 15 : p.name.includes('Cooling') ? 10 : p.name.includes('Bags') ? 5 : 0,
      rate: p.default_rate,
      return_qty: 0,
      leak_qty: 0,
      free_qty: 0,
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
  const [dealerReturns, setDealerReturns] = useState<any[]>([])
  const [savingBill, setSavingBill] = useState(false)

  const supabase = createClient()

  useEffect(() => { loadDealers() }, [])
  useEffect(() => {
    if (selectedDealer) {
      loadDealerHistory(selectedDealer.id)
    }
  }, [selectedDealer])

  async function loadDealers() {
    setLoading(true)
    try {
      const { data } = await supabase.from('dealers').select('*').order('name')
      if (data && data.length > 0) {
        setDealers(data)
        setSelectedDealer(data[0])
      }
    } catch {
      setDealers(INITIAL_DEALERS)
      setSelectedDealer(INITIAL_DEALERS[0])
    } finally {
      setLoading(false)
    }
  }

  async function loadDealerHistory(dealerId: string) {
    try {
      const [{ data: bills }, { data: collections }] = await Promise.all([
        supabase.from('bills').select('*').eq('customer_name', selectedDealer?.name).order('date', { ascending: false }),
        supabase.from('dealer_collections').select('*').order('collected_date', { ascending: false })
      ])
      
      setDealerBills(bills || [
        { id: 'b1', invoice_number: 'RK-2026-081', date: '2026-08-02', total_amount: 14500, paid_amount: 0, due_amount: 14500, payment_mode: 'due', payment_status: 'due', items_count: 3 },
        { id: 'b2', invoice_number: 'RK-2026-072', date: '2026-07-28', total_amount: 8200, paid_amount: 8200, due_amount: 0, payment_mode: 'upi', payment_status: 'paid', items_count: 2 }
      ])

      setDealerLedger([
        { date: '2026-08-02', type: 'Invoice RK-2026-081', debit: 14500, credit: 0, balance: 14500, notes: 'Multi-product billing' },
        { date: '2026-07-28', type: 'Payment UPI', debit: 0, credit: 8200, balance: 0, notes: 'Full due settlement' },
      ])

      setDealerReturns([
        { date: '2026-08-02', product: 'Water Can (20L)', return_qty: 12, leak_qty: 1, reason: 'Broken Cap Seals' },
        { date: '2026-07-28', product: 'Cooling Can (20L)', return_qty: 8, leak_qty: 0, reason: 'Empty Can Deposit Return' },
      ])
    } catch {
      // Fallback loaded
    }
  }

  async function handleCreateDealer() {
    if (!newDealerForm.name.trim()) {
      alert('Dealer Name is required')
      return
    }
    setSavingDealer(true)
    try {
      const dealerCode = `DLR-${Math.floor(1000 + Math.random() * 9000)}`
      const payload = { ...newDealerForm, dealer_code: dealerCode, outstanding_amount: 0, is_active: true }
      
      const { data, error } = await supabase.from('dealers').insert([payload]).select().single()
      if (error) throw error

      setDealers(prev => [data, ...prev])
      setSelectedDealer(data)
      setShowAddModal(false)
      setNewDealerForm({ name: '', phone: '', address: '', area: '', route: '', gst_number: '', credit_limit: 50000 })
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
      
      // Update dealer DB
      await supabase.from('dealers').update({ outstanding_amount: newDue }).eq('id', selectedDealer.id)
      
      // Log collection
      await supabase.from('dealer_collections').insert([{
        dealer_id: selectedDealer.id,
        amount: collectForm.amount,
        payment_mode: collectForm.mode,
        collected_date: new Date().toISOString().split('T')[0],
        notes: collectForm.notes
      }])

      const updated = { ...selectedDealer, outstanding_amount: newDue }
      setDealers(prev => prev.map(d => d.id === selectedDealer.id ? updated : d))
      setSelectedDealer(updated)
      setShowCollectModal(false)
      setCollectForm({ amount: 0, mode: 'cash', notes: 'Dealer Due Payment' })
      alert('✅ Payment collected successfully!')
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setSubmittingPayment(false)
    }
  }

  // ── AUTO CALCULATIONS FOR PRODUCT MATRIX ──
  const updateProductRow = (index: number, field: keyof ProductRow, value: any) => {
    const next = [...productRows]
    next[index] = { ...next[index], [field]: value }
    setProductRows(next)
  }

  const grossTotal = productRows.reduce((sum, row) => sum + (row.qty * row.rate), 0)
  const totalDiscount = productRows.reduce((sum, row) => sum + Number(row.discount || 0), 0)
  const netBillAmount = Math.max(0, grossTotal - totalDiscount)
  
  const totalPaid = Number(payments.cash || 0) + Number(payments.upi || 0) + Number(payments.bank || 0) + Number(payments.advance || 0)
  const pendingDue = Math.max(0, netBillAmount - totalPaid)
  const previousDue = selectedDealer?.outstanding_amount || 0
  const grandTotalDue = previousDue + pendingDue

  const totalQtySold = productRows.reduce((sum, r) => sum + Number(r.qty || 0), 0)
  const totalQtyReturned = productRows.reduce((sum, r) => sum + Number(r.return_qty || 0), 0)
  const totalQtyLeaked = productRows.reduce((sum, r) => sum + Number(r.leak_qty || 0), 0)

  async function handleSaveBill(shouldPrint = false) {
    if (netBillAmount <= 0) {
      alert('Please add at least one product quantity to generate bill')
      return
    }
    setSavingBill(true)
    try {
      const invNo = `RK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const activeRows = productRows.filter(r => r.qty > 0)
      
      const billPayload = {
        invoice_number: invNo,
        customer_name: selectedDealer.name,
        date: saleDate,
        total_amount: netBillAmount,
        paid_amount: totalPaid,
        due_amount: pendingDue,
        bill_type: 'dealer_invoice',
        payment_mode: totalPaid >= netBillAmount ? 'cash' : totalPaid > 0 ? 'mixed' : 'due',
        payment_status: totalPaid >= netBillAmount ? 'paid' : totalPaid > 0 ? 'partial' : 'due',
        items_count: activeRows.length
      }

      await supabase.from('bills').insert([billPayload])

      // Update Dealer Outstanding Balance
      const updatedDue = previousDue + pendingDue
      await supabase.from('dealers').update({ 
        outstanding_amount: updatedDue,
        total_purchases: (selectedDealer.total_purchases || 0) + netBillAmount,
        last_purchase_date: saleDate
      }).eq('id', selectedDealer.id)

      setSelectedDealer((prev: any) => (prev ? { ...prev, outstanding_amount: updatedDue } : null))

      alert(`✅ Bill ${invNo} saved successfully! Current Dealer Balance Due: ${formatCurrency(updatedDue)}`)
      if (shouldPrint) {
        window.print()
      }
    } catch (e: any) {
      alert(`Error saving bill: ${e.message}`)
    } finally {
      setSavingBill(false)
    }
  }

  // Filter Dealers
  const filteredDealers = dealers.filter(d => {
    const matchesSearch = d.name?.toLowerCase().includes(search.toLowerCase()) || d.phone?.includes(search) || d.area?.toLowerCase().includes(search.toLowerCase())
    const matchesArea = filterArea === 'all' || d.area === filterArea
    return matchesSearch && matchesArea
  })

  const uniqueAreas = Array.from(new Set(dealers.map(d => d.area).filter(Boolean)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Title & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Dealer Profile Workspace & Product-Wise Sales Matrix
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            360° Dealer CRM &bull; Multi-product billing, daily rate overrides, returns log, running dues & split collections.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="primary" icon={<Plus style={{ width: '16px', height: '16px' }} />} onClick={() => setShowAddModal(true)}>
            Add New Dealer Account
          </Button>
        </div>
      </div>

      {/* Main Dual-Panel Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        
        {/* LEFT PANEL: Dealer Directory & Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Input
                placeholder="Search dealer by name, area, phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ marginBottom: 0 }}
              />
              <Select
                value={filterArea}
                onChange={e => setFilterArea(e.target.value)}
                options={[
                  { value: 'all', label: 'All Areas / Regions' },
                  ...uniqueAreas.map(a => ({ value: a, label: a }))
                ]}
                style={{ marginBottom: 0 }}
              />
            </div>
          </Card>

          {/* Dealer Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '780px', overflowY: 'auto' }}>
            {filteredDealers.map(dealer => {
              const isSelected = selectedDealer?.id === dealer.id
              const isHighDue = (dealer.outstanding_amount || 0) > 10000
              return (
                <div
                  key={dealer.id}
                  onClick={() => setSelectedDealer(dealer)}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.15)' : '#18181b',
                    border: `1px solid ${isSelected ? '#2563eb' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fbbf24' }}>
                        {(dealer.name || 'D')[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{dealer.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{dealer.dealer_code || 'DLR-1000'} &bull; {dealer.area}</div>
                      </div>
                    </div>
                    {isHighDue && <Badge variant="danger">HIGH DUE</Badge>}
                  </div>

                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Ph: {dealer.phone}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.65rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Balance Due</div>
                      <div className="num" style={{ fontWeight: 800, color: (dealer.outstanding_amount || 0) > 0 ? '#f87171' : '#34d399', fontSize: '0.95rem' }}>
                        {formatCurrency(dealer.outstanding_amount || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Dealer 360° Profile Workspace */}
        {selectedDealer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Dealer Profile Header Card */}
            <Card style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#fbbf24', color: '#000', fontWeight: 900, fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(selectedDealer.name || 'D')[0]}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>{selectedDealer.name}</h3>
                      <Badge variant="info">{selectedDealer.dealer_code || 'DLR-1000'}</Badge>
                      <Badge variant={selectedDealer.is_active ? 'success' : 'danger'}>
                        {selectedDealer.is_active ? 'Active Dealer' : 'Inactive'}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.35rem', color: '#a1a1aa', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                      <span><MapPin style={{ width: '13px', height: '13px', display: 'inline', marginRight: '3px' }} />{selectedDealer.address || selectedDealer.area}</span>
                      <span><Phone style={{ width: '13px', height: '13px', display: 'inline', marginRight: '3px' }} />{selectedDealer.phone}</span>
                      <span>GSTIN: <strong style={{ color: '#fff' }}>{selectedDealer.gst_number || '37AAAAA0000A1Z5'}</strong></span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button variant="secondary" icon={<DollarSign style={{ width: '14px', height: '14px' }} />} onClick={() => setShowCollectModal(true)}>
                    Collect Due Payment
                  </Button>
                  <Button variant="primary" icon={<Printer style={{ width: '14px', height: '14px' }} />} onClick={() => window.print()}>
                    Print Statement
                  </Button>
                </div>
              </div>

              {/* Top Summary Stats Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding Balance Due</span>
                  <div className="num" style={{ fontSize: '1.35rem', fontWeight: 900, color: (selectedDealer.outstanding_amount || 0) > 0 ? '#f87171' : '#34d399' }}>
                    {formatCurrency(selectedDealer.outstanding_amount || 0)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Credit Limit</span>
                  <div className="num" style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24' }}>
                    {formatCurrency(selectedDealer.credit_limit || 50000)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Total Lifetime Purchases</span>
                  <div className="num" style={{ fontSize: '1.35rem', fontWeight: 900, color: '#60a5fa' }}>
                    {formatCurrency(selectedDealer.total_purchases || 185000)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Last Purchase Date</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
                    {selectedDealer.last_purchase_date || '2026-08-02'}
                  </div>
                </div>
              </div>
            </Card>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
              <Button variant={activeTab === 'sales_matrix' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('sales_matrix')}>
                🛒 Product-Wise Sales Matrix
              </Button>
              <Button variant={activeTab === 'history' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('history')}>
                📜 Billing History
              </Button>
              <Button variant={activeTab === 'due_ledger' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('due_ledger')}>
                🔴 Running Due Ledger
              </Button>
              <Button variant={activeTab === 'returns_leakages' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('returns_leakages')}>
                📦 Returns & Leakages Log
              </Button>
              <Button variant={activeTab === 'analytics' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('analytics')}>
                📊 Purchase BI Analytics
              </Button>
            </div>

            {/* TAB 1: PRODUCT-WISE SALES MATRIX */}
            {activeTab === 'sales_matrix' && (
              <Card style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingBag style={{ color: '#fbbf24', width: '18px', height: '18px' }} />
                    Daily Product Sales Ledger Entry ({selectedDealer.name})
                  </h3>
                  <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} style={{ width: 'auto', marginBottom: 0 }} />
                </div>

                {/* Product Sales Ledger Table */}
                <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Product Name</th>
                        <th style={{ padding: '0.75rem', width: '70px' }}>Unit</th>
                        <th style={{ padding: '0.75rem', width: '90px' }}>Sold Qty</th>
                        <th style={{ padding: '0.75rem', width: '100px' }}>Rate (₹)</th>
                        <th style={{ padding: '0.75rem', width: '90px' }}>Return Qty</th>
                        <th style={{ padding: '0.75rem', width: '90px' }}>Leak Qty</th>
                        <th style={{ padding: '0.75rem', width: '90px' }}>Discount (₹)</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '120px' }}>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productRows.map((row, idx) => {
                        const lineTotal = (row.qty * row.rate) - Number(row.discount || 0)
                        return (
                          <tr key={row.product_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: row.qty > 0 ? 'rgba(251, 191, 36, 0.03)' : 'transparent' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#fff' }}>{row.product_name}</td>
                            <td style={{ padding: '0.75rem', color: '#a1a1aa' }}>{row.unit}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <input
                                type="number"
                                min="0"
                                value={row.qty || ''}
                                onChange={e => updateProductRow(idx, 'qty', Number(e.target.value))}
                                style={{ width: '100%', backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem', borderRadius: '6px', textAlign: 'center', fontWeight: 800 }}
                              />
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <input
                                type="number"
                                min="0"
                                value={row.rate}
                                onChange={e => updateProductRow(idx, 'rate', Number(e.target.value))}
                                style={{ width: '100%', backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', color: '#fbbf24', padding: '0.4rem', borderRadius: '6px', textAlign: 'center', fontWeight: 800 }}
                              />
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <input
                                type="number"
                                min="0"
                                value={row.return_qty || ''}
                                onChange={e => updateProductRow(idx, 'return_qty', Number(e.target.value))}
                                style={{ width: '100%', backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', padding: '0.4rem', borderRadius: '6px', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <input
                                type="number"
                                min="0"
                                value={row.leak_qty || ''}
                                onChange={e => updateProductRow(idx, 'leak_qty', Number(e.target.value))}
                                style={{ width: '100%', backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', color: '#f87171', padding: '0.4rem', borderRadius: '6px', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <input
                                type="number"
                                min="0"
                                value={row.discount || ''}
                                onChange={e => updateProductRow(idx, 'discount', Number(e.target.value))}
                                style={{ width: '100%', backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', color: '#34d399', padding: '0.4rem', borderRadius: '6px', textAlign: 'center' }}
                              />
                            </td>
                            <td className="num" style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: lineTotal > 0 ? '#fbbf24' : '#a1a1aa' }}>
                              {formatCurrency(lineTotal)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Auto-Calculations Summary Footer */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem', padding: '1.25rem', backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Total Sold Units</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{totalQtySold} Units</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Total Returns / Leaks</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa' }}>{totalQtyReturned} Ret / {totalQtyLeaked} Leak</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Gross Bill Amount</span>
                    <div className="num" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{formatCurrency(grossTotal)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Net Invoice Total</span>
                    <div className="num" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24' }}>{formatCurrency(netBillAmount)}</div>
                  </div>
                </div>

                {/* Split Payment Section */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>Split Payment & Collection Details</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <Input
                      label="Cash Paid (₹)"
                      type="number"
                      value={payments.cash || ''}
                      onChange={e => setPayments({ ...payments, cash: Number(e.target.value) })}
                    />
                    <Input
                      label="UPI Paid (₹)"
                      type="number"
                      value={payments.upi || ''}
                      onChange={e => setPayments({ ...payments, upi: Number(e.target.value) })}
                    />
                    <Input
                      label="Bank Transfer (₹)"
                      type="number"
                      value={payments.bank || ''}
                      onChange={e => setPayments({ ...payments, bank: Number(e.target.value) })}
                    />
                    <Input
                      label="Advance Credit Used (₹)"
                      type="number"
                      value={payments.advance || ''}
                      onChange={e => setPayments({ ...payments, advance: Number(e.target.value) })}
                    />
                  </div>

                  {/* Summary Dues Result Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '1rem', backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Today's Remaining Pending Due:</span>
                      <span className="num" style={{ fontSize: '1.2rem', fontWeight: 900, color: pendingDue > 0 ? '#f87171' : '#34d399', marginLeft: '0.5rem' }}>
                        {formatCurrency(pendingDue)}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Updated Dealer Total Due:</span>
                      <span className="num" style={{ fontSize: '1.3rem', fontWeight: 900, color: grandTotalDue > 0 ? '#f87171' : '#34d399', marginLeft: '0.5rem' }}>
                        {formatCurrency(grandTotalDue)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <Button variant="secondary" icon={<Save style={{ width: '14px', height: '14px' }} />} loading={savingBill} onClick={() => handleSaveBill(false)}>
                        Save Bill
                      </Button>
                      <Button variant="primary" icon={<Printer style={{ width: '14px', height: '14px' }} />} loading={savingBill} onClick={() => handleSaveBill(true)}>
                        Save & Print Receipt
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* TAB 2: BILLING HISTORY */}
            {activeTab === 'history' && (
              <Card style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>Dealer Invoice History</h3>
                <DataTable
                  columns={[
                    { key: 'invoice_number', title: 'Invoice No', render: r => <span style={{ fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>{r.invoice_number}</span> },
                    { key: 'date', title: 'Date', render: r => <span style={{ color: '#a1a1aa' }}>{r.date}</span> },
                    { key: 'total_amount', title: 'Total Amount', align: 'right', render: r => <span className="num" style={{ fontWeight: 800, color: '#fff' }}>{formatCurrency(r.total_amount)}</span> },
                    { key: 'paid_amount', title: 'Paid', align: 'right', render: r => <span className="num" style={{ color: '#34d399' }}>{formatCurrency(r.paid_amount)}</span> },
                    { key: 'due_amount', title: 'Due', align: 'right', render: r => <span className="num" style={{ color: r.due_amount > 0 ? '#f87171' : '#a1a1aa' }}>{formatCurrency(r.due_amount)}</span> },
                    { key: 'payment_status', title: 'Status', render: r => <Badge variant={r.payment_status === 'paid' ? 'success' : 'danger'}>{r.payment_status?.toUpperCase()}</Badge> },
                    { key: 'actions', title: 'Action', align: 'right', render: r => <Button variant="secondary" size="sm" icon={<Printer style={{ width: '12px', height: '12px' }} />} onClick={() => window.print()}>Print Ticket</Button> }
                  ]}
                  data={dealerBills}
                  searchPlaceholder="Search invoices..."
                  exportFileName={`dealer-${selectedDealer.name}-invoices`}
                />
              </Card>
            )}

            {/* TAB 3: DUE LEDGER */}
            {activeTab === 'due_ledger' && (
              <Card style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>Running Account Statement & Due Ledger</h3>
                <DataTable
                  columns={[
                    { key: 'date', title: 'Date', render: r => <span style={{ color: '#a1a1aa' }}>{r.date}</span> },
                    { key: 'type', title: 'Transaction Type', render: r => <span style={{ fontWeight: 700, color: '#fff' }}>{r.type}</span> },
                    { key: 'debit', title: 'Invoice Debit (+)', align: 'right', render: r => <span className="num" style={{ color: '#f87171', fontWeight: 800 }}>{r.debit > 0 ? formatCurrency(r.debit) : '—'}</span> },
                    { key: 'credit', title: 'Payment Credit (-)', align: 'right', render: r => <span className="num" style={{ color: '#34d399', fontWeight: 800 }}>{r.credit > 0 ? formatCurrency(r.credit) : '—'}</span> },
                    { key: 'balance', title: 'Closing Due Balance', align: 'right', render: r => <span className="num" style={{ color: '#fbbf24', fontWeight: 900 }}>{formatCurrency(r.balance)}</span> },
                    { key: 'notes', title: 'Remarks / Notes', render: r => <span style={{ color: '#a1a1aa' }}>{r.notes}</span> }
                  ]}
                  data={dealerLedger}
                  exportFileName={`dealer-${selectedDealer.name}-statement`}
                />
              </Card>
            )}

            {/* TAB 4: RETURNS & LEAKAGES */}
            {activeTab === 'returns_leakages' && (
              <Card style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>Returns & Leakage Log History</h3>
                <DataTable
                  columns={[
                    { key: 'date', title: 'Log Date', render: r => <span style={{ color: '#a1a1aa' }}>{r.date}</span> },
                    { key: 'product', title: 'Product Name', render: r => <span style={{ fontWeight: 700, color: '#fff' }}>{r.product}</span> },
                    { key: 'return_qty', title: 'Returned Qty', render: r => <Badge variant="info">{r.return_qty} Units</Badge> },
                    { key: 'leak_qty', title: 'Leak / Damaged', render: r => <Badge variant="danger">{r.leak_qty} Leaks</Badge> },
                    { key: 'reason', title: 'Reason & Status', render: r => <span style={{ color: '#a1a1aa' }}>{r.reason}</span> }
                  ]}
                  data={dealerReturns}
                />
              </Card>
            )}

            {/* TAB 5: ANALYTICS */}
            {activeTab === 'analytics' && (
              <Card style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>Dealer Purchase BI Analytics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <Card style={{ padding: '1.25rem', backgroundColor: '#09090b' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Most Purchased Product</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.2rem' }}>Water Can (20L)</div>
                    <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.25rem' }}>65% Share of Orders</div>
                  </Card>
                  <Card style={{ padding: '1.25rem', backgroundColor: '#09090b' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Payment Reliability Score</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem' }}>92% On-Time</div>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.25rem' }}>Average Pay Days: 4 Days</div>
                  </Card>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Card style={{ padding: '3rem', textAlign: 'center', color: '#a1a1aa' }}>
            Select a dealer from the directory list to open the 360° workspace.
          </Card>
        )}
      </div>

      {/* CREATE DEALER MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Create New Dealer Account</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input label="Dealer Business / Contact Name" placeholder="e.g. Ramesh Water Traders" value={newDealerForm.name} onChange={e => setNewDealerForm({ ...newDealerForm, name: e.target.value })} />
              <Input label="Phone Number" placeholder="10-digit mobile" value={newDealerForm.phone} onChange={e => setNewDealerForm({ ...newDealerForm, phone: e.target.value })} />
              <Input label="GSTIN Number" placeholder="37AAAAA0000A1Z5" value={newDealerForm.gst_number} onChange={e => setNewDealerForm({ ...newDealerForm, gst_number: e.target.value })} />
              <Input label="Area / Region" placeholder="e.g. Kamavarapukota" value={newDealerForm.area} onChange={e => setNewDealerForm({ ...newDealerForm, area: e.target.value })} />
              <Input label="Assigned Route" placeholder="e.g. Nuzvid Highway" value={newDealerForm.route} onChange={e => setNewDealerForm({ ...newDealerForm, route: e.target.value })} />
              <Input label="Credit Limit Amount (₹)" type="number" value={newDealerForm.credit_limit} onChange={e => setNewDealerForm({ ...newDealerForm, credit_limit: Number(e.target.value) })} />
              <Input label="Full Address" placeholder="Street / Landmark..." value={newDealerForm.address} onChange={e => setNewDealerForm({ ...newDealerForm, address: e.target.value })} />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button variant="primary" loading={savingDealer} onClick={handleCreateDealer}>Create Dealer Account</Button>
            </div>
          </div>
        </div>
      )}

      {/* COLLECT DUE PAYMENT MODAL */}
      {showCollectModal && selectedDealer && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Record Dealer Due Payment</h3>
              <button onClick={() => setShowCollectModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>Dealer Account: <span style={{ color: '#fff', fontWeight: 700 }}>{selectedDealer.name}</span></div>
              <div>Current Balance Due: <span style={{ color: '#f87171', fontWeight: 800 }}>{formatCurrency(selectedDealer.outstanding_amount || 0)}</span></div>
              <Input label="Collection Payment Amount (₹)" type="number" value={collectForm.amount || ''} onChange={e => setCollectForm({ ...collectForm, amount: Number(e.target.value) })} />
              <Select label="Payment Mode" value={collectForm.mode} onChange={e => setCollectForm({ ...collectForm, mode: e.target.value as any })} options={[{ value: 'cash', label: 'Cash Deposit' }, { value: 'upi', label: 'UPI / PhonePe / GPay' }, { value: 'bank', label: 'Bank Transfer (NEFT/RTGS)' }]} />
              <Input label="Payment Notes / Reference" value={collectForm.notes} onChange={e => setCollectForm({ ...collectForm, notes: e.target.value })} />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowCollectModal(false)}>Cancel</Button>
              <Button variant="primary" loading={submittingPayment} onClick={handleCollectDue}>Record Collection</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
