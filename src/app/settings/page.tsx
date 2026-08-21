'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Save, CheckCircle, Shield, Building, Printer } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    company_name: 'Royal Kissan Packaged Drinking Water',
    company_address: 'Guntur Highway, Andhra Pradesh',
    company_phone: '9347662554',
    company_email: 'admin@royalkissan.com',
    company_gst: '37BABS2021G1Z3',
    invoice_prefix: 'RK',
  })
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const supabase = createClient()

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    try {
      const { data } = await supabase.from('settings').select('key, value')
      if (data) {
        const map: Record<string, string> = { ...settings }
        data.forEach(s => { map[s.key] = s.value })
        setSettings(map)
      }
    } catch {
      // Fallback
    }
  }

  async function saveAllSettings() {
    setSaving(true)
    setStatusMsg('')
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
      }
      setStatusMsg('✅ All system preferences saved successfully!')
      setTimeout(() => setStatusMsg(''), 3000)
    } catch (e: any) {
      alert(`Error saving settings: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            System Control & ERP Settings
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Manage organization branding, invoice prefixes, tax parameters, and thermal printer links.
          </p>
        </div>

        <Button variant="primary" icon={<Save style={{ width: '16px', height: '16px' }} />} loading={saving} onClick={saveAllSettings}>
          Save All System Settings
        </Button>
      </div>

      {statusMsg && (
        <Card style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>{statusMsg}</span>
        </Card>
      )}

      {/* Main Settings Card */}
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
          Company & Billing Profile
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <Input
            label="Company Name"
            value={settings.company_name || ''}
            onChange={e => setSettings({ ...settings, company_name: e.target.value })}
          />

          <Input
            label="Company GSTIN"
            value={settings.company_gst || ''}
            onChange={e => setSettings({ ...settings, company_gst: e.target.value })}
          />

          <Input
            label="Contact Phone"
            value={settings.company_phone || ''}
            onChange={e => setSettings({ ...settings, company_phone: e.target.value })}
          />

          <Input
            label="Support Email"
            value={settings.company_email || ''}
            onChange={e => setSettings({ ...settings, company_email: e.target.value })}
          />

          <Input
            label="Invoice Prefix"
            value={settings.invoice_prefix || ''}
            onChange={e => setSettings({ ...settings, invoice_prefix: e.target.value })}
            helperText="e.g. RK for RK-2026-001"
          />

          <Input
            label="Registered Plant Address"
            value={settings.company_address || ''}
            onChange={e => setSettings({ ...settings, company_address: e.target.value })}
          />
        </div>
      </Card>
    </div>
  )
}
