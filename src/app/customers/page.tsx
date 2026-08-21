'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Phone, MapPin, FileText, CheckCircle, X, Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', area: '', gst_number: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, name, address, phone, area, gst_number, outstanding_amount, is_active')
        .order('name')
      setCustomers(data || [])
    } catch (e) {
      console.warn('Error loading customers:', e)
    } finally {
      setLoading(false)
    }
  }

  async function saveCustomer() {
    if (!form.name.trim()) {
      alert('Please provide a customer name')
      return
    }
    setSaving(true)
    try {
      await supabase.from('customers').insert([form])
      setShowModal(false)
      setForm({ name: '', phone: '', address: '', area: '', gst_number: '' })
      loadCustomers()
    } catch (e: any) {
      alert(`Error saving customer: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      title: 'Customer Name',
      sortable: true,
      render: (c) => (
        <div>
          <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{c.name}</div>
          {c.address && <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{c.address}</div>}
        </div>
      ),
    },
    {
      key: 'phone',
      title: 'Phone Number',
      render: (c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#a1a1aa', fontSize: '0.8rem' }}>
          <Phone style={{ width: '13px', height: '13px', color: '#fbbf24' }} />
          <span>{c.phone || '—'}</span>
        </div>
      ),
    },
    {
      key: 'area',
      title: 'Area / Location',
      render: (c) => (
        c.area ? (
          <Badge variant="neutral" icon={<MapPin style={{ width: '11px', height: '11px' }} />}>
            {c.area}
          </Badge>
        ) : '—'
      ),
    },
    {
      key: 'gst_number',
      title: 'GST Number',
      render: (c) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#a1a1aa' }}>
          {c.gst_number || 'Non-GST'}
        </span>
      ),
    },
    {
      key: 'outstanding_amount',
      title: 'Outstanding Balance',
      align: 'right',
      sortable: true,
      render: (c) => (
        <span className="num" style={{ fontWeight: 700, color: Number(c.outstanding_amount) > 0 ? '#f87171' : '#34d399' }}>
          {formatCurrency(Number(c.outstanding_amount) || 0)}
        </span>
      ),
    },
    {
      key: 'is_active',
      title: 'Status',
      render: (c) => (
        <Badge variant={c.is_active !== false ? 'success' : 'danger'}>
          {c.is_active !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Quick Bill',
      align: 'right',
      render: (c) => (
        <a href={`/billing?customer=${encodeURIComponent(c.name)}`}>
          <Button variant="secondary" size="sm" icon={<Receipt style={{ width: '13px', height: '13px', color: '#fbbf24' }} />}>
            Create Bill
          </Button>
        </a>
      ),
    },
  ]

  const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.outstanding_amount) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Customer Directory
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {customers.length} registered accounts &bull; Total Outstanding: {' '}
            <span className="num" style={{ color: '#f87171', fontWeight: 700 }}>
              {formatCurrency(totalOutstanding)}
            </span>
          </p>
        </div>

        <Button variant="primary" icon={<Plus style={{ width: '16px', height: '16px' }} />} onClick={() => setShowModal(true)}>
          Add Customer
        </Button>
      </div>

      {/* Main Table */}
      {loading ? (
        <SkeletonTable rows={8} />
      ) : (
        <DataTable
          columns={columns}
          data={customers}
          searchPlaceholder="Search customers by name, phone, area, or GST..."
          exportFileName="royal-kissan-customers"
        />
      )}

      {/* Add Customer Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Add New Customer Account</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input label="Customer / Firm Name" placeholder="e.g. Sri Venkateswara Water Supplies" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="Phone Number" placeholder="10-digit mobile number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <Input label="Area / Route Location" placeholder="e.g. Guntur Highway" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} />
              </div>
              <Input label="GSTIN (Optional)" placeholder="37BABS2021G1Z3" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} />
              <Input label="Delivery Address" placeholder="Full address details" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={saveCustomer}>Save Customer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
