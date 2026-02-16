// src/app/api/user/stats/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/constants/constants'
import { getUserUsageStats } from '@/constants/plansLimit'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const stats = await getUserUsageStats(session.user.id)

    if (!stats) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erro ao buscar stats:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
