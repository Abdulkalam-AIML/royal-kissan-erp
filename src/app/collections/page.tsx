'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CollectionsPage() {
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadCollections()
  }, [])

  async function loadCollections() {
    setLoading(true)
    try {
      // Fetch from driver_collections first
      const { data, error } = await supabase
        .from('driver_collections')
        .select('*, drivers(name), routes(name)')
        .order('collection_date', { ascending: false })
        .limit(50)

      if (data && data.length > 0) {
        setCollections(data)
      } else {
        // Fallback to legacy collections table
        const { data: legacyData } = await supabase
          .from('collections')
          .select('*, drivers(name), routes(name)')
          .order('collection_date', { ascending: false })
          .limit(50)

        if (legacyData) {
          setCollections(
            legacyData.map(c => ({
              id: c.id,
              collection_date: c.collection_date,
              drivers: c.drivers,
              routes: c.routes,
              cash_collected: c.cash_amount || 0,
              upi_collected: c.upi_amount || 0,
              total_collected: c.total_collected || 0,
              due_outstanding: 0
            }))
          )
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totalCollected = collections.reduce((s, c) => s + (Number(c.total_collected) || 0), 0)
  const totalCash = collections.reduce((s, c) => s + (Number(c.cash_collected) || 0), 0)
  const totalUpi = collections.reduce((s, c) => s + (Number(c.upi_collected) || 0), 0)
  const totalDues = collections.reduce((s, c) => s + (Number(c.due_outstanding) || 0), 0)

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-title">💰 Route Collections</h2>
          <p className="page-subtitle">Historical log of driver route collections and daily sales summaries</p>
        </div>
      </div>

      {/* Summary Stats Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Collections</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'hsl(210 40% 98%)', marginTop: '0.25rem' }}>₹{totalCollected.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.75rem', color: 'hsl(142 71% 45%)', marginTop: '0.25rem' }}>Active database log</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Cash</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'hsl(142 71% 45%)', marginTop: '0.25rem' }}>₹{totalCash.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 45%)', marginTop: '0.25rem' }}>Physical payments</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total UPI</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'hsl(199 89% 48%)', marginTop: '0.25rem' }}>₹{totalUpi.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 45%)', marginTop: '0.25rem' }}>Digital bank transfers</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unresolved Dues</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: totalDues > 0 ? 'hsl(0 85% 60%)' : 'hsl(142 71% 45%)', marginTop: '0.25rem' }}>₹{totalDues.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 45%)', marginTop: '0.25rem' }}>Route outstanding</div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><span className="loading-spinner" /></div>
        ) : collections.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
            <p>No collections recorded yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th style={{ textAlign: 'right' }}>Cash</th>
                  <th style={{ textAlign: 'right' }}>UPI</th>
                  <th style={{ textAlign: 'right' }}>Dues</th>
                  <th style={{ textAlign: 'right' }}>Total Collected</th>
                </tr>
              </thead>
              <tbody>
                {collections.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '600', color: 'hsl(210 40% 98%)' }}>
                      {new Date(c.collection_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>{c.drivers?.name || '—'}</td>
                    <td>{c.routes?.name || '—'}</td>
                    <td style={{ textAlign: 'right', color: 'hsl(142 71% 55%)', fontWeight: '600' }}>
                      ₹{(c.cash_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', color: 'hsl(199 89% 48%)', fontWeight: '600' }}>
                      ₹{(c.upi_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      color: (c.due_outstanding || 0) > 0 ? 'hsl(0 85% 60%)' : 'hsl(215 20% 45%)', 
                      fontWeight: '700' 
                    }}>
                      ₹{(c.due_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: 'hsl(210 40% 98%)' }}>
                      ₹{(c.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
