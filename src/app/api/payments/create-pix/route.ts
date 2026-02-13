// src/app/api/payments/create-pix/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { asaasClient } from '@/lib/asaas'
import { plans } from '@/constants/plans'

const createPixSchema = z.object({
  customerName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  customerEmail: z.string().email('Email inválido'),
  customerDocument: z.string().min(11, 'CPF é obrigatório'), // cpfCnpj obrigatório no Asaas
  customerPhone: z.string().optional(),
  planType: z.enum(['base', 'premium', 'vip']).default('base')
})

// Preços dos planos em centavos
const PLAN_PRICES = {
  base: 799, // R$ 7,99
  premium: 1499, // R$ 14,99
  vip: 2499 // R$ 24,99
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const validationResult = createPixSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const {
      customerName,
      customerEmail,
      customerDocument,
      customerPhone,
      planType
    } = validationResult.data

    // Verificar se já existe um pagamento pendente para este email e plano
    const existingPayment = await prisma.payment.findFirst({
      where: {
        customerEmail,
        planType,
        status: 'pending',
        expiresAt: { gt: new Date() }
      }
    })

    if (existingPayment) {
      try {
        // Verificar se ainda está pendente no Asaas
        const asaasPayment = await asaasClient.getPayment(
          existingPayment.paymentId
        )

        if (asaasPayment.status === 'PENDING') {
          // Rebuscar o QR Code
          const pixData = await asaasClient.getPixQrCode(
            existingPayment.paymentId
          )

          console.log('pix data', pixData)

          return NextResponse.json({
            paymentId: existingPayment.paymentId,
            qrCode: pixData.payload,
            qrCodeBase64: `data:image/png;base64,${pixData.encodedImage}`,
            copyPaste: pixData.payload,
            amount: existingPayment.amount,
            expiresAt: existingPayment.expiresAt,
            status: existingPayment.status,
            planType: existingPayment.planType
          })
        }
      } catch (err) {
        console.log('Pagamento existente expirado ou erro, criando novo...')
      }
    }

    // Obter dados do plano
    const selectedPlan = plans.find(p => p.planType === planType)
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 400 }
      )
    }

    const amount = PLAN_PRICES[planType]

    // Criar novo pagamento no Asaas
    const pixPayment = await asaasClient.createPixPayment({
      amount,
      expiresInSeconds: 3600, // 1 hora
      description: `Plano ${selectedPlan.name} - Cupons de Amor`,
      customer: {
        name: customerName,
        email: customerEmail,
        cpfCnpj: customerDocument, // obrigatório no Asaas
        mobilePhone: customerPhone
      }
    })

    // Salvar no banco de dados
    const payment = await prisma.payment.create({
      data: {
        paymentId: pixPayment.paymentId,
        customerEmail,
        customerName,
        amount,
        status: 'pending',
        planType,
        expiresAt: new Date(pixPayment.expiresAt)
      }
    })

    return NextResponse.json({
      paymentId: payment.paymentId,
      qrCode: pixPayment.qrCode,
      qrCodeBase64: pixPayment.qrCodeBase64,
      copyPaste: pixPayment.qrCode,
      amount: payment.amount,
      expiresAt: payment.expiresAt,
      status: payment.status,
      planType: payment.planType,
      planName: selectedPlan.name,
      invoiceUrl: pixPayment.invoiceUrl
    })
  } catch (error: any) {
    console.error(
      'Erro ao criar pagamento PIX:',
      error?.response?.data || error
    )
    return NextResponse.json(
      { error: 'Erro ao criar pagamento PIX' },
      { status: 500 }
    )
  }
}
