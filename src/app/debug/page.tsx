'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Required debug fields
  const [supabaseUrl, setSupabaseUrl] = useState<string>('Not Loaded')
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'healthy' | 'unhealthy'>('testing')
  const [sessionStatus, setSessionStatus] = useState<string>('Testing...')
  const [databaseStatus, setDatabaseStatus] = useState<string>('Testing...')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
    runDiagnostics()
  }, [])

  async function runDiagnostics() {
    setLoading(true)
    setErrorMessage('')
    
    // 1. Check loaded Supabase URL
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    setSupabaseUrl(url || '⚠️ Undefined - NEXT_PUBLIC_SUPABASE_URL is missing')

    if (!url) {
      setConnectionStatus('unhealthy')
      setSessionStatus('❌ Supabase URL is undefined')
      setDatabaseStatus('❌ Cannot connect without URL')
      setErrorMessage('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
      setLoading(false)
      return
    }

    try {
      // 2. Connection ping / fetch test
      const pingStart = Date.now()
      const pingRes = await fetch(`${url}/rest/v1/`, {
        headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' }
      })
      const latency = Date.now() - pingStart

      if (pingRes.ok || pingRes.status === 404 || pingRes.status === 400) {
        setConnectionStatus('healthy')
      } else {
        setConnectionStatus('unhealthy')
        setErrorMessage(prev => prev + `\nPing response returned HTTP ${pingRes.status}`)
      }

      // 3. Auth session status
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) {
        setSessionStatus(`❌ Auth error: ${sessionErr.message}`)
        setErrorMessage(prev => prev + `\nSession check failed: ${sessionErr.message}`)
      } else if (sessionData?.session) {
        setSessionStatus(`✅ Authenticated as: ${sessionData.session.user.email} (${sessionData.session.user.id})`)
      } else {
        setSessionStatus('⚠️ Anonymous Session (No active login)')
      }

      // 4. Database status check (Read/Write test)
      const testName = `Debug Test Customer - ${Date.now()}`
      const { data: insertData, error: insertErr } = await supabase
        .from('customers')
        .insert({ name: testName, customer_type: 'regular', outstanding_amount: 0 })
        .select()
        .single()

      if (insertErr) {
        setDatabaseStatus(`❌ Write failed: [${insertErr.code}] ${insertErr.message}`)
        setErrorMessage(prev => prev + `\nDatabase write failed: ${insertErr.message}`)
      } else {
        const { data: selectData, error: selectErr } = await supabase
          .from('customers')
          .select('*')
          .eq('id', insertData.id)
          .single()

        if (selectErr) {
          setDatabaseStatus(`❌ Write OK, Read failed: ${selectErr.message}`)
          setErrorMessage(prev => prev + `\nDatabase read-back failed: ${selectErr.message}`)
        } else {
          setDatabaseStatus(`✅ Verified (Read & Write OK). Test ID: ${selectData.id}`)
          // Clean up the dummy customer row
          await supabase.from('customers').delete().eq('id', insertData.id)
        }
      }

    } catch (err: any) {
      setConnectionStatus('unhealthy')
      setSessionStatus('❌ Exception occurred during auth check')
      setDatabaseStatus('❌ Exception occurred during query')
      setErrorMessage(prev => prev + `\nDiagnostics Exception: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isMounted) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'hsl(222 47% 5%)',
      color: 'hsl(210 40% 98%)',
      padding: '2.5rem 1.5rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
              🛠️ Supabase Connectivity Diagnostics
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'hsl(215 20% 55%)', marginTop: '0.25rem' }}>
              Real-time integration check for environments, auth session, and database access
            </p>
          </div>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={runDiagnostics} 
            disabled={loading}
          >
            {loading ? '⏳ Testing...' : '🔄 Rerun Diagnostics'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Supabase URL Card */}
          <div style={{ background: 'hsl(222 47% 8%)', border: '1px solid hsl(217 32% 17%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
              Supabase URL Configured
            </h3>
            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'hsl(199 89% 48%)', wordBreak: 'break-all' }}>
              {supabaseUrl}
            </div>
          </div>

          {/* Connection Status Card */}
          <div style={{ background: 'hsl(222 47% 8%)', border: '1px solid hsl(217 32% 17%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
              Connection Health Ping
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: connectionStatus === 'healthy' ? 'hsl(142 71% 55%)' : connectionStatus === 'testing' ? 'hsl(38 92% 50%)' : 'hsl(0 85% 60%)'
              }} />
              <span style={{ fontWeight: '700', fontSize: '1rem' }}>
                {connectionStatus === 'healthy' ? 'Healthy (Connected)' : connectionStatus === 'testing' ? 'Pinging REST endpoint...' : 'Unhealthy (Offline / Bad credentials)'}
              </span>
            </div>
          </div>

          {/* Session Status Card */}
          <div style={{ background: 'hsl(222 47% 8%)', border: '1px solid hsl(217 32% 17%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
              Authentication Session
            </h3>
            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {sessionStatus}
            </div>
          </div>

          {/* Database Status Card */}
          <div style={{ background: 'hsl(222 47% 8%)', border: '1px solid hsl(217 32% 17%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
              Database Read/Write Verification
            </h3>
            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {databaseStatus}
            </div>
          </div>

          {/* Error Message Card */}
          {errorMessage && (
            <div style={{ background: 'hsl(222 47% 8%)', border: '1px solid hsl(0 85% 60% / 0.3)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'hsl(0 85% 70%)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
                Diagnostic Error Logs
              </h3>
              <pre style={{
                background: 'hsl(222 47% 5%)',
                border: '1px solid hsl(217 32% 17%)',
                borderRadius: '0.5rem',
                padding: '1rem',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: 'hsl(0 85% 85%)',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {errorMessage}
              </pre>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
