'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { TIME_SLOTS, formatTime } from '@/lib/utils'

type Room = { id: string; name: string; capacity: number; description: string }
type Booking = {
  id: string
  startTime: string
  endTime: string
  notes?: string
  isBlocked: boolean
  user?: { name: string; group: string }
  room?: { name: string }
}

const ROOMS: Room[] = [
  { id: 'room-kafeen', name: 'Kaféen', capacity: 50, description: 'Plass til 50 personer • Stor TV' },
  { id: 'room-trykkerommet', name: 'Trykkerommet', capacity: 8, description: 'Plass til 8 personer' },
]

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function maxDateStr() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

export default function BookingPage() {
  const { data: session } = useSession()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedStart, setSelectedStart] = useState<number | null>(null)
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [myBookings, setMyBookings] = useState<Booking[]>([])

  const fetchBookings = useCallback(async () => {
    if (!selectedRoom) return
    setLoadingSlots(true)
    const res = await fetch(`/api/bookings?roomId=${selectedRoom.id}&date=${selectedDate}`)
    const data = await res.json()
    setBookings(res.ok ? data : [])
    setLoadingSlots(false)
  }, [selectedRoom, selectedDate])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  useEffect(() => {
    fetch('/api/my-bookings')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setMyBookings(d))
  }, [submitting])

  function getSlotStatus(hour: number): 'available' | 'booked' | 'blocked' | 'past' | 'selected' {
    const now = new Date()
    const slotDate = new Date(`${selectedDate}T${String(hour).padStart(2, '0')}:00:00`)
    if (slotDate < now) return 'past'

    const booking = bookings.find(b => {
      const s = new Date(b.startTime).getHours()
      const e = new Date(b.endTime).getHours()
      return hour >= s && hour < e
    })
    if (booking?.isBlocked) return 'blocked'
    if (booking) return 'booked'

    if (selectedStart !== null && selectedEnd !== null) {
      if (hour >= selectedStart && hour < selectedEnd) return 'selected'
    } else if (selectedStart !== null && hour === selectedStart) {
      return 'selected'
    }
    return 'available'
  }

  function handleSlotClick(hour: number) {
    const status = getSlotStatus(hour)
    if (status === 'booked' || status === 'blocked' || status === 'past') return

    if (selectedStart === null) {
      setSelectedStart(hour)
      setSelectedEnd(null)
    } else if (selectedEnd === null) {
      if (hour <= selectedStart) {
        setSelectedStart(hour)
      } else {
        // check no booked slot in range
        let conflict = false
        for (let h = selectedStart; h < hour; h++) {
          const s = getSlotStatus(h)
          if (s === 'booked' || s === 'blocked') { conflict = true; break }
        }
        if (conflict) {
          setSelectedStart(hour)
        } else {
          setSelectedEnd(hour + 1 > 22 ? 22 : hour + 1)
          // show end picker by setting end to next hour
          setSelectedEnd(hour + 1)
        }
      }
    } else {
      setSelectedStart(hour)
      setSelectedEnd(null)
    }
  }

  function handleEndChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedEnd(Number(e.target.value))
  }

  async function handleBook() {
    if (!selectedRoom || selectedStart === null || selectedEnd === null) return
    setSubmitting(true)
    setMessage(null)

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: selectedRoom.id,
        date: selectedDate,
        startHour: selectedStart,
        endHour: selectedEnd,
        notes,
      }),
    })

    const data = await res.json()
    if (res.ok) {
      setMessage({ type: 'success', text: 'Booking bekreftet! Bekreftelse sendt på e-post.' })
      setSelectedStart(null)
      setSelectedEnd(null)
      setNotes('')
      fetchBookings()
    } else {
      setMessage({ type: 'error', text: data.error || 'Noe gikk galt' })
    }
    setSubmitting(false)
  }

  async function cancelMyBooking(id: string) {
    if (!confirm('Vil du kansellere denne bookingen?')) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    setMyBookings(mb => mb.filter(b => b.id !== id))
    fetchBookings()
  }

  const slotColors: Record<string, string> = {
    available: 'bg-green-100 hover:bg-green-200 text-green-800 cursor-pointer border-green-200',
    booked: 'bg-red-100 text-red-700 cursor-not-allowed border-red-200',
    blocked: 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300',
    past: 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200',
    selected: 'bg-blue-500 text-white cursor-pointer border-blue-600',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="font-bold text-gray-900 text-lg">Kragerøhallen Booking</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">{session?.user?.name}</span>
            <Link href="/change-password" className="text-sm text-gray-500 hover:text-gray-800">
              Bytt passord
            </Link>
            {session?.user?.role === 'ADMIN' && (
              <Link href="/admin" className="text-sm text-blue-600 hover:underline font-medium">
                Admin
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Logg ut
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Room selection */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Velg rom</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROOMS.map(room => (
              <button
                key={room.id}
                onClick={() => { setSelectedRoom(room); setSelectedStart(null); setSelectedEnd(null) }}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selectedRoom?.id === room.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">{room.name}</div>
                <div className="text-sm text-gray-500 mt-0.5">{room.description}</div>
              </button>
            ))}
          </div>
        </section>

        {selectedRoom && (
          <>
            {/* Date selection */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Velg dato</h2>
              <input
                type="date"
                value={selectedDate}
                min={todayStr()}
                max={maxDateStr()}
                onChange={e => { setSelectedDate(e.target.value); setSelectedStart(null); setSelectedEnd(null) }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </section>

            {/* Time slots */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Ledige tider — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>

              {loadingSlots ? (
                <div className="text-gray-400 text-sm py-4">Laster...</div>
              ) : (
                <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
                  {TIME_SLOTS.map(hour => {
                    const status = getSlotStatus(hour)
                    const booking = bookings.find(b => {
                      const s = new Date(b.startTime).getHours()
                      const e = new Date(b.endTime).getHours()
                      return hour >= s && hour < e
                    })
                    return (
                      <div
                        key={hour}
                        onClick={() => handleSlotClick(hour)}
                        className={`rounded-lg border text-center py-2 text-xs font-medium transition-all ${slotColors[status]}`}
                        title={
                          booking
                            ? booking.isBlocked
                              ? 'Blokkert'
                              : `${booking.user?.name} – ${booking.user?.group}`
                            : status === 'past'
                            ? 'Passert'
                            : 'Ledig'
                        }
                      >
                        {formatTime(hour)}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 inline-block"></span>Ledig</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block"></span>Valgt</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 inline-block"></span>Opptatt</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300 inline-block"></span>Blokkert</span>
              </div>
            </section>

            {/* Booking form */}
            {selectedStart !== null && (
              <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="font-semibold text-gray-800">Fullfør booking</h2>

                <div className="flex gap-4 flex-wrap">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Starttid</label>
                    <div className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-sm">
                      {formatTime(selectedStart)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sluttid</label>
                    <select
                      value={selectedEnd ?? ''}
                      onChange={handleEndChange}
                      className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Velg sluttid</option>
                      {Array.from({ length: 22 - selectedStart }, (_, i) => selectedStart + i + 1).map(h => {
                        const conflict = Array.from({ length: h - selectedStart }, (_, i) => selectedStart + i).some(hour => {
                          const s = getSlotStatus(hour)
                          return s === 'booked' || s === 'blocked'
                        })
                        if (conflict && h > selectedStart + 1) return null
                        return (
                          <option key={h} value={h}>{formatTime(h)}</option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                {selectedEnd !== null && (
                  <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-800">
                    {selectedRoom.name} • {formatTime(selectedStart)}–{formatTime(selectedEnd)} •{' '}
                    {selectedEnd - selectedStart} time{selectedEnd - selectedStart > 1 ? 'r' : ''}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Merknad (valgfritt)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="F.eks. trening, møte, arrangement..."
                  />
                </div>

                {message && (
                  <div className={`text-sm px-4 py-3 rounded-lg ${
                    message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleBook}
                    disabled={submitting || selectedEnd === null}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors"
                  >
                    {submitting ? 'Booker...' : 'Bekreft booking'}
                  </button>
                  <button
                    onClick={() => { setSelectedStart(null); setSelectedEnd(null); setMessage(null) }}
                    className="text-gray-500 hover:text-gray-700 text-sm px-4 py-2"
                  >
                    Avbryt
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {/* My bookings */}
        {myBookings.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Mine kommende bookinger</h2>
            <div className="space-y-2">
              {myBookings.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{b.room?.name}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      {new Date(b.startTime).toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
                      {new Date(b.startTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}–
                      {new Date(b.endTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {b.notes && <span className="text-gray-400 text-xs ml-2">• {b.notes}</span>}
                  </div>
                  <button
                    onClick={() => cancelMyBooking(b.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium shrink-0"
                  >
                    Kanseller
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
