import { Calendar, Gift, Heart } from 'lucide-react'

export const getIcon = (type: any, p0: string) => {
  switch (type) {
    case 'heart':
      return <Heart className="text-red-500" />
    case 'gift':
      return <Gift className="text-purple-500" />
    case 'calendar':
      return <Calendar className="text-blue-500" />
    default:
      return <Gift className="text-gray-500" />
  }
}
