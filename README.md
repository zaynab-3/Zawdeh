# Zawdeh

Mobile-only Expo React Native app for rescuing messy recipe screenshots, captions, and notes into structured recipes.

## Local Setup

```powershell
npm install
npx expo start --clear
```

Copy `.env.example` to `.env` for local development and fill only client-safe values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://anmwqkmizidjblpijwao.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not put Google Client Secret, Gemini API key, Supabase service role key, or database passwords in the mobile app.

## Supabase

Local migrations and Edge Function stubs live in `supabase/`.

The migration has not been applied to the live project yet. Apply it only after Supabase CLI/MCP/database access is configured, or run the SQL manually in the Supabase Dashboard SQL Editor.

Required Auth redirect settings:

- Expo scheme: `zawdeh`
- Mobile callback: `zawdeh://auth/callback`
- Google OAuth redirect URI: `https://anmwqkmizidjblpijwao.supabase.co/auth/v1/callback`

## Checks

```powershell
npm run lint
npx tsc --noEmit
```
