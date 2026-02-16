// src/constants/plans.ts

export const plans = [
  {
    name: 'Base',
    price: 'R$ 7,99',
    period: '/pagamento único',
    description: 'Perfeito para começar',
    features: [
      '5 tokens para cupons',
      '2 coleções',
      'Compartilhamento seguro',
      'Suporte básico'
    ],
    color: 'from-pink-400 to-pink-500',
    popular: false,
    tokens: 5,
    maxCollections: 2,
    planType: 'base'
  },
  {
    name: 'Premium',
    price: 'R$ 14,99',
    period: '/pagamento único',
    description: 'Ideal para casais',
    features: [
      '10 tokens para cupons',
      '3 coleções',
      'Compartilhamento seguro',
      'Personalização avançada',
      'Suporte prioritário'
    ],
    color: 'from-pink-500 to-red-500',
    popular: true,
    tokens: 10,
    maxCollections: 3,
    planType: 'premium'
  },
  {
    name: 'VIP',
    price: 'R$ 24,99',
    period: '/pagamento único',
    description: 'Para quem quer mais opções',
    features: [
      '20 tokens para cupons',
      '5 coleções',
      'Compartilhamento seguro',
      'Todas as personalizações',
      'Suporte VIP',
      'Recursos exclusivos'
    ],
    color: 'from-red-500 to-red-600',
    popular: false,
    tokens: 20,
    maxCollections: 5,
    planType: 'vip'
  }
]

// Limites do plano gratuito
export const FREE_PLAN = {
  tokens: 2,
  maxCollections: 1
}

// Função para obter limites do plano
export const getPlanLimits = (planType: string | null) => {
  if (!planType || planType === 'free') {
    return {
      tokens: FREE_PLAN.tokens,
      maxCollections: FREE_PLAN.maxCollections
    }
  }
  const plan = plans.find(p => p.planType === planType)
  return {
    tokens: plan?.tokens || FREE_PLAN.tokens,
    maxCollections: plan?.maxCollections || FREE_PLAN.maxCollections
  }
}
