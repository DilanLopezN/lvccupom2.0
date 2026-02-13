import { getServerSession } from 'next-auth'

import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import { authOptions } from '@/constants/constants'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <DashboardClient session={session} />
}
