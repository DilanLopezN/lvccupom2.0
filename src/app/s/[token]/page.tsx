// src/app/s/[token]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { Header } from '@/app/components/Header'
import { CouponModal } from '@/app/components/CupomModal'
import { CouponGrid } from '@/app/components/CupomGrid'
import { SearchBar } from '@/app/components/Search'
import { Heart, UserPlus, CheckCircle2, Coins, Flame } from 'lucide-react'
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
  fulfillment?: {
    fulfilled: boolean
    fulfilledAt: string | null
  } | null
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
  const { data: session } = useSession()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [modalMessage, setModalMessage] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Partner registration state
  const [showPartnerForm, setShowPartnerForm] = useState(false)
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [partnerLoading, setPartnerLoading] = useState(false)
  const [partnerMessage, setPartnerMessage] = useState<string | null>(null)

  // Fulfillment state
  const [fulfillLoading, setFulfillLoading] = useState(false)
  const [fulfillMessage, setFulfillMessage] = useState<string | null>(null)

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

  const isCouponAvailable = (coupon: Coupon): boolean => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (coupon.isUsed) return false
    if (coupon.validStart) {
      const startDate = new Date(coupon.validStart)
      if (today < startDate) return false
    }
    const endDate = new Date(coupon.validUntil)
    if (today > endDate) return false
    return true
  }

  const getCouponStatus = (
    coupon: Coupon
  ): 'available' | 'used' | 'not-started' | 'expired' => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (coupon.isUsed) return 'used'
    if (coupon.validStart) {
      const startDate = new Date(coupon.validStart)
      if (today < startDate) return 'not-started'
    }
    const endDate = new Date(coupon.validUntil)
    if (today > endDate) return 'expired'
    return 'available'
  }

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

  const categories = collection
    ? ['All', ...new Set(collection.coupons.map(c => c.category))]
    : ['All']

  const openModal = (coupon: CouponCardType) => {
    const originalCoupon =
      collection?.coupons.find(c => c.id === coupon.id) || null
    setSelectedCoupon(originalCoupon)
    setModalVisible(true)
    setModalMessage('')
    setFulfillMessage(null)
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedCoupon(null)
    setModalMessage('')
    setFulfillMessage(null)
  }

  const redeemCoupon = async () => {
    if (!selectedCoupon || !params.token) return

    if (!isCouponAvailable(selectedCoupon)) {
      const status = getCouponStatus(selectedCoupon)
      let message = ''
      switch (status) {
        case 'used':
          message = 'Este cupom já foi resgatado.'
          break
        case 'not-started':
          message = `Este cupom só estará disponível a partir de ${formatDateBR(selectedCoupon.validStart!)}.`
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId: selectedCoupon.id })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao resgatar cupom')
      }

      const updatedCoupon = await response.json()

      if (collection) {
        const updatedCoupons = collection.coupons.map(c =>
          c.id === updatedCoupon.id
            ? { ...c, isUsed: true, redeemedAt: updatedCoupon.redeemedAt }
            : c
        )
        setCollection({ ...collection, coupons: updatedCoupons })
      }

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

  // Confirmar cumprimento do cupom
  const handleFulfill = async () => {
    if (!selectedCoupon || !params.token || !session?.user) return

    setFulfillLoading(true)
    setFulfillMessage(null)

    try {
      const response = await fetch(`/api/share/${params.token}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId: selectedCoupon.id })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao confirmar cumprimento')
      }

      setFulfillMessage(data.message)

      if (collection) {
        const updatedCoupons = collection.coupons.map(c =>
          c.id === selectedCoupon.id
            ? {
                ...c,
                fulfillment: {
                  fulfilled: true,
                  fulfilledAt: new Date().toISOString()
                }
              }
            : c
        )
        setCollection({ ...collection, coupons: updatedCoupons })
      }
    } catch (error: any) {
      setFulfillMessage(`Erro: ${error.message}`)
    } finally {
      setFulfillLoading(false)
    }
  }

  // Registrar como parceiro(a) + login automático
  const handlePartnerRegister = async () => {
    setPartnerLoading(true)
    setPartnerMessage(null)

    try {
      const response = await fetch('/api/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...partnerForm,
          shareToken: params.token
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta')
      }

      // Login automático após criar conta
      const loginResult = await signIn('credentials', {
        redirect: false,
        email: partnerForm.email,
        password: partnerForm.password
      })

      if (loginResult?.error) {
        setPartnerMessage(
          'Conta criada! Faça login manualmente para confirmar cupons.'
        )
        setShowPartnerForm(false)
        return
      }

      setPartnerMessage('Conta criada e logado com sucesso!')
      setShowPartnerForm(false)
      // Recarregar para atualizar a session
      window.location.reload()
    } catch (error: any) {
      setPartnerMessage(`Erro: ${error.message}`)
    } finally {
      setPartnerLoading(false)
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

          <div className="text-sm text-gray-500 mb-4">
            Coleção de cupons criada por:{' '}
            <span className="font-medium">{collection.user.name}</span>
          </div>

          {/* Seção de parceiro(a) */}
          {!session?.user ? (
            <div className="bg-pink-50 border border-pink-200 rounded-md p-4">
              <div className="flex items-center mb-2">
                <UserPlus className="h-5 w-5 text-pink-500 mr-2" />
                <span className="font-medium text-pink-700">
                  Recebeu esses cupons do seu amor?
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Crie uma conta para poder confirmar cupons cumpridos e ganhar
                Lover Coins!
              </p>

              {!showPartnerForm ? (
                <button
                  onClick={() => setShowPartnerForm(true)}
                  className="bg-pink-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-pink-600 transition-colors"
                >
                  Criar Minha Conta
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={partnerForm.name}
                    onChange={e =>
                      setPartnerForm(prev => ({
                        ...prev,
                        name: e.target.value
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Seu email"
                    value={partnerForm.email}
                    onChange={e =>
                      setPartnerForm(prev => ({
                        ...prev,
                        email: e.target.value
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Crie uma senha"
                    value={partnerForm.password}
                    onChange={e =>
                      setPartnerForm(prev => ({
                        ...prev,
                        password: e.target.value
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handlePartnerRegister}
                      disabled={
                        partnerLoading ||
                        !partnerForm.name ||
                        !partnerForm.email ||
                        !partnerForm.password
                      }
                      className="bg-pink-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
                    >
                      {partnerLoading ? 'Criando...' : 'Criar Conta'}
                    </button>
                    <button
                      onClick={() => setShowPartnerForm(false)}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {partnerMessage && (
                <p
                  className={`text-sm mt-2 ${partnerMessage.startsWith('Erro') ? 'text-red-600' : 'text-green-600'}`}
                >
                  {partnerMessage}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm text-green-700">
                Logado como {session.user.name}. Confirme cupons cumpridos
                abaixo!
              </span>
            </div>
          )}
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

      {/* Modal do cupom com botão de fulfillment */}
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
        extraContent={
          selectedCoupon?.isUsed &&
          session?.user &&
          !selectedCoupon?.fulfillment?.fulfilled ? (
            <div className="mt-4 border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">
                Seu amor cumpriu o prometido neste cupom?
              </p>
              <button
                onClick={handleFulfill}
                disabled={fulfillLoading}
                className="bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-70 flex items-center"
              >
                {fulfillLoading ? (
                  'Confirmando...'
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmar Cumprimento
                  </>
                )}
              </button>
              {fulfillMessage && (
                <p
                  className={`text-sm mt-2 ${fulfillMessage.startsWith('Erro') ? 'text-red-600' : 'text-green-600'}`}
                >
                  {fulfillMessage}
                </p>
              )}
            </div>
          ) : selectedCoupon?.fulfillment?.fulfilled ? (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center text-green-600">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">
                  Cupom cumprido!{' '}
                  {selectedCoupon.fulfillment.fulfilledAt &&
                    `em ${formatDateBR(selectedCoupon.fulfillment.fulfilledAt)}`}
                </span>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  )
}
