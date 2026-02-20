// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPlanLimits } from '@/constants/plans'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const url = new URL(req.url)
    const webhookToken = url.searchParams.get('token')

    console.log('Webhook Asaas recebido:', JSON.stringify(body, null, 2))

    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN
    if (expectedToken && webhookToken !== expectedToken) {
      console.error('Token de webhook inválido')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const event = body.event
    const paymentData = body.payment

    if (!event || !paymentData?.id) {
      console.error('Formato de webhook inválido:', body)
      return NextResponse.json(
        { error: 'Formato de webhook inválido' },
        { status: 400 }
      )
    }

    const paymentId = paymentData.id

    console.log(
      'Dados extraídos - ID:',
      paymentId,
      'Event:',
      event,
      'Status:',
      paymentData.status
    )

    const payment = await prisma.payment.findUnique({
      where: { paymentId }
    })

    if (!payment) {
      console.error('Pagamento não encontrado:', paymentId)
      return NextResponse.json(
        { error: 'Pagamento não encontrado' },
        { status: 404 }
      )
    }

    let mappedStatus = 'pending'

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        mappedStatus = 'paid'
        break
      case 'PAYMENT_OVERDUE':
        mappedStatus = 'expired'
        break
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
        mappedStatus = 'canceled'
        break
      case 'PAYMENT_CREATED':
      case 'PAYMENT_UPDATED':
      case 'PAYMENT_AWAITING_RISK_ANALYSIS':
        mappedStatus = 'pending'
        break
      default:
        console.log('Evento não mapeado:', event)
        return NextResponse.json({ message: 'Evento ignorado', event })
    }

    if (payment.status === mappedStatus) {
      console.log('Webhook já processado para pagamento:', paymentId)
      return NextResponse.json({ message: 'Webhook já processado' })
    }

    const updateData: any = { status: mappedStatus }
    if (mappedStatus === 'paid') {
      updateData.paidAt = new Date()
    }

    await prisma.payment.update({
      where: { paymentId },
      data: updateData
    })

    // Se pagamento confirmado e há usuário vinculado, adicionar tokens
    if (mappedStatus === 'paid') {
      let targetUserId = payment.userId

      // Fallback: buscar usuário pelo email se userId não estiver vinculado
      if (!targetUserId) {
        const user = await prisma.user.findUnique({
          where: { email: payment.customerEmail },
          select: { id: true }
        })
        if (user) {
          targetUserId = user.id
          // Vincular o payment ao usuário encontrado
          await prisma.payment.update({
            where: { paymentId },
            data: { userId: user.id }
          })
        }
      }

      if (targetUserId) {
        const planLimits = getPlanLimits(payment.planType)

        await prisma.user.update({
          where: { id: targetUserId },
          data: {
            planType: payment.planType,
            tokens: { increment: planLimits.tokens },
            maxCollections: planLimits.maxCollections,
            planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        })

        console.log('Tokens adicionados ao usuário:', {
          userId: targetUserId,
          planType: payment.planType,
          tokensAdded: planLimits.tokens,
          maxCollections: planLimits.maxCollections
        })
      } else {
        console.warn('Pagamento confirmado mas nenhum usuário encontrado:', {
          paymentId,
          email: payment.customerEmail
        })
      }
    }

    console.log(
      'Pagamento atualizado:',
      paymentId,
      'Novo status:',
      mappedStatus,
      'Evento:',
      event
    )

    return NextResponse.json({
      message: 'Webhook processado com sucesso',
      paymentId,
      status: mappedStatus,
      event
    })
  } catch (error) {
    console.error('Erro no webhook Asaas:', error)
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}
