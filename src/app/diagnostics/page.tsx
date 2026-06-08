'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const TABLES_TO_CHECK = [
  'bills',
  'dealers',
  'drivers',
  'employees',
  'products',
  'sales',
  'routes',
  'non_local_routes',
  'expenses',
  'salary',
  'stock'
]

export default function DiagnosticsPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [anonKeyLoaded, setAnonKeyLoaded] = useState(false)
  const [pubKeyLoaded, setPubKeyLoaded] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'healthy' | 'unhealthy'>('testing')
  
  // Specific query states for "bills" select
  const [billsDataReturned, setBillsDataReturned] = useState<string>('Not tested yet')
  const [billsError, setBillsError] = useState<string>('None')
  
  // Table checks
  const [tableStatuses, setTableStatuses] = useState<Record<string, { exists: boolean; count?: number; error?: string }>>({})
  
  // Insert test
  const [insertStatus, setInsertStatus] = useState<string>('Not tested')
  const [insertError, setInsertError] = useState<string>('None')
  
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<string[]>([])

  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
    runDiagnostics()
  }, [])

  const log = (msg: string) => {
    setDiagnosticsLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  async function runDiagnostics() {
    setLoading(true)
    setDiagnosticsLogs([])
    log('Starting diagnostics check...')

    // 1. Env check
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
    
    // Print env variables as requested by STEP 2
    console.log("SUPABASE URL:", url)
    console.log("SUPABASE KEY:", pubKey)

    setSupabaseUrl(url)
    setAnonKeyLoaded(!!anonKey)
    setPubKeyLoaded(!!pubKey)
    
    log(`SUPABASE URL Loaded: ${url ? 'Yes' : 'No'}`)
    log(`Anon Key Loaded: ${anonKey ? 'Yes' : 'No'}`)
    log(`Publishable Key Loaded: ${pubKey ? 'Yes' : 'No'}`)

    if (!url || !anonKey) {
      setConnectionStatus('unhealthy')
      setLoading(false)
      log('❌ Aborting: Missing Supabase URL or Anon Key.')
      return
    }

    try {
      // 2. Ping check
      log('Pinging Supabase REST API...')
      const pingRes = await fetch(`${url}/rest/v1/`, {
        headers: { 'apikey': anonKey }
      })
      log(`Ping Response Status: ${pingRes.status}`)
      
      // 3. Select 1 record from bills (STEP 4)
      log('Querying "bills" table to test SELECT connectivity...')
      const { data: selectData, error: selectErr } = await supabase
        .from('bills')
        .select('*')
        .limit(1)

      if (selectErr) {
        setBillsDataReturned('None')
        setBillsError(`[Code: ${selectErr.code}] ${selectErr.message} (Detail: ${selectErr.details || 'none'}, Hint: ${selectErr.hint || 'none'})`)
        log(`❌ Query on "bills" failed: ${selectErr.message}`)
      } else {
        setBillsDataReturned(JSON.stringify(selectData, null, 2))
        setBillsError('None')
        log(`✅ Query on "bills" succeeded! Data size: ${selectData?.length || 0}`)
      }

      if (pingRes.ok || pingRes.status === 404 || pingRes.status === 400) {
        setConnectionStatus(selectErr ? 'unhealthy' : 'healthy')
        log('✅ Supabase Connection Status: Online')
      } else {
        setConnectionStatus('unhealthy')
        log('❌ Supabase Connection Status: Offline')
      }

      // 4. Check all 11 Tables (STEP 5)
      const statuses: typeof tableStatuses = {}
      for (const tableName of TABLES_TO_CHECK) {
        log(`Checking table: ${tableName}...`)
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          statuses[tableName] = { exists: false, error: `[Code: ${error.code}] ${error.message}` }
          log(`❌ Table "${tableName}" check failed: ${error.message}`)
        } else {
          statuses[tableName] = { exists: true, count: count || 0 }
          log(`✅ Table "${tableName}" verified. Row count: ${count || 0}`)
        }
      }
      setTableStatuses(statuses)

      // 5. Test Insert on "bills" (STEP 6)
      log('Running test insert on "bills"...')
      const testInvoiceNo = `TEST-DIAG-${Date.now().toString().slice(-4)}`
      const testPayload = {
        invoice_number: testInvoiceNo,
        bill_type: 'company_sale',
        customer_name: 'Test Diagnostics Customer',
        subtotal: 100.00,
        gst_amount: 18.00,
        total_amount: 118.00,
        payment_method: 'cash',
        due_amount: 0.00,
        date: new Date().toISOString().split('T')[0]
      }
      
      const { data: insertData, error: insErr } = await supabase
        .from('bills')
        .insert(testPayload)
        .select()
        .single()

      if (insErr) {
        setInsertStatus('Failed')
        setInsertError(`[Code: ${insErr.code}] ${insErr.message} (Detail: ${insErr.details || 'none'}, Hint: ${insErr.hint || 'none'})`)
        log(`❌ Test Insert Failed: [${insErr.code}] ${insErr.message}`)
      } else {
        setInsertStatus('Succeeded')
        setInsertError('None')
        log(`✅ Test Insert Succeeded! New Bill ID: ${insertData.id}`)
        
        // Clean up immediately
        log('Cleaning up test row...')
        const { error: delErr } = await supabase.from('bills').delete().eq('id', insertData.id)
        if (delErr) {
          log(`⚠️ Cleanup failed: ${delErr.message}`)
        } else {
          log('✅ Cleanup completed.')
        }
      }

    } catch (e: any) {
      log(`❌ Diagnostic exception: ${e.message || e}`)
      setConnectionStatus('unhealthy')
    } finally {
      setLoading(false)
      log('Diagnostics completed.')
    }
  }

  if (!isMounted) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'hsl(222 47% 4%)',
      color: '#fff',
      padding: '2rem 1.5rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#60a5fa' }}>🔌 Supabase Connection Audit & Diagnostics</h1>
            <p style={{ color: 'hsl(215 20% 55%)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Real-time database integration verification</p>
          </div>
          <button 
            onClick={runDiagnostics} 
            disabled={loading}
            style={{
              padding: '0.625rem 1.25rem',
              background: '#2563eb',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳ Diagnosing...' : '🔄 Rerun Diagnostics'}
          </button>
        </div>

        {/* Loaded Environment Variables */}
        <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 15%)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: '#60a5fa', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>1. Loaded Environment Variables</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            <div><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {supabaseUrl || '⚠️ UNDEFINED'}</div>
            <div><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {anonKeyLoaded ? '✅ LOADED (Valid token)' : '⚠️ UNDEFINED'}</div>
            <div><strong>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:</strong> {pubKeyLoaded ? '✅ LOADED (Valid token)' : '⚠️ UNDEFINED'}</div>
          </div>
        </div>

        {/* Core Status Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Connection Status Card */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 15%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Connection Status</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: connectionStatus === 'healthy' ? '#10b981' : connectionStatus === 'testing' ? '#f59e0b' : '#ef4444'
              }} />
              <strong style={{ fontSize: '1.25rem', color: connectionStatus === 'healthy' ? '#10b981' : '#f87171' }}>
                {connectionStatus === 'healthy' ? 'Healthy' : connectionStatus === 'testing' ? 'Testing...' : 'Unhealthy'}
              </strong>
            </div>
          </div>

          {/* Insert Test Card */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 15%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Insert Test Result</h3>
            <strong style={{ fontSize: '1.25rem', color: insertStatus === 'Succeeded' ? '#10b981' : insertStatus === 'Failed' ? '#ef4444' : '#f59e0b' }}>
              {insertStatus}
            </strong>
          </div>
        </div>

        {/* SELECT Bills Query Details */}
        <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 15%)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: '#60a5fa', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>2. "bills" SELECT Query Diagnostic</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div>
              <strong>Data Returned:</strong>
              <pre style={{
                background: 'hsl(222 47% 3%)',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid hsl(217 32% 15%)',
                overflowX: 'auto',
                fontSize: '0.8125rem',
                fontFamily: 'monospace',
                marginTop: '0.25rem',
                color: '#10b981'
              }}>{billsDataReturned}</pre>
            </div>
            <div>
              <strong>Supabase Error:</strong>
              <div style={{
                color: billsError === 'None' ? '#10b981' : '#f87171',
                fontWeight: '600',
                fontFamily: 'monospace',
                marginTop: '0.25rem'
              }}>{billsError}</div>
            </div>
          </div>
        </div>

        {/* Insert Test Query Details */}
        <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 15%)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: '#60a5fa', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>3. "bills" INSERT Query Diagnostic</h3>
          <div style={{ fontSize: '0.875rem' }}>
            <strong>Insert Error:</strong>
            <div style={{
              color: insertError === 'None' ? '#10b981' : '#f87171',
              fontWeight: '600',
              fontFamily: 'monospace',
              marginTop: '0.25rem'
            }}>{insertError}</div>
          </div>
        </div>

        {/* 11 Tables Checklist */}
        <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 15%)', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid hsl(217 32% 15%)', fontWeight: '700', color: '#60a5fa' }}>4. Required Tables Checklist</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'hsl(222 47% 10%)', borderBottom: '1px solid hsl(217 32% 15%)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'hsl(215 20% 55%)' }}>Table Name</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'hsl(215 20% 55%)' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'hsl(215 20% 55%)' }}>Details / Error</th>
              </tr>
            </thead>
            <tbody>
              {TABLES_TO_CHECK.map(tableName => {
                const s = tableStatuses[tableName]
                return (
                  <tr key={tableName} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>{tableName}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {s ? (
                        s.exists ? <span style={{ color: '#10b981', fontWeight: '700' }}>✅ EXISTS</span> : <span style={{ color: '#ef4444', fontWeight: '700' }}>❌ MISSING</span>
                      ) : '...'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: s?.exists ? '#38bdf8' : '#f87171', fontFamily: s?.exists ? 'monospace' : 'inherit' }}>
                      {s ? (s.exists ? `Rows: ${s.count}` : s.error) : '...'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Live Diagnostics Log console */}
        <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 15%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.75rem', color: '#60a5fa' }}>5. Live Diagnostics Log</h3>
          <pre style={{
            background: 'hsl(222 47% 3%)',
            border: '1px solid hsl(217 32% 15%)',
            borderRadius: '0.5rem',
            padding: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.8125rem',
            color: '#34d399',
            maxHeight: '250px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            margin: 0
          }}>
            {diagnosticsLogs.join('\n')}
          </pre>
        </div>

      </div>
    </div>
  )
}
