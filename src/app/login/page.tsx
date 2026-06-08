'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, hsl(222 47% 5%) 0%, hsl(222 47% 8%) 50%, hsl(217 91% 10%) 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decorative elements */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, hsl(217 91% 60% / 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, hsl(199 89% 48% / 0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        animation: 'fadeIn 0.4s ease',
      }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(199 89% 48%))',
            marginBottom: '1rem',
            boxShadow: '0 8px 32px hsl(217 91% 60% / 0.3)',
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 4L32 12V24L18 32L4 24V12L18 4Z" fill="white" fillOpacity="0.9"/>
              <path d="M18 10L26 14.5V23.5L18 28L10 23.5V14.5L18 10Z" fill="white" fillOpacity="0.3"/>
              <circle cx="18" cy="19" r="5" fill="white"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #fff, hsl(217 91% 75%))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em',
            fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
          }}>
            ROYAL KISSAN
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: 'hsl(215 20% 55%)',
            marginTop: '0.25rem',
            fontWeight: '500',
          }}>
            Smart ERP & Billing System
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'hsl(222 47% 8%)',
          border: '1px solid hsl(217 32% 17%)',
          borderRadius: '1.25rem',
          padding: '2rem',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'hsl(210 40% 98%)',
            marginBottom: '0.375rem',
          }}>
            Welcome Back
          </h2>
          <p style={{
            fontSize: '0.8125rem',
            color: 'hsl(215 20% 55%)',
            marginBottom: '1.75rem',
          }}>
            Sign in to your ERP account
          </p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="owner@royalkissan.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                background: 'hsl(0 85% 60% / 0.1)',
                border: '1px solid hsl(0 85% 60% / 0.3)',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                color: 'hsl(0 85% 70%)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                  Signing In...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10,17 15,12 10,7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Sign In to ERP
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: 'hsl(215 20% 40%)',
        }}>
          Royal Kissan Packaged Drinking Water © 2025
          <br />
          Powered by Royal Kissan Smart ERP v1.0
        </p>
      </div>
    </div>
  )
}
