'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*')
    const map: Record<string, string> = {}
    for (const s of (data || [])) map[s.key] = s.value
    setSettings(map)
  }

  async function saveSetting(key: string, value: string) {
    await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const FIELDS = [
    { group: 'Company Information', fields: [
      { key: 'company_name', label: 'Company Name', placeholder: 'ROYAL KISSAN PACKAGED DRINKING WATER' },
      { key: 'company_address', label: 'Company Address', placeholder: 'Full Address' },
      { key: 'company_phone', label: 'Phone Number', placeholder: '9876543210' },
      { key: 'company_email', label: 'Email', placeholder: 'royalkissan@gmail.com' },
    ]},
    { group: 'GST & Tax', fields: [
      { key: 'company_gst', label: 'GST Number', placeholder: 'GST Registration Number' },
      { key: 'invoice_prefix', label: 'Invoice Prefix', placeholder: 'RK' },
    ]},
    { group: 'Print Settings', fields: [
      { key: 'thermal_printer_width', label: 'Thermal Printer Width (mm)', placeholder: '58' },
    ]},
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">⚙️ Settings</h2>
          <p className="page-subtitle">Configure your Royal Kissan ERP system</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem' }}>
        {/* Left menu */}
        <div className="card" style={{ height: 'fit-content', padding: '0.5rem' }}>
          {FIELDS.map(group => (
            <a key={group.group} href={`#${group.group}`} style={{ display: 'block', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: 'hsl(215 20% 65%)', textDecoration: 'none', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'hsl(217 32% 17%)'; (e.target as HTMLElement).style.color = 'hsl(210 40% 98%)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = 'hsl(215 20% 65%)' }}
            >
              {group.group}
            </a>
          ))}
        </div>

        {/* Settings panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {FIELDS.map(group => (
            <div key={group.group} className="card" id={group.group}>
              <div className="card-header"><h3 className="card-title">{group.group}</h3></div>
              <div className="card-body">
                {group.fields.map(field => (
                  <div key={field.key} className="form-group">
                    <label className="form-label">{field.label}</label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <input
                        className="form-input"
                        placeholder={field.placeholder}
                        value={settings[field.key] || ''}
                        onChange={e => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                      />
                      <button
                        onClick={() => saveSetting(field.key, settings[field.key] || '')}
                        className="btn btn-secondary btn-sm"
                        style={{ flexShrink: 0 }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Danger Zone */}
          <div className="card" style={{ border: '1px solid hsl(0 85% 60% / 0.3)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid hsl(0 85% 60% / 0.3)' }}>
              <h3 className="card-title" style={{ color: 'hsl(0 85% 70%)' }}>⚠️ Danger Zone</h3>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.875rem', color: 'hsl(215 20% 55%)', marginBottom: '1rem' }}>
                These actions cannot be undone. Please proceed with caution.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-danger btn-sm" onClick={() => alert('Feature coming soon – database backup')}>
                  💾 Export Full Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
