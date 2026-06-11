'use client'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { TIME_SLOTS, formatTime } from '@/lib/utils'

type User = {
  id: string; name: string; email: string; phone: string
  group: string; role: string; status: string; createdAt: string
}
type Booking = {
  id: string; startTime: string; endTime: string; notes?: string; isBlocked: boolean
  room: { name: string }; user: { name: string; email: string; group: string }
}
type Tab = 'godkjenning' | 'bookinger' | 'ny-booking' | 'blokker'

const ROOMS = [
  { id: 'room-kafeen', name: 'Kaféen' },
  { id: 'room-trykkerommet', name: 'Trykkerommet' },
]

function todayStr() { return new Date().toISOString().split('T')[0] }
function maxDateStr() {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

export default function AdminPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('godkjenning')
  const [users, setUsers] = useState<User[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // New booking form
  const [nbRoom, setNbRoom] = useState(ROOMS[0].id)
  const [nbDate, setNbDate] = useState(todayStr())
  const [nbStart, setNbStart] = useState(8)
  const [nbEnd, setNbEnd] = useState(10)
  const [nbNotes, setNbNotes] = useState('')
  const [nbUserId, setNbUserId] = useState('')
  const [nbSubmitting, setNbSubmitting] = useState(false)

  // Block form
  const [blRoom, setBlRoom] = useState(ROOMS[0].id)
  const [blDate, setBlDate] = useState(todayStr())
  const [blStart, setBlStart] = useState(8)
  const [blEnd, setBlEnd] = useState(10)
  const [blNotes, setBlNotes] = useState('')
  const [blSubmitting, setBlSubmitting] = useState(false)

  useEffect(() => {
    if (tab === 'godkjenning' || tab === 'ny-booking') fetchUsers()
    if (tab === 'bookinger') fetchBookings()
  }, [tab])

  async function fetchUsers() {
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
  }

  async function fetchBookings() {
    const res = await fetch('/api/admin/bookings')
    if (res.ok) setBookings(await res.json())
  }

  async function handleUserAction(userId: string, action: 'approve' | 'reject') {
    setLoading(true)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'success', text: action === 'approve' ? 'Bruker godkjent – passord sendt på e-post.' : 'Bruker avvist.' })
      fetchUsers()
    } else {
      setMsg({ type: 'error', text: data.error })
    }
    setLoading(false)
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleDeleteUser(userId: string, name: string) {
    if (!confirm(`Slett ${name} og alle deres bookinger?`)) return
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    fetchUsers()
  }

  async function handleCancelBooking(id: string) {
    if (!confirm('Kanseller denne bookingen?')) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    fetchBookings()
  }

  async function handleNewBooking(isBlocked: boolean) {
    const setter = isBlocked ? setBlSubmitting : setNbSubmitting
    setter(true)
    setMsg(null)

    const body = isBlocked
      ? { roomId: blRoom, date: blDate, startHour: blStart, endHour: blEnd, notes: blNotes, isBlocked: true }
      : { roomId: nbRoom, date: nbDate, startHour: nbStart, endHour: nbEnd, notes: nbNotes, userId: nbUserId, isBlocked: false }

    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'success', text: isBlocked ? 'Tid blokkert.' : 'Booking opprettet.' })
    } else {
      setMsg({ type: 'error', text: data.error })
    }
    setter(false)
    setTimeout(() => setMsg(null), 4000)
  }

  const pendingUsers = users.filter(u => u.status === 'PENDING')
  const approvedUsers = users.filter(u => u.status === 'APPROVED' && u.role !== 'ADMIN')

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'godkjenning', label: 'Godkjenning', badge: pendingUsers.length },
    { key: 'bookinger', label: 'Bookinger' },
    { key: 'ny-booking', label: 'Ny booking' },
    { key: 'blokker', label: 'Blokker tid' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/booking" className="text-gray-400 hover:text-gray-600 text-sm">← Booking</Link>
            <span className="text-gray-300">|</span>
            <h1 className="font-bold text-gray-900">Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">{session?.user?.name}</span>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-gray-500 hover:text-gray-800">Logg ut</button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setMsg(null) }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center ${
                  tab === t.key ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                }`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {msg && (
          <div className={`mb-4 text-sm px-4 py-3 rounded-lg ${
            msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>{msg.text}</div>
        )}

        {/* Godkjenning */}
        {tab === 'godkjenning' && (
          <div className="space-y-6">
            {pendingUsers.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                Ingen ventende søknader
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Ventende ({pendingUsers.length})
                </h3>
                <div className="space-y-2">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900">{u.name}</div>
                        <div className="text-sm text-gray-500">{u.email} • {u.phone}</div>
                        <div className="text-sm text-gray-400">{u.group}</div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleUserAction(u.id, 'approve')}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          Godkjenn
                        </button>
                        <button
                          onClick={() => handleUserAction(u.id, 'reject')}
                          disabled={loading}
                          className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          Avvis
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approvedUsers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Godkjente brukere ({approvedUsers.length})
                </h3>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Navn</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 hidden sm:table-cell">E-post</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 hidden md:table-cell">Gruppe</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {approvedUsers.map(u => (
                        <tr key={u.id}>
                          <td className="px-4 py-2 font-medium text-gray-900">{u.name}</td>
                          <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">{u.email}</td>
                          <td className="px-4 py-2 text-gray-500 hidden md:table-cell">{u.group}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-red-400 hover:text-red-600 text-xs">Slett</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bookinger */}
        {tab === 'bookinger' && (
          <div>
            {bookings.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                Ingen kommende bookinger
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Rom</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Tid</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600 hidden sm:table-cell">Bruker</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600 hidden md:table-cell">Gruppe</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map(b => (
                      <tr key={b.id} className={b.isBlocked ? 'bg-gray-50' : ''}>
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {b.room.name}
                          {b.isBlocked && <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">blokkert</span>}
                        </td>
                        <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                          {new Date(b.startTime).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}{' '}
                          {new Date(b.startTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}–
                          {new Date(b.endTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">{b.user.name}</td>
                        <td className="px-4 py-2 text-gray-400 hidden md:table-cell">{b.user.group}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleCancelBooking(b.id)} className="text-red-400 hover:text-red-600 text-xs">Kanseller</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Ny booking */}
        {tab === 'ny-booking' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
            <h3 className="font-semibold text-gray-800">Opprett booking på vegne av bruker</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bruker</label>
              <select value={nbUserId} onChange={e => setNbUserId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Velg bruker</option>
                {approvedUsers.map(u => <option key={u.id} value={u.id}>{u.name} – {u.group}</option>)}
              </select>
            </div>
            <BookingFormFields
              room={nbRoom} setRoom={setNbRoom}
              date={nbDate} setDate={setNbDate}
              start={nbStart} setStart={setNbStart}
              end={nbEnd} setEnd={setNbEnd}
              notes={nbNotes} setNotes={setNbNotes}
            />
            <button
              onClick={() => handleNewBooking(false)}
              disabled={nbSubmitting || !nbUserId}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2 rounded-lg"
            >
              {nbSubmitting ? 'Oppretter...' : 'Opprett booking'}
            </button>
          </div>
        )}

        {/* Blokker tid */}
        {tab === 'blokker' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
            <h3 className="font-semibold text-gray-800">Blokker tidsrom</h3>
            <p className="text-sm text-gray-500">Blokkerte tider kan ikke bookes av brukere.</p>
            <BookingFormFields
              room={blRoom} setRoom={setBlRoom}
              date={blDate} setDate={setBlDate}
              start={blStart} setStart={setBlStart}
              end={blEnd} setEnd={setBlEnd}
              notes={blNotes} setNotes={setBlNotes}
            />
            <button
              onClick={() => handleNewBooking(true)}
              disabled={blSubmitting}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-medium px-5 py-2 rounded-lg"
            >
              {blSubmitting ? 'Blokkerer...' : 'Blokker tid'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function BookingFormFields({
  room, setRoom, date, setDate, start, setStart, end, setEnd, notes, setNotes,
}: {
  room: string; setRoom: (v: string) => void
  date: string; setDate: (v: string) => void
  start: number; setStart: (v: number) => void
  end: number; setEnd: (v: number) => void
  notes: string; setNotes: (v: string) => void
}) {
  const ROOMS = [{ id: 'room-kafeen', name: 'Kaféen' }, { id: 'room-trykkerommet', name: 'Trykkerommet' }]

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rom</label>
        <select value={room} onChange={e => setRoom(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {ROOMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dato</label>
        <input type="date" value={date} min={todayStr()} max={maxDateStr()} onChange={e => setDate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Starttid</label>
          <select value={start} onChange={e => setStart(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {TIME_SLOTS.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Sluttid</label>
          <select value={end} onChange={e => setEnd(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Array.from({ length: 22 - start }, (_, i) => start + i + 1).map(h => (
              <option key={h} value={h}>{formatTime(h)}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Merknad (valgfritt)</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="F.eks. vedlikehold, arrangement..." />
      </div>
    </>
  )
}

function todayStr() { return new Date().toISOString().split('T')[0] }
function maxDateStr() {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}
