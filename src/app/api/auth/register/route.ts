// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { getPlanLimits, FREE_PLAN } from '@/constants/plans'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const validationResult = registerSchema.safeParse(body)

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

    const hashedPassword = await bcrypt.hash(password, 10)

    // Cadastro gratuito com 2 tokens e 1 collection
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        planType: 'free',
        tokens: FREE_PLAN.tokens,
        maxCollections: FREE_PLAN.maxCollections
      }
    })

    const { paymentId } = body

    if (paymentId) {
      await prisma.payment.updateMany({
        where: {
          paymentId,
          userId: null
        },
        data: { userId: newUser.id }
      })
      console.log('Payment vinculado ao novo usuário:', {
        paymentId,
        userId: newUser.id
      })
    }

    console.log('Usuário criado com sucesso:', {
      userId: newUser.id,
      planType: 'free',
      tokens: FREE_PLAN.tokens
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
