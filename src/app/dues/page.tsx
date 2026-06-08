'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DuesPage() {
  const [dues, setDues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [showCollectModal, setShowCollectModal] = useState<any | null>(null)
  const [updating, setUpdating] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadDues()
  }, [])

  async function loadDues() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customer_dues')
        .select('*, routes(name), drivers(name)')
        .gt('due_amount', 0)
        .order('due_amount', { ascending: false })

      if (data) {
        setDues(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Handle manual due collection/partial resolution
  const handleCollect = async () => {
    if (!showCollectModal || paymentAmount <= 0) return
    setUpdating(true)
    try {
      const currentDue = showCollectModal
      const newDueAmount = Math.max(0, currentDue.due_amount - paymentAmount)
      const resolvedAmount = (currentDue.resolved_amount || 0) + Math.min(paymentAmount, currentDue.due_amount)
      const isResolved = newDueAmount === 0

      // Update in customer_dues table
      const { error } = await supabase
        .from('customer_dues')
        .update({
          due_amount: newDueAmount,
          resolved_amount: resolvedAmount,
          status: isResolved ? 'resolved' : 'pending',
          last_updated: new Date().toISOString()
        })
        .eq('id', currentDue.id)

      if (error) {
        throw error
      }

      // Also record this collection in driver_collections (as UPI or Cash collection)
      const { error: collError } = await supabase
        .from('driver_collections')
        .insert({
          driver_id: currentDue.driver_id,
          route_id: currentDue.route_id,
          cash_collected: paymentAmount, // default to cash for manual due clear
          upi_collected: 0,
          total_collected: paymentAmount,
          due_outstanding: newDueAmount
        })

      if (collError) {
        console.error('Error inserting collection log for due payment:', collError)
      }

      setShowCollectModal(null)
      setPaymentAmount(0)
      loadDues()
    } catch (err) {
      console.error(err)
      alert('Failed to update payment details.')
    } finally {
      setUpdating(false)
    }
  }

  const totalOutstanding = dues.reduce((sum, d) => sum + (Number(d.due_amount) || 0), 0)

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-title">🔴 Outstanding Dues</h2>
          <p className="page-subtitle">Track outstanding credit totals and resolve outstanding route dues</p>
        </div>
      </div>

      {totalOutstanding > 0 && (
        <div style={{ 
          padding: '1.25rem', 
          background: 'hsl(0 85% 60% / 0.1)', 
          border: '1px solid hsl(0 85% 60% / 0.3)', 
          borderRadius: '0.75rem', 
          marginBottom: '1.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontWeight: '700', color: 'hsl(0 85% 70%)', fontSize: '1rem' }}>⚠️ Outstanding Dues Alert</div>
            <div style={{ fontSize: '0.8125rem', color: 'hsl(215 20% 55%)', marginTop: '0.25rem' }}>
              {dues.length} customer accounts are flagged in red as overdue
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'hsl(0 85% 70%)' }}>
            ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><span className="loading-spinner" /></div>
          ) : dues.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <p style={{ fontWeight: '600' }}>All dues cleared! No outstanding payments found.</p>
            </div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Route</th>
                  <th>Assigned Driver</th>
                  <th style={{ textAlign: 'right' }}>Paid (Resolved)</th>
                  <th style={{ textAlign: 'right' }}>Outstanding Due</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dues.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: '700', color: 'hsl(0 85% 70%)' }}>{d.customer_name}</td>
                    <td>{d.routes?.name || '—'}</td>
                    <td>{d.drivers?.name || '—'}</td>
                    <td style={{ textAlign: 'right', color: 'hsl(142 71% 55%)' }}>
                      ₹{(d.resolved_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: 'hsl(0 85% 60%)' }}>
                      ₹{d.due_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'hsl(215 20% 45%)' }}>
                      {new Date(d.last_updated).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setShowCollectModal(d)
                          setPaymentAmount(d.due_amount)
                        }}
                      >
                        💰 Clear Due
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Collect Modal */}
      {showCollectModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCollectModal(null)}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'hsl(210 40% 98%)', margin: 0 }}>Record Due Collection</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCollectModal(null)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'hsl(215 20% 55%)', marginBottom: '1rem' }}>
                Customer: <strong>{showCollectModal.customer_name}</strong><br/>
                Current Outstanding: <span style={{ color: 'hsl(0 85% 70%)', fontWeight: '700' }}>₹{showCollectModal.due_amount.toFixed(2)}</span>
              </p>
              
              <div className="form-group">
                <label className="form-label">Amount Collected (₹)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  max={showCollectModal.due_amount}
                  min="1"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid hsl(217 32% 17%)' }}>
                <button className="btn btn-ghost" onClick={() => setShowCollectModal(null)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleCollect}
                  disabled={updating || paymentAmount <= 0}
                >
                  {updating ? 'Saving...' : '✅ Save Collection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
