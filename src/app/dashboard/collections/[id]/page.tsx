'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  PlusCircle,
  Share2,
  Copy,
  Check,
  Trash2
} from 'lucide-react'
import { getIcon } from '@/app/components/GetIcon'
import { formatDateBR, adaptCouponsForUI } from '@/lib/utils'

type Coupon = {
  id: string
  title: string
  description: string
  icon: string
  category: string
  isUsed: boolean
  validUntil: string
  redeemedAt: string | null
}

type Collection = {
  id: string
  title: string
  description: string | null
  shareToken: string
}

export default function CollectionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  )

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        // Buscar dados da coleção
        const collectionResponse = await fetch(`/api/collections/${params.id}`)
        if (!collectionResponse.ok) {
          throw new Error('Falha ao buscar coleção')
        }
        const collectionData = await collectionResponse.json()
        setCollection(collectionData)

        // Buscar cupons da coleção
        const couponsResponse = await fetch(
          `/api/collections/${params.id}/coupons`
        )
        if (!couponsResponse.ok) {
          throw new Error('Falha ao buscar cupons')
        }
        const couponsData = await couponsResponse.json()
        setCoupons(adaptCouponsForUI(couponsData))
      } catch (err) {
        console.error('Erro:', err)
        setError(
          'Não foi possível carregar os dados. Tente novamente mais tarde.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchCollection()
  }, [params.id])

  const handleCopyLink = () => {
    if (!collection) return

    const shareUrl = `${window.location.origin}/s/${collection.shareToken}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  const handleDeleteCoupon = async (couponId: string) => {
    try {
      const response = await fetch(
        `/api/collections/${params.id}/coupons/${couponId}`,
        {
          method: 'DELETE'
        }
      )

      if (!response.ok) {
        throw new Error('Falha ao excluir cupom')
      }

      // Atualizar a lista de cupons removendo o excluído
      setCoupons(coupons.filter(coupon => coupon.id !== couponId))
      setShowDeleteConfirm(null)
    } catch (err) {
      console.error('Erro ao excluir cupom:', err)
      setError('Não foi possível excluir o cupom. Tente novamente.')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-pink-200 rounded-full mb-4"></div>
          <div className="h-4 w-48 bg-pink-200 rounded mb-3"></div>
          <div className="h-3 w-32 bg-pink-100 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="bg-red-100 text-red-700 p-4 rounded-md">{error}</div>
  }

  if (!collection) {
    return (
      <div className="bg-yellow-100 text-yellow-700 p-4 rounded-md">
        Coleção não encontrada.
      </div>
    )
  }

  const shareUrl = `${
    typeof window !== 'undefined' ? window.location.origin : ''
  }/s/${collection.shareToken}`

  return (
    <div className="text-black">
      <div className=" mb-6">
        <Link
          href="/dashboard"
          className="text-gray-600 hover:text-gray-900 flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{collection.title}</h1>
        {collection.description && (
          <p className="text-gray-600 mb-4">{collection.description}</p>
        )}

        <div className="bg-pink-50 p-4 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center text-pink-700">
            <Share2 className="h-5 w-5 mr-2" />
            <span>Link para compartilhar:</span>
          </div>

          <div className="flex-1 flex items-center">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 p-2 border border-gray-300 rounded-l-md text-sm bg-white"
            />
            <button
              onClick={handleCopyLink}
              className="bg-pink-500 text-white p-2 rounded-r-md hover:bg-pink-600 transition-colors"
              title="Copiar link"
            >
              {copied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Cupons ({coupons.length})</h2>
        <Link
          href={`/dashboard/collections/${params.id}/coupons/new`}
          className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-4 py-2 rounded-md font-medium flex items-center hover:from-pink-600 hover:to-red-600 transition-colors"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          Novo Cupom
        </Link>
      </div>

      {coupons.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <PlusCircle className="h-12 w-12 text-pink-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Nenhum cupom encontrado</h2>
          <p className="text-gray-600 mb-6">
            Esta coleção ainda não tem cupons. Crie o primeiro cupom para
            compartilhar.
          </p>
          <Link
            href={`/dashboard/collections/${params.id}/coupons/new`}
            className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-6 py-3 rounded-md font-medium inline-flex items-center hover:from-pink-600 hover:to-red-600 transition-colors"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Criar Cupom
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map(coupon => (
            <div
              key={coupon.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
                coupon.isUsed ? 'opacity-70' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    {getIcon(coupon.icon, 'h-5 w-5 text-pink-500')}
                    <span className="ml-2 text-xs py-1 px-2 bg-pink-100 text-pink-800 rounded-full">
                      {coupon.category}
                    </span>
                  </div>
                  {coupon.isUsed ? (
                    <span className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded-full flex items-center">
                      <Check size={12} className="mr-1" /> Resgatado
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      Disponível
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-1">{coupon.title}</h3>
                <p className="text-gray-600 text-sm">{coupon.description}</p>
                <div className="mt-4 text-xs text-gray-500">
                  Válido até: {formatDateBR(coupon.validUntil)}
                </div>
                {coupon.isUsed && coupon.redeemedAt && (
                  <div className="mt-1 text-xs text-gray-500">
                    Resgatado em: {formatDateBR(coupon.redeemedAt)}
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-r from-pink-100 to-red-100 p-2 flex justify-between items-center">
                <Link
                  href={`/dashboard/collections/${params.id}/coupons/${coupon.id}`}
                  className="text-sm font-medium text-pink-700 hover:text-pink-800"
                >
                  Editar
                </Link>

                {showDeleteConfirm === coupon.id ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(coupon.id)}
                    className="text-sm text-gray-500 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <Link
            href={`/dashboard/collections/${params.id}/coupons/new`}
            className="bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-6 h-full hover:border-pink-300 hover:bg-pink-50 transition-colors"
          >
            <PlusCircle className="h-12 w-12 text-gray-400 mb-4" />
            <span className="text-gray-600 font-medium">
              Adicionar Novo Cupom
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}
