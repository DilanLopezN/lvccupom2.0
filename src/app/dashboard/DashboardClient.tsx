'use client'

import { useEffect, useState } from 'react'
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

type Props = {
  session: any
}

export default function DashboardClient({ session }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const collectionsResponse = await fetch('/api/collections')

        if (!collectionsResponse.ok) {
          throw new Error('Falha ao buscar coleções')
        }

        const collectionsData = await collectionsResponse.json()
        setCollections(collectionsData)

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

  const handleCreateCollection = () => {
    if (!userStats) return

    if (userStats.collections.current >= userStats.collections.max) {
      setShowUpgradeModal(true)
      return
    }

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
                  className={`h-2 rounded-full ${getProgressColor(
                    userStats.collections.percentage
                  )}`}
                  style={{
                    width: `${Math.min(userStats.collections.percentage, 100)}%`
                  }}
                />
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
                  className={`h-2 rounded-full ${getProgressColor(
                    userStats.coupons.percentage
                  )}`}
                  style={{
                    width: `${Math.min(userStats.coupons.percentage, 100)}%`
                  }}
                />
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
        <div className="text-center py-12">Carregando...</div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md">{error}</div>
      ) : collections.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Heart className="h-12 w-12 text-pink-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhuma coleção encontrada</h2>

          <button
            onClick={handleCreateCollection}
            className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-6 py-3 rounded-md font-medium inline-flex items-center"
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
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-pink-100 p-3 rounded-full">
                  {getRandomIcon()}
                </div>

                <span className="text-sm bg-pink-100 text-pink-800 rounded-full px-3 py-1">
                  {collection._count.coupons} cupons
                </span>
              </div>

              <h3 className="text-xl font-bold mb-2">{collection.title}</h3>

              <div className="text-sm text-gray-500 mb-4">
                Criado em: {formatDateBR(collection.createdAt)}
              </div>

              <Link
                href={`/dashboard/collections/${collection.id}`}
                className="bg-gradient-to-r from-pink-500 to-red-500 text-white text-center py-2 rounded-md block"
              >
                Gerenciar Cupons
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
