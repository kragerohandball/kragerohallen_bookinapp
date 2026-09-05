'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { TIME_SLOTS, formatTime } from '@/lib/utils'
import SiteHeader from '@/components/SiteHeader'
import { useSiteSettings } from '@/components/SiteSettingsContext'

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
  const { primaryColor, bgColor, navBgColor, footerText } = useSiteSettings()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedStart, setSelectedStart] = useState<number | null>(null)
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [slotInfo, setSlotInfo] = useState<Booking | null>(null)
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
    if (status === 'booked' || status === 'blocked') {
      const booking = bookings.find(b => {
        const s = new Date(b.startTime).getHours()
        const e = new Date(b.endTime).getHours()
        return hour >= s && hour < e
      })
      if (booking) setSlotInfo(booking)
      return
    }
    if (status === 'past') return

    setSlotInfo(null)
    setMessage(null)
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
    if (!notes.trim()) { setMessage({ type: 'error', text: 'Du må fylle inn hvem som skal bruke rommet.' }); return }
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
      setSelectedStart(null)
      setSelectedEnd(null)
      setNotes('')
      fetchBookings()
      setMessage({ type: 'success', text: 'Booking bekreftet!' })
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
    available: 'bg-green-100 hover:bg-green-200 text-green-800 cursor-pointer border-green-300',
    booked: 'bg-red-100 text-red-700 cursor-not-allowed border-red-300',
    blocked: 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300',
    past: 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200',
    selected: 'text-black cursor-pointer font-bold',
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Room selection */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Velg rom</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROOMS.map(room => {
              const isSelected = selectedRoom?.id === room.id
              return (
                <button
                  key={room.id}
                  onClick={() => { setSelectedRoom(room); setSelectedStart(null); setSelectedEnd(null); setMessage(null); setSlotInfo(null) }}
                  className="text-left p-4 rounded-xl border-2 transition-all bg-[#2a2a2a]"
                  style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}18` } : { borderColor: '#374151' }}
                >
                  <div className="font-semibold" style={isSelected ? { color: primaryColor } : { color: 'white' }}>{room.name}</div>
                  <div className="text-sm text-gray-400 mt-0.5">{room.description}</div>
                </button>
              )
            })}
          </div>
        </section>

        {selectedRoom && (
          <>
            {/* Date selection */}
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Velg dato</h2>
              <input
                type="date"
                value={selectedDate}
                min={todayStr()}
                max={maxDateStr()}
                onChange={e => { setSelectedDate(e.target.value); setSelectedStart(null); setSelectedEnd(null); setMessage(null); setSlotInfo(null) }}
                className="bg-[#2a2a2a] border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
            </section>

            {/* Time slots */}
            <section className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
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
                    const isSelected = status === 'selected'
                    return (
                      <div
                        key={hour}
                        onClick={() => handleSlotClick(hour)}
                        className={`rounded-lg border text-center py-2 text-xs font-medium transition-all ${slotColors[status]}`}
                        style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
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
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 border border-green-300 inline-block"></span>Ledig</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: primaryColor }}></span>Valgt</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block"></span>Opptatt</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 inline-block"></span>Blokkert</span>
              </div>
            </section>

            {/* Slot info popup */}
            {slotInfo && (
              <div className="bg-[#2a2a2a] rounded-xl border border-gray-600 p-4 flex items-start justify-between gap-4">
                <div className="space-y-1 text-sm">
                  {slotInfo.isBlocked ? (
                    <p className="font-semibold text-gray-300">Blokkert tid</p>
                  ) : (
                    <>
                      <p className="font-semibold text-white">{slotInfo.user?.name}</p>
                      <p className="text-gray-400">{slotInfo.user?.group}</p>
                    </>
                  )}
                  <p className="text-gray-500">
                    {new Date(slotInfo.startTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}–
                    {new Date(slotInfo.endTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {slotInfo.notes && <p className="text-gray-400 italic">"{slotInfo.notes}"</p>}
                </div>
                <button onClick={() => setSlotInfo(null)} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
              </div>
            )}

            {/* Booking form */}
            {selectedStart !== null && (
              <section className="bg-[#2a2a2a] rounded-xl p-5 space-y-4" style={{ border: `1px solid ${primaryColor}30` }}>
                <h2 className="font-semibold text-white">Fullfør booking</h2>

                <div className="flex gap-4 flex-wrap">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Starttid</label>
                    <div className="border border-gray-600 rounded-lg px-3 py-2 bg-[#1a1a1a] text-white text-sm">
                      {formatTime(selectedStart)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Sluttid</label>
                    <select
                      value={selectedEnd ?? ''}
                      onChange={handleEndChange}
                      className="bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
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
                  <div className="rounded-lg px-4 py-2 text-sm" style={{ backgroundColor: `${primaryColor}18`, border: `1px solid ${primaryColor}40`, color: primaryColor }}>
                    {selectedRoom.name} • {formatTime(selectedStart)}–{formatTime(selectedEnd)} •{' '}
                    {selectedEnd - selectedStart} time{selectedEnd - selectedStart > 1 ? 'r' : ''}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Hvem skal bruke rommet?</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    required
                    className="w-full bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none resize-none placeholder-gray-600"
                    placeholder="F.eks. Kragerø IL Marked, J16 trening..."
                  />
                </div>

                {message?.type === 'error' && (
                  <div className="rounded-xl px-5 py-4 border bg-red-900/40 text-red-300 border-red-700">
                    <p className="font-bold text-base">{message.text}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleBook}
                    disabled={submitting || selectedEnd === null}
                    className="text-black font-bold px-6 py-2 rounded-lg text-sm transition-colors disabled:opacity-40"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {submitting ? 'Booker...' : 'Bekreft booking'}
                  </button>
                  <button
                    onClick={() => { setSelectedStart(null); setSelectedEnd(null); setMessage(null) }}
                    className="text-gray-400 hover:text-white text-sm px-4 py-2"
                  >
                    Avbryt
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {message?.type === 'success' && (
          <div className="rounded-2xl px-6 py-6 text-black text-center shadow-lg" style={{ backgroundColor: primaryColor }}>
            <div className="text-4xl mb-2">✅</div>
            <p className="font-bold text-xl">{message.text}</p>
          </div>
        )}

        {/* My bookings */}
        {myBookings.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Mine kommende bookinger</h2>
            <div className="space-y-2">
              {myBookings.map(b => (
                <div key={b.id} className="bg-[#2a2a2a] rounded-xl border border-gray-700 px-4 py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-white text-sm">{b.room?.name}</span>
                    <span className="text-gray-400 text-sm ml-2">
                      {new Date(b.startTime).toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
                      {new Date(b.startTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}–
                      {new Date(b.endTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {b.notes && <span className="text-gray-500 text-xs ml-2">• {b.notes}</span>}
                  </div>
                  <button
                    onClick={() => cancelMyBooking(b.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-medium shrink-0"
                  >
                    Kanseller
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      {footerText && (
        <footer className="border-t border-gray-800 py-4 px-4 mt-8">
          <p className="text-center text-xs text-gray-600 max-w-4xl mx-auto">{footerText}</p>
        </footer>
      )}
    </div>
  )
}
