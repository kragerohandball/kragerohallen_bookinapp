# Kragerøhallen Booking – Oppsett

## Krav
- [Node.js](https://nodejs.org/) versjon 18 eller nyere

## Første gangs oppsett

```bash
# 1. Gå til mappen
cd "booking app"

# 2. Installer avhengigheter
npm install

# 3. Sett opp databasen
npm run db:push

# 4. Opprett admin-bruker og rom
npm run db:seed
# Output: Admin: admin@kragerophallen.no / Admin123!
# ⚠️ Bytt passord etter første innlogging!

# 5. Start appen
npm run dev
```

Åpne http://localhost:3000

## Konfigurere e-post (.env)

Rediger `.env`-filen med dine SMTP-innstillinger:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=din-epost@gmail.com
SMTP_PASS=ditt-app-passord     # Gmail: bruk "App-passord"
SMTP_FROM=Kragerøhallen Booking <din-epost@gmail.com>
ADMIN_EMAIL=din-admin-epost@gmail.com
```

### Gmail App-passord
1. Gå til Google-konto → Sikkerhet → 2-trinnsbekreftelse → App-passord
2. Velg "Annen" og gi det et navn
3. Kopier det genererte passordet inn i SMTP_PASS

## Legge ut link på nettside

Når appen er i produksjon (f.eks. på Vercel):
- Registreringsside: `https://din-domene.no/register`
- Innloggingsside: `https://din-domene.no/login`

## Admin-panel

Logg inn som admin og gå til `/admin`:
- **Godkjenning**: Godkjenn/avvis nye brukere (passord sendes automatisk)
- **Bookinger**: Se og kanseller alle bookinger
- **Ny booking**: Opprett booking på vegne av bruker
- **Blokker tid**: Blokker tidsrom som ikke kan bookes

## Deploye til Vercel (gratis)

1. Push koden til GitHub
2. Koble til [vercel.com](https://vercel.com)
3. Legg til miljøvariabler fra `.env`
4. Bytt `DATABASE_URL` til en Postgres-URL (f.eks. Supabase/Neon – gratis)
5. Oppdater Prisma-provider fra `sqlite` til `postgresql` i `prisma/schema.prisma`
