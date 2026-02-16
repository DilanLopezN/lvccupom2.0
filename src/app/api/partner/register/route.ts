// src/app/api/partner/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// POST /api/partner/register - Criar conta simplificada de parceiro(a)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, shareToken } = body

    if (!name || !email || !password || !shareToken) {
      return NextResponse.json(
        {
          error:
            'Nome, email, senha e token de compartilhamento são obrigatórios'
        },
        { status: 400 }
      )
    }

    // Verificar se a coleção existe pelo shareToken
    const collection = await prisma.couponCollection.findUnique({
      where: { shareToken },
      include: { user: true }
    })

    if (!collection) {
      return NextResponse.json(
        { error: 'Link de compartilhamento inválido' },
        { status: 404 }
      )
    }

    const ownerId = collection.userId

    // Verificar se o email já está em uso
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      // Se já existe, apenas vincular como parceiro se ainda não está vinculado
      if (!existingUser.partnerId && existingUser.id !== ownerId) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: existingUser.id },
            data: { partnerId: ownerId }
          }),
          prisma.user.update({
            where: { id: ownerId },
            data: { partnerId: existingUser.id }
          })
        ])
      }

      return NextResponse.json({
        message: 'Conta já existe. Vinculação atualizada.',
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email
        },
        alreadyExists: true
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Criar conta do parceiro e vincular ao dono da coleção
    const newPartner = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        planType: 'free',
        tokens: 0, // Parceiro não precisa de tokens inicialmente
        maxCollections: 0,
        partnerId: ownerId
      }
    })

    // Vincular o dono ao parceiro também (relação bidirecional)
    await prisma.user.update({
      where: { id: ownerId },
      data: { partnerId: newPartner.id }
    })

    console.log('Parceiro criado e vinculado:', {
      partnerId: newPartner.id,
      ownerId,
      shareToken
    })

    return NextResponse.json({
      message: 'Conta de parceiro(a) criada com sucesso!',
      user: {
        id: newPartner.id,
        name: newPartner.name,
        email: newPartner.email
      }
    })
  } catch (error) {
    console.error('Erro ao criar conta de parceiro:', error)
    return NextResponse.json(
      { error: 'Erro ao criar conta de parceiro' },
      { status: 500 }
    )
  }
}
