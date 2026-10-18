'use client'

import { useState, useEffect } from 'react'
import { Driver, Route, RouteCustomer } from '@/lib/types/database'
import { Truck, MapPin, User, Calendar, Plus, Navigation } from 'lucide-react'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'

interface BillingRouteSelectorProps {
  drivers: Driver[]
  routes: Route[]
  selectedDriverId: string
  selectedRouteId: string
  selectedRouteCustomerId: string
  deliveryDate: string
  onDriverChange: (driverId: string) => void
  onRouteChange: (routeId: string) => void
  onRouteCustomerSelect: (customer: RouteCustomer | null) => void
  onDeliveryDateChange: (date: string) => void
  onApplyPresetItem?: (preset: { productName: string; rate: number; quantity: number }) => void
}

export default function BillingRouteSelector({
  drivers,
  routes,
  selectedDriverId,
  selectedRouteId,
  selectedRouteCustomerId,
  deliveryDate,
  onDriverChange,
  onRouteChange,
  onRouteCustomerSelect,
  onDeliveryDateChange,
  onApplyPresetItem
}: BillingRouteSelectorProps) {
  const [routeCustomers, setRouteCustomers] = useState<RouteCustomer[]>([])
  const [loadingStops, setLoadingStops] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null)

  const supabase = createClient()

  // Load route customers whenever route changes
  useEffect(() => {
    if (!selectedRouteId) {
      setRouteCustomers([])
      return
    }

    async function loadStops() {
      setLoadingStops(true)
      try {
        const { data } = await supabase
          .from('route_customers')
          .select('*')
          .eq('route_id', selectedRouteId)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        setRouteCustomers(data || [])
      } catch (err) {
        console.warn('Error loading route stops:', err)
      } finally {
        setLoadingStops(false)
      }
    }

    loadStops()
  }, [selectedRouteId])

  // Look up active assignment for driver + route on deliveryDate
  useEffect(() => {
    if (!selectedDriverId || !selectedRouteId) {
      setActiveAssignment(null)
      return
    }

    async function checkAssignment() {
      try {
        const { data } = await supabase
          .from('daily_route_assignments')
          .select('id, vehicle_number, status, date')
          .eq('driver_id', selectedDriverId)
          .eq('route_id', selectedRouteId)
          .eq('date', deliveryDate)
          .maybeSingle()

        setActiveAssignment(data || null)
      } catch {
        setActiveAssignment(null)
      }
    }

    checkAssignment()
  }, [selectedDriverId, selectedRouteId, deliveryDate])

  const selectedDriver = drivers.find(d => d.id === selectedDriverId)
  const selectedRoute = routes.find(r => r.id === selectedRouteId)
  const selectedStop = routeCustomers.find(c => c.id === selectedRouteCustomerId)

  const filteredStops = routeCustomers.filter(c => 
    (c.customer_name || c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.section || '').toLowerCase().includes(customerSearch.toLowerCase())
  )

  function handleStopSelect(stop: RouteCustomer) {
    onRouteCustomerSelect(stop)
    setCustomerSearch('')

    // If stop has default product and rate, offer auto-population
    if (onApplyPresetItem) {
      const prodName = stop.default_product || stop.product_name || 'Water Can (20L)'
      const rate = Number(stop.default_rate) || 15
      const qty = Number(stop.default_quantity || stop.default_qty) || 1
      onApplyPresetItem({ productName: prodName, rate, quantity: qty })
    }
  }

  return (
    <div style={{ 
      background: 'rgba(251, 191, 36, 0.03)', 
      border: '1px solid rgba(251, 191, 36, 0.25)', 
      borderRadius: '10px', 
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>
          <Truck style={{ width: '18px', height: '18px' }} />
          Route Dispatch & Delivery Context
        </div>
        {activeAssignment ? (
          <Badge variant="success" icon={<Navigation style={{ width: '11px', height: '11px' }} />}>
            Active Run: Vehicle {activeAssignment.vehicle_number || selectedDriver?.vehicle_number || 'AP 16 AB 1234'}
          </Badge>
        ) : (
          <Badge variant="neutral">
            Standard Route Delivery
          </Badge>
        )}
      </div>

      {/* Grid: Driver, Route, Delivery Date */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
            Assigned Driver *
          </label>
          <select 
            className="input-select"
            value={selectedDriverId}
            onChange={e => onDriverChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              background: '#18181b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.9rem'
            }}
          >
            <option value="">-- Select Driver --</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} {d.phone ? `(${d.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
            Delivery Route *
          </label>
          <select 
            className="input-select"
            value={selectedRouteId}
            onChange={e => onRouteChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              background: '#18181b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.9rem'
            }}
          >
            <option value="">-- Select Route --</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} {r.area ? `[${r.area}]` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
            Delivery Date *
          </label>
          <input 
            type="date"
            value={deliveryDate}
            onChange={e => onDeliveryDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              background: '#18181b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.9rem'
            }}
          />
        </div>
      </div>

      {/* Customer / Stop Selection from Route Customers */}
      {selectedRouteId && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d4d4d8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin style={{ width: '13px', height: '13px', color: '#fbbf24' }} />
              Route Stop / Customer Sheet ({routeCustomers.length} registered stops)
            </label>
            {selectedStop && (
              <button 
                type="button" 
                onClick={() => onRouteCustomerSelect(null)}
                style={{ background: 'none', border: 'none', color: '#fbbf24', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Clear Stop Selection
              </button>
            )}
          </div>

          {selectedStop ? (
            <div style={{ 
              background: 'rgba(0,0,0,0.4)', 
              border: '1px solid rgba(251, 191, 36, 0.4)', 
              borderRadius: '8px', 
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div>
                <div style={{ fontWeight: 800, color: '#f4f4f5', fontSize: '1rem' }}>
                  {selectedStop.customer_name || selectedStop.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'flex', gap: '0.75rem', marginTop: '2px' }}>
                  <span>Section: <strong style={{ color: '#fff' }}>{selectedStop.section || 'General'}</strong></span>
                  <span>Default: <strong style={{ color: '#fbbf24' }}>{selectedStop.default_quantity || selectedStop.default_qty || 1} x {selectedStop.default_product || selectedStop.product_name || 'Cans'} @ ₹{selectedStop.default_rate || 0}</strong></span>
                </div>
              </div>
              <Badge variant="success">Stop Linked</Badge>
            </div>
          ) : (
            <div>
              <input
                type="text"
                placeholder={loadingStops ? 'Loading route stops...' : '🔍 Search customer stop in this route... (e.g. Dhaba, Canteen, Shop)'}
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  background: '#18181b',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              />

              {routeCustomers.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '0.4rem', 
                  marginTop: '0.5rem',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  padding: '2px'
                }}>
                  {filteredStops.slice(0, 12).map(stop => (
                    <button
                      type="button"
                      key={stop.id}
                      onClick={() => handleStopSelect(stop)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.65rem',
                        color: '#f4f4f5',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#fbbf24'
                        e.currentTarget.style.background = 'rgba(251, 191, 36, 0.12)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{stop.customer_name || stop.name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#fbbf24' }}>
                        ₹{stop.default_rate || 0} &bull; {stop.default_product || stop.product_name || 'Can'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
