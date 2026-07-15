'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const FALLBACK_DEALERS = [
  { id: 'd1111111-1111-1111-1111-111111111111', name: 'Babu', area: 'Kamavarapukota', phone: '9347662554', outstanding_amount: 14500, credit_limit: 20000, is_active: true, custom_rates: { 'Bags (100 Pack)': 70, '500ml Bottle Case': 120, '1L Bottle Case': 100 } },
  { id: 'd2222222-2222-2222-2222-222222222222', name: 'Bobby', area: 'Nuzvid', phone: '9393064848', outstanding_amount: 8200, credit_limit: 15000, is_active: true, custom_rates: { 'Bags (100 Pack)': 35, '500ml Bottle Case': 120 } },
  { id: 'd3333333-3333-3333-3333-333333333333', name: 'Vissannapeta Contact', area: 'Vissannapeta', phone: '9849072413', outstanding_amount: 0, credit_limit: 10000, is_active: true, custom_rates: { 'Bags (100 Pack)': 75, '500ml Bottle Case': 120, '1L Bottle Case': 100 } },
  { id: 'd4444444-4444-4444-4444-444444444444', name: 'Narsayapuram Contact', area: 'Narsayapuram', phone: '9640352593', outstanding_amount: 12000, credit_limit: 15000, is_active: true, custom_rates: { 'Bags (100 Pack)': 80, '500ml Bottle Case': 120, '1L Bottle Case': 100 } },
  { id: 'd5555555-5555-5555-5555-555555555555', name: 'Mukkinavarigudem Contact', area: 'Mukkinavarigudem', phone: '9579533803', outstanding_amount: 4500, credit_limit: 10000, is_active: true, custom_rates: { 'Bags (100 Pack)': 75 } },
  { id: 'd6666666-6666-6666-6666-666666666666', name: 'Prasad', area: 'Erraguntapalli', phone: '9987979151', outstanding_amount: 0, credit_limit: 15000, is_active: true, custom_rates: { 'Bags (100 Pack)': 70 } },
  { id: 'd7777777-7777-7777-7777-777777777777', name: 'M. Srinu', area: 'Chintalapudi', phone: '9633075598', outstanding_amount: 6000, credit_limit: 10000, is_active: true, custom_rates: {} },
  { id: 'd8888888-8888-8888-8888-888888888888', name: 'Harish', area: 'Mankollu', phone: '9963355747', outstanding_amount: 9500, credit_limit: 12000, is_active: true, custom_rates: {} },
  { id: 'd9999999-9999-9999-9999-999999999999', name: 'M. Kiran', area: 'Rangapuram', phone: '9866924211', outstanding_amount: 0, credit_limit: 10000, is_active: true, custom_rates: {} },
  { id: 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Kranthi', area: 'Kunavaram', phone: '8464969797', outstanding_amount: 15400, credit_limit: 25000, is_active: true, custom_rates: { '500ml Bottle Case': 115, '1L Bottle Case': 100 } },
  { id: 'dbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Gopi', area: 'Sathupally', phone: '9502110935', outstanding_amount: 3200, credit_limit: 10000, is_active: true, custom_rates: { 'Bags (100 Pack)': 75, '500ml Bottle Case': 120 } }
]

const FALLBACK_PRODUCTS = [
  { id: 'p1', name: 'Water Can (20L)', default_rate: 15.00 },
  { id: 'p2', name: 'Cooling Can (20L)', default_rate: 30.00 },
  { id: 'p3', name: 'Bags (100 Pack)', default_rate: 80.00 },
  { id: 'p4', name: '500ml Bottle Case', default_rate: 130.00 },
  { id: 'p5', name: '1L Bottle Case', default_rate: 120.00 },
  { id: 'p6', name: '2L Bottle Case', default_rate: 140.00 },
]

type DealerTab = 'profile' | 'orders' | 'outstanding' | 'collections' | 'ledger' | 'reports'

export default function DealersPage() {
  const [dealers, setDealers] = useState<any[]>(FALLBACK_DEALERS)
  const [products, setProducts] = useState<any[]>(FALLBACK_PRODUCTS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', area: '', gst_number: '', credit_limit: 5000 })
  const [saving, setSaving] = useState(false)

  const [currentView, setCurrentView] = useState<'list' | 'dashboard'>('list')
  const [selectedDealer, setSelectedDealer] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<DealerTab>('profile')

  const [orders, setOrders] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [ledger, setLedger] = useState<any[]>([])

  const [customRates, setCustomRates] = useState<Record<string, number>>({})
  const [savingRates, setSavingRates] = useState(false)

  const [collectionAmount, setCollectionAmount] = useState<number>(0)
  const [collectionMode, setCollectionMode] = useState<'cash' | 'upi'>('cash')
  const [collectingDue, setCollectingDue] = useState(false)

  // Inline Bill Modal
  const [showBillModal, setShowBillModal] = useState(false)
  const [billProduct, setBillProduct] = useState('')
  const [billQty, setBillQty] = useState(1)
  const [billRate, setBillRate] = useState(0)
  const [billPayMode, setBillPayMode] = useState<'cash' | 'upi' | 'due'>('cash')
  const [savingBill, setSavingBill] = useState(false)

  const supabase = createClient()

  useEffect(() => { loadDealersAndProducts() }, [])

  async function loadDealersAndProducts() {
    setLoading(true)
    try {
      const { data: dbDealers } = await supabase.from('dealers').select('id, name, area, phone, address, gst_number, outstanding_amount, credit_limit, is_active').order('name')
      const { data: dbProducts } = await supabase.from('products').select('id, name, default_rate, category, unit, is_active').order('name')

      if (dbDealers && dbDealers.length > 0) {
        const merged = dbDealers.map(d => {
          const fallback = FALLBACK_DEALERS.find(f => f.name.toLowerCase() === d.name.toLowerCase())
          return { ...d, custom_rates: fallback?.custom_rates || {} }
        })
        setDealers(merged)
      } else {
        setDealers(FALLBACK_DEALERS)
      }
      if (dbProducts && dbProducts.length > 0) setProducts(dbProducts)
      else setProducts(FALLBACK_PRODUCTS)
    } catch (e) {
      console.error(e)
      setDealers(FALLBACK_DEALERS)
      setProducts(FALLBACK_PRODUCTS)
    } finally {
      setLoading(false)
    }
  }

  const handleDealerSelect = async (dealer: any) => {
    setSelectedDealer(dealer)
    setCurrentView('dashboard')
    setActiveTab('profile')
    setCustomRates(dealer.custom_rates || {})
    setBillProduct(products[0]?.name || '')
    setBillRate(dealer.custom_rates?.[products[0]?.name] || products[0]?.default_rate || 0)
    await loadDealerHistory(dealer.id)
  }

  async function loadDealerHistory(dealerId: string) {
    try {
      // Load bills for this dealer
      const { data: billsData } = await supabase
        .from('bills')
        .select('id, invoice_number, date, total_amount, paid_amount, payment_status')
        .eq('dealer_id', dealerId)
        .order('date', { ascending: false })

      // Load collections for this dealer
      const { data: collectData } = await supabase
        .from('dealer_collections')
        .select('id, collected_date, notes, amount, payment_mode')
        .eq('dealer_id', dealerId)
        .order('collected_date', { ascending: false })

      // Load ledger with exact name match and column projection
      const { data: ledgerData } = await supabase
        .from('customer_ledger')
        .select('id, transaction_date, description, debit, credit, balance')
        .eq('customer_name', selectedDealer?.name)
        .order('transaction_date', { ascending: false })

      setOrders(billsData || [
        { id: 'o1', invoice_number: 'INV-001', date: '2026-06-05', total_amount: 4200, paid_amount: 4200, due_amount: 0, payment_status: 'paid' },
        { id: 'o2', invoice_number: 'INV-002', date: '2026-06-01', total_amount: 8500, paid_amount: 5000, due_amount: 3500, payment_status: 'partial' },
        { id: 'o3', invoice_number: 'INV-003', date: '2026-05-28', total_amount: 6000, paid_amount: 0, due_amount: 6000, payment_status: 'due' }
      ])
      setCollections(collectData || [
        { id: 'c1', collected_date: '2026-06-05', amount: 4200, payment_mode: 'upi', notes: 'Invoice payment' },
        { id: 'c2', collected_date: '2026-06-01', amount: 5000, payment_mode: 'cash', notes: 'Advance payment' }
      ])
      setLedger(ledgerData || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function saveDealer() {
    setSaving(true)
    try {
      const { error } = await supabase.from('dealers').insert({
        name: form.name, phone: form.phone, address: form.address,
        area: form.area, gst_number: form.gst_number, credit_limit: form.credit_limit,
        outstanding_amount: 0, is_active: true
      }).select().single()

      if (error) { alert(`Failed: ${error.message}`) }
      else {
        setShowModal(false)
        setForm({ name: '', phone: '', address: '', area: '', gst_number: '', credit_limit: 5000 })
        loadDealersAndProducts()
      }
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function handleSavePricing() {
    if (!selectedDealer) return
    setSavingRates(true)
    try {
      for (const [prodName, rate] of Object.entries(customRates)) {
        const prod = products.find(p => p.name === prodName)
        if (prod) {
          await supabase.from('dealer_products').upsert({
            dealer_id: selectedDealer.id, product_id: prod.id, custom_rate: rate
          }, { onConflict: 'dealer_id,product_id' })
        }
      }
      const updatedDealers = dealers.map(d => d.id === selectedDealer.id ? { ...d, custom_rates: customRates } : d)
      setDealers(updatedDealers)
      setSelectedDealer({ ...selectedDealer, custom_rates: customRates })
      alert('✅ Custom pricing saved!')
    } catch (e) { console.error(e) }
    finally { setSavingRates(false) }
  }

  async function handleCollectDue() {
    if (!selectedDealer || collectionAmount <= 0) return
    setCollectingDue(true)
    try {
      // 1. Insert collection record
      const { error: collErr } = await supabase.from('dealer_collections').insert({
        dealer_id: selectedDealer.id,
        amount: collectionAmount,
        payment_mode: collectionMode,
        notes: `Due collection — ${collectionMode.toUpperCase()}`,
        collected_date: new Date().toISOString().split('T')[0]
      })

      if (collErr) { alert(`Collection failed: ${collErr.message}`); return }

      // 2. Update dealer outstanding_amount (handled by trigger, we only calculate for local UI state update)
      const newOutstanding = Math.max(0, (selectedDealer.outstanding_amount || 0) - collectionAmount)

      // 3. Insert into customer_ledger as payment
      try {
        await supabase.from('customer_ledger').insert({
          customer_name: selectedDealer.name,
          transaction_type: 'payment',
          credit: collectionAmount,
          debit: 0,
          balance: newOutstanding,
          description: `Payment received — ${collectionMode.toUpperCase()} ₹${collectionAmount}`,
          transaction_date: new Date().toISOString().split('T')[0]
        })
      } catch (ledgerErr) { console.warn('Ledger insert skipped:', ledgerErr) }

      // 4. Update local state
      const newCollection = {
        id: Date.now().toString(),
        collected_date: new Date().toISOString().split('T')[0],
        amount: collectionAmount,
        payment_mode: collectionMode,
        notes: `Due collection — ${collectionMode.toUpperCase()}`
      }
      setCollections([newCollection, ...collections])
      setDealers(dealers.map(d => d.id === selectedDealer.id ? { ...d, outstanding_amount: newOutstanding } : d))
      setSelectedDealer({ ...selectedDealer, outstanding_amount: newOutstanding })
      setCollectionAmount(0)

      alert(`✅ ₹${collectionAmount} collected via ${collectionMode.toUpperCase()}! Outstanding reduced to ₹${newOutstanding}`)
    } catch (e) {
      console.error(e)
    } finally {
      setCollectingDue(false)
    }
  }

  async function handleGenerateBill() {
    if (!selectedDealer || !billProduct || billQty <= 0 || billRate <= 0) {
      alert('Fill all bill fields')
      return
    }
    setSavingBill(true)
    try {
      const total = billQty * billRate
      const paid = billPayMode === 'due' ? 0 : total
      const due = total - paid
      const invoiceNumber = `RK-${Date.now().toString().slice(-8)}`

      const { data: bill, error } = await supabase.from('bills').insert({
        invoice_number: invoiceNumber,
        bill_type: 'dealer_invoice',
        customer_name: selectedDealer.name,
        dealer_id: selectedDealer.id,
        subtotal: total,
        gst_amount: 0,
        total_amount: total,
        payment_method: billPayMode,
        cash_amount: billPayMode === 'cash' ? paid : 0,
        upi_amount: billPayMode === 'upi' ? paid : 0,
        paid_amount: paid,
        due_amount: due,
        payment_status: billPayMode === 'due' ? 'due' : 'paid',
        date: new Date().toISOString().split('T')[0]
      }).select().single()

      if (error) throw error

      // Insert bill item
      await supabase.from('bill_items').insert({
        bill_id: bill.id, product_name: billProduct,
        quantity: billQty, rate: billRate, amount: total, gst_rate: 0, gst_amount: 0, total
      })

      // Update dealer outstanding + total_sales (handled by trigger, we only calculate for local UI state update)
      const newOutstanding = (selectedDealer.outstanding_amount || 0) + due
      const newSales = (selectedDealer.total_sales || 0) + total

      // Add to ledger
      try {
        await supabase.from('customer_ledger').insert({
          customer_name: selectedDealer.name,
          transaction_type: 'bill',
          bill_id: bill.id,
          debit: total,
          credit: paid,
          balance: newOutstanding,
          description: `Dealer Bill #${invoiceNumber} — ${billProduct} x ${billQty}`,
          transaction_date: new Date().toISOString().split('T')[0]
        })
      } catch (_e) { /* ledger optional */ }

      // Update local state
      setSelectedDealer({ ...selectedDealer, outstanding_amount: newOutstanding, total_sales: newSales })
      setDealers(dealers.map(d => d.id === selectedDealer.id ? { ...d, outstanding_amount: newOutstanding } : d))
      setOrders([bill, ...orders])
      setShowBillModal(false)
      setBillQty(1)

      alert(`✅ Bill #${invoiceNumber} generated! Total: ₹${total} | Due: ₹${due}`)
    } catch (e: any) {
      alert(`Error: ${e?.message}`)
    } finally {
      setSavingBill(false)
    }
  }

  const filteredDealers = dealers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.area && d.area.toLowerCase().includes(search.toLowerCase()))
  )
  const totalOutstanding = dealers.reduce((sum, d) => sum + (d.outstanding_amount || 0), 0)

  const TABS: { id: DealerTab; label: string; icon: string }[] = [
    { id: 'profile', label: 'Profile & Rates', icon: '👤' },
    { id: 'orders', label: 'Sales History', icon: '📦' },
    { id: 'outstanding', label: 'Collect Due', icon: '🔴' },
    { id: 'collections', label: 'Payments', icon: '💰' },
    { id: 'ledger', label: 'Ledger', icon: '📒' },
    { id: 'reports', label: 'Reports', icon: '📈' },
  ]

  return (
    <div className="animate-fade-in" style={{ padding: '0.25rem' }}>

      {/* HEADER */}
      {currentView === 'list' ? (
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h2 className="page-title">🏪 Wholesale Dealer Network</h2>
            <p className="page-subtitle">Outstanding: <span style={{ color: '#f87171', fontWeight: '800' }}>₹{totalOutstanding.toLocaleString('en-IN')}</span> across {dealers.length} dealers</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Dealer</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button className="btn btn-secondary btn-sm" style={{ width: '42px', height: '42px', borderRadius: '50%', padding: 0 }} onClick={() => setCurrentView('list')}>←</button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', margin: 0 }}>🏪 {selectedDealer?.name}</h2>
            <p style={{ fontSize: '0.8125rem', color: 'hsl(215 20% 55%)', marginTop: '0.25rem' }}>📍 {selectedDealer?.area} | 📞 {selectedDealer?.phone}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => setShowBillModal(true)}>📋 Generate Bill</button>
            <button
              className="btn btn-secondary"
              style={{ borderColor: 'rgba(248,113,113,0.4)', color: '#f87171' }}
              onClick={() => setActiveTab('outstanding')}
            >
              💰 Collect Due
            </button>
          </div>
        </div>
      )}

      {/* DEALER LIST */}
      {currentView === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card-3d" style={{ padding: '1.5rem' }}>
            <input className="form-input" placeholder="🔍 Search dealer name or area..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}><span className="loading-spinner" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {filteredDealers.map(d => (
                <div key={d.id} className="glass-card-3d" style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem' }} onClick={() => handleDealerSelect(d)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>{d.name}</h4>
                      <span className="badge badge-muted" style={{ marginTop: '0.375rem' }}>📍 {d.area || '—'}</span>
                    </div>
                    {(d.outstanding_amount || 0) > 0 ? (
                      <span className="badge badge-danger">Due: ₹{(d.outstanding_amount || 0).toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="badge badge-success">✅ No Dues</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', fontSize: '0.8125rem', color: 'hsl(215 20% 55%)' }}>
                    <div><span>Credit Limit</span><div style={{ fontWeight: '700', color: '#fff' }}>₹{(d.credit_limit || 5000).toLocaleString('en-IN')}</div></div>
                    <div><span>Phone</span><div style={{ fontWeight: '700', color: '#fff' }}>{d.phone || '—'}</div></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8125rem', color: '#3b82f6', fontWeight: '700', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>Open Account →</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DEALER DASHBOARD */}
      {currentView === 'dashboard' && selectedDealer && (
        <div>
          {/* KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Outstanding Due', value: `₹${(selectedDealer.outstanding_amount || 0).toLocaleString('en-IN')}`, color: selectedDealer.outstanding_amount > 0 ? '#f87171' : '#34d399', icon: '🔴' },
              { label: 'Credit Limit', value: `₹${(selectedDealer.credit_limit || 5000).toLocaleString('en-IN')}`, color: '#60a5fa', icon: '💳' },
              { label: 'Total Sales', value: `₹${(selectedDealer.total_sales || 0).toLocaleString('en-IN')}`, color: '#fff', icon: '📈' },
              { label: 'Orders', value: orders.length.toString(), color: '#a78bfa', icon: '📦' },
              { label: 'Collections', value: orders.length.toString(), color: '#34d399', icon: '💰' },
            ].map((kpi, i) => (
              <div key={i} className="glass-card-3d" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', fontWeight: '700' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1rem' }}>{kpi.icon}</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                style={{ borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: '700', flexShrink: 0 }}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB: PROFILE & RATES */}
          {activeTab === 'profile' && (
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
              <div className="glass-card-3d" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'fit-content' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🏪</div>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: '800', color: '#fff', fontSize: '1.15rem' }}>{selectedDealer.name}</h4>
                    <span className="badge badge-muted" style={{ marginTop: '0.25rem' }}>📍 {selectedDealer.area}</span>
                  </div>
                </div>
                {[
                  { label: 'Phone', value: selectedDealer.phone || '—' },
                  { label: 'GST Number', value: selectedDealer.gst_number || '—' },
                  { label: 'Address', value: selectedDealer.address || '—' },
                  { label: 'Status', value: selectedDealer.is_active ? '✅ Active' : '❌ Inactive' },
                ].map((info, i) => (
                  <div key={i} style={{ fontSize: '0.8125rem', borderTop: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingTop: i === 0 ? '1rem' : 0 }}>
                    <span style={{ color: 'hsl(215 20% 55%)' }}>{info.label}:</span>
                    <div style={{ color: '#fff', fontWeight: '600', marginTop: '0.125rem' }}>{info.value}</div>
                  </div>
                ))}
              </div>

              <div className="glass-card-3d" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>🏷️ Custom Product Rates</h3>
                  <button className="btn btn-primary btn-sm" onClick={handleSavePricing} disabled={savingRates}>{savingRates ? 'Saving...' : '💾 Save Rates'}</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {products.map(p => {
                    const currentRate = customRates[p.name] !== undefined ? customRates[p.name] : p.default_rate
                    const isCustom = customRates[p.name] !== undefined
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', background: isCustom ? 'rgba(59,130,246,0.03)' : 'rgba(255,255,255,0.01)', borderRadius: '0.75rem', border: `1px solid ${isCustom ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)'}` }}>
                        <div>
                          <div style={{ fontWeight: '700', color: '#fff' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Base: ₹{p.default_rate}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <input type="number" className="form-input" style={{ width: '100px', textAlign: 'right' }} value={currentRate}
                            onChange={e => setCustomRates({ ...customRates, [p.name]: parseFloat(e.target.value) || 0 })} />
                          {isCustom && (
                            <button className="btn btn-danger btn-sm" style={{ padding: '0.375rem 0.5rem' }}
                              onClick={() => { const c = { ...customRates }; delete c[p.name]; setCustomRates(c) }}>
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SALES HISTORY */}
          {activeTab === 'orders' && (
            <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
              <div className="card-header"><h3 className="card-title">📦 Sales History</h3></div>
              {orders.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>No orders yet.</div>
              ) : (
                <div>
                  {orders.map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: '#fff' }}>#{o.invoice_number}</div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>{o.date || o.sale_date}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '700', color: '#fff' }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '0.7rem', color: '#34d399' }}>Paid: ₹{Number(o.paid_amount || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <span className={`badge ${o.payment_status === 'paid' ? 'badge-success' : o.payment_status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                          {(o.payment_status || 'paid').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: COLLECT DUE */}
          {activeTab === 'outstanding' && (
            <div className="glass-card-3d" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.5rem' }}>🔴 Outstanding Due Collection</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ background: selectedDealer.outstanding_amount > 0 ? 'rgba(248,113,113,0.05)' : 'rgba(52,211,153,0.05)', border: `1px solid ${selectedDealer.outstanding_amount > 0 ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'}`, borderRadius: '0.75rem', padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase' }}>Current Outstanding</span>
                  <h4 style={{ fontSize: '2rem', fontWeight: '800', color: selectedDealer.outstanding_amount > 0 ? '#f87171' : '#34d399', margin: '0.375rem 0 0' }}>
                    ₹{(selectedDealer.outstanding_amount || 0).toLocaleString('en-IN')}
                  </h4>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase' }}>Credit Limit</span>
                  <h4 style={{ fontSize: '2rem', fontWeight: '800', color: '#60a5fa', margin: '0.375rem 0 0' }}>
                    ₹{(selectedDealer.credit_limit || 5000).toLocaleString('en-IN')}
                  </h4>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>Record Payment Collection</h4>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Amount (₹)</label>
                    <input type="number" className="form-input" placeholder="Enter amount" value={collectionAmount || ''} onChange={e => setCollectionAmount(Math.max(0, Number(e.target.value)))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-input" value={collectionMode} onChange={e => setCollectionMode(e.target.value as any)}>
                      <option value="cash">💵 Cash</option>
                      <option value="upi">📱 UPI</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" onClick={handleCollectDue} disabled={collectingDue || collectionAmount <= 0} style={{ marginBottom: '1px' }}>
                    {collectingDue ? 'Saving...' : '✅ Collect Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PAYMENT HISTORY */}
          {activeTab === 'collections' && (
            <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
              <div className="card-header"><h3 className="card-title">💰 Payment History</h3></div>
              {collections.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>No payments recorded.</div>
              ) : (
                <div>
                  {collections.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>{c.collected_date}</div>
                        <div style={{ fontSize: '0.875rem', color: '#fff', fontWeight: '600' }}>{c.notes}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399' }}>+₹{Number(c.amount).toLocaleString('en-IN')}</span>
                        <span className="badge badge-info">{(c.payment_mode || 'cash').toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: LEDGER */}
          {activeTab === 'ledger' && (
            <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
              <div className="card-header"><h3 className="card-title">📒 Account Ledger</h3></div>
              {ledger.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>
                  <div style={{ fontSize: '2rem' }}>📒</div>
                  <p>No ledger entries yet. Generate bills to see transactions here.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'hsl(215 20% 40%)', marginTop: '1rem' }}>
                    {[...orders.slice(0, 3), ...collections.slice(0, 2)].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '0.5rem' }}>
                        <span>{item.invoice_number ? `Bill #${item.invoice_number}` : `Payment`}</span>
                        <span style={{ color: item.invoice_number ? '#f87171' : '#34d399' }}>
                          {item.invoice_number ? `-₹${Number(item.total_amount).toFixed(0)}` : `+₹${Number(item.amount).toFixed(0)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="erp-table">
                    <thead><tr><th>Date</th><th>Description</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
                    <tbody>
                      {ledger.map((entry, i) => (
                        <tr key={i}>
                          <td>{entry.transaction_date}</td>
                          <td>{entry.description}</td>
                          <td style={{ textAlign: 'right', color: '#f87171' }}>{entry.debit > 0 ? `₹${Number(entry.debit).toLocaleString('en-IN')}` : '—'}</td>
                          <td style={{ textAlign: 'right', color: '#34d399' }}>{entry.credit > 0 ? `₹${Number(entry.credit).toLocaleString('en-IN')}` : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: Number(entry.balance) > 0 ? '#f87171' : '#34d399' }}>₹{Number(entry.balance || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: REPORTS */}
          {activeTab === 'reports' && (
            <div className="glass-card-3d" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>📈 Consolidated Report</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Total Orders', value: orders.length.toString(), color: '#fff' },
                  { label: 'Net Collections', value: `₹${collections.reduce((s, c) => s + (Number(c.amount) || 0), 0).toLocaleString('en-IN')}`, color: '#34d399' },
                  { label: 'Outstanding', value: `₹${(selectedDealer.outstanding_amount || 0).toLocaleString('en-IN')}`, color: selectedDealer.outstanding_amount > 0 ? '#f87171' : '#34d399' },
                ].map((kpi, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>{kpi.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: kpi.color }}>{kpi.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => alert('PDF export — use browser print')}>📄 Download PDF</button>
                <button className="btn btn-secondary" onClick={() => alert('CSV export coming soon')}>📊 Export CSV</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD DEALER MODAL */}
      {showModal && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#fff', margin: 0 }}>Add Wholesale Dealer</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group"><label className="form-label">Dealer Name *</label><input className="form-input" placeholder="Dealer Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Area</label><input className="form-input" placeholder="Area" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Address</label><input className="form-input" placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group"><label className="form-label">GST Number</label><input className="form-input" placeholder="GST" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Credit Limit (₹)</label><input type="number" className="form-input" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: Number(e.target.value) })} /></div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveDealer} disabled={!form.name || saving}>{saving ? 'Saving...' : '💾 Save Dealer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE BILL MODAL */}
      {showBillModal && selectedDealer && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#fff', margin: 0 }}>📋 Generate Bill — {selectedDealer.name}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowBillModal(false)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Product</label>
                <select className="form-input" value={billProduct} onChange={e => {
                  setBillProduct(e.target.value)
                  const p = products.find(p => p.name === e.target.value)
                  const rate = selectedDealer.custom_rates?.[e.target.value] || p?.default_rate || 0
                  setBillRate(rate)
                }}>
                  {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group"><label className="form-label">Quantity</label><input type="number" className="form-input" value={billQty} onChange={e => setBillQty(Number(e.target.value))} /></div>
                <div className="form-group"><label className="form-label">Rate (₹)</label><input type="number" className="form-input" value={billRate} onChange={e => setBillRate(Number(e.target.value))} /></div>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'hsl(215 20% 55%)' }}>Total Amount</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#60a5fa' }}>₹{(billQty * billRate).toFixed(2)}</span>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['cash', 'upi', 'due'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setBillPayMode(m)}
                      className={billPayMode === m ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
                      {m === 'cash' ? '💵 Cash' : m === 'upi' ? '📱 UPI' : '🔴 Due'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button className="btn btn-ghost" onClick={() => setShowBillModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleGenerateBill} disabled={savingBill}>{savingBill ? 'Saving...' : '💾 Generate Bill'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
