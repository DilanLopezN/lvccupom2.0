import { Check, Clock, Calendar } from 'lucide-react'
import { getIcon } from './GetIcon'

export type Coupon = {
  id: any
  icon: string
  category: string
  used: boolean
  title: string
  description: string
  validUntil: string
  validStart?: string | null
  redeemedAt?: string | null
  status?: 'available' | 'used' | 'not-started' | 'expired'
  isAvailable?: boolean
}

type CouponCardProps = {
  coupon: Coupon
  onClick: (coupon: Coupon) => void
}

export const CouponCard: React.FC<CouponCardProps> = ({ coupon, onClick }) => {
  const getStatusBadge = () => {
    if (coupon.used) {
      return (
        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded-full flex items-center">
          <Check size={12} className="mr-1" /> Resgatado
        </span>
      )
    }

    if (coupon.status === 'not-started') {
      return (
        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center">
          <Calendar size={12} className="mr-1" /> Aguardando
        </span>
      )
    }

    if (coupon.status === 'expired') {
      return (
        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full flex items-center">
          <Clock size={12} className="mr-1" /> Expirado
        </span>
      )
    }

    return null
  }

  const getOpacity = () => {
    if (coupon.used || coupon.status === 'expired') return 'opacity-70'
    if (coupon.status === 'not-started') return 'opacity-60'
    return ''
  }

  const getClickAction = () => {
    if (coupon.status === 'not-started') {
      return 'ver detalhes'
    }
    return coupon.used ? 'ver detalhes' : 'resgatar'
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-105 ${getOpacity()}`}
      onClick={() => onClick(coupon)}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            {getIcon(coupon.icon, 'h-5 w-5 text-pink-500')}
            <span className="ml-2 text-xs py-1 px-2 bg-pink-100 text-pink-800 rounded-full">
              {coupon.category}
            </span>
          </div>
          {getStatusBadge()}
        </div>
        <h3 className="text-lg font-bold mb-1">{coupon.title}</h3>
        <p className="text-gray-600 text-sm">{coupon.description}</p>

        <div className="mt-4 space-y-1">
          {coupon.validStart && (
            <div className="flex items-center text-xs text-gray-500">
              <Calendar size={12} className="mr-1" /> Válido a partir de:{' '}
              {coupon.validStart}
            </div>
          )}
          <div className="flex items-center text-xs text-gray-500">
            <Clock size={12} className="mr-1" /> Válido até: {coupon.validUntil}
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r from-pink-100 to-red-100 p-2 text-center">
        <span className="text-sm font-medium text-pink-700">
          Clique para {getClickAction()}
        </span>
      </div>
    </div>
  )
}
