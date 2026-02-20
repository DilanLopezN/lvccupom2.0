// src/app/api/mood/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/constants/constants'
import { prisma } from '@/lib/prisma'

// GET /api/mood - Buscar humor de hoje e histórico recente
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id

    // Início e fim do dia de hoje
    const now = new Date()
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    // Entradas de humor de hoje do usuário logado
    const todayEntries = await prisma.moodEntry.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Histórico dos últimos 7 dias
    const sevenDaysAgo = new Date(startOfDay)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const history = await prisma.moodEntry.findMany({
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Buscar humor do parceiro (para o dono ver no dashboard)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true }
    })

    let partnerMood = null
    if (user?.partnerId) {
      partnerMood = await prisma.moodEntry.findFirst({
        where: {
          userId: user.partnerId,
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        orderBy: { createdAt: 'desc' },
        select: {
          mood: true,
          emoji: true,
          note: true,
          createdAt: true
        }
      })
    }

    return NextResponse.json({
      todayEntries,
      todayCount: todayEntries.length,
      canSubmit: todayEntries.length < 2,
      remainingToday: Math.max(0, 2 - todayEntries.length),
      history,
      partnerMood
    })
  } catch (error) {
    console.error('Erro ao buscar humor:', error)
    return NextResponse.json({ error: 'Erro ao buscar humor' }, { status: 500 })
  }
}

// POST /api/mood - Registrar humor do dia (+1 lover coin para o DONO da coleção, max 2x/dia)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const { mood, emoji, note } = body

    if (!mood || !emoji) {
      return NextResponse.json(
        { error: 'Humor e emoji são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar limite de 2x por dia
    const now = new Date()
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const todayCount = await prisma.moodEntry.count({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    })

    if (todayCount >= 2) {
      return NextResponse.json(
        {
          error: 'Você já registrou seu humor 2 vezes hoje. Volte amanhã!',
          limitReached: true,
          todayCount
        },
        { status: 429 }
      )
    }

    // Buscar o parceiro (dono) para dar a lover coin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true }
    })

    // Montar transação: criar mood + dar coin pro dono
    const transactionOps: any[] = [
      // 1. Criar entrada de humor
      prisma.moodEntry.create({
        data: {
          userId,
          mood,
          emoji,
          note: note || null,
          coinsEarned: true
        }
      })
    ]

    // 2. +1 lover coin para o DONO (parceiro do user logado)
    if (user?.partnerId) {
      transactionOps.push(
        prisma.user.update({
          where: { id: user.partnerId },
          data: {
            loverCoins: { increment: 1 }
          }
        })
      )
    }

    const [moodEntry] = await prisma.$transaction(transactionOps)

    console.log('Humor registrado:', {
      userId,
      mood,
      emoji,
      coinsEarnedBy: user?.partnerId || 'sem parceiro'
    })

    return NextResponse.json({
      entry: moodEntry,
      message: user?.partnerId
        ? 'Humor registrado! Seu amor ganhou 1 Lover Coin 💰'
        : 'Humor registrado!',
      coinsEarned: user?.partnerId ? 1 : 0,
      coinsEarnedByOwner: !!user?.partnerId,
      remainingToday: Math.max(0, 2 - (todayCount + 1))
    })
  } catch (error) {
    console.error('Erro ao registrar humor:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar humor' },
      { status: 500 }
    )
  }
}
