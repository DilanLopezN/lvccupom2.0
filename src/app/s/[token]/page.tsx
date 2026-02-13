'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/app/components/Header'
import { CouponModal } from '@/app/components/CupomModal'
import { CouponGrid } from '@/app/components/CupomGrid'
import { SearchBar } from '@/app/components/Search'
import { Heart } from 'lucide-react'
import { formatDateBR } from '@/lib/utils'
import { Coupon as CouponCardType } from '@/app/components/CupomCard'

type Coupon = {
  id: string
  title: string
  description: string
  icon: string
  category: string
  isUsed: boolean
  validUntil: string
  validStart?: string | null
  redeemedAt: string | null
}

type Collection = {
  id: string
  title: string
  description: string | null
  shareToken: string
  user: {
    name: string
  }
  coupons: Coupon[]
}

export default function SharedCollection() {
  const params = useParams<{ token: string }>()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [modalMessage, setModalMessage] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const response = await fetch(`/api/share/${params.token}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Coleção não encontrada')
          }
          throw new Error('Erro ao buscar coleção')
        }

        const data = await response.json()
        setCollection(data)
      } catch (err) {
        console.error('Erro:', err)
        setError('Não foi possível carregar esta coleção de cupons.')
      } finally {
        setLoading(false)
      }
    }

    if (params.token) {
      fetchCollection()
    }
  }, [params.token])

  // CORRIGIDO: Verificar se o cupom está disponível para resgate
  const isCouponAvailable = (coupon: Coupon): boolean => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Se já foi usado, não está disponível
    if (coupon.isUsed) return false

    // Verificar data de início
    if (coupon.validStart) {
      const startDate = new Date(coupon.validStart)
      if (today < startDate) return false
    }
    // Se validStart é null/undefined, considera que já está disponível

    // Verificar data de fim
    const endDate = new Date(coupon.validUntil)
    if (today > endDate) return false

    return true
  }

  // CORRIGIDO: Obter status do cupom para exibição
  const getCouponStatus = (
    coupon: Coupon
  ): 'available' | 'used' | 'not-started' | 'expired' => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (coupon.isUsed) return 'used'

    // Verificar se ainda não começou
    if (coupon.validStart) {
      const startDate = new Date(coupon.validStart)
      if (today < startDate) return 'not-started'
    }
    // Se validStart é null/undefined, considera que já começou

    // Verificar se expirou
    const endDate = new Date(coupon.validUntil)
    if (today > endDate) return 'expired'

    return 'available'
  }

  // Filtrar cupons com base nos filtros
  const filteredCoupons =
    collection?.coupons.filter(coupon => {
      const matchesCategory =
        categoryFilter === 'All' || coupon.category === categoryFilter
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Available' &&
          getCouponStatus(coupon) === 'available') ||
        (statusFilter === 'Redeemed' && coupon.isUsed)
      const matchesSearch =
        coupon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coupon.description.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesCategory && matchesStatus && matchesSearch
    }) || []

  // Mapear para o formato esperado pelo CouponCard
  const mappedCoupons: CouponCardType[] = filteredCoupons.map(coupon => {
    const status = getCouponStatus(coupon)

    return {
      id: coupon.id,
      title: coupon.title,
      description: coupon.description,
      icon: coupon.icon,
      category: coupon.category,
      used: coupon.isUsed,
      validUntil: formatDateBR(coupon.validUntil),
      validStart: coupon.validStart ? formatDateBR(coupon.validStart) : null,
      redeemedAt: coupon.redeemedAt,
      status: status,
      isAvailable: status === 'available'
    }
  })

  // Obter todas as categorias únicas
  const categories = collection
    ? ['All', ...new Set(collection.coupons.map(c => c.category))]
    : ['All']

  // Abrir o modal de cupom
  const openModal = (coupon: CouponCardType) => {
    // Converter de volta para o formato interno
    const originalCoupon =
      collection?.coupons.find(c => c.id === coupon.id) || null
    setSelectedCoupon(originalCoupon)
    setModalVisible(true)
    setModalMessage('')
  }

  // Fechar o modal
  const closeModal = () => {
    setModalVisible(false)
    setSelectedCoupon(null)
    setModalMessage('')
  }

  // Resgatar um cupom
  const redeemCoupon = async () => {
    if (!selectedCoupon || !params.token) return

    // Verificar se o cupom está disponível para resgate
    if (!isCouponAvailable(selectedCoupon)) {
      const status = getCouponStatus(selectedCoupon)
      let message = ''

      switch (status) {
        case 'used':
          message = 'Este cupom já foi resgatado.'
          break
        case 'not-started':
          message = `Este cupom só estará disponível a partir de ${formatDateBR(
            selectedCoupon.validStart!
          )}.`
          break
        case 'expired':
          message = 'Este cupom expirou e não pode mais ser resgatado.'
          break
        default:
          message = 'Este cupom não está disponível para resgate no momento.'
      }

      setModalMessage(message)
      return
    }

    try {
      const response = await fetch(`/api/share/${params.token}/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ couponId: selectedCoupon.id })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao resgatar cupom')
      }

      const updatedCoupon = await response.json()

      // Atualizar o cupom na lista
      if (collection) {
        const updatedCoupons = collection.coupons.map(c =>
          c.id === updatedCoupon.id
            ? { ...c, isUsed: true, redeemedAt: updatedCoupon.redeemedAt }
            : c
        )

        setCollection({
          ...collection,
          coupons: updatedCoupons
        })
      }

      // Atualizar o cupom selecionado
      setSelectedCoupon({
        ...selectedCoupon,
        isUsed: true,
        redeemedAt: updatedCoupon.redeemedAt
      })

      setModalMessage('Cupom resgatado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao resgatar cupom:', error)
      setModalMessage(`Erro: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pink-50">
        <Header />
        <div className="container mx-auto p-4">
          <div className="text-center py-12">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 bg-pink-200 rounded-full mb-4"></div>
              <div className="h-4 w-48 bg-pink-200 rounded mb-3"></div>
              <div className="h-3 w-32 bg-pink-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="text-black min-h-screen bg-pink-50">
        <Header />
        <div className="container mx-auto p-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="flex justify-center mb-4">
              <Heart className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Oops! Algo deu errado</h2>
            <p className="text-gray-600 mb-6">
              {error || 'Esta coleção de cupons não existe ou foi removida.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="text-black min-h-screen bg-pink-50">
      <Header />

      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-xl md:text-2xl font-bold mb-2">
            {collection.title}
          </h1>

          {collection.description && (
            <p className="text-gray-600 mb-4">{collection.description}</p>
          )}

          <div className="text-sm text-gray-500">
            Coleção de cupons criada por:{' '}
            <span className="font-medium">{collection.user.name}</span>
          </div>
        </div>

        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categories={categories}
        />

        <CouponGrid filteredCoupons={mappedCoupons} onCouponClick={openModal} />
      </div>

      <CouponModal
        isVisible={modalVisible}
        coupon={
          selectedCoupon
            ? {
                id: selectedCoupon.id,
                title: selectedCoupon.title,
                description: selectedCoupon.description,
                icon: selectedCoupon.icon,
                category: selectedCoupon.category,
                used: selectedCoupon.isUsed,
                validUntil: formatDateBR(selectedCoupon.validUntil),
                validStart: selectedCoupon.validStart
                  ? formatDateBR(selectedCoupon.validStart)
                  : null,
                status: getCouponStatus(selectedCoupon),
                isAvailable: isCouponAvailable(selectedCoupon)
              }
            : null
        }
        onClose={closeModal}
        onRedeem={redeemCoupon}
        message={modalMessage}
      />
    </div>
  )
}
