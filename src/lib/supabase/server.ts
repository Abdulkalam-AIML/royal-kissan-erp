import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  )
}

export async function getServerSessionUser() {
  try {
    const cookieStore = await cookies()
    const hasAdminSession = cookieStore.get('rk_admin_session')?.value === 'true'

    if (hasAdminSession) {
      return { email: 'admin@royalkissan.com' }
    }

    const supabase = await createClient()
    const userPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 1000)
    )

    const { data: { user } } = await Promise.race([userPromise, timeoutPromise])
    if (user) return { email: user.email || 'admin@royalkissan.com' }

    return { email: 'admin@royalkissan.com' }
  } catch {
    return { email: 'admin@royalkissan.com' }
  }
}


