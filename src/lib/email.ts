import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'Kragerøhallen Booking <onboarding@resend.dev>'
const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

export async function sendApprovalEmail(to: string, name: string, password: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Din bruker er godkjent – Kragerøhallen Booking',
    html: `
      <h2>Hei ${name}!</h2>
      <p>Din bruker er nå godkjent. Du kan logge inn med:</p>
      <ul>
        <li><strong>E-post:</strong> ${to}</li>
        <li><strong>Passord:</strong> ${password}</li>
      </ul>
      <p><a href="${BASE_URL}/login">Logg inn her</a></p>
      <p>Vi anbefaler at du bytter passord etter første innlogging.</p>
      <br><p>Hilsen Kragerøhallen</p>
    `,
  })
}

export async function sendRejectionEmail(to: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Din registrering – Kragerøhallen Booking',
    html: `
      <h2>Hei ${name}!</h2>
      <p>Vi beklager, men din forespørsel om tilgang er dessverre ikke godkjent.</p>
      <p>Ta kontakt med oss hvis du har spørsmål.</p>
      <br><p>Hilsen Kragerøhallen</p>
    `,
  })
}

export async function sendAdminNewUserEmail(userName: string, userEmail: string, group: string) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `Ny brukerregistrering: ${userName}`,
    html: `
      <h2>Ny bruker venter på godkjenning</h2>
      <ul>
        <li><strong>Navn:</strong> ${userName}</li>
        <li><strong>E-post:</strong> ${userEmail}</li>
        <li><strong>Gruppe/lag:</strong> ${group}</li>
      </ul>
      <p><a href="${BASE_URL}/admin">Gå til admin-panel</a></p>
    `,
  })
}

export async function sendBookingConfirmationEmail(
  to: string,
  name: string,
  roomName: string,
  startTime: Date,
  endTime: Date,
  notes?: string | null
) {
  const fmt = (d: Date) =>
    d.toLocaleString('nb-NO', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Bookingbekreftelse – ${roomName}`,
    html: `
      <h2>Hei ${name}!</h2>
      <p>Din booking er bekreftet:</p>
      <ul>
        <li><strong>Rom:</strong> ${roomName}</li>
        <li><strong>Fra:</strong> ${fmt(startTime)}</li>
        <li><strong>Til:</strong> ${fmt(endTime)}</li>
        ${notes ? `<li><strong>Merknad:</strong> ${notes}</li>` : ''}
      </ul>
      <br><p>Hilsen Kragerøhallen</p>
    `,
  })
}

export async function sendBookingCancellationEmail(
  to: string,
  name: string,
  roomName: string,
  startTime: Date
) {
  const fmt = (d: Date) =>
    d.toLocaleString('nb-NO', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Booking kansellert – ${roomName}`,
    html: `
      <h2>Hei ${name}!</h2>
      <p>Bookingen din har blitt kansellert:</p>
      <ul>
        <li><strong>Rom:</strong> ${roomName}</li>
        <li><strong>Tidspunkt:</strong> ${fmt(startTime)}</li>
      </ul>
      <br><p>Hilsen Kragerøhallen</p>
    `,
  })
}
