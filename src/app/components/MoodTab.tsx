'use client'

import { useEffect, useState } from 'react'
import { Coins, Heart, Clock } from 'lucide-react'

const MOODS = [
  { emoji: '😍', mood: 'Apaixonado(a)', color: 'bg-pink-100 border-pink-400' },
  { emoji: '🥰', mood: 'Carinhoso(a)', color: 'bg-rose-100 border-rose-400' },
  { emoji: '😊', mood: 'Feliz', color: 'bg-yellow-100 border-yellow-400' },
  { emoji: '🤗', mood: 'Grato(a)', color: 'bg-orange-100 border-orange-400' },
  { emoji: '😌', mood: 'Tranquilo(a)', color: 'bg-green-100 border-green-400' },
  { emoji: '🤔', mood: 'Pensativo(a)', color: 'bg-blue-100 border-blue-400' },
  { emoji: '😴', mood: 'Cansado(a)', color: 'bg-indigo-100 border-indigo-400' },
  { emoji: '😢', mood: 'Triste', color: 'bg-gray-100 border-gray-400' },
  { emoji: '😤', mood: 'Irritado(a)', color: 'bg-red-100 border-red-400' },
  { emoji: '🥺', mood: 'Carente', color: 'bg-purple-100 border-purple-400' },
  {
    emoji: '😏',
    mood: 'Safado(a)',
    color: 'bg-fuchsia-100 border-fuchsia-400'
  },
  { emoji: '🥳', mood: 'Animado(a)', color: 'bg-amber-100 border-amber-400' }
]

type MoodEntry = {
  id: string
  mood: string
  emoji: string
  note: string | null
  coinsEarned: boolean
  createdAt: string
}

type PartnerMood = {
  mood: string
  emoji: string
  note: string | null
  createdAt: string
}

type Props = {
  partnerName?: string | null
}

export default function MoodTab({ partnerName }: Props) {
  const [todayEntries, setTodayEntries] = useState<MoodEntry[]>([])
  const [canSubmit, setCanSubmit] = useState(true)
  const [remainingToday, setRemainingToday] = useState(2)
  const [partnerMood, setPartnerMood] = useState<PartnerMood | null>(null)
  const [selectedMood, setSelectedMood] = useState<(typeof MOODS)[0] | null>(
    null
  )
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const fetchMood = async () => {
    try {
      const res = await fetch('/api/mood')
      if (res.ok) {
        const data = await res.json()
        setTodayEntries(data.todayEntries)
        setCanSubmit(data.canSubmit)
        setRemainingToday(data.remainingToday)
        setPartnerMood(data.partnerMood)
      }
    } catch (err) {
      console.error('Erro ao buscar humor:', err)
    } finally {
      setFetchLoading(false)
    }
  }

  useEffect(() => {
    fetchMood()
  }, [])

  const handleSubmit = async () => {
    if (!selectedMood || !canSubmit) return

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedMood.mood,
          emoji: selectedMood.emoji,
          note: note.trim() || null
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error)
        return
      }

      setMessage(data.message)
      setSelectedMood(null)
      setNote('')
      setRemainingToday(data.remainingToday)
      setCanSubmit(data.remainingToday > 0)
      setTodayEntries(prev => [data.entry, ...prev])
    } catch (err) {
      setMessage('Erro ao registrar humor')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (fetchLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse flex flex-col items-center py-4">
          <div className="h-8 w-48 bg-pink-200 rounded mb-3"></div>
          <div className="h-4 w-32 bg-pink-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center">
          <Heart className="h-5 w-5 text-pink-500 mr-2" fill="#ec4899" />
          Como você está hoje?
        </h2>
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="h-4 w-4 mr-1" />
          <span>{remainingToday}/2 restantes</span>
        </div>
      </div>

      {/* Humor do parceiro */}
      {partnerMood && (
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-pink-700">
            <span className="font-medium">{partnerName || 'Seu amor'}</span>{' '}
            está se sentindo{' '}
            <span className="font-bold">
              {partnerMood.emoji} {partnerMood.mood}
            </span>
            {partnerMood.note && (
              <span className="italic text-pink-600">
                {' '}
                — "{partnerMood.note}"
              </span>
            )}
          </p>
        </div>
      )}

      {/* Grade de emojis */}
      {canSubmit ? (
        <>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {MOODS.map(m => (
              <button
                key={m.mood}
                onClick={() => setSelectedMood(m)}
                className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                  selectedMood?.mood === m.mood
                    ? `${m.color} border-2 scale-105 shadow-md`
                    : 'border-transparent hover:bg-gray-50 hover:scale-105'
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] text-gray-600 mt-1 leading-tight text-center">
                  {m.mood}
                </span>
              </button>
            ))}
          </div>

          {/* Nota opcional */}
          {selectedMood && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Quer deixar uma notinha? (opcional)"
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={100}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          )}

          {/* Botão enviar */}
          <button
            onClick={handleSubmit}
            disabled={!selectedMood || loading}
            className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-2.5 rounded-lg font-medium hover:from-pink-600 hover:to-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              'Registrando...'
            ) : (
              <>
                <Coins className="h-4 w-4 mr-2" />
                Registrar Humor (+1 Lover Coin)
              </>
            )}
          </button>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">
            Você já registrou seu humor 2 vezes hoje! Volte amanhã 💕
          </p>
        </div>
      )}

      {/* Mensagem de feedback */}
      {message && (
        <div
          className={`mt-3 text-sm text-center p-2 rounded-md ${
            message.includes('Erro') || message.includes('já registrou')
              ? 'bg-red-50 text-red-600'
              : 'bg-green-50 text-green-600'
          }`}
        >
          {message}
        </div>
      )}

      {/* Entradas de hoje */}
      {todayEntries.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="text-xs text-gray-400 mb-2">Hoje:</p>
          <div className="space-y-2">
            {todayEntries.map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-gray-50 rounded-md p-2"
              >
                <div className="flex items-center">
                  <span className="text-xl mr-2">{entry.emoji}</span>
                  <div>
                    <span className="text-sm font-medium">{entry.mood}</span>
                    {entry.note && (
                      <p className="text-xs text-gray-500 italic">
                        "{entry.note}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-xs text-gray-400">
                  {entry.coinsEarned && (
                    <Coins className="h-3 w-3 text-yellow-500 mr-1" />
                  )}
                  {formatTime(entry.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
