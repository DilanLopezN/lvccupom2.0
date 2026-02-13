// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Webhook do Asaas
// Docs: eventos payment.* enviam { event: "PAYMENT_RECEIVED", payment: { id, status, value, ... } }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const url = new URL(req.url)
    const webhookToken = url.searchParams.get('token')

    console.log('Webhook Asaas recebido:', JSON.stringify(body, null, 2))

    // Validar token do webhook (opcional)
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN
    if (expectedToken && webhookToken !== expectedToken) {
      console.error('Token de webhook inválido')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Formato do webhook Asaas:
    // { event: "PAYMENT_RECEIVED", payment: { id: "pay_xxx", status: "RECEIVED", ... } }
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

    // Buscar o pagamento no banco de dados
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

    // Mapear eventos do Asaas para nosso sistema
    // Status possíveis no Asaas: PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED,
    // RECEIVED_IN_CASH, REFUND_REQUESTED, REFUND_IN_PROGRESS, CHARGEBACK_REQUESTED,
    // CHARGEBACK_DISPUTE, AWAITING_CHARGEBACK_REVERSAL, DUNNING_REQUESTED,
    // DUNNING_RECEIVED, AWAITING_RISK_ANALYSIS
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

    // Atualizar status do pagamento
    const updateData: any = { status: mappedStatus }
    if (mappedStatus === 'paid') {
      updateData.paidAt = new Date()
    }

    await prisma.payment.update({
      where: { paymentId },
      data: updateData
    })

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
