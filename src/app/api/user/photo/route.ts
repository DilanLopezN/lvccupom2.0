import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/constants/constants'
import { prisma } from '@/lib/prisma'
import { uploadToR2 } from '@/lib/r2'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('photo') as File
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhuma foto enviada' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${session.user.id}-${Date.now()}.${ext}`

    const imageUrl = await uploadToR2(buffer, fileName, file.type)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { profileImage: imageUrl }
    })

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
  }
}
