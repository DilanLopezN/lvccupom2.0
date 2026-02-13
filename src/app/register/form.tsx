// src/app/register/form.tsx
'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { RegisterInput } from '@/lib/validations'
import { Heart } from 'lucide-react'
import { PricingModal } from '../components/PricingModal'

export function RegisterForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<RegisterInput>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    paymentId: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const searchParams = useSearchParams()

  // Se veio com payment na URL, permite registro direto
  const hasPayment = !!searchParams.get('payment')

  useEffect(() => {
    const emailFromURL = searchParams.get('email')
    const paymentFromURL = searchParams.get('payment')

    setFormData(prev => ({
      ...prev,
      email: emailFromURL || '',
      paymentId: paymentFromURL || ''
    }))
  }, [searchParams])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // Se NÃO tem paymentId, abrir modal de compra
    if (!formData.paymentId) {
      setShowPricingModal(true)
      return
    }

    setLoading(true)

    try {
      if (formData.password !== formData.confirmPassword) {
        setError('As senhas não conferem')
        setLoading(false)
        return
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar usuário')
      }

      router.push('/login?registered=true')
    } catch (error: any) {
      setError(
        error.message || 'Ocorreu um erro ao registrar. Tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="text-black min-h-screen bg-pink-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="flex justify-center mb-6">
          <Heart className="h-12 w-12 text-pink-500" fill="#ec4899" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-6">Crie sua conta</h1>

        {!hasPayment && (
          <div className="bg-pink-50 border border-pink-200 text-pink-700 p-3 rounded-md mb-4 text-sm text-center">
            Para criar sua conta, escolha um plano primeiro!
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nome
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Senha
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
              minLength={6}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirmar Senha
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-2 rounded-md font-medium hover:from-pink-600 hover:to-red-600 transition-colors disabled:opacity-70"
          >
            {loading
              ? 'Processando...'
              : hasPayment
                ? 'Registrar'
                : 'Escolher Plano e Registrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-pink-600 hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>

      {/* Modal de Planos - abre quando tenta registrar sem pagamento */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />
    </div>
  )
}
