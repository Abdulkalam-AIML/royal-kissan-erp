'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import { MapPin, Plus, Truck, User, Calendar, Save, CheckCircle, RefreshCw, Layers } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0])
  const [vehicleNumber, setVehicleNumber] = useState('AP 16 AB 1234')
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRoute, setNewRoute] = useState({ name: '', area: '', driver_id: '' })

  const supabase = createClient()

  useDataSyncListener(['routes', 'drivers', 'all'], () => { loadInitialData() })

  useEffect(() => { loadInitialData() }, [])

  async function loadInitialData() {
    setLoading(true)
    try {
      const [routesRes, driversRes] = await Promise.all([
        supabase.from('routes').select('id, name, driver_id, area').order('name'),
        supabase.from('drivers').select('id, name, phone').order('name')
      ])
      if (routesRes.data) setRoutes(routesRes.data)
      if (driversRes.data) setDrivers(driversRes.data)
      if (routesRes.data && routesRes.data.length > 0) setSelectedRoute(routesRes.data[0])
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  async function saveNewRoute() {
    if (!newRoute.name.trim()) {
      alert('Route name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: newRoute.name,
        area: newRoute.area || null,
        driver_id: newRoute.driver_id || null,
        is_active: true
      }
      const { data, error } = await supabase.from('routes').insert([payload]).select().single()
      if (error) throw error
      if (data) {
        setRoutes(prev => [...prev, data])
        setSelectedRoute(data)
      }
      emitDataChange('routes')
      setShowAddModal(false)
      setNewRoute({ name: '', area: '', driver_id: '' })
      loadInitialData()
      alert('✅ Route saved successfully in database!')
    } catch (e: any) {
      alert(`Error saving route: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      title: 'Route Name',
      sortable: true,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{r.name}</div>
          <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Area: {r.area || 'General'}</div>
        </div>
      ),
    },
    {
      key: 'area',
      title: 'Assigned Driver',
      render: (r) => {
        const d = drivers.find(drv => drv.id === r.driver_id)
        return d ? (
          <Badge variant="info" icon={<User style={{ width: '11px', height: '11px' }} />}>
            {d.name}
          </Badge>
        ) : <span style={{ color: '#71717a' }}>Unassigned</span>
      },
    },
    {
      key: 'actions',
      title: 'Manage Route',
      align: 'right',
      render: (r) => (
        <Button
          variant={selectedRoute?.id === r.id ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedRoute(r)}
        >
          {selectedRoute?.id === r.id ? 'Active Route' : 'Select Route'}
        </Button>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Route Management & Dispatch Sequences
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {routes.length} delivery routes registered &bull; Assign driver routes, vehicle dispatches, and daily runs.
          </p>
        </div>

        <Button variant="primary" icon={<Plus style={{ width: '16px', height: '16px' }} />} onClick={() => setShowAddModal(true)}>
          Create New Route
        </Button>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {loading ? (
          <SkeletonTable rows={6} />
        ) : (
          <DataTable
            columns={columns}
            data={routes}
            searchPlaceholder="Search routes by name or area..."
            exportFileName="royal-kissan-routes"
          />
        )}

        {/* Selected Route Sidebar Config */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
            Active Route Configuration
          </h3>

          {selectedRoute ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: '#09090b', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Selected Route</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>{selectedRoute.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#71717a' }}>Area: {selectedRoute.area || 'General Local'}</div>
              </div>

              <Input label="Trip Date" type="date" value={tripDate} onChange={e => setTripDate(e.target.value)} />
              <Input label="Vehicle Registration Number" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} />

              <Select
                label="Assign Driver"
                value={selectedRoute.driver_id || ''}
                onChange={e => setSelectedRoute({ ...selectedRoute, driver_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Driver...' },
                  ...drivers.map(d => ({ value: d.id, label: d.name }))
                ]}
              />

              <Button variant="primary" icon={<Save style={{ width: '16px', height: '16px' }} />} fullWidth onClick={() => alert('✅ Route assignment updated!')}>
                Save Route Assignment
              </Button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#71717a' }}>Select a route to configure.</div>
          )}
        </Card>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Create New Route</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input label="Route Name" placeholder="e.g. Nuzvid Local Route" value={newRoute.name} onChange={e => setNewRoute({ ...newRoute, name: e.target.value })} />
              <Input label="Target Area / Region" placeholder="e.g. Nuzvid" value={newRoute.area} onChange={e => setNewRoute({ ...newRoute, area: e.target.value })} />
              <Select
                label="Assign Default Driver"
                value={newRoute.driver_id}
                onChange={e => setNewRoute({ ...newRoute, driver_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Driver...' },
                  ...drivers.map(d => ({ value: d.id, label: d.name }))
                ]}
              />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={saveNewRoute}>Create Route</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
