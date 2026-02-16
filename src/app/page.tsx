// src/app/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LandingHeader } from './components/LandingHeader'
import {
  Heart,
  Gift,
  Calendar,
  Share2,
  Lock,
  Smile,
  X,
  Check,
  Coins,
  Flame
} from 'lucide-react'
import { exampleCoupons } from '@/constants/cupoms'
import { plans } from '@/constants/plans'
import { PricingModal } from './components/PricingModal'

export default function HomePage() {
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-pink-50">
      <LandingHeader />

      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-pink-500 to-pink-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Compartilhe Momentos Especiais
          </h1>
          <p className="text-lg md:text-xl mb-4 max-w-3xl mx-auto">
            Cupons de Amor é a forma mais fácil de criar e compartilhar cupons
            personalizados com alguém especial. Surpreenda seu amor com gestos
            que importam.
          </p>
          <p className="text-md mb-8 opacity-90">
            Comece grátis com 2 tokens para criar cupons!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-pink-600 px-6 py-3 rounded-md font-bold hover:bg-pink-50 transition-colors text-lg"
            >
              Criar Conta Grátis
            </Link>
            <Link
              href="/login"
              className="bg-pink-700 text-white px-6 py-3 rounded-md font-bold hover:bg-pink-800 transition-colors text-lg"
            >
              Entrar
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-black text-3xl font-bold text-center mb-12">
            Como Funciona
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-black text-center">
              <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="text-pink-600 h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Crie Seus Cupons</h3>
              <p className="text-gray-600">
                Personalize cupons de amor com diferentes categorias e
                validades. Cada cupom custa 1 token.
              </p>
            </div>

            <div className="text-black text-center">
              <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="text-pink-600 h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Compartilhe com Amor</h3>
              <p className="text-gray-600">
                Envie o link exclusivo para seu amor. Ele(a) cria uma conta
                fácil e pode resgatar os cupons.
              </p>
            </div>

            <div className="text-black text-center">
              <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Flame className="text-pink-600 h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Ganhem Recompensas</h3>
              <p className="text-gray-600">
                Quando um cupom é cumprido, vocês dois ganham Lover Coins e
                Lover Strikes. Amor que vale pontos!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-pink-50">
        <div className="container mx-auto px-4">
          <h2 className="text-black text-3xl font-bold text-center mb-4">
            Planos
          </h2>
          <p className="text-gray-600 text-center mb-12">
            Comece grátis e compre mais tokens quando quiser
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {/* Plano Free */}
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
              <h3 className="text-black text-xl font-bold mb-1">Grátis</h3>
              <p className="text-3xl font-bold text-black mb-1">R$ 0</p>
              <p className="text-gray-500 text-sm mb-4">para sempre</p>
              <div className="space-y-2 text-sm text-gray-600">
                <p>2 tokens</p>
                <p>1 coleção</p>
                <p>Compartilhamento seguro</p>
              </div>
              <Link
                href="/register"
                className="mt-6 block text-center bg-gray-100 text-gray-700 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors"
              >
                Começar Grátis
              </Link>
            </div>

            {plans.map(plan => (
              <div
                key={plan.planType}
                className={`bg-white rounded-lg shadow-md p-6 ${
                  plan.popular
                    ? 'border-2 border-pink-500 relative'
                    : 'border-2 border-gray-200'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-xs px-3 py-1 rounded-full">
                    Popular
                  </span>
                )}
                <h3 className="text-black text-xl font-bold mb-1">
                  {plan.name}
                </h3>
                <p className="text-3xl font-bold text-black mb-1">
                  {plan.price}
                </p>
                <p className="text-gray-500 text-sm mb-4">{plan.period}</p>
                <div className="space-y-2 text-sm text-gray-600">
                  {plan.features.map((feature, idx) => (
                    <p key={idx} className="flex items-center">
                      <Check className="h-4 w-4 text-pink-500 mr-1 flex-shrink-0" />
                      {feature}
                    </p>
                  ))}
                </div>
                <button
                  onClick={() => setIsPricingModalOpen(true)}
                  className={`mt-6 w-full py-2 rounded-md font-medium transition-colors ${
                    plan.popular
                      ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white hover:from-pink-600 hover:to-red-600'
                      : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                  }`}
                >
                  Comprar Tokens
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-pink-500 to-red-500 text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Pronto para Surpreender?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Crie sua conta grátis e comece a surpreender aquela pessoa especial.
          </p>
          <Link
            href="/register"
            className="bg-white text-pink-600 px-8 py-3 rounded-md font-bold hover:bg-pink-50 transition-colors"
          >
            Criar Conta Grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center mb-4">
            <Heart className="mr-2" fill="white" />
            <h2 className="text-xl font-bold">Cupons de Amor</h2>
          </div>
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Cupons de Amor. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>

      {/* Modal de Planos */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />
    </div>
  )
}
