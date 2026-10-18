'use client'

import { useState } from 'react'
import { Dealer } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/formatters'
import { Building2, Plus, Phone, MapPin, Hash, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange } from '@/lib/events/data-sync'

interface BillingDealerSelectorProps {
  dealers: Dealer[]
  selectedDealer: Dealer | null
  onSelectDealer: (dealer: Dealer | null) => void
  onDealerCreated?: (newDealer: Dealer) => void
}

export default function BillingDealerSelector({
  dealers,
  selectedDealer,
  onSelectDealer,
  onDealerCreated
}: BillingDealerSelectorProps) {
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const [newDealerForm, setNewDealerForm] = useState({
    name: '',
    dealer_code: '',
    phone: '',
    address: '',
    area: '',
    gst_number: '',
    credit_limit: 25000
  })

  const filteredDealers = dealers.filter(d => 
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.dealer_code?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.includes(search) ||
    d.area?.toLowerCase().includes(search.toLowerCase()) ||
    d.gst_number?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreateDealer() {
    if (!newDealerForm.name.trim()) {
      alert('Please enter a valid dealer / firm name.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('dealers')
        .insert([{
          name: newDealerForm.name.trim(),
          dealer_code: newDealerForm.dealer_code.trim() || `DLR-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: newDealerForm.phone.trim() || null,
          address: newDealerForm.address.trim() || null,
          area: newDealerForm.area.trim() || null,
          gst_number: newDealerForm.gst_number.trim() || null,
          credit_limit: Number(newDealerForm.credit_limit) || 25000,
          outstanding_amount: 0,
          total_purchases: 0,
          total_sales: 0,
          is_active: true
        }])
        .select()
        .single()

      if (error) {
        console.warn('Supabase dealer insert failed, using fallback dealer creation:', error.message)
        const localDealer: Dealer = {
          id: `dlr-${Date.now()}`,
          name: newDealerForm.name.trim(),
          dealer_code: newDealerForm.dealer_code.trim() || `DLR-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: newDealerForm.phone.trim() || undefined,
          address: newDealerForm.address.trim() || undefined,
          area: newDealerForm.area.trim() || undefined,
          gst_number: newDealerForm.gst_number.trim() || undefined,
          credit_limit: Number(newDealerForm.credit_limit) || 25000,
          outstanding_amount: 0,
          total_purchases: 0,
          total_sales: 0,
          is_active: true,
          created_at: new Date().toISOString()
        }
        if (onDealerCreated) onDealerCreated(localDealer)
        onSelectDealer(localDealer)
        setShowAddModal(false)
        setNewDealerForm({ name: '', dealer_code: '', phone: '', address: '', area: '', gst_number: '', credit_limit: 25000 })
        emitDataChange('dealers')
        return
      }

      if (data) {
        emitDataChange('dealers')
        if (onDealerCreated) onDealerCreated(data)
        onSelectDealer(data)
        setShowAddModal(false)
        setNewDealerForm({ name: '', dealer_code: '', phone: '', address: '', area: '', gst_number: '', credit_limit: 25000 })
      }
    } catch (err: any) {
      console.warn('Error creating dealer, using local fallback:', err)
      const localDealer: Dealer = {
        id: `dlr-${Date.now()}`,
        name: newDealerForm.name.trim(),
        dealer_code: newDealerForm.dealer_code.trim() || `DLR-${Math.floor(1000 + Math.random() * 9000)}`,
        phone: newDealerForm.phone.trim() || undefined,
        address: newDealerForm.address.trim() || undefined,
        area: newDealerForm.area.trim() || undefined,
        gst_number: newDealerForm.gst_number.trim() || undefined,
        credit_limit: Number(newDealerForm.credit_limit) || 25000,
        outstanding_amount: 0,
        total_purchases: 0,
        total_sales: 0,
        is_active: true,
        created_at: new Date().toISOString()
      }
      if (onDealerCreated) onDealerCreated(localDealer)
      onSelectDealer(localDealer)
      setShowAddModal(false)
      setNewDealerForm({ name: '', dealer_code: '', phone: '', address: '', area: '', gst_number: '', credit_limit: 25000 })
      emitDataChange('dealers')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Building2 style={{ width: '15px', height: '15px', color: '#fbbf24' }} />
          Select Dealer Account
        </label>
        <Button 
          type="button"
          variant="secondary" 
          size="sm" 
          icon={<Plus style={{ width: '13px', height: '13px', color: '#fbbf24' }} />}
          onClick={() => setShowAddModal(true)}
        >
          Add Dealer
        </Button>
      </div>

      {selectedDealer ? (
        <div style={{ 
          background: 'rgba(251, 191, 36, 0.04)', 
          border: '1px solid rgba(251, 191, 36, 0.3)', 
          borderRadius: '10px', 
          padding: '1rem',
          position: 'relative'
        }}>
          <button 
            type="button"
            onClick={() => onSelectDealer(null)}
            style={{ 
              position: 'absolute', 
              top: '12px', 
              right: '12px', 
              background: 'rgba(255,255,255,0.06)', 
              border: 'none', 
              borderRadius: '6px', 
              color: '#a1a1aa', 
              cursor: 'pointer',
              padding: '4px'
            }}
            title="Change Dealer"
          >
            <X style={{ width: '15px', height: '15px' }} />
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', paddingRight: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f4f4f5' }}>
                  {selectedDealer.name}
                </span>
                {selectedDealer.dealer_code && (
                  <span style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.75rem', 
                    background: 'rgba(251,191,36,0.15)', 
                    color: '#fbbf24', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    fontWeight: 700 
                  }}>
                    {selectedDealer.dealer_code}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.8rem', color: '#a1a1aa' }}>
                {selectedDealer.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Phone style={{ width: '12px', height: '12px', color: '#fbbf24' }} /> {selectedDealer.phone}
                  </span>
                )}
                {selectedDealer.area && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin style={{ width: '12px', height: '12px', color: '#fbbf24' }} /> {selectedDealer.area}
                  </span>
                )}
                {selectedDealer.gst_number && (
                  <span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>
                    GST: {selectedDealer.gst_number}
                  </span>
                )}
              </div>
              {selectedDealer.address && (
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
                  {selectedDealer.address}
                </div>
              )}
            </div>

            {/* Financial Status */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Current Outstanding</div>
                <div className="num" style={{ fontSize: '1rem', fontWeight: 800, color: (selectedDealer.outstanding_amount || 0) > 0 ? '#f87171' : '#34d399' }}>
                  {formatCurrency(Number(selectedDealer.outstanding_amount) || 0)}
                </div>
              </div>
              {selectedDealer.credit_limit !== undefined && (
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                  <div style={{ fontSize: '0.68rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Credit Limit</div>
                  <div className="num" style={{ fontSize: '1rem', fontWeight: 700, color: '#e4e4e7' }}>
                    {formatCurrency(Number(selectedDealer.credit_limit) || 0)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <Input 
            placeholder="🔍 Search dealer by firm name, dealer code, area, or GST..." 
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
          />

          {isOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '260px',
              overflowY: 'auto',
              background: '#18181b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              marginTop: '4px',
              zIndex: 50,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.6)'
            }}>
              {filteredDealers.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>
                  No dealers found matching "{search}".
                  <div style={{ marginTop: '0.5rem' }}>
                    <Button 
                      type="button" 
                      variant="primary" 
                      size="sm" 
                      icon={<Plus style={{ width: '13px', height: '13px' }} />}
                      onClick={() => {
                        setShowAddModal(true)
                        setNewDealerForm(prev => ({ ...prev, name: search }))
                        setIsOpen(false)
                      }}
                    >
                      Add Dealer "{search || 'New Dealer'}"
                    </Button>
                  </div>
                </div>
              ) : (
                filteredDealers.slice(0, 15).map(d => (
                  <div
                    key={d.id}
                    onClick={() => {
                      onSelectDealer(d)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, color: '#f4f4f5', fontSize: '0.9rem' }}>{d.name}</span>
                        {d.dealer_code && (
                          <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontFamily: 'monospace' }}>[{d.dealer_code}]</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                        {d.phone && <span>📞 {d.phone}</span>}
                        {d.area && <span>📍 {d.area}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="num" style={{ fontSize: '0.85rem', fontWeight: 700, color: (d.outstanding_amount || 0) > 0 ? '#f87171' : '#34d399' }}>
                        Due: {formatCurrency(Number(d.outstanding_amount) || 0)}
                      </div>
                      {d.credit_limit && (
                        <div style={{ fontSize: '0.7rem', color: '#71717a' }}>
                          Limit: {formatCurrency(Number(d.credit_limit) || 0)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Dealer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 style={{ color: '#fbbf24', width: '20px', height: '20px' }} />
                Add New Dealer Account
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input 
                label="Dealer / Agency Name *" 
                placeholder="e.g. Royal Water Distributors" 
                value={newDealerForm.name} 
                onChange={e => setNewDealerForm({ ...newDealerForm, name: e.target.value })} 
                autoFocus
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input 
                  label="Dealer Code (Auto or Custom)" 
                  placeholder="e.g. DLR-0042" 
                  value={newDealerForm.dealer_code} 
                  onChange={e => setNewDealerForm({ ...newDealerForm, dealer_code: e.target.value })} 
                />
                <Input 
                  label="Phone Number" 
                  placeholder="10-digit mobile" 
                  value={newDealerForm.phone} 
                  onChange={e => setNewDealerForm({ ...newDealerForm, phone: e.target.value })} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input 
                  label="Area / Territory" 
                  placeholder="e.g. Tenali City" 
                  value={newDealerForm.area} 
                  onChange={e => setNewDealerForm({ ...newDealerForm, area: e.target.value })} 
                />
                <Input 
                  label="GSTIN (Optional)" 
                  placeholder="37AAAAA0000A1Z5" 
                  value={newDealerForm.gst_number} 
                  onChange={e => setNewDealerForm({ ...newDealerForm, gst_number: e.target.value })} 
                />
              </div>
              <Input 
                label="Credit Limit (₹)" 
                type="number"
                value={newDealerForm.credit_limit} 
                onChange={e => setNewDealerForm({ ...newDealerForm, credit_limit: Number(e.target.value) })} 
              />
              <Input 
                label="Office / Godown Address" 
                placeholder="Full address details" 
                value={newDealerForm.address} 
                onChange={e => setNewDealerForm({ ...newDealerForm, address: e.target.value })} 
              />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="button" variant="primary" loading={saving} onClick={handleCreateDealer}>
                Save Dealer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
