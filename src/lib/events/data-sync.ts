'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type DataModuleKey =
  | 'bills'
  | 'sales'
  | 'expenses'
  | 'products'
  | 'stock'
  | 'customers'
  | 'dealers'
  | 'drivers'
  | 'routes'
  | 'collections'
  | 'dues'
  | 'attendance'
  | 'all'

const EVENT_NAME = 'rk_data_changed'

/**
 * Emit a global data change event (both window custom event & Supabase broadcast channel)
 */
export function emitDataChange(moduleKey: DataModuleKey) {
  if (typeof window === 'undefined') return

  // 1. Local Browser Custom Event
  const customEvent = new CustomEvent(EVENT_NAME, { detail: { moduleKey, timestamp: Date.now() } })
  window.dispatchEvent(customEvent)

  // 2. Broadcast via localStorage for cross-tab sync
  try {
    localStorage.setItem('rk_last_sync_event', JSON.stringify({ moduleKey, timestamp: Date.now() }))
  } catch (e) {
    // Ignore quota errors
  }
}

/**
 * Custom React Hook to subscribe to data mutations (Window CustomEvent + Storage Event + Window Focus)
 */
export function useDataSyncListener(
  targetModules: DataModuleKey[],
  onDataChanged: (moduleKey: DataModuleKey) => void
) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Handle local custom event
    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (!detail) return
      const key = detail.moduleKey as DataModuleKey
      if (targetModules.includes('all') || targetModules.includes(key) || key === 'all') {
        onDataChanged(key)
      }
    }

    // 2. Handle cross-tab storage event
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'rk_last_sync_event' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue)
          const key = parsed.moduleKey as DataModuleKey
          if (targetModules.includes('all') || targetModules.includes(key) || key === 'all') {
            onDataChanged(key)
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // 3. Handle window focus refetch
    const handleFocus = () => {
      onDataChanged('all')
    }

    window.addEventListener(EVENT_NAME, handleCustomEvent)
    window.addEventListener('storage', handleStorageEvent)
    window.addEventListener('focus', handleFocus)

    // 4. Supabase Realtime Postgres Changes Subscription
    const supabase = createClient()
    const channel = supabase
      .channel('rk_global_db_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const table = payload.table
          let key: DataModuleKey = 'all'
          if (table === 'bills' || table === 'bill_items') key = 'bills'
          else if (table === 'expenses') key = 'expenses'
          else if (table === 'products') key = 'products'
          else if (table === 'dealers') key = 'dealers'
          else if (table === 'customers') key = 'customers'
          else if (table === 'drivers') key = 'drivers'
          else if (table === 'stock_transactions') key = 'stock'
          else if (table === 'collections') key = 'collections'

          if (targetModules.includes('all') || targetModules.includes(key) || key === 'all') {
            onDataChanged(key)
          }
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomEvent)
      window.removeEventListener('storage', handleStorageEvent)
      window.removeEventListener('focus', handleFocus)
      supabase.removeChannel(channel)
    }
  }, [targetModules, onDataChanged])
}
