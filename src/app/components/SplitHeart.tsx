'use client'

import { useRef } from 'react'
import { Camera } from 'lucide-react'

type Props = {
  ownerName: string
  ownerPhoto: string | null
  partnerName: string | null
  partnerPhoto: string | null
  onPhotoUpload?: (file: File) => void
}

export default function SplitHeart({
  ownerName,
  ownerPhoto,
  partnerName,
  partnerPhoto,
  onPhotoUpload
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onPhotoUpload) onPhotoUpload(file)
  }

  return (
    <div className="flex flex-col items-center mb-6">
      <div className="relative" style={{ width: 200, height: 180 }}>
        <svg viewBox="0 0 200 180" width="200" height="180">
          <defs>
            <clipPath id="leftHeart">
              <path d="M100,170 C100,170 10,110 10,55 C10,25 35,5 65,5 C80,5 93,12 100,25 L100,170 Z" />
            </clipPath>
            <clipPath id="rightHeart">
              <path d="M100,170 C100,170 190,110 190,55 C190,25 165,5 135,5 C120,5 107,12 100,25 L100,170 Z" />
            </clipPath>
          </defs>

          {/* Lado esquerdo - Dono */}
          <g clipPath="url(#leftHeart)">
            {ownerPhoto ? (
              <image
                href={ownerPhoto}
                x="0"
                y="0"
                width="100"
                height="180"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <rect x="0" y="0" width="100" height="180" fill="#f9a8d4" />
            )}
          </g>

          {/* Lado direito - Parceiro */}
          <g clipPath="url(#rightHeart)">
            {partnerPhoto ? (
              <image
                href={partnerPhoto}
                x="100"
                y="0"
                width="100"
                height="180"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <rect x="100" y="0" width="100" height="180" fill="#fca5a5" />
            )}
          </g>

          {/* Borda */}
          <path
            d="M100,170 C100,170 10,110 10,55 C10,25 35,5 65,5 C80,5 93,12 100,25 C107,12 120,5 135,5 C165,5 190,25 190,55 C190,110 100,170 100,170 Z"
            fill="none"
            stroke="#e11d48"
            strokeWidth="3"
          />

          {/* Divisória */}
          <line
            x1="100"
            y1="25"
            x2="100"
            y2="170"
            stroke="#e11d48"
            strokeWidth="2"
            strokeDasharray="4,3"
          />
        </svg>

        {/* Botão câmera - dono */}
        {onPhotoUpload && (
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-2 left-6 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100"
            title="Alterar sua foto"
          >
            <Camera className="h-4 w-4 text-pink-500" />
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="flex gap-4 mt-2 text-sm">
        <span className="text-pink-600 font-medium">{ownerName}</span>
        <span className="text-red-400">&</span>
        <span className="text-red-500 font-medium">{partnerName || '???'}</span>
      </div>
    </div>
  )
}
