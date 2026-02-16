// src/app/components/CupomModal.tsx
import { Clock, X, Calendar } from 'lucide-react'
import { getIcon } from './GetIcon'

export const CouponModal = ({
  isVisible,
  coupon,
  onClose,
  onRedeem,
  message,
  extraContent
}: any) => {
  if (!isVisible || !coupon) return null

  const getButtonContent = () => {
    if (message) {
      return null
    }

    if (coupon.used) {
      return (
        <div className="bg-gray-100 text-gray-800 p-4 rounded-md text-center mb-4">
          Este cupom já foi resgatado
          {coupon.redeemedAt && (
            <div className="text-sm mt-1">
              Resgatado em:{' '}
              {new Date(coupon.redeemedAt).toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>
      )
    }

    if (coupon.status === 'not-started') {
      return (
        <div className="bg-blue-100 text-blue-800 p-4 rounded-md text-center mb-4">
          Este cupom estará disponível a partir de {coupon.validStart}
        </div>
      )
    }

    if (coupon.status === 'expired') {
      return (
        <div className="bg-red-100 text-red-800 p-4 rounded-md text-center mb-4">
          Este cupom expirou e não pode mais ser resgatado
        </div>
      )
    }

    return (
      <button
        onClick={onRedeem}
        className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-3 rounded-md font-medium hover:from-pink-600 hover:to-red-600 transition-colors"
      >
        Resgatar Cupom
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-red-500 p-4 flex justify-between items-center">
          <h3 className="text-white font-bold">{coupon.title}</h3>
          <button onClick={onClose} className="text-white">
            <X />
          </button>
        </div>
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className="bg-pink-100 p-4 rounded-full">
              {getIcon(coupon.icon, 'h-8 w-8 text-pink-500')}
            </div>
          </div>

          <p className="text-gray-700 text-center mb-4">{coupon.description}</p>

          <div className="flex justify-center space-x-4 mb-4 text-sm text-gray-500">
            {coupon.validStart && (
              <div className="flex items-center">
                <Calendar size={14} className="mr-1" />
                De: {coupon.validStart}
              </div>
            )}
            <div className="flex items-center">
              <Clock size={14} className="mr-1" />
              Até: {coupon.validUntil}
            </div>
          </div>

          {message && (
            <div
              className={`p-4 rounded-md text-center mb-4 ${
                message.includes('sucesso')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {message}
            </div>
          )}

          {getButtonContent()}

          {/* Extra content - usado para fulfillment */}
          {extraContent}
        </div>
      </div>
    </div>
  )
}
