// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      console.error('Webhook: body não é JSON válido')
      return NextResponse.json({ received: true, error: 'Invalid JSON body' })
    }

    console.log('=== WEBHOOK ASAAS RECEBIDO ===')
    console.log('Body completo:', JSON.stringify(body, null, 2))

    // Validar token via header
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN
    if (expectedToken) {
      const receivedToken = req.headers.get('asaas-access-token')
      if (receivedToken !== expectedToken) {
        console.error('Token inválido:', receivedToken)
        return NextResponse.json({
          received: true,
          processed: false,
          reason: 'invalid_token'
        })
      }
    }

    const event = body.event
    const paymentData = body.payment

    if (!event || !paymentData?.id) {
      console.error('Formato inválido - event:', event, 'payment:', paymentData)
      return NextResponse.json({
        received: true,
        processed: false,
        reason: 'invalid_format'
      })
    }

    const asaasPaymentId = paymentData.id

    console.log('Event:', event)
    console.log('Asaas Payment ID:', asaasPaymentId)
    console.log('Asaas Status:', paymentData.status)
    console.log('Asaas externalReference:', paymentData.externalReference)
    console.log('Asaas customer:', paymentData.customer)

    // === BUSCAR PAGAMENTO NO BANCO ===
    // Tentativa 1: buscar pelo paymentId direto
    let payment = await prisma.payment.findUnique({
      where: { paymentId: asaasPaymentId }
    })

    // Tentativa 2: se não achou, logar todos os pagamentos para debug
    if (!payment) {
      console.error('Pagamento NÃO encontrado pelo ID:', asaasPaymentId)

      // Listar pagamentos recentes para debug
      const recentPayments = await prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          paymentId: true,
          customerEmail: true,
          status: true,
          createdAt: true
        }
      })
      console.log(
        'Pagamentos recentes no banco:',
        JSON.stringify(recentPayments, null, 2)
      )

      // Tentativa 3: buscar por email do customer (fallback)
      if (paymentData.customer) {
        const customerEmail =
          typeof paymentData.customer === 'string'
            ? null // é só o ID do customer, não o email
            : paymentData.customer?.email

        if (customerEmail) {
          payment = await prisma.payment.findFirst({
            where: {
              customerEmail,
              status: 'pending'
            },
            orderBy: { createdAt: 'desc' }
          })

          if (payment) {
            console.log('Encontrado por email fallback:', payment.paymentId)
            // Atualizar o paymentId no banco para o correto do Asaas
            await prisma.payment.update({
              where: { id: payment.id },
              data: { paymentId: asaasPaymentId }
            })
            console.log(
              'PaymentId atualizado no banco de',
              payment.paymentId,
              'para',
              asaasPaymentId
            )
          }
        }
      }
    }

    if (!payment) {
      console.error('Pagamento definitivamente não encontrado:', asaasPaymentId)
      return NextResponse.json({
        received: true,
        processed: false,
        reason: 'payment_not_found',
        searchedId: asaasPaymentId
      })
    }

    console.log('Pagamento encontrado:', {
      dbPaymentId: payment.paymentId,
      email: payment.customerEmail,
      currentStatus: payment.status
    })

    // === MAPEAR EVENTOS ===
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
      case 'PAYMENT_RESTORED':
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_REFUND_IN_PROGRESS':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
      case 'PAYMENT_CHARGEBACK_DISPUTE':
        mappedStatus = 'canceled'
        break
      case 'PAYMENT_CREATED':
      case 'PAYMENT_UPDATED':
      case 'PAYMENT_AWAITING_RISK_ANALYSIS':
      case 'PAYMENT_APPROVED_BY_RISK_ANALYSIS':
        mappedStatus = 'pending'
        break
      default:
        console.log('Evento não mapeado:', event)
        return NextResponse.json({
          received: true,
          processed: false,
          reason: 'unmapped_event',
          event
        })
    }

    // Idempotência
    if (payment.status === mappedStatus) {
      console.log('Já processado:', asaasPaymentId, mappedStatus)
      return NextResponse.json({
        received: true,
        processed: true,
        reason: 'already_processed'
      })
    }

    // === ATUALIZAR STATUS ===
    const updateData: any = { status: mappedStatus }
    if (mappedStatus === 'paid') {
      updateData.paidAt = new Date()
    }

    await prisma.payment.update({
      where: { id: payment.id }, // usar id interno, mais seguro
      data: updateData
    })

    console.log('✅ Pagamento atualizado:', asaasPaymentId, '→', mappedStatus)

    // === EMAIL ASYNC ===
    if (mappedStatus === 'paid' && payment.customerEmail) {
      sendPaymentConfirmationEmail(
        asaasPaymentId,
        payment.customerEmail,
        payment.customerName || '',
        payment.planType,
        payment.amount
      ).catch(err => console.error('Erro email async:', err))
    }

    return NextResponse.json({
      received: true,
      processed: true,
      paymentId: asaasPaymentId,
      status: mappedStatus,
      event
    })
  } catch (error) {
    console.error('ERRO CRITICO no webhook:', error)
    // Sempre 200 para não penalizar
    return NextResponse.json({
      received: true,
      processed: false,
      reason: 'internal_error'
    })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'webhook' })
}

// === EMAIL ===
async function sendPaymentConfirmationEmail(
  paymentId: string,
  customerEmail: string,
  customerName: string,
  planType: string,
  amount: number
) {
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'https://lovecupoms.store'
    const registerUrl = `${baseUrl}/register?payment=${paymentId}&email=${encodeURIComponent(customerEmail)}`

    await resend.emails.send({
      from: 'pagamentos@lovecupoms.store',
      to: [customerEmail],
      subject: 'Pagamento confirmado - Cupons de Amor',
      html: `
        <!DOCTYPE html>
        <html>
        <head><style>
          body{font-family:Arial,sans-serif;background:#fdf2f8;margin:0;padding:20px}
          .c{max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1)}
          .h{background:linear-gradient(to right,#ec4899,#ef4444);padding:24px;text-align:center}
          .h h1{color:#fff;margin:0;font-size:22px}
          .b{padding:24px}
          .b h2{color:#333;font-size:18px}
          .b p{color:#666;line-height:1.6}
          .btn{display:inline-block;background:linear-gradient(to right,#ec4899,#ef4444);color:#fff!important;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:16px;margin:16px 0}
          .info{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0}
          .info p{color:#166534;margin:4px 0;font-size:14px}
          .f{background:#fdf2f8;padding:16px;text-align:center;font-size:12px;color:#999}
        </style></head>
        <body><div class="c">
          <div class="h"><h1>Pagamento Confirmado!</h1></div>
          <div class="b">
            <h2>Ola, ${customerName || 'querido(a)'}!</h2>
            <p>Seu pagamento foi confirmado. Complete seu cadastro:</p>
            <div class="info">
              <p><strong>Plano:</strong> ${planType}</p>
              <p><strong>Valor:</strong> R$ ${(amount / 100).toFixed(2).replace('.', ',')}</p>
            </div>
            <p style="text-align:center"><a href="${registerUrl}" class="btn">Completar Cadastro</a></p>
            <p style="font-size:13px;color:#888">Link: <a href="${registerUrl}" style="color:#ec4899;word-break:break-all">${registerUrl}</a></p>
            <p style="font-size:13px;color:#888">Guarde este email para acessar seu registro a qualquer momento.</p>
          </div>
          <div class="f"><p>Cupons de Amor</p></div>
        </div></body></html>
      `,
      text: `Pagamento Confirmado!\n\nOla, ${customerName}!\nPlano: ${planType}\nValor: R$ ${(amount / 100).toFixed(2).replace('.', ',')}\n\nComplete seu cadastro: ${registerUrl}\n\nCupons de Amor`
    })
    console.log('Email enviado para:', customerEmail)
  } catch (err) {
    console.error('Falha email:', err)
  }
}
