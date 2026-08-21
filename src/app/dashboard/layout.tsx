import { getServerSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'

export default async function AppSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerSessionUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <AppLayout userEmail={user.email}>
      {children}
    </AppLayout>
  )
}
