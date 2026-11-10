'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { formatTime } from '@/lib/utils'
import { ROOMS, RoomConfig, roomHours, isDayAllowed, allowedDaysText } from '@/lib/rooms'
import SiteHeader from '@/components/SiteHeader'
import { useSiteSettings } from '@/components/SiteSettingsContext'

type Room = RoomConfig
type Booking = {
  id: string
  startTime: string
  endTime: string
  notes?: string
  isBlocked: boolean
  externalId?: string | null
  user?: { name: string; group: string }
  room?: { name: string }
}

function slotRange(date: string, hour: number): [number, number] {
  const start = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime()
  return [start, start + 60 * 60 * 1000]
}

function bookingAt(bookings: Booking[], date: string, hour: number): Booking | undefined {
  const [s, e] = slotRange(date, hour)
  return bookings.find(b => new Date(b.startTime).getTime() < e && new Date(b.endTime).getTime() > s)
}

function isMatch(b: Booking) {
  return !!b.externalId?.startsWith('hbno:')
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DAY_LIST_DAYS = 56 // 8 uker frem

function upcomingDays(room: Room): string[] {
  const days: string[] = []
  const d = new Date()
  for (let i = 0; i < DAY_LIST_DAYS; i++) {
    const ds = localDateStr(d)
    if (isDayAllowed(room, ds)) days.push(ds)
    d.setDate(d.getDate() + 1)
  }
  return days
}

type DaySummary = { matches: string[]; bookedHours: number; free: boolean }

function summarizeDay(bookings: Booking[], date: string, room: Room): DaySummary {
  const dayStart = new Date(`${date}T00:00:00`).getTime()
  const dayEnd = dayStart + 24 * 3600 * 1000
  const onDay = bookings.filter(b => new Date(b.startTime).getTime() < dayEnd && new Date(b.endTime).getTime() > dayStart)
  const matches = onDay
    .filter(isMatch)
    .map(b => /Kamp (\d{1,2}:\d{2})/.exec(b.notes ?? '')?.[1] ?? new Date(b.startTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }))
  const bookedHours = roomHours(room).filter(h => onDay.some(b => !isMatch(b) && bookingAt([b], date, h))).length
  return { matches, bookedHours, free: onDay.length === 0 }
}

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
  const [rangeBookings, setRangeBookings] = useState<Booking[]>([])
  const [loadingRange, setLoadingRange] = useState(false)

  const dayList = selectedRoom?.allowedWeekdays ? upcomingDays(selectedRoom) : []

  const fetchRange = useCallback(async () => {
    if (!selectedRoom?.allowedWeekdays) { setRangeBookings([]); return }
    const days = upcomingDays(selectedRoom)
    if (days.length === 0) return
    setLoadingRange(true)
    const res = await fetch(`/api/bookings?roomId=${selectedRoom.id}&from=${days[0]}&to=${days[days.length - 1]}`)
    const data = await res.json()
    setRangeBookings(res.ok ? data : [])
    setLoadingRange(false)
  }, [selectedRoom])

  useEffect(() => { fetchRange() }, [fetchRange])

  function selectDate(date: string) {
    setSelectedDate(date); setSelectedStart(null); setSelectedEnd(null); setMessage(null); setSlotInfo(null)
  }

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
    const [slotStart] = slotRange(selectedDate, hour)
    if (slotStart < Date.now()) return 'past'

    const booking = bookingAt(bookings, selectedDate, hour)
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
      const booking = bookingAt(bookings, selectedDate, hour)
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
          setSelectedEnd(Math.min(hour + 1, selectedRoom!.closeHour))
        }
      }
    } else {
      setSelectedStart(hour)
      setSelectedEnd(null)
    }
  }

  function handleEndChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedEnd(e.target.value === '' ? null : Number(e.target.value))
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
      fetchRange()
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
    fetchRange()
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
                  onClick={() => { setSelectedRoom(room); if (room.allowedWeekdays) { const d = upcomingDays(room)[0]; if (d) setSelectedDate(d) } setSelectedStart(null); setSelectedEnd(null); setMessage(null); setSlotInfo(null) }}
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
            {/* Day list for halls */}
            {dayList.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Kommende dager — {selectedRoom.name}
                </h2>
                {loadingRange ? (
                  <div className="text-gray-400 text-sm py-2">Laster...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {dayList.map(d => {
                      const sum = summarizeDay(rangeBookings, d, selectedRoom)
                      const isSel = d === selectedDate
                      const dt = new Date(`${d}T12:00:00`)
                      return (
                        <button
                          key={d}
                          onClick={() => selectDate(d)}
                          className="text-left rounded-lg border-2 px-3 py-2 bg-[#2a2a2a] transition-all"
                          style={isSel ? { borderColor: primaryColor, backgroundColor: `${primaryColor}18` } : { borderColor: '#374151' }}
                        >
                          <div className="text-sm font-semibold capitalize" style={{ color: isSel ? primaryColor : 'white' }}>
                            {dt.toLocaleDateString('nb-NO', { weekday: 'long' })}
                          </div>
                          <div className="text-xs text-gray-400">{dt.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })}</div>
                          <div className="mt-1 space-y-0.5 text-xs">
                            {sum.free && <div className="text-green-400">● Ledig hele dagen</div>}
                            {sum.matches.length > 0 && (
                              <div className="text-gray-300">● Kamp kl. {sum.matches.join(', ')}</div>
                            )}
                            {sum.bookedHours > 0 && (
                              <div className="text-red-400">● Booket {sum.bookedHours} t</div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Date selection */}
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">{dayList.length > 0 ? 'Eller velg en annen dato' : 'Velg dato'}</h2>
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

              {!isDayAllowed(selectedRoom, selectedDate) ? (
                <div className="text-gray-500 text-sm py-4">
                  {selectedRoom.name} kan bare bookes på {allowedDaysText(selectedRoom)}. Velg en annen dato.
                </div>
              ) : loadingSlots ? (
                <div className="text-gray-400 text-sm py-4">Laster...</div>
              ) : (
                <div className={`grid gap-1.5 ${selectedRoom.closeHour - selectedRoom.openHour > 14 ? 'grid-cols-6 sm:grid-cols-12' : 'grid-cols-7 sm:grid-cols-14'}`}>
                  {roomHours(selectedRoom).map(hour => {
                    const status = getSlotStatus(hour)
                    const booking = bookingAt(bookings, selectedDate, hour)
                    const isSelected = status === 'selected'
                    return (
                      <div
                        key={hour}
                        onClick={() => handleSlotClick(hour)}
                        className={`rounded-lg border text-center py-2 text-xs font-medium transition-all ${slotColors[status]}`}
                        style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                        title={
                          booking
                            ? isMatch(booking)
                              ? booking.notes ?? 'Kamp'
                              : booking.isBlocked
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
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 inline-block"></span>{selectedRoom.banedagbokPlace ? 'Blokkert / kamp' : 'Blokkert'}</span>
              </div>
            </section>

            {/* Slot info popup */}
            {slotInfo && (
              <div className="bg-[#2a2a2a] rounded-xl border border-gray-600 p-4 flex items-start justify-between gap-4">
                <div className="space-y-1 text-sm">
                  {isMatch(slotInfo) ? (
                    <p className="font-semibold text-gray-300">Kamp (fra banedagboken)</p>
                  ) : slotInfo.isBlocked ? (
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
                      {Array.from({ length: selectedRoom.closeHour - selectedStart }, (_, i) => selectedStart + i + 1).map(h => {
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
