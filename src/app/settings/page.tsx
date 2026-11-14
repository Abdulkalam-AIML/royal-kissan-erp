'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Settings,
  Save,
  CheckCircle,
  Building,
  Phone,
  Key,
  ShieldCheck,
  Send,
  RefreshCw,
  AlertCircle,
  FileText
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  getWhatsAppSettings,
  saveWhatsAppSettings,
  validateAndFormatIndianPhone
} from '@/lib/services/whatsapp-service'
import { WhatsAppSettings } from '@/lib/types/database'

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

  // WhatsApp Business API Settings state
  const [waSettings, setWaSettings] = useState<WhatsAppSettings>({
    enabled: true,
    phone_number_id: '',
    whatsapp_business_account_id: '',
    access_token: '',
    default_recipient_phone: '+919347662554',
    recipient_type: 'owner',
    send_to_supplier: false,
    auto_send_invoices: false,
    webhook_verify_token: 'royal_kissan_webhook_token_2026'
  })
  const [savingWa, setSavingWa] = useState(false)
  const [waStatusMsg, setWaStatusMsg] = useState('')
  const [testingWa, setTestingWa] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    loadSettings()
    loadWhatsAppConfig()
  }, [])

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

  async function loadWhatsAppConfig() {
    try {
      const config = await getWhatsAppSettings()
      if (config) {
        setWaSettings(prev => ({
          ...prev,
          ...config
        }))
      }
    } catch (e) {
      console.warn('Failed to load WhatsApp config:', e)
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

  async function handleSaveWhatsApp() {
    // Validate phone number
    const v = validateAndFormatIndianPhone(waSettings.default_recipient_phone)
    if (!v.isValid) {
      alert(`Invalid Default Recipient Phone: ${v.error}`)
      return
    }

    setSavingWa(true)
    setWaStatusMsg('')
    try {
      const res = await saveWhatsAppSettings({
        ...waSettings,
        default_recipient_phone: v.formattedPhone
      })
      if (res.success) {
        setWaStatusMsg('✅ WhatsApp Business API settings saved successfully!')
        setTimeout(() => setWaStatusMsg(''), 3000)
      } else {
        alert(res.message)
      }
    } catch (err: any) {
      alert(`Failed to save WhatsApp settings: ${err?.message || err}`)
    } finally {
      setSavingWa(false)
    }
  }

  async function handleSendTestMessage() {
    setTestingWa(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: waSettings.default_recipient_phone })
      })
      const data = await res.json()
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Test message delivered!' : data.error || 'Failed to send test message')
      })
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Error connecting to test endpoint: ${err?.message || err}`
      })
    } finally {
      setTestingWa(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            System Control & ERP Settings
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Manage organization branding, WhatsApp Business Cloud API, invoice prefixes, and company profile.
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
          Company &amp; Billing Profile
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

      {/* WhatsApp Business API & Invoice Sharing Settings Card */}
      <Card style={{ padding: '1.5rem', backgroundColor: '#141417', border: '1px solid rgba(37, 211, 102, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#25D366',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(37, 211, 102, 0.3)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.223-.559-1.848-.767-3.037-2.656-3.129-2.78-.093-.123-.746-.991-.746-1.888 0-.898.469-1.339.636-1.52.167-.182.366-.228.487-.228.121 0 .243.002.348.006.111.005.26-.042.407.311.152.365.518 1.265.564 1.357.045.092.076.2.015.322-.061.122-.092.199-.183.307-.091.107-.191.24-.273.322-.091.091-.186.19-.08.373.106.183.473.78 1.016 1.263.699.623 1.288.816 1.472.907.183.092.29.077.397-.046.107-.123.456-.533.578-.716.121-.183.243-.153.407-.092.164.061 1.042.492 1.22.583.178.091.297.137.34.213.045.076.045.441-.099.846z"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                WhatsApp Business Cloud API &amp; Document Sharing
              </h3>
              <p style={{ color: '#a1a1aa', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                Meta Cloud API configuration for automated invoice PDFs &amp; notifications
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              loading={testingWa}
              onClick={handleSendTestMessage}
              icon={<Send style={{ width: '13px', height: '13px', color: '#25D366' }} />}
            >
              Send Test Ping
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={savingWa}
              onClick={handleSaveWhatsApp}
              icon={<Save style={{ width: '13px', height: '13px' }} />}
              style={{ backgroundColor: '#25D366', color: '#000', fontWeight: 800 }}
            >
              Save WhatsApp Config
            </Button>
          </div>
        </div>

        {waStatusMsg && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.85rem' }}>
            {waStatusMsg}
          </div>
        )}

        {testResult && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', border: testResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', color: testResult.success ? '#34d399' : '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {testResult.success ? <CheckCircle style={{ width: 16, height: 16 }} /> : <AlertCircle style={{ width: 16, height: 16 }} />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Toggle Switches */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Master Enable */}
          <div style={{ padding: '0.85rem 1rem', backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#f4f4f5', fontSize: '0.85rem' }}>WhatsApp System Notifications</div>
              <div style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>Master switch for ERP WhatsApp features</div>
            </div>
            <input
              type="checkbox"
              checked={waSettings.enabled !== false}
              onChange={e => setWaSettings({ ...waSettings, enabled: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#25D366', cursor: 'pointer' }}
            />
          </div>

          {/* Auto-send Invoices */}
          <div style={{ padding: '0.85rem 1rem', backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#f4f4f5', fontSize: '0.85rem' }}>Auto-Send Bill on Invoice Save</div>
              <div style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>Automatically dispatch PDF to recipient on bill creation</div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(waSettings.auto_send_invoices)}
              onChange={e => setWaSettings({ ...waSettings, auto_send_invoices: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#25D366', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <Input
            label="Default Recipient Mobile (+91)"
            value={waSettings.default_recipient_phone || ''}
            onChange={e => setWaSettings({ ...waSettings, default_recipient_phone: e.target.value })}
            helperText="Default owner/admin number for system notifications (e.g. +919347662554)"
          />

          <Input
            label="WhatsApp Business Phone Number ID"
            value={waSettings.phone_number_id || ''}
            onChange={e => setWaSettings({ ...waSettings, phone_number_id: e.target.value })}
            helperText="From Meta App Dashboard -> WhatsApp -> API Setup"
          />

          <Input
            label="WhatsApp Business Account ID (WABA ID)"
            value={waSettings.whatsapp_business_account_id || ''}
            onChange={e => setWaSettings({ ...waSettings, whatsapp_business_account_id: e.target.value })}
            helperText="Optional Meta WhatsApp Business Account ID"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d4d4d8' }}>
              Permanent Meta System-User Access Token
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type={showToken ? 'text' : 'password'}
                value={waSettings.access_token || ''}
                onChange={e => setWaSettings({ ...waSettings, access_token: e.target.value })}
                placeholder="EAAB..."
                style={{
                  flex: 1,
                  padding: '0.55rem 0.75rem',
                  backgroundColor: '#18181b',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace'
                }}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                style={{
                  backgroundColor: '#27272a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#d4d4d8',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#71717a' }}>
              Never exposed to the client; securely processed on backend API routes only.
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
