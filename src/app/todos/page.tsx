import { redirect } from 'next/navigation'

// This is an internal placeholder route — redirect to dashboard
export default function Page() {
  redirect('/dashboard')
}
