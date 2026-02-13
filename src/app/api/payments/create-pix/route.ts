import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAsaasClient } from '@/lib/asaas'
import { plans } from '@/constants/plans'

export const runtime = 'nodejs'

const createPixSchema = z.object({
  customerName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  customerEmail: z.string().email('Email inválido'),
  customerDocument: z.string().min(11, 'CPF é obrigatório'),
  customerPhone: z.string().optional(),
  planType: z.enum(['base', 'premium', 'vip']).default('base')
})

// Preços em centavos
const PLAN_PRICES = {
  base: 799,
  premium: 1499,
  vip: 2499
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

    const asaas = getAsaasClient()

    // Remove máscara do CPF (caso venha formatado)
    const cleanDocument = customerDocument.replace(/\D/g, '')

    // 🔎 Verificar pagamento pendente
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
        const asaasPayment = await asaas.getPayment(existingPayment.paymentId)

        if (asaasPayment.status === 'PENDING') {
          const pixData = await asaas.getPixQrCode(existingPayment.paymentId)

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
      } catch {
        console.log('Pagamento existente inválido. Criando novo...')
      }
    }

    // 📦 Plano
    const selectedPlan = plans.find(p => p.planType === planType)

    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 400 }
      )
    }

    const amount = PLAN_PRICES[planType]

    // 💳 Criar PIX no Asaas
    const pixPayment = await asaas.createPixPayment({
      amount,
      expiresInSeconds: 3600,
      description: `Plano ${selectedPlan.name} - Cupons de Amor`,
      customer: {
        name: customerName,
        email: customerEmail,
        cpfCnpj: cleanDocument,
        mobilePhone: customerPhone
      }
    })

    // 💾 Salvar no banco
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
      qrCodeBase64: `data:image/png;base64,${pixPayment.qrCodeBase64}`,
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
