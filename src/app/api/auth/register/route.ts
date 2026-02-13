// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { registerWithPaymentSchema } from '@/lib/asaas'
import { getPlanLimits } from '@/constants/plans'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const paymentId = body.paymentId
    const hasPaymentData = !!paymentId

    console.log('Dados recebidos:', {
      finalPaymentId: paymentId,
      hasPaymentData,
      bodyKeys: Object.keys(body)
    })

    // Usar esquema apropriado para validação
    const validationResult = hasPaymentData
      ? registerWithPaymentSchema.safeParse({ ...body, paymentId })
      : registerSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, password } = validationResult.data

    // Verificar se o e-mail já está em uso
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está em uso' },
        { status: 400 }
      )
    }

    // Se há pagamento, verificar se é válido
    let paymentData = null
    let planType = 'free'

    if (paymentId) {
      paymentData = await prisma.payment.findUnique({
        where: { paymentId }
      })

      console.log('Dados do pagamento encontrado:', paymentData)

      if (!paymentData) {
        return NextResponse.json(
          { error: 'Pagamento não encontrado' },
          { status: 404 }
        )
      }

      if (paymentData.status !== 'paid') {
        return NextResponse.json(
          { error: 'Pagamento ainda não foi confirmado' },
          { status: 400 }
        )
      }

      planType = paymentData.planType
    }

    // Obter limites do plano
    const planLimits = getPlanLimits(planType)

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Calcular expiração do plano (30 dias para planos pagos)
    let planExpiresAt = null
    if (planType !== 'free' && paymentData) {
      planExpiresAt = new Date()
      planExpiresAt.setDate(planExpiresAt.getDate() + 30)
    }

    // Criar o usuário
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        planType,
        maxCollections: planLimits.maxCollections,
        maxCupoms: planLimits.maxCupons,
        planExpiresAt
      }
    })

    // Vincular pagamento ao usuário se houver
    if (paymentId && paymentData) {
      await prisma.payment.update({
        where: { paymentId },
        data: { userId: newUser.id }
      })
    }

    console.log('Usuário criado com sucesso:', {
      userId: newUser.id,
      planType,
      hasPayment: !!paymentId
    })

    return NextResponse.json({
      message: 'Usuário registrado com sucesso',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        planType: newUser.planType
      }
    })
  } catch (error) {
    console.error('Erro ao registrar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar usuário' },
      { status: 500 }
    )
  }
}
