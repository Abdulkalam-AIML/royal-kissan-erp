'use client'

import { useState } from 'react'
import { Customer } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/formatters'
import { Users, Plus, Phone, MapPin, ShieldAlert, Check, X, Building } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange } from '@/lib/events/data-sync'

interface BillingCustomerSelectorProps {
  customers: Customer[]
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer | null) => void
  onCustomerCreated?: (newCustomer: Customer) => void
}

export default function BillingCustomerSelector({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onCustomerCreated
}: BillingCustomerSelectorProps) {
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const [newCustForm, setNewCustForm] = useState({
    name: '',
    phone: '',
    address: '',
    area: '',
    gst_number: '',
    credit_limit: 10000
  })

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.area?.toLowerCase().includes(search.toLowerCase()) ||
    c.gst_number?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreateCustomer() {
    if (!newCustForm.name.trim()) {
      alert('Please enter a valid customer name.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: newCustForm.name.trim(),
          phone: newCustForm.phone.trim() || null,
          address: newCustForm.address.trim() || null,
          area: newCustForm.area.trim() || null,
          gst_number: newCustForm.gst_number.trim() || null,
          credit_limit: Number(newCustForm.credit_limit) || 10000,
          outstanding_amount: 0,
          is_active: true
        }])
        .select()
        .single()

      if (error) {
        console.warn('Supabase customer insert failed, using fallback customer:', error.message)
        const localCust: Customer = {
          id: `cust-${Date.now()}`,
          name: newCustForm.name.trim(),
          phone: newCustForm.phone.trim() || undefined,
          address: newCustForm.address.trim() || undefined,
          area: newCustForm.area.trim() || undefined,
          gst_number: newCustForm.gst_number.trim() || undefined,
          credit_limit: Number(newCustForm.credit_limit) || 10000,
          outstanding_amount: 0,
          is_active: true,
          created_at: new Date().toISOString()
        }
        if (onCustomerCreated) onCustomerCreated(localCust)
        onSelectCustomer(localCust)
        setShowAddModal(false)
        setNewCustForm({ name: '', phone: '', address: '', area: '', gst_number: '', credit_limit: 10000 })
        emitDataChange('customers')
        return
      }

      if (data) {
        emitDataChange('customers')
        if (onCustomerCreated) onCustomerCreated(data)
        onSelectCustomer(data)
        setShowAddModal(false)
        setNewCustForm({ name: '', phone: '', address: '', area: '', gst_number: '', credit_limit: 10000 })
      }
    } catch (err: any) {
      console.warn('Error creating customer, using local fallback:', err)
      const localCust: Customer = {
        id: `cust-${Date.now()}`,
        name: newCustForm.name.trim(),
        phone: newCustForm.phone.trim() || undefined,
        address: newCustForm.address.trim() || undefined,
        area: newCustForm.area.trim() || undefined,
        gst_number: newCustForm.gst_number.trim() || undefined,
        credit_limit: Number(newCustForm.credit_limit) || 10000,
        outstanding_amount: 0,
        is_active: true,
        created_at: new Date().toISOString()
      }
      if (onCustomerCreated) onCustomerCreated(localCust)
      onSelectCustomer(localCust)
      setShowAddModal(false)
      setNewCustForm({ name: '', phone: '', address: '', area: '', gst_number: '', credit_limit: 10000 })
      emitDataChange('customers')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Users style={{ width: '15px', height: '15px', color: '#fbbf24' }} />
          Select Customer Account
        </label>
        <Button 
          type="button"
          variant="secondary" 
          size="sm" 
          icon={<Plus style={{ width: '13px', height: '13px', color: '#fbbf24' }} />}
          onClick={() => setShowAddModal(true)}
        >
          Add Customer
        </Button>
      </div>

      {/* Customer Selection Card or Dropdown */}
      {selectedCustomer ? (
        <div style={{ 
          background: 'rgba(251, 191, 36, 0.04)', 
          border: '1px solid rgba(251, 191, 36, 0.3)', 
          borderRadius: '10px', 
          padding: '1rem',
          position: 'relative'
        }}>
          <button 
            type="button"
            onClick={() => onSelectCustomer(null)}
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
            title="Change Customer"
          >
            <X style={{ width: '15px', height: '15px' }} />
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', paddingRight: '2rem' }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f4f4f5' }}>
                {selectedCustomer.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.8rem', color: '#a1a1aa' }}>
                {selectedCustomer.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Phone style={{ width: '12px', height: '12px', color: '#fbbf24' }} /> {selectedCustomer.phone}
                  </span>
                )}
                {selectedCustomer.area && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin style={{ width: '12px', height: '12px', color: '#fbbf24' }} /> {selectedCustomer.area}
                  </span>
                )}
                {selectedCustomer.gst_number && (
                  <span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>
                    GST: {selectedCustomer.gst_number}
                  </span>
                )}
              </div>
              {selectedCustomer.address && (
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
                  {selectedCustomer.address}
                </div>
              )}
            </div>

            {/* Balances & Credit Limit */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Existing Outstanding</div>
                <div className="num" style={{ fontSize: '1rem', fontWeight: 800, color: (selectedCustomer.outstanding_amount || 0) > 0 ? '#f87171' : '#34d399' }}>
                  {formatCurrency(Number(selectedCustomer.outstanding_amount) || 0)}
                </div>
              </div>
              {selectedCustomer.credit_limit !== undefined && (
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                  <div style={{ fontSize: '0.68rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Credit Limit</div>
                  <div className="num" style={{ fontSize: '1rem', fontWeight: 700, color: '#e4e4e7' }}>
                    {formatCurrency(Number(selectedCustomer.credit_limit) || 0)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <Input 
            placeholder="🔍 Search existing customer by name, phone, area, or GSTIN..." 
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
              {filteredCustomers.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>
                  No registered customers found matching "{search}".
                  <div style={{ marginTop: '0.5rem' }}>
                    <Button 
                      type="button" 
                      variant="primary" 
                      size="sm" 
                      icon={<Plus style={{ width: '13px', height: '13px' }} />}
                      onClick={() => {
                        setShowAddModal(true)
                        setNewCustForm(prev => ({ ...prev, name: search }))
                        setIsOpen(false)
                      }}
                    >
                      Add "{search || 'New Customer'}"
                    </Button>
                  </div>
                </div>
              ) : (
                filteredCustomers.slice(0, 15).map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c)
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
                      <div style={{ fontWeight: 700, color: '#f4f4f5', fontSize: '0.9rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                        {c.phone && <span>📞 {c.phone}</span>}
                        {c.area && <span>📍 {c.area}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="num" style={{ fontSize: '0.85rem', fontWeight: 700, color: (c.outstanding_amount || 0) > 0 ? '#f87171' : '#34d399' }}>
                        Due: {formatCurrency(Number(c.outstanding_amount) || 0)}
                      </div>
                      {c.credit_limit && (
                        <div style={{ fontSize: '0.7rem', color: '#71717a' }}>
                          Limit: {formatCurrency(Number(c.credit_limit) || 0)}
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users style={{ color: '#fbbf24', width: '20px', height: '20px' }} />
                Add New Customer Account
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
                label="Customer / Firm Name *" 
                placeholder="e.g. Sri Balaji Enterprises" 
                value={newCustForm.name} 
                onChange={e => setNewCustForm({ ...newCustForm, name: e.target.value })} 
                autoFocus
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input 
                  label="Phone Number" 
                  placeholder="10-digit mobile" 
                  value={newCustForm.phone} 
                  onChange={e => setNewCustForm({ ...newCustForm, phone: e.target.value })} 
                />
                <Input 
                  label="Area / Route Location" 
                  placeholder="e.g. Tenali Main Road" 
                  value={newCustForm.area} 
                  onChange={e => setNewCustForm({ ...newCustForm, area: e.target.value })} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input 
                  label="GSTIN (Optional)" 
                  placeholder="37AAAAA0000A1Z5" 
                  value={newCustForm.gst_number} 
                  onChange={e => setNewCustForm({ ...newCustForm, gst_number: e.target.value })} 
                />
                <Input 
                  label="Credit Limit (₹)" 
                  type="number"
                  value={newCustForm.credit_limit} 
                  onChange={e => setNewCustForm({ ...newCustForm, credit_limit: Number(e.target.value) })} 
                />
              </div>
              <Input 
                label="Delivery Address" 
                placeholder="Full street address" 
                value={newCustForm.address} 
                onChange={e => setNewCustForm({ ...newCustForm, address: e.target.value })} 
              />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="button" variant="primary" loading={saving} onClick={handleCreateCustomer}>
                Save Customer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
