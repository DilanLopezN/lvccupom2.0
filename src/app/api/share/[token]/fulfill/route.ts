// src/app/api/share/[token]/fulfill/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/constants/constants'

// POST /api/share/[token]/fulfill - Confirmar que o cupom foi cumprido
export async function POST(req: NextRequest) {
  try {
    const match = req.nextUrl.pathname.match(/\/share\/([^/]+)\/fulfill/)
    const token = match ? match[1] : null

    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login primeiro.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { couponId } = body

    if (!couponId) {
      return NextResponse.json(
        { error: 'couponId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar a coleção pelo token
    const collection = await prisma.couponCollection.findUnique({
      where: { shareToken: token },
      include: {
        user: true,
        coupons: { where: { id: couponId } }
      }
    })

    if (!collection) {
      return NextResponse.json(
        { error: 'Coleção não encontrada' },
        { status: 404 }
      )
    }

    if (collection.coupons.length === 0) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      )
    }

    const coupon = collection.coupons[0]

    // O cupom precisa ter sido resgatado antes de ser confirmado como cumprido
    if (!coupon.isUsed) {
      return NextResponse.json(
        { error: 'Este cupom ainda não foi resgatado' },
        { status: 400 }
      )
    }

    // Verificar se o usuário logado é o parceiro (não o dono da coleção)
    // Quem confirma o cumprimento é quem recebeu o cupom (parceiro)
    const ownerId = collection.userId
    if (session.user.id === ownerId) {
      return NextResponse.json(
        {
          error:
            'Apenas o parceiro(a) que recebeu o cupom pode confirmar o cumprimento'
        },
        { status: 403 }
      )
    }

    // Verificar se já existe fulfillment
    const existingFulfillment = await prisma.couponFulfillment.findUnique({
      where: { couponId }
    })

    if (existingFulfillment?.fulfilled) {
      return NextResponse.json(
        { error: 'Este cupom já foi confirmado como cumprido' },
        { status: 400 }
      )
    }

    // Criar ou atualizar o fulfillment e dar loverCoin + loverStrike para ambos
    await prisma.$transaction([
      // Criar/atualizar fulfillment
      prisma.couponFulfillment.upsert({
        where: { couponId },
        create: {
          couponId,
          confirmedById: session.user.id,
          fulfilled: true,
          fulfilledAt: new Date()
        },
        update: {
          fulfilled: true,
          fulfilledAt: new Date(),
          confirmedById: session.user.id
        }
      }),
      // +1 loverCoin e +1 loverStrike para o dono da coleção
      prisma.user.update({
        where: { id: ownerId },
        data: {
          loverCoins: { increment: 1 },
          loverStrikes: { increment: 1 }
        }
      }),
      // +1 loverCoin e +1 loverStrike para o parceiro que confirmou
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          loverCoins: { increment: 1 },
          loverStrikes: { increment: 1 }
        }
      })
    ])

    console.log('Cupom confirmado como cumprido:', {
      couponId,
      confirmedBy: session.user.id,
      ownerId
    })

    return NextResponse.json({
      message:
        'Cupom confirmado como cumprido! Vocês ganharam 1 Lover Coin e 1 Lover Strike cada!',
      fulfilled: true,
      rewards: {
        loverCoins: 1,
        loverStrikes: 1
      }
    })
  } catch (error) {
    console.error('Erro ao confirmar cumprimento:', error)
    return NextResponse.json(
      { error: 'Erro ao confirmar cumprimento do cupom' },
      { status: 500 }
    )
  }
}
