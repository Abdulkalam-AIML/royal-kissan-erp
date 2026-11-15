'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Wrench,
  ShieldAlert,
  Calendar,
  X,
  RefreshCw,
  Edit,
  User,
  Check
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'

export interface VehicleRecord {
  id: string
  registration_number: string
  vehicle_type: string
  capacity: number
  assigned_driver_id: string | null
  assigned_driver_name: string | null
  insurance_expiry: string | null
  fitness_expiry: string | null
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE'
  remarks: string | null
  created_at: string
  updated_at: string
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<VehicleRecord | null>(null)
  const [saving, setSaving] = useState(false)

  // Form State
  const [form, setForm] = useState({
    registration_number: '',
    vehicle_type: 'Delivery Van',
    capacity: 100,
    assigned_driver_id: '',
    insurance_expiry: '',
    fitness_expiry: '',
    status: 'AVAILABLE' as 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE',
    remarks: ''
  })

  const supabase = createClient()

  useDataSyncListener(['vehicles', 'drivers', 'all'], () => {
    loadData()
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: vList }, { data: dList }] = await Promise.all([
        supabase.from('vehicles').select('*').order('registration_number', { ascending: true }),
        supabase.from('drivers').select('id, name, phone, status').eq('is_active', true).order('name', { ascending: true })
      ])

      setVehicles((vList || []) as VehicleRecord[])
      setDrivers(dList || [])
    } catch (err) {
      console.warn('Error loading vehicles:', err)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingVehicle(null)
    setForm({
      registration_number: '',
      vehicle_type: 'Delivery Van',
      capacity: 100,
      assigned_driver_id: '',
      insurance_expiry: '',
      fitness_expiry: '',
      status: 'AVAILABLE',
      remarks: ''
    })
    setShowAddModal(true)
  }

  const openEditModal = (v: VehicleRecord) => {
    setEditingVehicle(v)
    setForm({
      registration_number: v.registration_number,
      vehicle_type: v.vehicle_type || 'Delivery Van',
      capacity: Number(v.capacity) || 100,
      assigned_driver_id: v.assigned_driver_id || '',
      insurance_expiry: v.insurance_expiry || '',
      fitness_expiry: v.fitness_expiry || '',
      status: v.status || 'AVAILABLE',
      remarks: v.remarks || ''
    })
    setShowAddModal(true)
  }

  const handleSaveVehicle = async () => {
    if (!form.registration_number.trim()) {
      alert('Registration number is required (e.g. AP 16 AB 1234)')
      return
    }

    setSaving(true)
    try {
      const selectedDriver = drivers.find(d => d.id === form.assigned_driver_id)
      const payload: any = {
        registration_number: form.registration_number.trim().toUpperCase(),
        vehicle_type: form.vehicle_type,
        capacity: Number(form.capacity) || 100,
        assigned_driver_id: form.assigned_driver_id || null,
        assigned_driver_name: selectedDriver ? selectedDriver.name : null,
        insurance_expiry: form.insurance_expiry || null,
        fitness_expiry: form.fitness_expiry || null,
        status: form.status,
        remarks: form.remarks || null,
        updated_at: new Date().toISOString()
      }

      if (editingVehicle) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', editingVehicle.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('vehicles').insert([payload])
        if (error) throw error
      }

      // If a driver was assigned, also update driver's vehicle info
      if (form.assigned_driver_id) {
        await supabase.from('drivers').update({
          assigned_vehicle: payload.registration_number
        }).eq('id', form.assigned_driver_id)
      }

      emitDataChange('vehicles')
      emitDataChange('drivers')
      setShowAddModal(false)
      loadData()
      alert(`✅ Vehicle ${payload.registration_number} saved successfully!`)
    } catch (e: any) {
      alert(`Error saving vehicle: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Quick Status Toggle
  const handleQuickStatusChange = async (vehicleId: string, newStatus: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE') => {
    try {
      const { error } = await supabase.from('vehicles').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', vehicleId)
      if (error) throw error
      setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, status: newStatus } : v))
      emitDataChange('vehicles')
    } catch (e: any) {
      alert(`Error updating vehicle status: ${e.message}`)
    }
  }

  // Metrics
  const totalVehicles = vehicles.length
  const availableCount = vehicles.filter(v => v.status === 'AVAILABLE').length
  const inUseCount = vehicles.filter(v => v.status === 'IN_USE').length
  const maintenanceCount = vehicles.filter(v => v.status === 'MAINTENANCE').length

  const filteredVehicles = vehicles.filter(v => {
    const q = search.toLowerCase()
    const matchesSearch =
      v.registration_number.toLowerCase().includes(q) ||
      (v.assigned_driver_name && v.assigned_driver_name.toLowerCase().includes(q)) ||
      (v.vehicle_type && v.vehicle_type.toLowerCase().includes(q))
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: 'rgba(251, 191, 36, 0.12)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24'
          }}>
            <Truck style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff', margin: 0 }}>
              Vehicle Fleet Management
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: '0.2rem 0 0 0' }}>
              Fleet registration, payload capacities, driver allocations, maintenance, and route availability.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw style={{ width: '14px', height: '14px' }} />}
            onClick={loadData}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Plus style={{ width: '16px', height: '16px' }} />}
            onClick={openAddModal}
          >
            Add New Vehicle
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Total Fleet</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f4f4f5', marginTop: '0.2rem' }}>{totalVehicles} Vehicles</div>
        </Card>

        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Available for Route</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#34d399', marginTop: '0.2rem' }}>{availableCount} Available</div>
        </Card>

        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>In Transit (On Route)</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.2rem' }}>{inUseCount} On Route</div>
        </Card>

        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>Under Maintenance</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f87171', marginTop: '0.2rem' }}>{maintenanceCount} In Shop</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search style={{ width: '15px', height: '15px', color: '#71717a', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by reg number, driver, type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#18181b',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                color: '#fff',
                padding: '0.55rem 0.75rem 0.55rem 2rem',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px' }}>
          {['ALL', 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: statusFilter === st ? '#fbbf24' : 'transparent',
                color: statusFilter === st ? '#000' : '#a1a1aa'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Table */}
      <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
        {loading ? (
          <SkeletonTable rows={5} />
        ) : filteredVehicles.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#71717a' }}>
            No vehicles matching current filters. Click <strong>Add New Vehicle</strong> to register one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Registration #</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Vehicle Type</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Payload Capacity</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assigned Driver</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Insurance Expiry</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Fitness Expiry</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map(v => {
                  const isMaintenance = v.status === 'MAINTENANCE'
                  const isInUse = v.status === 'IN_USE'
                  const isAvail = v.status === 'AVAILABLE'

                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 800, color: '#f4f4f5', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                          {v.registration_number}
                        </div>
                        {v.remarks && (
                          <div style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '2px' }}>{v.remarks}</div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#d4d4d8' }}>
                        {v.vehicle_type || 'Commercial Vehicle'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 800, color: '#fbbf24' }}>
                        {v.capacity} Units
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {v.assigned_driver_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User style={{ width: '13px', height: '13px', color: '#34d399' }} />
                            <span style={{ fontWeight: 700, color: '#f4f4f5' }}>{v.assigned_driver_name}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#71717a' }}>Unassigned</span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#a1a1aa' }}>
                        {v.insurance_expiry || '—'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#a1a1aa' }}>
                        {v.fitness_expiry || '—'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <Badge variant={isAvail ? 'success' : isInUse ? 'warning' : isMaintenance ? 'danger' : 'neutral'}>
                          {v.status}
                        </Badge>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Edit style={{ width: '12px', height: '12px' }} />}
                            onClick={() => openEditModal(v)}
                          >
                            Edit
                          </Button>

                          {/* Quick status actions */}
                          {v.status === 'AVAILABLE' ? (
                            <button
                              type="button"
                              title="Send to Maintenance"
                              onClick={() => handleQuickStatusChange(v.id, 'MAINTENANCE')}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                borderRadius: '4px',
                                padding: '0.3rem 0.55rem',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Maintenance
                            </button>
                          ) : v.status === 'MAINTENANCE' ? (
                            <button
                              type="button"
                              title="Mark Available"
                              onClick={() => handleQuickStatusChange(v.id, 'AVAILABLE')}
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#34d399',
                                borderRadius: '4px',
                                padding: '0.3rem 0.55rem',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Mark Ready
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE / EDIT VEHICLE MODAL */}
      {showAddModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px', width: '100%', maxWidth: '540px', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{
              padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
                {editingVehicle ? 'Edit Vehicle Details' : 'Register New Vehicle'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  label="Registration Number *"
                  placeholder="e.g. AP 16 AB 1234"
                  value={form.registration_number}
                  onChange={e => setForm({ ...form, registration_number: e.target.value })}
                />
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '0.35rem' }}>
                    VEHICLE TYPE
                  </label>
                  <select
                    value={form.vehicle_type}
                    onChange={e => setForm({ ...form, vehicle_type: e.target.value })}
                    style={{
                      width: '100%', backgroundColor: '#27272a', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px', color: '#fff', padding: '0.55rem', fontSize: '0.88rem', outline: 'none'
                    }}
                  >
                    <option value="Delivery Van">Delivery Van (Water Cans & Bags)</option>
                    <option value="Can Carrier Truck">Can Carrier Truck (Heavy Distribution)</option>
                    <option value="Light Commercial Carrier">Light Commercial Carrier</option>
                    <option value="Water Tanker 20L">Water Tanker 20L</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  label="Payload Capacity (Units) *"
                  type="number"
                  placeholder="e.g. 100"
                  value={form.capacity}
                  onChange={e => setForm({ ...form, capacity: Number(e.target.value) })}
                />
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '0.35rem' }}>
                    ASSIGNED DRIVER
                  </label>
                  <select
                    value={form.assigned_driver_id}
                    onChange={e => setForm({ ...form, assigned_driver_id: e.target.value })}
                    style={{
                      width: '100%', backgroundColor: '#27272a', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px', color: '#fff', padding: '0.55rem', fontSize: '0.88rem', outline: 'none'
                    }}
                  >
                    <option value="">-- No Dedicated Driver --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  label="Insurance Expiry Date"
                  type="date"
                  value={form.insurance_expiry}
                  onChange={e => setForm({ ...form, insurance_expiry: e.target.value })}
                />
                <Input
                  label="Fitness Certificate Expiry"
                  type="date"
                  value={form.fitness_expiry}
                  onChange={e => setForm({ ...form, fitness_expiry: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '0.35rem' }}>
                  OPERATIONAL STATUS
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as any })}
                  style={{
                    width: '100%', backgroundColor: '#27272a', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px', color: '#fff', padding: '0.55rem', fontSize: '0.88rem', outline: 'none'
                  }}
                >
                  <option value="AVAILABLE">AVAILABLE (Ready for Route Load)</option>
                  <option value="IN_USE">IN_USE (Currently on Route)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Workshop / Service)</option>
                  <option value="INACTIVE">INACTIVE (Decommissioned)</option>
                </select>
              </div>

              <Input
                label="Remarks / Vehicle Notes"
                placeholder="e.g. New tyres fitted, assigned to Chintalapudi route"
                value={form.remarks}
                onChange={e => setForm({ ...form, remarks: e.target.value })}
              />
            </div>

            <div style={{
              padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'flex-end', gap: '0.65rem'
            }}>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={handleSaveVehicle}>
                {editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

