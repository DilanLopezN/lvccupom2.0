// src/app/dashboard/DashboardClient.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  PlusCircle,
  Heart,
  Gift,
  Calendar,
  AlertCircle,
  Crown,
  Coins,
  Flame
} from 'lucide-react'
import { formatDateBR } from '@/lib/utils'
import { plans } from '@/constants/plans'
import { PricingModal } from '@/app/components/PricingModal'

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
  tokens: number
  loverCoins: number
  loverStrikes: number
  collections: {
    current: number
    max: number
    percentage: number
  }
  coupons: {
    total: number
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
  const [showPricingModal, setShowPricingModal] = useState(false)

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

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateCollection = () => {
    if (!userStats) return

    if (userStats.collections.current >= userStats.collections.max) {
      setShowPricingModal(true)
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

  const handlePaymentSuccess = () => {
    setLoading(true)
    fetchData()
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
              onClick={() => setShowPricingModal(true)}
              className="text-pink-600 hover:text-pink-700 text-sm font-medium"
            >
              Comprar Tokens
            </button>
          </div>

          {/* Tokens, Coins e Strikes */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-pink-50 rounded-lg p-4 text-center">
              <Gift className="h-6 w-6 text-pink-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-pink-600">
                {userStats.tokens}
              </p>
              <p className="text-xs text-gray-600">Tokens</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <Coins className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-yellow-600">
                {userStats.loverCoins}
              </p>
              <p className="text-xs text-gray-600">Lover Coins</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <Flame className="h-6 w-6 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-600">
                {userStats.loverStrikes}
              </p>
              <p className="text-xs text-gray-600">Lover Strikes</p>
            </div>
          </div>

          {/* Barra de Coleções */}
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

          {/* Alerta de tokens baixos */}
          {userStats.tokens === 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-sm text-red-700">
                    Você não tem tokens! Compre mais para criar cupons.
                  </span>
                </div>
                <button
                  onClick={() => setShowPricingModal(true)}
                  className="text-sm bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                >
                  Comprar
                </button>
              </div>
            </div>
          )}
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

      {/* Modal de Planos / Compra de Tokens */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
