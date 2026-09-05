'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { TIME_SLOTS, formatTime } from '@/lib/utils'
import SiteHeader from '@/components/SiteHeader'
import { useSiteSettings } from '@/components/SiteSettingsContext'

type User = {
  id: string; name: string; email: string; phone: string
  group: string; role: string; status: string; createdAt: string
}
type Booking = {
  id: string; startTime: string; endTime: string; notes?: string; isBlocked: boolean
  room: { name: string }; user: { name: string; email: string; group: string }
}
type Tab = 'godkjenning' | 'bookinger' | 'ny-booking' | 'blokker' | 'legg-til' | 'importer' | 'innstillinger'
type CreatedUser = { name: string; email: string; group: string; password: string; error?: string }

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
  const { primaryColor } = useSiteSettings()
  const [tab, setTab] = useState<Tab>('godkjenning')
  const [users, setUsers] = useState<User[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [approvedUser, setApprovedUser] = useState<{ name: string; email: string; password: string } | null>(null)

  // Legg til bruker manuelt
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', group: '' })
  const [newUserSubmitting, setNewUserSubmitting] = useState(false)
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([])

  // Excel-import
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importSubmitting, setImportSubmitting] = useState(false)
  const [importResults, setImportResults] = useState<CreatedUser[]>([])

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
    if (tab === 'legg-til') { setCreatedUsers([]); setNewUser({ name: '', email: '', phone: '', group: '' }) }
    if (tab === 'importer') { setImportResults([]); setImportFile(null) }
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
      if (action === 'approve') {
        const found = users.find(u => u.id === userId)
        setApprovedUser({ name: found?.name ?? '', email: found?.email ?? '', password: data.password })
      } else {
        setMsg({ type: 'success', text: 'Bruker avvist.' })
      }
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

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setNewUserSubmitting(true)
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    const data = await res.json()
    if (res.ok) {
      setCreatedUsers(prev => [...prev, { name: data.name, email: data.email, group: newUser.group, password: data.password }])
      setNewUser({ name: '', email: '', phone: '', group: '' })
    } else {
      setMsg({ type: 'error', text: data.error })
      setTimeout(() => setMsg(null), 4000)
    }
    setNewUserSubmitting(false)
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!importFile) return
    setImportSubmitting(true)
    const form = new FormData()
    form.append('file', importFile)
    const res = await fetch('/api/admin/import-users', { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok) setImportResults(data.results)
    else { setMsg({ type: 'error', text: data.error }); setTimeout(() => setMsg(null), 4000) }
    setImportSubmitting(false)
  }

  const pendingUsers = users.filter(u => u.status === 'PENDING')
  const approvedUsers = users.filter(u => u.status === 'APPROVED' && u.role !== 'ADMIN')

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'godkjenning', label: 'Godkjenning', badge: pendingUsers.length },
    { key: 'bookinger', label: 'Bookinger' },
    { key: 'ny-booking', label: 'Ny booking' },
    { key: 'blokker', label: 'Blokker tid' },
    { key: 'legg-til', label: 'Legg til bruker' },
    { key: 'importer', label: 'Importer brukere' },
    { key: 'innstillinger', label: 'Innstillinger' },
  ]

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <SiteHeader backHref="/booking" backLabel="← Booking" title="Admin" />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#111] rounded-xl border border-gray-700 p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setMsg(null) }}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              style={tab === t.key ? { backgroundColor: primaryColor, color: 'black' } : { color: '#9ca3af' }}
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="text-xs rounded-full w-5 h-5 flex items-center justify-center"
                  style={tab === t.key ? { backgroundColor: 'black', color: primaryColor } : { backgroundColor: '#ef4444', color: 'white' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {msg && (
          <div className={`mb-4 text-sm px-4 py-3 rounded-lg border ${
            msg.type === 'success' ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-red-900/40 text-red-300 border-red-700'
          }`}>{msg.text}</div>
        )}

        {approvedUser && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="bg-[#2a2a2a] rounded-2xl border border-[#FFD400]/30 shadow-xl p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-semibold text-[#FFD400]">✅ Bruker godkjent</h3>
              <p className="text-sm text-gray-300">
                Send dette til <strong className="text-white">{approvedUser.name}</strong> manuelt (SMS, e-post, telefon):
              </p>
              <div className="bg-[#1a1a1a] rounded-xl border border-gray-600 p-4 space-y-2 text-sm">
                <div><span className="text-gray-500">E-post:</span> <strong className="text-white">{approvedUser.email}</strong></div>
                <div><span className="text-gray-500">Passord:</span>{' '}
                  <strong className="text-[#FFD400] text-base tracking-wide">{approvedUser.password}</strong>
                </div>
              </div>
              <p className="text-xs text-gray-500">Brukeren blir bedt om å bytte passord ved første innlogging.</p>
              <button
                onClick={() => setApprovedUser(null)}
                className="w-full bg-[#FFD400] hover:bg-[#e6be00] text-black font-bold py-2 rounded-lg text-sm"
              >
                Jeg har notert passordet
              </button>
            </div>
          </div>
        )}

        {/* Godkjenning */}
        {tab === 'godkjenning' && (
          <div className="space-y-6">
            {pendingUsers.length === 0 ? (
              <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-8 text-center text-gray-500">
                Ingen ventende søknader
              </div>
            ) : (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Ventende ({pendingUsers.length})
                </h3>
                <div className="space-y-2">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-white">{u.name}</div>
                        <div className="text-sm text-gray-400">{u.email} • {u.phone}</div>
                        <div className="text-sm text-gray-500">{u.group}</div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleUserAction(u.id, 'approve')}
                          disabled={loading}
                          className="bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          Godkjenn
                        </button>
                        <button
                          onClick={() => handleUserAction(u.id, 'reject')}
                          disabled={loading}
                          className="bg-red-800 hover:bg-red-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg disabled:opacity-50"
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
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Godkjente brukere ({approvedUsers.length})
                </h3>
                <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#111] border-b border-gray-700">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-400">Navn</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-400 hidden sm:table-cell">E-post</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-400 hidden md:table-cell">Gruppe</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {approvedUsers.map(u => (
                        <tr key={u.id}>
                          <td className="px-4 py-2 font-medium text-white">{u.name}</td>
                          <td className="px-4 py-2 text-gray-400 hidden sm:table-cell">{u.email}</td>
                          <td className="px-4 py-2 text-gray-500 hidden md:table-cell">{u.group}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-red-400 hover:text-red-300 text-xs">Slett</button>
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
              <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-8 text-center text-gray-500">
                Ingen kommende bookinger
              </div>
            ) : (
              <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#111] border-b border-gray-700">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-400">Rom</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-400">Tid</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-400 hidden sm:table-cell">Bruker</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-400 hidden md:table-cell">Gruppe</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {bookings.map(b => (
                      <tr key={b.id} className={b.isBlocked ? 'bg-[#111]' : ''}>
                        <td className="px-4 py-2 font-medium text-white">
                          {b.room.name}
                          {b.isBlocked && <span className="ml-2 text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">blokkert</span>}
                        </td>
                        <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                          {new Date(b.startTime).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}{' '}
                          {new Date(b.startTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}–
                          {new Date(b.endTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2 text-gray-400 hidden sm:table-cell">{b.user.name}</td>
                        <td className="px-4 py-2 text-gray-500 hidden md:table-cell">{b.user.group}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleCancelBooking(b.id)} className="text-red-400 hover:text-red-300 text-xs">Kanseller</button>
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
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-6 max-w-lg space-y-4">
            <h3 className="font-semibold text-white">Opprett booking på vegne av bruker</h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bruker</label>
              <select value={nbUserId} onChange={e => setNbUserId(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD400]">
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
              className="bg-[#FFD400] hover:bg-[#e6be00] disabled:bg-[#FFD400]/40 text-black font-bold text-sm px-5 py-2 rounded-lg"
            >
              {nbSubmitting ? 'Oppretter...' : 'Opprett booking'}
            </button>
          </div>
        )}

        {/* Legg til bruker manuelt */}
        {tab === 'legg-til' && (
          <div className="space-y-6 max-w-lg">
            <form onSubmit={handleCreateUser} className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-6 space-y-4">
              <h3 className="font-semibold text-white">Legg til bruker manuelt</h3>
              {(['name', 'email', 'phone', 'group'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {{ name: 'Fullt navn', email: 'E-post', phone: 'Telefon (valgfritt)', group: 'Gruppe / lag' }[field]}
                  </label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={newUser[field]}
                    onChange={e => setNewUser(p => ({ ...p, [field]: e.target.value }))}
                    required={field !== 'phone'}
                    className="w-full bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD400] placeholder-gray-600"
                  />
                </div>
              ))}
              <button type="submit" disabled={newUserSubmitting}
                className="bg-[#FFD400] hover:bg-[#e6be00] disabled:bg-[#FFD400]/40 text-black font-bold text-sm px-5 py-2 rounded-lg">
                {newUserSubmitting ? 'Oppretter...' : 'Opprett bruker'}
              </button>
            </form>

            {createdUsers.length > 0 && (
              <div className="bg-[#2a2a2a] rounded-xl border border-[#FFD400]/30 p-6 space-y-3">
                <h3 className="font-semibold text-[#FFD400]">✅ Opprettede brukere — noter passordene!</h3>
                <div className="space-y-3">
                  {createdUsers.map((u, i) => (
                    <div key={i} className="bg-[#1a1a1a] rounded-lg border border-gray-600 p-4 text-sm space-y-1">
                      <div><span className="text-gray-500">Navn:</span> <strong className="text-white">{u.name}</strong></div>
                      <div><span className="text-gray-500">E-post:</span> <span className="text-white">{u.email}</span></div>
                      <div><span className="text-gray-500">Passord:</span> <strong className="text-[#FFD400] text-base tracking-wide">{u.password}</strong></div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">Brukerne blir bedt om å bytte passord ved første innlogging.</p>
              </div>
            )}
          </div>
        )}

        {/* Importer brukere fra Excel */}
        {tab === 'importer' && (
          <div className="space-y-6 max-w-2xl">
            <form onSubmit={handleImport} className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-6 space-y-4">
              <h3 className="font-semibold text-white">Importer brukere fra Excel</h3>
              <div className="bg-[#1a1a1a] rounded-lg border border-gray-700 p-4 text-sm text-gray-400 space-y-1">
                <p className="text-gray-300 font-medium">Excel-filen må ha disse kolonnene:</p>
                <p><span className="text-white">Navn</span> · <span className="text-white">E-post</span> · <span className="text-white">Telefon</span> (valgfritt) · <span className="text-white">Gruppe</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Velg Excel-fil (.xlsx)</label>
                <input
                  type="file" accept=".xlsx,.xls"
                  onChange={e => setImportFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#FFD400] file:text-black hover:file:bg-[#e6be00] cursor-pointer"
                />
              </div>
              <button type="submit" disabled={importSubmitting || !importFile}
                className="bg-[#FFD400] hover:bg-[#e6be00] disabled:bg-[#FFD400]/40 text-black font-bold text-sm px-5 py-2 rounded-lg">
                {importSubmitting ? 'Importerer...' : 'Importer'}
              </button>
            </form>

            {importResults.length > 0 && (
              <div className="bg-[#2a2a2a] rounded-xl border border-[#FFD400]/30 p-6 space-y-3">
                <h3 className="font-semibold text-[#FFD400]">Importresultat — noter passordene!</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#111] border-b border-gray-700">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-400">Navn</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-400">E-post</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-400">Gruppe</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-400">Passord</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {importResults.map((r, i) => (
                        <tr key={i} className={r.error ? 'bg-red-900/20' : ''}>
                          <td className="px-3 py-2 text-white">{r.name}</td>
                          <td className="px-3 py-2 text-gray-400">{r.email}</td>
                          <td className="px-3 py-2 text-gray-500">{r.group}</td>
                          <td className="px-3 py-2">
                            {r.error
                              ? <span className="text-red-400 text-xs">{r.error}</span>
                              : <strong className="text-[#FFD400] tracking-wide">{r.password}</strong>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500">Brukerne blir bedt om å bytte passord ved første innlogging.</p>
              </div>
            )}
          </div>
        )}

        {/* Innstillinger */}
        {tab === 'innstillinger' && <SiteSettingsTab primaryColor={primaryColor} />}

        {/* Blokker tid */}
        {tab === 'blokker' && (
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-6 max-w-lg space-y-4">
            <h3 className="font-semibold text-white">Blokker tidsrom</h3>
            <p className="text-sm text-gray-400">Blokkerte tider kan ikke bookes av brukere.</p>
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
              className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-900 text-white text-sm font-medium px-5 py-2 rounded-lg"
            >
              {blSubmitting ? 'Blokkerer...' : 'Blokker tid'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function SiteSettingsTab({ primaryColor }: { primaryColor: string }) {
  const [form, setForm] = useState({
    siteTitle: '',
    logoUrl: '',
    primaryColor: '',
    bgColor: '',
    navBgColor: '',
    footerText: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then(r => r.json())
      .then(d => {
        setForm({
          siteTitle: d.siteTitle ?? '',
          logoUrl: d.logoUrl ?? '',
          primaryColor: d.primaryColor ?? '',
          bgColor: d.bgColor ?? '',
          navBgColor: d.navBgColor ?? '',
          footerText: d.footerText ?? '',
        })
        setLoaded(true)
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      // Refresh the page to apply new settings
      window.location.reload()
    }
    setSaving(false)
  }

  if (!loaded) return <div className="text-gray-400 text-sm py-8">Laster innstillinger...</div>

  const inputCls = "w-full bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-5">
      <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-6 space-y-4">
        <h3 className="font-semibold text-white">Branding & design</h3>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Sidetittel</label>
          <input type="text" value={form.siteTitle} onChange={e => setForm(p => ({ ...p, siteTitle: e.target.value }))} className={inputCls} placeholder="Kragerøhallen Booking" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Logo-URL</label>
          <input type="text" value={form.logoUrl} onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))} className={inputCls} placeholder="/kif-logo.png" />
          <p className="text-xs text-gray-500 mt-1">Sti til bilde i /public-mappen, f.eks. /logo.png — eller full URL</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Footertekst</label>
          <input type="text" value={form.footerText} onChange={e => setForm(p => ({ ...p, footerText: e.target.value }))} className={inputCls} placeholder="Kragerø IF Håndball · Frydensborgveien 13..." />
        </div>
      </div>

      <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-6 space-y-4">
        <h3 className="font-semibold text-white">Farger</h3>

        {([
          ['primaryColor', 'Primærfarge (knapper, aksentfarger)'],
          ['bgColor', 'Bakgrunnsfarge (sidebakgrunn)'],
          ['navBgColor', 'Navigasjonsfarge (toppbar)'],
        ] as [keyof typeof form, string][]).map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form[key] || '#FFD400'}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border border-gray-600 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                className="flex-1 bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
                placeholder="#FFD400"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="text-black font-bold px-6 py-2 rounded-lg text-sm disabled:opacity-40"
          style={{ backgroundColor: primaryColor }}
        >
          {saving ? 'Lagrer...' : 'Lagre innstillinger'}
        </button>
        {saved && <span className="text-green-400 text-sm">✓ Lagret! Siden laster på nytt...</span>}
      </div>
    </form>
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

  const inputCls = "w-full bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD400] placeholder-gray-600"
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Rom</label>
        <select value={room} onChange={e => setRoom(e.target.value)} className={inputCls}>
          {ROOMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Dato</label>
        <input type="date" value={date} min={todayStr()} max={maxDateStr()} onChange={e => setDate(e.target.value)} className={inputCls} />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">Starttid</label>
          <select value={start} onChange={e => setStart(Number(e.target.value))} className={inputCls}>
            {TIME_SLOTS.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">Sluttid</label>
          <select value={end} onChange={e => setEnd(Number(e.target.value))} className={inputCls}>
            {Array.from({ length: 22 - start }, (_, i) => start + i + 1).map(h => (
              <option key={h} value={h}>{formatTime(h)}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Merknad (valgfritt)</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputCls}
          placeholder="F.eks. vedlikehold, arrangement..." />
      </div>
    </>
  )
}
