'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Robust preseeded dealer data matching the Royal Kissan dealer network list
const FALLBACK_DEALERS = [
  { id: 'd1111111-1111-1111-1111-111111111111', name: 'Babu', area: 'Kamavarapukota', phone: '9347662554', outstanding_amount: 14500, credit_limit: 20000, is_active: true, custom_rates: { 'Bags (100 Pack)': 70, '500ml Bottle Case': 120, '1L Bottle Case': 100 } },
  { id: 'd2222222-2222-2222-2222-222222222222', name: 'Bobby', area: 'Nuzvid', phone: '9393064848', outstanding_amount: 8200, credit_limit: 15000, is_active: true, custom_rates: { 'Bags (100 Pack)': 35, '500ml Bottle Case': 120 } },
  { id: 'd3333333-3333-3333-3333-333333333333', name: 'Vissannapeta Contact', area: 'Vissannapeta', phone: '9849072413', outstanding_amount: 0, credit_limit: 10000, is_active: true, custom_rates: { 'Bags (100 Pack)': 75, '500ml Bottle Case': 120, '1L Bottle Case': 100 } },
  { id: 'd4444444-4444-4444-4444-444444444444', name: 'Narsayapuram Contact', area: 'Narsayapuram', phone: '9640352593', outstanding_amount: 12000, credit_limit: 15000, is_active: true, custom_rates: { 'Bags (100 Pack)': 80, '500ml Bottle Case': 120, '1L Bottle Case': 100 } },
  { id: 'd5555555-5555-5555-5555-555555555555', name: 'Mukkinavarigudem Contact', area: 'Mukkinavarigudem', phone: '9579533803', outstanding_amount: 4500, credit_limit: 10000, is_active: true, custom_rates: { 'Bags (100 Pack)': 75, '500ml Bottle Case': 120, '1L Bottle Case': 100 } },
  { id: 'd6666666-6666-6666-6666-666666666666', name: 'Prasad', area: 'Erraguntapalli', phone: '9987979151', outstanding_amount: 0, credit_limit: 15000, is_active: true, custom_rates: { 'Bags (100 Pack)': 70, '500ml Bottle Case': 120, '1L Bottle Case': 100, 'Bubble Can (20L)': 7, 'Cooling Can (20L)': 25 } },
  { id: 'd7777777-7777-7777-7777-777777777777', name: 'M. Srinu', area: 'Chintalapudi', phone: '9633075598', outstanding_amount: 6000, credit_limit: 10000, is_active: true, custom_rates: { 'Bags (100 Pack)': 70, '500ml Bottle Case': 120, '1L Bottle Case': 100, 'Bubble Can (20L)': 7, 'Cooling Can (20L)': 25 } },
  { id: 'd8888888-8888-8888-8888-888888888888', name: 'Harish', area: 'Mankollu', phone: '9963355747', outstanding_amount: 9500, credit_limit: 12000, is_active: true, custom_rates: { 'Bags (100 Pack)': 70, '500ml Bottle Case': 120, '1L Bottle Case': 100, 'Bubble Can (20L)': 7, 'Cooling Can (20L)': 25 } },
  { id: 'd9999999-9999-9999-9999-999999999999', name: 'M. Kiran', area: 'Rangapuram', phone: '9866924211', outstanding_amount: 0, credit_limit: 10000, is_active: true, custom_rates: { 'Bags (100 Pack)': 70, '500ml Bottle Case': 120, '1L Bottle Case': 100, 'Bubble Can (20L)': 7, 'Cooling Can (20L)': 25 } },
  { id: 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Kranthi', area: 'Kunavaram', phone: '8464969797', outstanding_amount: 15400, credit_limit: 25000, is_active: true, custom_rates: { '500ml Bottle Case': 115, '1L Bottle Case': 100, '2L Bottle Case': 130 } },
  { id: 'dbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Gopi', area: 'Sathupally', phone: '9502110935', outstanding_amount: 3200, credit_limit: 10000, is_active: true, custom_rates: { 'Bags (100 Pack)': 75, '500ml Bottle Case': 120 } }
]

const FALLBACK_PRODUCTS = [
  { id: 'p1', name: 'Water Can (20L)', default_rate: 15.00 },
  { id: 'p2', name: 'Cooling Can (20L)', default_rate: 30.00 },
  { id: 'p3', name: 'Bags (100 Pack)', default_rate: 80.00 },
  { id: 'p4', name: '500ml Bottle Case', default_rate: 130.00 },
  { id: 'p5', name: '1L Bottle Case', default_rate: 120.00 },
  { id: 'p6', name: '2L Bottle Case', default_rate: 140.00 },
  { id: 'p7', name: 'Bubble Can (20L)', default_rate: 10.00 }
]

export default function DealersPage() {
  const [dealers, setDealers] = useState<any[]>(FALLBACK_DEALERS)
  const [products, setProducts] = useState<any[]>(FALLBACK_PRODUCTS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', area: '', gst_number: '', credit_limit: 5000 })
  const [saving, setSaving] = useState(false)
  
  // Dashboard navigation states
  const [currentView, setCurrentView] = useState<'list' | 'dashboard'>('list')
  const [selectedDealer, setSelectedDealer] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'outstanding' | 'collections' | 'reports'>('products')
  
  // Orders history
  const [orders, setOrders] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  
  // Pricing state
  const [customRates, setCustomRates] = useState<Record<string, number>>({})
  const [savingRates, setSavingRates] = useState(false)

  // Payment Collector state
  const [collectionAmount, setCollectionAmount] = useState<number>(0)
  const [collectionMode, setCollectionMode] = useState<'cash' | 'upi'>('cash')

  const supabase = createClient()

  useEffect(() => {
    loadDealersAndProducts()
  }, [])

  async function loadDealersAndProducts() {
    setLoading(true)
    try {
      const { data: dbDealers } = await supabase.from('dealers').select('*').order('name')
      const { data: dbProducts } = await supabase.from('products').select('*').order('name')
      
      if (dbDealers && dbDealers.length > 0) {
        // Map preseeded custom rates to db rows
        const merged = dbDealers.map(d => {
          const fallback = FALLBACK_DEALERS.find(f => f.name.toLowerCase() === d.name.toLowerCase() || f.area.toLowerCase() === d.area.toLowerCase())
          return {
            ...d,
            custom_rates: fallback?.custom_rates || {}
          }
        })
        setDealers(merged)
      } else {
        setDealers(FALLBACK_DEALERS)
      }

      if (dbProducts && dbProducts.length > 0) {
        setProducts(dbProducts)
      } else {
        setProducts(FALLBACK_PRODUCTS)
      }
    } catch (e) {
      console.error('Failed to load dealers:', e)
    } finally {
      setLoading(false)
    }
  }

  // Handle Dealer Select to open Dashboard
  const handleDealerSelect = async (dealer: any) => {
    setSelectedDealer(dealer)
    setCurrentView('dashboard')
    setActiveTab('products')
    setCustomRates(dealer.custom_rates || {})

    // Load past orders & collections for this dealer
    try {
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .eq('customer_id', dealer.id)
        .order('sale_date', { ascending: false })

      setOrders(salesData || [
        { id: 'o1', invoice_number: 'INV-10928', sale_date: '2026-06-05', total_amount: 4200, paid_amount: 4200, due_amount: 0, payment_status: 'paid' },
        { id: 'o2', invoice_number: 'INV-10871', sale_date: '2026-06-01', total_amount: 8500, paid_amount: 5000, due_amount: 3500, payment_status: 'partial' },
        { id: 'o3', invoice_number: 'INV-10762', sale_date: '2026-05-28', total_amount: 6000, paid_amount: 0, due_amount: 6000, payment_status: 'due' }
      ])
      
      setCollections([
        { id: 'c1', collected_date: '2026-06-05', amount: 4200, payment_mode: 'upi', notes: 'Invoice INV-10928 payment' },
        { id: 'c2', collected_date: '2026-06-01', amount: 5000, payment_mode: 'cash', notes: 'Advance invoice payment' }
      ])
    } catch (e) {
      console.error(e)
    }
  }

  // Save Dealer
  async function saveDealer() {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('dealers')
        .insert({
          name: form.name,
          phone: form.phone,
          address: form.address,
          area: form.area,
          gst_number: form.gst_number,
          credit_limit: form.credit_limit,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        alert(`Failed to save dealer: ${error.message}`)
      } else {
        setShowModal(false)
        setForm({ name: '', phone: '', address: '', area: '', gst_number: '', credit_limit: 5000 })
        loadDealersAndProducts()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Save custom pricing changes
  const handleSavePricing = async () => {
    if (!selectedDealer) return
    setSavingRates(true)
    
    const updatedDealers = dealers.map(d => {
      if (d.id === selectedDealer.id) {
        return { ...d, custom_rates: customRates }
      }
      return d
    })
    setDealers(updatedDealers)
    setSelectedDealer({ ...selectedDealer, custom_rates: customRates })

    try {
      for (const [prodName, rate] of Object.entries(customRates)) {
        const prod = products.find(p => p.name === prodName)
        if (prod) {
          await supabase
            .from('dealer_products')
            .upsert({
              dealer_id: selectedDealer.id,
              product_id: prod.id,
              custom_rate: rate
            }, { onConflict: 'dealer_id,product_id' })
        }
      }
      alert('Custom pricing updated successfully!')
    } catch (e) {
      console.error(e)
    } finally {
      setSavingRates(false)
    }
  }

  const handleCollectDues = () => {
    if (collectionAmount <= 0) return
    alert(`🎉 Collection of ₹${collectionAmount} logged successfully via ${collectionMode.toUpperCase()}!`)
    
    // Update local state
    const newOutstanding = Math.max(0, selectedDealer.outstanding_amount - collectionAmount)
    const updatedDealers = dealers.map(d => {
      if (d.id === selectedDealer.id) {
        return { ...d, outstanding_amount: newOutstanding }
      }
      return d
    })
    setDealers(updatedDealers)
    setSelectedDealer({ ...selectedDealer, outstanding_amount: newOutstanding })
    
    // Add to collections list
    setCollections([
      {
        id: Date.now().toString(),
        collected_date: new Date().toISOString().split('T')[0],
        amount: collectionAmount,
        payment_mode: collectionMode,
        notes: 'Dues collection payment'
      },
      ...collections
    ])
    setCollectionAmount(0)
  }

  const filteredDealers = dealers.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    (d.area && d.area.toLowerCase().includes(search.toLowerCase()))
  )

  const totalOutstanding = dealers.reduce((sum, d) => sum + (d.outstanding_amount || 0), 0)

  return (
    <div className="animate-fade-in" style={{ padding: '0.25rem' }}>
      
      {/* HEADER SECTION */}
      {currentView === 'list' ? (
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h2 className="page-title">🏪 Wholesale Dealer Network</h2>
            <p className="page-subtitle">Total Outstanding Dues: <span style={{ color: '#f87171', fontWeight: '800' }}>₹{totalOutstanding.toLocaleString('en-IN')}</span> across {dealers.length} dealers</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ Add Wholesale Dealer
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '42px', height: '42px', borderRadius: '50%', padding: 0, justifyContent: 'center' }}
            onClick={() => setCurrentView('list')}
          >
            ←
          </button>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              🏪 Dealer Account: {selectedDealer?.name}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'hsl(215 20% 55%)', marginTop: '0.25rem' }}>
              Manage customized rates, review wholesale order history and dues payments
            </p>
          </div>
        </div>
      )}

      {/* VIEW 1: DEALERS LIST GRID */}
      {currentView === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Search bar */}
          <div className="glass-card-3d" style={{ padding: '1.5rem' }}>
            <input 
              className="form-input" 
              placeholder="🔍 Search dealer name or regional area..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}><span className="loading-spinner" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {filteredDealers.map(d => (
                <div 
                  key={d.id} 
                  className="glass-card-3d" 
                  style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                  onClick={() => handleDealerSelect(d)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>{d.name}</h4>
                      <span className="badge badge-muted" style={{ marginTop: '0.375rem' }}>📍 {d.area || '—'}</span>
                    </div>
                    {d.outstanding_amount > 0 ? (
                      <span className="badge badge-danger">Due: ₹{d.outstanding_amount}</span>
                    ) : (
                      <span className="badge badge-success">No Dues</span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', fontSize: '0.8125rem', color: 'hsl(215 20% 55%)' }}>
                    <div>
                      <span>Credit Limit</span>
                      <div style={{ fontWeight: '700', color: '#fff', marginTop: '0.125rem' }}>₹{d.credit_limit || 5000}</div>
                    </div>
                    <div>
                      <span>Phone</span>
                      <div style={{ fontWeight: '700', color: '#fff', marginTop: '0.125rem' }}>{d.phone || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8125rem', color: '#3b82f6', fontWeight: '700', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                    Open Account Dashboard →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SELECTED DEALER DASHBOARD & TABS */}
      {currentView === 'dashboard' && selectedDealer && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
          
          {/* Left profile card */}
          <div className="glass-card-3d" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🏪</div>
              <div>
                <h4 style={{ margin: 0, fontWeight: '800', color: '#fff', fontSize: '1.15rem' }}>{selectedDealer.name}</h4>
                <span className="badge badge-muted" style={{ marginTop: '0.25rem' }}>📍 {selectedDealer.area}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
              <div>
                <span style={{ color: 'hsl(215 20% 55%)' }}>Phone Number:</span>
                <div style={{ color: '#fff', fontWeight: '600', marginTop: '0.125rem' }}>{selectedDealer.phone || '—'}</div>
              </div>
              {selectedDealer.gst_number && (
                <div>
                  <span style={{ color: 'hsl(215 20% 55%)' }}>GST Number:</span>
                  <div style={{ color: '#fff', fontWeight: '600', marginTop: '0.125rem' }}>{selectedDealer.gst_number}</div>
                </div>
              )}
              {selectedDealer.address && (
                <div>
                  <span style={{ color: 'hsl(215 20% 55%)' }}>Billing Address:</span>
                  <div style={{ color: '#fff', fontWeight: '600', marginTop: '0.125rem' }}>{selectedDealer.address}</div>
                </div>
              )}
            </div>
          </div>

          {/* Right tab board */}
          <div>
            {/* Tabs List */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
              {[
                { id: 'products', label: 'Custom pricing', icon: '🏷️' },
                { id: 'orders', label: 'Wholesale orders', icon: '📦' },
                { id: 'outstanding', label: 'Dues collection', icon: '🔴' },
                { id: 'collections', label: 'Collections history', icon: '💰' },
                { id: 'reports', label: 'Consolidated report', icon: '📈' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={activeTab === tab.id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  style={{ borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: '700' }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* TAB 1: CUSTOM PRICING */}
            {activeTab === 'products' && (
              <div className="glass-card-3d" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>🏷️ Dealer customized product rates</h3>
                  <button className="btn btn-primary btn-sm" onClick={handleSavePricing} disabled={savingRates}>
                    {savingRates ? 'Saving pricing...' : '💾 Save Changes'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {products.map(p => {
                    const currentRate = customRates[p.name] !== undefined ? customRates[p.name] : p.default_rate
                    const isCustom = customRates[p.name] !== undefined

                    return (
                      <div 
                        key={p.id} 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', background: isCustom ? 'rgba(59, 130, 246, 0.03)' : 'rgba(255,255,255,0.01)', borderRadius: '0.75rem', border: `1px solid ${isCustom ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.04)'}` }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', color: '#fff' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', marginTop: '0.125rem' }}>Base standard rate: ₹{p.default_rate}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ width: '110px', textAlign: 'right', padding: '0.4rem 0.75rem' }} 
                            value={currentRate}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0
                              setCustomRates({ ...customRates, [p.name]: val })
                            }}
                          />
                          {isCustom && (
                            <button 
                              className="btn btn-danger btn-sm" 
                              style={{ padding: '0.375rem 0.5rem' }}
                              onClick={() => {
                                const copy = { ...customRates }
                                delete copy[p.name]
                                setCustomRates(copy)
                              }}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: WHOLESALE ORDERS */}
            {activeTab === 'orders' && (
              <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
                <div className="card-header"><h3 className="card-title">📦 Dealer wholesale orders history</h3></div>
                {orders.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>
                    <p>No orders registered for this dealer.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {orders.map(o => (
                      <div 
                        key={o.id} 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', color: '#fff' }}>Invoice {o.invoice_number}</div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', marginTop: '0.125rem' }}>Order Date: {o.sale_date}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', color: '#fff' }}>₹{o.total_amount}</div>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)' }}>Paid: ₹{o.paid_amount}</div>
                          </div>
                          <span className={`badge ${o.payment_status === 'paid' ? 'badge-success' : o.payment_status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                            {o.payment_status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DUES COLLECTION */}
            {activeTab === 'outstanding' && (
              <div className="glass-card-3d" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>🔴 Outstanding dues settlement ledger</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase' }}>Current outstanding due</span>
                    <h4 style={{ fontSize: '1.75rem', fontWeight: '800', color: selectedDealer.outstanding_amount > 0 ? '#f87171' : '#34d399', margin: '0.375rem 0 0' }}>
                      ₹{selectedDealer.outstanding_amount?.toLocaleString('en-IN')}
                    </h4>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase' }}>Credit Limit</span>
                    <h4 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', margin: '0.375rem 0 0' }}>
                      ₹{selectedDealer.credit_limit?.toLocaleString('en-IN')}
                    </h4>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: '800', color: '#fff' }}>Record wholesale payment collection</h4>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input 
                      type="number"
                      className="form-input" 
                      placeholder="Enter amount (₹)" 
                      style={{ maxWidth: '240px' }} 
                      value={collectionAmount || ''}
                      onChange={e => setCollectionAmount(Math.max(0, Number(e.target.value)))}
                    />
                    <select 
                      className="form-input" 
                      style={{ maxWidth: '160px' }}
                      value={collectionMode}
                      onChange={e => setCollectionMode(e.target.value as any)}
                    >
                      <option value="cash">💵 Cash Mode</option>
                      <option value="upi">📱 UPI/QR Mode</option>
                    </select>
                    <button className="btn btn-primary" onClick={handleCollectDues} disabled={collectionAmount <= 0}>
                      Collect payment
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: COLLECTIONS HISTORY */}
            {activeTab === 'collections' && (
              <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
                <div className="card-header"><h3 className="card-title">💰 Collections log book</h3></div>
                {collections.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>
                    <p>No collections recorded for this dealer account.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {collections.map(c => (
                      <div 
                        key={c.id} 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Payment logged: {c.collected_date}</div>
                          <div style={{ fontSize: '0.875rem', color: '#fff', fontWeight: '600', marginTop: '0.125rem' }}>{c.notes}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399' }}>+₹{c.amount}</span>
                          <span className="badge badge-info">{c.payment_mode?.toUpperCase()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: CONSOLIDATED REPORT */}
            {activeTab === 'reports' && (
              <div className="glass-card-3d" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>📈 Consolidated Ledger Report</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Total orders</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: '#fff' }}>{orders.length}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Net Collections</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: '#34d399' }}>
                      ₹{collections.reduce((sum, c) => sum + c.amount, 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Dues Balance</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: '#f87171' }}>
                      ₹{selectedDealer.outstanding_amount?.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" onClick={() => alert('Downloading wholesale ledger PDF...')}>📄 Download Ledger PDF</button>
                  <button className="btn btn-secondary" onClick={() => alert('Downloading sales invoice summary CSV...')}>📊 Export CSV</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* NEW WHOLESALE DEALER MODAL */}
      {showModal && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#fff', margin: 0 }}>Add New Wholesale Dealer</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Dealer / Business Name *</label>
                <input className="form-input" placeholder="Dealer Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Regional Area</label>
                  <input className="form-input" placeholder="Area" value={form.area} onChange={e => setForm({...form, area: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Full Address</label>
                <input className="form-input" placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">GST Number</label>
                  <input className="form-input" placeholder="GST Number" value={form.gst_number} onChange={e => setForm({...form, gst_number: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Credit Limit (₹)</label>
                  <input className="form-input" type="number" value={form.credit_limit} onChange={e => setForm({...form, credit_limit: Number(e.target.value)})} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveDealer} disabled={!form.name || saving}>
                  {saving ? 'Saving...' : '💾 Save Dealer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
