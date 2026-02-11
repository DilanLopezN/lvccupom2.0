'use client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redeemCouponSchema } from '@/lib/validations'
import { sendCouponRedeemedEmail } from '@/lib/resend'
import { formatDateBR } from '@/lib/utils'

// POST /api/share/[token]/redeem - Resgatar um cupom
export async function POST(req: NextRequest) {
  try {
    // Extrai o token da URL
    const match = req.nextUrl.pathname.match(/\/share\/([^/]+)\/redeem/)
    const token = match ? match[1] : null

    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const body = await req.json()

    // Validar dados de entrada
    const validationResult = redeemCouponSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { couponId } = validationResult.data

    // Verificar se a coleção existe pelo token de compartilhamento
    // Incluir dados do usuário proprietário para o email
    const collection = await prisma.couponCollection.findUnique({
      where: { shareToken: token },
      include: {
        coupons: {
          where: { id: couponId }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
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
        { error: 'Cupom não encontrado nesta coleção' },
        { status: 404 }
      )
    }

    const coupon = collection.coupons[0]

    if (coupon.isUsed) {
      return NextResponse.json(
        { error: 'Este cupom já foi resgatado' },
        { status: 400 }
      )
    }

    // Verificar se o cupom está dentro do período válido
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Verificar data de início (se existir)
    if (coupon.validStart) {
      const startDate = new Date(coupon.validStart)
      if (today < startDate) {
        return NextResponse.json(
          { error: 'Este cupom ainda não está disponível para resgate' },
          { status: 400 }
        )
      }
    }

    // Verificar data de fim
    const endDate = new Date(coupon.validUntil)
    if (today > endDate) {
      return NextResponse.json(
        { error: 'Este cupom expirou e não pode mais ser resgatado' },
        { status: 400 }
      )
    }

    // Atualizar o cupom como resgatado
    const redeemedAt = new Date()
    const updatedCoupon = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        isUsed: true,
        redeemedAt: redeemedAt
      }
    })

    // Enviar email para o proprietário da coleção
    try {
      const emailResult = await sendCouponRedeemedEmail({
        ownerEmail: collection.user.email,
        ownerName: collection.user.name,
        couponTitle: coupon.title,
        couponDescription: coupon.description,
        collectionTitle: collection.title,
        redeemedAt: formatDateBR(redeemedAt),
        redeemerInfo: undefined // Pode ser expandido no futuro para incluir info do resgatador
      })

      if (emailResult.success) {
        console.log(
          'Email de notificação enviado com sucesso para:',
          collection.user.email
        )
      } else {
        console.error(
          'Falha no envio do email de notificação:',
          emailResult.error
        )
        // Nota: Não falhamos a operação de resgate se o email falhar
      }
    } catch (emailError) {
      console.error('Erro ao tentar enviar email de notificação:', emailError)
      // Nota: Não falhamos a operação de resgate se o email falhar
    }

    return NextResponse.json(updatedCoupon)
  } catch (error) {
    console.error('Erro ao resgatar cupom:', error)
    return NextResponse.json(
      { error: 'Erro ao resgatar cupom' },
      { status: 500 }
    )
  }
}
