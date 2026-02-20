import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAsaasClient } from '@/lib/asaas'
import { plans } from '@/constants/plans'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/constants/constants'

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

          console.log('PIXDATA', pixData)
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

    const session = await getServerSession(authOptions)
    let userId: string | null = null

    if (session?.user?.id) {
      userId = session.user.id
    } else {
      // Tentar encontrar usuário pelo email
      const existingUser = await prisma.user.findUnique({
        where: { email: customerEmail },
        select: { id: true }
      })
      if (existingUser) {
        userId = existingUser.id
      }
    }

    // 💾 Salvar no banco
    const payment = await prisma.payment.create({
      data: {
        paymentId: pixPayment.paymentId,
        customerEmail,
        customerName,
        amount,
        status: 'pending',
        planType,
        expiresAt: new Date(pixPayment.expiresAt),
        userId
      }
    })

    console.log('PAYDATA', payment)
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
    const asaasError = error?.response?.data
    const statusCode = error?.response?.status || 500

    console.error('=== ERRO CREATE-PIX ===')
    console.error('Status HTTP:', statusCode)
    console.error('Asaas Response:', JSON.stringify(asaasError, null, 2))
    console.error('Error Message:', error?.message)
    console.error('Stack:', error?.stack)
    console.error('=== FIM ERRO ===')

    // Mensagem amigável baseada no erro
    let userMessage = 'Erro ao criar pagamento PIX'

    if (statusCode === 401) {
      userMessage = 'Erro de autenticação com gateway de pagamento'
    } else if (statusCode === 400) {
      const errors = asaasError?.errors
      if (errors?.length) {
        userMessage = errors.map((e: any) => e.description).join(', ')
      }
    } else if (statusCode === 403) {
      userMessage = 'Acesso negado ao gateway de pagamento'
    } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      userMessage = 'Não foi possível conectar ao gateway de pagamento'
    }

    return NextResponse.json(
      {
        error: userMessage,
        details: process.env.NODE_ENV !== 'production' ? asaasError : undefined,
        code: statusCode
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    )
  }
}
