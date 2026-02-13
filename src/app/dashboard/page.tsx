'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  PlusCircle,
  Heart,
  Gift,
  Calendar,
  AlertCircle,
  Crown
} from 'lucide-react'
import { formatDateBR } from '@/lib/utils'
import { plans } from '@/constants/plans'

type Collection = {
  id: string
  title: string
  description: string | null
  shareToken: string
  createdAt: string
  _count: {
    coupons: number
  }
}

type UserStats = {
  planType: string
  collections: {
    current: number
    max: number
    percentage: number
  }
  coupons: {
    current: number
    max: number
    percentage: number
  }
}

export default function Dashboard() {
  const { data: session } = useSession()
  const [collections, setCollections] = useState<Collection[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar coleções
        const collectionsResponse = await fetch('/api/collections')
        if (!collectionsResponse.ok) {
          throw new Error('Falha ao buscar coleções')
        }
        const collectionsData = await collectionsResponse.json()
        setCollections(collectionsData)

        // Buscar estatísticas do usuário
        const statsResponse = await fetch('/api/user/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setUserStats(statsData)
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err)
        setError(
          'Não foi possível carregar suas coleções. Tente novamente mais tarde.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleCreateCollection = async () => {
    if (!userStats) return

    // Verificar se pode criar nova coleção
    if (userStats.collections.current >= userStats.collections.max) {
      setShowUpgradeModal(true)
      return
    }

    // Redirecionar para criação
    window.location.href = '/dashboard/collections/new'
  }

  const getRandomIcon = () => {
    const icons = [
      <Heart key="heart" className="text-red-500" />,
      <Gift key="gift" className="text-purple-500" />,
      <Calendar key="calendar" className="text-blue-500" />
    ]
    return icons[Math.floor(Math.random() * icons.length)]
  }

  const getCurrentPlan = () => {
    return plans.find(p => p.planType === userStats?.planType) || plans[0]
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="text-black">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bem-vindo, {session?.user?.name}</h1>
        <button
          onClick={handleCreateCollection}
          className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-4 py-2 rounded-md font-medium flex items-center hover:from-pink-600 hover:to-red-600 transition-colors"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          Nova Coleção
        </button>
      </div>

      {/* Estatísticas do Plano */}
      {userStats && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Crown className="h-6 w-6 text-yellow-500 mr-2" />
              <h2 className="text-lg font-bold">
                Plano {getCurrentPlan().name}
              </h2>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="text-pink-600 hover:text-pink-700 text-sm font-medium"
            >
              Fazer Upgrade
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coleções */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Coleções
                </span>
                <span className="text-sm text-gray-500">
                  {userStats.collections.current} / {userStats.collections.max}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(userStats.collections.percentage)}`}
                  style={{
                    width: `${Math.min(userStats.collections.percentage, 100)}%`
                  }}
                ></div>
              </div>
              {userStats.collections.percentage >= 80 && (
                <p className="text-xs text-orange-600 mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Você está próximo do limite
                </p>
              )}
            </div>

            {/* Cupons */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Cupons
                </span>
                <span className="text-sm text-gray-500">
                  {userStats.coupons.current} / {userStats.coupons.max}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(userStats.coupons.percentage)}`}
                  style={{
                    width: `${Math.min(userStats.coupons.percentage, 100)}%`
                  }}
                ></div>
              </div>
              {userStats.coupons.percentage >= 80 && (
                <p className="text-xs text-orange-600 mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Você está próximo do limite
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-pink-200 rounded-full mb-4"></div>
            <div className="h-4 w-48 bg-pink-200 rounded mb-3"></div>
            <div className="h-3 w-32 bg-pink-100 rounded"></div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md">{error}</div>
      ) : collections.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <Heart className="h-12 w-12 text-pink-500" fill="#ec4899" />
          </div>
          <h2 className="text-xl font-bold mb-2">Nenhuma coleção encontrada</h2>
          <p className="text-gray-600 mb-6">
            Crie sua primeira coleção de cupons de amor para compartilhar com
            aquela pessoa especial.
          </p>
          <button
            onClick={handleCreateCollection}
            className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-6 py-3 rounded-md font-medium inline-flex items-center hover:from-pink-600 hover:to-red-600 transition-colors"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Criar Coleção
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map(collection => (
            <div
              key={collection.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-pink-100 p-3 rounded-full">
                    {getRandomIcon()}
                  </div>
                  <span className="text-sm bg-pink-100 text-pink-800 rounded-full px-3 py-1">
                    {collection._count.coupons} cupons
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">{collection.title}</h3>
                {collection.description && (
                  <p className="text-gray-600 mb-4">{collection.description}</p>
                )}
                <div className="text-sm text-gray-500 mb-4">
                  Criado em: {formatDateBR(collection.createdAt)}
                </div>
                <div className="flex flex-col space-y-2">
                  <Link
                    href={`/dashboard/collections/${collection.id}`}
                    className="bg-gradient-to-r from-pink-500 to-red-500 text-white text-center py-2 rounded-md font-medium hover:from-pink-600 hover:to-red-600 transition-colors"
                  >
                    Gerenciar Cupons
                  </Link>
                  <Link
                    href={`/s/${collection.shareToken}`}
                    target="_blank"
                    className="bg-pink-100 text-pink-700 text-center py-2 rounded-md font-medium hover:bg-pink-200 transition-colors"
                  >
                    Ver Link Compartilhado
                  </Link>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleCreateCollection}
            className="bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-6 h-full hover:border-pink-300 hover:bg-pink-50 transition-colors"
          >
            <PlusCircle className="h-12 w-12 text-gray-400 mb-4" />
            <span className="text-gray-600 font-medium">
              Criar Nova Coleção
            </span>
          </button>
        </div>
      )}

      {/* Modal de Upgrade */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Crown className="h-8 w-8 text-yellow-500 mr-3" />
                <h3 className="text-xl font-bold">Limite Atingido</h3>
              </div>

              <p className="text-gray-600 mb-6">
                Você atingiu o limite do seu plano atual. Faça upgrade para
                criar mais coleções e cupons!
              </p>

              <div className="grid grid-cols-1 gap-3 mb-6">
                {plans
                  .filter(p => p.planType !== userStats?.planType)
                  .map(plan => (
                    <div
                      key={plan.planType}
                      className="border border-gray-200 rounded-lg p-4 hover:border-pink-300 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-lg">{plan.name}</h4>
                          <p className="text-sm text-gray-600">
                            {plan.description}
                          </p>
                          <div className="text-xs text-gray-500 mt-1">
                            {plan.features.slice(0, 2).map((feature, index) => (
                              <span key={index}>
                                ✓ {feature}
                                {index === 0 ? ' • ' : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{plan.price}</div>
                          <div className="text-xs text-gray-500">
                            {plan.period}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false)
                    // Redirecionar para página de upgrade (implementar depois)
                    window.location.href = '/#pricing'
                  }}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white py-2 px-4 rounded-md hover:from-pink-600 hover:to-red-600 transition-colors"
                >
                  Fazer Upgrade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
