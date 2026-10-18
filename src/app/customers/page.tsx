'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import { Users, Plus, Phone, MapPin, FileText, CheckCircle, X, Receipt, Printer } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'
import ReceiptPreviewModal from '@/components/printer/ReceiptPreviewModal'
import { BillData } from '@/lib/printer/receipt'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', area: '', gst_number: '' })
  const [saving, setSaving] = useState(false)
  const [customerBillsModal, setCustomerBillsModal] = useState<any | null>(null)
  const [customerBills, setCustomerBills] = useState<any[]>([])
  const [loadingCustomerBills, setLoadingCustomerBills] = useState(false)
  const [previewBill, setPreviewBill] = useState<BillData | null>(null)
  const supabase = createClient()

  useDataSyncListener(['customers', 'bills', 'dues', 'collections', 'all'], () => { loadCustomers() })

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
      const { data, error } = await supabase.from('customers').insert([form]).select().single()
      if (error) throw error
      if (data) {
        setCustomers(prev => [data, ...prev])
      }
      emitDataChange('customers')

      setShowModal(false)
      setForm({ name: '', phone: '', address: '', area: '', gst_number: '' })
      loadCustomers()
      alert('✅ Customer saved successfully in database!')
    } catch (e: any) {
      alert(`Error saving customer: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function openCustomerInvoices(customer: any) {
    setCustomerBillsModal(customer)
    setLoadingCustomerBills(true)
    try {
      const { data } = await supabase
        .from('bills')
        .select('*')
        .or(`customer_id.eq.${customer.id},customer_name.eq.${customer.name}`)
        .order('date', { ascending: false })
        .limit(10)
      setCustomerBills(data || [])
    } catch (e) {
      console.warn('Error loading customer bills:', e)
      setCustomerBills([])
    } finally {
      setLoadingCustomerBills(false)
    }
  }

  async function handlePrintCustomerBill(b: any, customer: any) {
    try {
      const { data: items } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', b.id)

      const billDataObj: BillData = {
        id: b.id,
        invoice_number: b.invoice_number,
        bill_type: b.bill_type || 'customer',
        customer_name: customer.name || b.customer_name || 'Customer',
        customer_phone: customer.phone || b.customer_phone || null,
        customer_address: customer.address || b.customer_address || null,
        customer_gstin: customer.gst_number || b.customer_gstin || null,
        date: b.date,
        subtotal: Number(b.total_amount) || 0,
        gst_amount: Number(b.gst_amount) || 0,
        discount_amount: Number(b.discount_amount) || 0,
        total_amount: Number(b.total_amount) || 0,
        paid_amount: Number(b.paid_amount) || 0,
        due_amount: Number(b.due_amount) || 0,
        payment_method: b.payment_mode || b.payment_method || 'cash',
        items: (items && items.length > 0 ? items : [{
          product_name: 'Water Can (20L)',
          quantity: b.items_count || 1,
          rate: Number(b.total_amount) || 0,
          amount: Number(b.total_amount) || 0
        }]).map((i: any) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          rate: Number(i.rate) || 0,
          amount: Number(i.amount) || Number(i.total) || 0,
          total: Number(i.total) || Number(i.amount) || 0
        }))
      }
      setPreviewBill(billDataObj)
    } catch (err: any) {
      alert(`Error loading bill for print: ${err?.message || err}`)
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
      title: 'Actions',
      align: 'right',
      render: (c) => (
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Printer style={{ width: '13px', height: '13px', color: '#fbbf24' }} />}
            onClick={() => openCustomerInvoices(c)}
          >
            Invoices
          </Button>
          <a href={`/billing?type=customer&customerId=${c.id}`}>
            <Button variant="secondary" size="sm" icon={<Receipt style={{ width: '13px', height: '13px' }} />}>
              New Bill
            </Button>
          </a>
        </div>
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
      {/* Customer Invoices Modal */}
      {customerBillsModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '750px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                  Invoices for {customerBillsModal.name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                  Outstanding Balance: <strong style={{ color: Number(customerBillsModal.outstanding_amount) > 0 ? '#f87171' : '#34d399' }}>{formatCurrency(Number(customerBillsModal.outstanding_amount) || 0)}</strong>
                </span>
              </div>
              <button onClick={() => setCustomerBillsModal(null)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingCustomerBills ? (
                <SkeletonTable rows={4} />
              ) : customerBills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#71717a' }}>
                  No recent invoices found for this customer.
                </div>
              ) : (
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th style={{ textAlign: 'right' }}>Due</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerBills.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>{b.invoice_number}</td>
                        <td style={{ color: '#a1a1aa' }}>{b.date}</td>
                        <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(Number(b.total_amount) || 0)}</td>
                        <td className="num" style={{ textAlign: 'right', color: '#34d399' }}>{formatCurrency(Number(b.paid_amount) || 0)}</td>
                        <td className="num" style={{ textAlign: 'right', color: Number(b.due_amount) > 0 ? '#f87171' : '#a1a1aa' }}>{formatCurrency(Number(b.due_amount) || 0)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Printer style={{ width: '12px', height: '12px', color: '#fbbf24' }} />}
                            onClick={() => handlePrintCustomerBill(b, customerBillsModal)}
                          >
                            Print Bill
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href={`/billing?type=customer&customerId=${customerBillsModal.id}`}>
                <Button variant="primary" size="sm" icon={<Receipt style={{ width: '13px', height: '13px' }} />}>
                  Create New Bill
                </Button>
              </a>
              <Button variant="secondary" size="sm" onClick={() => setCustomerBillsModal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Receipt Preview & Print Modal */}
      {previewBill && (
        <ReceiptPreviewModal
          isOpen={!!previewBill}
          onClose={() => setPreviewBill(null)}
          bill={previewBill}
          initialFormat="80mm"
        />
      )}
    </div>
  )
}
