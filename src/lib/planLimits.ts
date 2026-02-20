// src/lib/planLimits.ts
import { prisma } from './prisma'
import { getPlanLimits } from '@/constants/plans'

export interface PlanLimitCheck {
  canCreate: boolean
  currentCount: number
  maxAllowed: number
  planType: string
  errorMessage?: string
}

/**
 * Verifica se o usuário pode criar uma nova coleção
 */
export async function canCreateCollection(
  userId: string
): Promise<PlanLimitCheck> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: { collections: true }
      }
    }
  })

  if (!user) {
    return {
      canCreate: false,
      currentCount: 0,
      maxAllowed: 0,
      planType: 'free',
      errorMessage: 'Usuário não encontrado'
    }
  }

  const planLimits = getPlanLimits(user.planType)
  const currentCount = user._count.collections
  const maxAllowed = user.maxCollections || planLimits.maxCollections

  const canCreate = currentCount < maxAllowed

  return {
    canCreate,
    currentCount,
    maxAllowed,
    planType: user.planType || 'free',
    errorMessage: canCreate
      ? undefined
      : `Você atingiu o limite de ${maxAllowed} coleções do seu plano ${user.planType || 'gratuito'}. Faça upgrade para criar mais coleções.`
  }
}

/**
 * Verifica se o usuário pode criar um novo cupom em uma coleção
 */
/**
 * Verifica se o usuário tem tokens para criar um cupom
 */
export async function canCreateCoupon(
  userId: string,
  collectionId?: string
): Promise<PlanLimitCheck> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    return {
      canCreate: false,
      currentCount: 0,
      maxAllowed: 0,
      planType: 'free',
      errorMessage: 'Usuário não encontrado'
    }
  }

  const canCreate = user.tokens > 0

  return {
    canCreate,
    currentCount: 0,
    maxAllowed: user.tokens,
    planType: user.planType || 'free',
    errorMessage: canCreate
      ? undefined
      : `Você não tem tokens disponíveis. Adquira um plano para ganhar mais tokens.`
  }
}
/**
 * Obtém estatísticas de uso do usuário
 */
export async function getUserUsageStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      collections: {
        include: {
          _count: {
            select: { coupons: true }
          }
        }
      }
    }
  })

  if (!user) {
    return null
  }

  const planLimits = getPlanLimits(user.planType)
  const totalCoupons = user.collections.reduce((total, collection) => {
    return total + collection._count.coupons
  }, 0)

  return {
    planType: user.planType || 'free',
    tokens: user.tokens,
    collections: {
      current: user.collections.length,
      max: user.maxCollections || planLimits.maxCollections,
      percentage: Math.round(
        (user.collections.length /
          (user.maxCollections || planLimits.maxCollections)) *
          100
      )
    },
    coupons: {
      total: totalCoupons
    }
  }
}
