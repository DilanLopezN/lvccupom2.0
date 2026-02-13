// src/app/components/PricingModal.tsx
'use client'

import React, { useState } from 'react'
import { X, Check, CreditCard } from 'lucide-react'
import { plans } from '@/constants/plans'
import { signIn } from 'next-auth/react'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
  // Dados vindos do formulário de registro
  registerData?: {
    name: string
    email: string
    password: string
  }
  onPaymentSuccess?: () => void
}

export function PricingModal({
  isOpen,
  onClose,
  registerData,
  onPaymentSuccess
}: PricingModalProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePlanSelection = (planType: string) => {
    setSelectedPlan(planType)
    setShowPaymentModal(true)
  }

  return (
    <>
      <div className="text-black fixed inset-0 bg-transparent bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-pink-500 to-red-500 p-6 flex justify-between items-center">
            <h2 className="text-white text-2xl font-bold">Escolha seu Plano</h2>
            <button onClick={onClose} className="text-white">
              <X />
            </button>
          </div>

          <div className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map(plan => (
                <div
                  key={plan.planType}
                  className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                  <p className="text-2xl font-bold mb-4">{plan.price}</p>
                  <ul className="space-y-2 mb-6 text-sm text-gray-600">
                    {plan.features.map((feature, index) => (
                      <li key={index}>✓ {feature}</li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-3 px-4 rounded-md font-medium text-white bg-gradient-to-r ${plan.color} hover:opacity-90 transition-opacity flex items-center justify-center`}
                    onClick={() => handlePlanSelection(plan.planType)}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Escolher {plan.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Todos os planos: Pagamento único via PIX</p>
              <p>Acesso imediato após confirmação do pagamento</p>
              <p>Sem mensalidades ou taxas ocultas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento PIX */}
      {showPaymentModal && selectedPlan && (
        <PaymentModal
          planType={selectedPlan}
          registerData={registerData}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedPlan(null)
          }}
          onPaymentSuccess={() => {
            setShowPaymentModal(false)
            setSelectedPlan(null)
            onClose()
            onPaymentSuccess?.()
          }}
        />
      )}
    </>
  )
}

// Componente do Modal de Pagamento PIX
function PaymentModal({
  planType,
  registerData,
  onClose,
  onPaymentSuccess
}: {
  planType: string
  registerData?: {
    name: string
    email: string
    password: string
  }
  onClose: () => void
  onPaymentSuccess: () => void
}) {
  // Se temos dados do registro, pular direto para 'form' mas com dados preenchidos
  const hasRegisterData = !!(registerData?.name && registerData?.email)
  const [step, setStep] = useState<'form' | 'payment'>(
    hasRegisterData ? 'form' : 'form'
  )

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customerName: registerData?.name || '',
    customerEmail: registerData?.email || '',
    customerDocument: '',
    customerPhone: ''
  })
  const [paymentData, setPaymentData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedPlan = plans.find(p => p.planType === planType)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/create-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          planType
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar pagamento')
      }

      setPaymentData(data)
      setStep('payment')
    } catch (error: any) {
      setError(error.message || 'Erro ao criar pagamento')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="text-black fixed inset-0 bg-transparent bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {step === 'form' ? (
          <>
            <div
              className={`bg-gradient-to-r ${selectedPlan?.color} p-4 flex justify-between items-center`}
            >
              <h3 className="text-white font-bold text-lg">
                Plano {selectedPlan?.name}
              </h3>
              <button onClick={onClose} className="text-white">
                <X />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <div className="bg-pink-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <CreditCard className="text-pink-600 h-8 w-8" />
                </div>
                <h4 className="text-xl font-bold mb-2">
                  {selectedPlan?.price}
                </h4>
                <p className="text-gray-600">Pagamento único via PIX</p>
                <div className="mt-4 text-sm text-gray-500">
                  {selectedPlan?.features.map((feature, index) => (
                    <p key={index}>✓ {feature}</p>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">
                  {error}
                </div>
              )}

              {/* Se já tem nome e email do registro, mostrar resumo ao invés de pedir de novo */}
              {hasRegisterData && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-md mb-4 text-sm">
                  <p className="text-green-700 font-medium mb-1">
                    Dados do cadastro:
                  </p>
                  <p className="text-green-600">👤 {formData.customerName}</p>
                  <p className="text-green-600">📧 {formData.customerEmail}</p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Só mostra nome e email se NÃO veio do registro */}
                {!hasRegisterData && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="customerEmail"
                        value={formData.customerEmail}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF *
                  </label>
                  <input
                    type="text"
                    name="customerDocument"
                    value={formData.customerDocument}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    placeholder="000.000.000-00"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-gradient-to-r ${selectedPlan?.color} text-white py-2 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-70`}
                >
                  {loading ? 'Gerando PIX...' : 'Gerar PIX'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <PixPaymentStep
            paymentData={paymentData}
            customerEmail={formData.customerEmail}
            planName={selectedPlan?.name || ''}
            planType={planType}
            registerData={registerData}
            onClose={onClose}
            onPaymentConfirmed={onPaymentSuccess}
          />
        )}
      </div>
    </div>
  )
}

// Componente para mostrar o PIX e aguardar pagamento
function PixPaymentStep({
  paymentData,
  customerEmail,
  planName,
  planType,
  registerData,
  onClose,
  onPaymentConfirmed
}: {
  paymentData: any
  customerEmail: string
  planName: string
  planType: string
  registerData?: {
    name: string
    email: string
    password: string
  }
  onClose: () => void
  onPaymentConfirmed: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(paymentData.status)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isChecking, setIsChecking] = useState(false)
  const [autoRegisterStatus, setAutoRegisterStatus] = useState<
    'idle' | 'registering' | 'logging-in' | 'success' | 'error'
  >('idle')
  const [autoRegisterError, setAutoRegisterError] = useState<string | null>(
    null
  )

  // Função para copiar código PIX
  const handleCopyPix = () => {
    navigator.clipboard.writeText(paymentData.copyPaste)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Função para auto-registro + login após pagamento confirmado
  const handleAutoRegister = async () => {
    if (!registerData?.password) {
      // Sem senha = não veio do form de registro, redirecionar normalmente
      window.location.href = `/register?payment=${paymentData.paymentId}&email=${encodeURIComponent(customerEmail)}`
      return
    }

    try {
      setAutoRegisterStatus('registering')

      // 1. Registrar o usuário
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          confirmPassword: registerData.password,
          paymentId: paymentData.paymentId
        })
      })

      const registerResult = await registerResponse.json()

      if (!registerResponse.ok) {
        throw new Error(registerResult.error || 'Erro ao registrar')
      }

      // 2. Fazer login automático
      setAutoRegisterStatus('logging-in')

      const loginResult = await signIn('credentials', {
        redirect: false,
        email: registerData.email,
        password: registerData.password
      })

      if (loginResult?.error) {
        // Registro OK mas login falhou - redirecionar para login
        window.location.href = '/login?registered=true'
        return
      }

      // 3. Sucesso total - redirecionar para dashboard
      setAutoRegisterStatus('success')
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1500)
    } catch (error: any) {
      console.error('Erro no auto-registro:', error)
      setAutoRegisterError(error.message)
      setAutoRegisterStatus('error')

      // Fallback: redirecionar para registro manual
      setTimeout(() => {
        window.location.href = `/register?payment=${paymentData.paymentId}&email=${encodeURIComponent(customerEmail)}`
      }, 3000)
    }
  }

  // Polling para verificar status do pagamento
  React.useEffect(() => {
    if (paymentStatus === 'paid') return

    const checkPaymentStatus = async () => {
      try {
        setIsChecking(true)
        const response = await fetch(
          `/api/payments/status/${paymentData.paymentId}`
        )
        const data = await response.json()

        if (data.status === 'paid') {
          setPaymentStatus('paid')
          // Aguarda 1s e tenta auto-registro
          setTimeout(() => {
            handleAutoRegister()
          }, 1000)
        }
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error)
      } finally {
        setIsChecking(false)
      }
    }

    const interval = setInterval(checkPaymentStatus, 3000)
    return () => clearInterval(interval)
  }, [paymentStatus, paymentData.paymentId, customerEmail])

  // Contador de tempo restante
  React.useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date().getTime()
      const expiry = new Date(paymentData.expiresAt).getTime()
      const difference = expiry - now

      if (difference > 0) {
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        )
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      } else {
        setTimeLeft('Expirado')
        setPaymentStatus('expired')
      }
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 1000)
    return () => clearInterval(interval)
  }, [paymentData.expiresAt])

  // === TELA DE PAGAMENTO CONFIRMADO ===
  if (paymentStatus === 'paid') {
    return (
      <div className="p-6 text-center">
        <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <Check className="text-green-600 h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold text-green-600 mb-2">
          🎉 Pagamento Confirmado!
        </h3>
        <p className="text-gray-600 mb-4">
          Seu plano {planName} foi ativado com sucesso!
        </p>

        {autoRegisterStatus === 'registering' && (
          <div className="bg-blue-50 p-3 rounded-md mb-4">
            <p className="text-sm text-blue-700">Criando sua conta...</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mt-2"></div>
          </div>
        )}

        {autoRegisterStatus === 'logging-in' && (
          <div className="bg-blue-50 p-3 rounded-md mb-4">
            <p className="text-sm text-blue-700">
              Conta criada! Fazendo login...
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mt-2"></div>
          </div>
        )}

        {autoRegisterStatus === 'success' && (
          <div className="bg-green-50 p-3 rounded-md mb-4">
            <p className="text-sm text-green-700">
              ✅ Conta criada e login realizado! Redirecionando para o
              dashboard...
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mt-2"></div>
          </div>
        )}

        {autoRegisterStatus === 'error' && (
          <div className="bg-yellow-50 p-3 rounded-md mb-4">
            <p className="text-sm text-yellow-700">
              ⚠️ {autoRegisterError || 'Erro ao criar conta automaticamente.'}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Redirecionando para registro manual...
            </p>
          </div>
        )}

        {autoRegisterStatus === 'idle' && (
          <div className="bg-green-50 p-3 rounded-md mb-4">
            <p className="text-sm text-green-700">
              Redirecionando para criar sua conta...
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mt-2"></div>
          </div>
        )}
      </div>
    )
  }

  // === TELA DE PIX EXPIRADO ===
  if (paymentStatus === 'expired') {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <X className="text-red-600 h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold text-red-600 mb-2">PIX Expirado</h3>
        <p className="text-gray-600 mb-4">
          O tempo para pagamento expirou. Gere um novo PIX para continuar.
        </p>
        <button
          onClick={onClose}
          className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  // === TELA DE AGUARDANDO PAGAMENTO ===
  return (
    <>
      <div className="bg-gradient-to-r from-pink-400 to-pink-500 p-4 flex justify-between items-center">
        <h3 className="text-white font-bold text-lg">
          Pagamento PIX - {planName}
        </h3>
        <button onClick={onClose} className="text-white">
          <X />
        </button>
      </div>

      <div className="p-6">
        <div className="text-center mb-6">
          <h4 className="text-lg font-bold mb-2">
            {paymentData.amount / 100
              ? `R$ ${(paymentData.amount / 100).toFixed(2).replace('.', ',')}`
              : paymentData.price}
          </h4>
          <p className="text-gray-600 mb-2">
            Escaneie o QR Code ou copie o código PIX
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-gray-500">
              Tempo restante: {timeLeft}
            </span>
            {isChecking && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500"></div>
            )}
          </div>
        </div>

        {/* Status de aguardando confirmação */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex items-center">
            <div className="animate-pulse flex items-center">
              <div className="rounded-full h-3 w-3 bg-blue-400 mr-2"></div>
              <p className="text-sm text-blue-700 font-medium">
                Aguardando confirmação do pagamento...
              </p>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Assim que o pagamento for processado, sua conta será criada
            automaticamente.
          </p>
        </div>

        {/* QR Code */}
        <div className="text-center mb-4">
          <img
            src={paymentData.qrCodeBase64}
            alt="QR Code PIX"
            className="mx-auto w-48 h-48 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Código PIX para copiar */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código PIX (Copia e Cola):
          </label>
          <div className="flex">
            <input
              type="text"
              value={paymentData.copyPaste}
              readOnly
              className="flex-1 p-2 border border-gray-300 rounded-l-md text-xs bg-gray-50"
            />
            <button
              onClick={handleCopyPix}
              className="bg-pink-500 text-white px-4 py-2 rounded-r-md hover:bg-pink-600 transition-colors flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="hidden sm:inline">Copiado!</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Copiar</span>
                  📋
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800">
          <p className="font-medium mb-2">📱 Como pagar:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Abra seu app do banco ou carteira digital</li>
            <li>Escolha a opção PIX</li>
            <li>Escaneie o QR Code ou cole o código acima</li>
            <li>Confirme o pagamento</li>
            <li>Aguarde a confirmação automática</li>
          </ol>
        </div>

        {/* Dica */}
        <div className="mt-4 p-3 bg-yellow-50 rounded-md">
          <p className="text-xs text-yellow-800">
            💡 <strong>Dica:</strong> O pagamento é processado instantaneamente.
            Mantenha esta tela aberta para ser redirecionado automaticamente
            após a confirmação.
          </p>
        </div>

        {/* Aviso sobre email de backup */}
        <div className="mt-2 p-3 bg-green-50 rounded-md">
          <p className="text-xs text-green-800">
            📧 <strong>Tranquilo:</strong> Após o pagamento, você receberá um
            email com o link de registro. Mesmo se fechar esta página, poderá
            completar o cadastro pelo link.
          </p>
        </div>
      </div>
    </>
  )
}
