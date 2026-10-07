# Surprise message

A shareable link where an animated character speaks your message in an ElevenLabs voice. Recipients need no account. Creators sign in to make messages and see OPENED / PLAYED / COMPLETED.

## Needs outside accounts
- **Supabase** (free tier is fine): database, auth, audio storage.
- **ElevenLabs** (free tier has limited credits): text to speech. Key stays on the server.
- **Vercel** (free tier): hosting.

## Setup
1. `npm install`
2. Supabase: create a project, open **SQL Editor**, paste and run `supabase/schema.sql` (tables, RLS, `audio` bucket).
3. Supabase **Authentication > Providers**: keep Email on. For quick testing, turn off "Confirm email".
4. `cp .env.example .env.local` and fill in the four values (Supabase URL, anon key, service-role key, ElevenLabs key).
5. ElevenLabs: copy your voice ID (Voices > your voice > Copy voice ID) into `lib/config.ts` (`VOICES`).
6. `npm run dev`, open http://localhost:3000, create an account, make a message.

## Deploy (Vercel)
Push to GitHub, import the repo in Vercel, add the four env vars (Project Settings > Environment Variables), deploy. In Supabase **Authentication > URL Configuration**, set Site URL to your Vercel domain.

## How it fits together
- `app/api/messages`: create (validate, ElevenLabs, store mp3, save row, random 12-char link id), list with status, delete (owner only).
- `app/api/public/[publicId]`: returns only recipient name, audio URL and closing line. The message text is never sent to recipients.
- `app/api/events`: anonymous event log (no IP, no device info). Status shows only that the page opened and audio started/finished, not that anyone heard it.
- `lib/tts`: provider interface. To switch TTS, add a file implementing `TTSProvider` and change one line in `lib/tts/index.ts`.
- `components/Player.tsx`: the character. Audio loudness drives 5 mouth sprites from `public/character/`. Volume boost is `GAIN` at the top of the file.

## Notes
- Audio files are in a public bucket under unguessable names. Anyone with the exact audio URL can play it, so don't put secrets in messages.
- Add rate limiting (e.g. Vercel Firewall or Upstash) on `/api/events` and `/api/messages` before sharing widely.
- The character art comes from a YouTuber's video. Fine for a private gift; check the rights before wider use.
- Styling is plain CSS in `app/globals.css` rather than Tailwind, to keep the project small.
