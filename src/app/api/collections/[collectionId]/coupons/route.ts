// src/app/api/collections/[collectionId]/coupons/route.ts

import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

import { createCouponSchema } from '@/lib/validations'
import { parseDate } from '@/lib/utils'

import { authOptions } from '@/constants/constants'
import { canCreateCoupon, consumeToken } from '@/constants/plansLimit'

// GET /api/collections/[collectionId]/coupons
export async function GET(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl
    const match = pathname.match(/\/collections\/([^/]+)\/coupons/)
    const collectionId = match ? match[1] : null

    if (!collectionId) {
      return NextResponse.json(
        { error: 'collectionId inválido' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)

    const collection = await prisma.couponCollection.findUnique({
      where: { id: collectionId }
    })

    if (!collection) {
      return NextResponse.json(
        { error: 'Coleção não encontrada' },
        { status: 404 }
      )
    }

    if (session?.user?.id && collection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const coupons = await prisma.coupon.findMany({
      where: { collectionId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(coupons)
  } catch (error) {
    console.error('Erro ao buscar cupons:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cupons' },
      { status: 500 }
    )
  }
}

// POST /api/collections/[collectionId]/coupons - Criar um novo cupom (consome 1 token)
export async function POST(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl
    const match = pathname.match(/\/collections\/([^/]+)\/coupons/)
    const collectionId = match ? match[1] : null

    if (!collectionId) {
      return NextResponse.json(
        { error: 'collectionId inválido' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const collection = await prisma.couponCollection.findUnique({
      where: {
        id: collectionId,
        userId: session.user.id
      }
    })

    if (!collection) {
      return NextResponse.json(
        { error: 'Coleção não encontrada ou sem permissão' },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem tokens disponíveis
    const tokenCheck = await canCreateCoupon(session.user.id)

    if (!tokenCheck.canCreate) {
      return NextResponse.json(
        {
          error: tokenCheck.errorMessage,
          limitReached: true,
          tokensRemaining: tokenCheck.tokensRemaining,
          planType: tokenCheck.planType
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    const validationResult = createCouponSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { title, description, icon, category, validUntil, validStart } =
      validationResult.data

    let processedValidStart: Date
    if (validStart && validStart.trim() !== '') {
      processedValidStart = parseDate(validStart) || new Date()
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      processedValidStart = yesterday
    }

    // Criar o cupom
    const newCoupon = await prisma.coupon.create({
      data: {
        title,
        description,
        icon,
        category,
        validStart: processedValidStart,
        validUntil: parseDate(validUntil) || new Date('2099-12-31'),
        collectionId
      }
    })

    // Consumir 1 token do usuário
    await consumeToken(session.user.id)

    console.log('Cupom criado e token consumido:', {
      id: newCoupon.id,
      title: newCoupon.title,
      userId: session.user.id
    })

    return NextResponse.json(newCoupon, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cupom:', error)
    return NextResponse.json({ error: 'Erro ao criar cupom' }, { status: 500 })
  }
}
