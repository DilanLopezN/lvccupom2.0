'use client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/share/[token] - Obter uma coleção compartilhada pelo token
export async function GET(req: NextRequest) {
  try {
    // Extrai o token da URL
    const match = req.nextUrl.pathname.match(/\/share\/([^/]+)/)
    const token = match ? match[1] : null

    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    // Verificar se a coleção existe pelo token de compartilhamento
    const collection = await prisma.couponCollection.findUnique({
      where: { shareToken: token },
      include: {
        coupons: {
          orderBy: { createdAt: 'desc' }
        },
        user: {
          select: {
            name: true // Apenas retornar o nome do usuário, não dados sensíveis
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

    return NextResponse.json(collection)
  } catch (error) {
    console.error('Erro ao buscar coleção compartilhada:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar coleção compartilhada' },
      { status: 500 }
    )
  }
}
