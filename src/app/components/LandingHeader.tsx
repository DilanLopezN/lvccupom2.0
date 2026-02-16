// src/app/components/LandingHeader.tsx
import { Heart } from 'lucide-react'
import Link from 'next/link'

export const LandingHeader = () => (
  <header className="bg-gradient-to-r from-pink-500 to-red-500 p-4 text-white shadow-md">
    <div className="container mx-auto flex items-center justify-between">
      <div className="flex items-center">
        <Heart className="mr-2" fill="white" />
        <h1 className="text-2xl font-bold">Cupons de Amor</h1>
      </div>
      <div className="flex space-x-4">
        <Link
          href="/login"
          className="bg-white text-pink-600 px-4 py-2 rounded-md font-medium hover:bg-pink-50 transition-colors"
        >
          Entrar
        </Link>
        <Link
          href="/register"
          className="bg-pink-600 text-white px-4 py-2 rounded-md font-medium hover:bg-pink-700 transition-colors"
        >
          Registrar
        </Link>
      </div>
    </div>
  </header>
)
