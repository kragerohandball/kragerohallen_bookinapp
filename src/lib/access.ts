type AccessUser = { role: string; bookingAccess: boolean; kamperAccess: boolean }

export function hasBookingAccess(user: AccessUser) {
  return user.role === 'ADMIN' || user.bookingAccess
}

export function hasKamperAccess(user: AccessUser) {
  return user.role === 'ADMIN' || user.kamperAccess
}
