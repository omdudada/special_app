# Special app

Flow: **index** ("Someone made something for you") → **name window** → **character speaks your message** → closing screen.
No login or signup for visitors. Supabase is used only as a database to remember the names. You see them at `/admin`.

## Setup
1. `npm install`
2. Supabase: SQL Editor > run `supabase/schema.sql`. (Email auth can stay disabled; it isn't used.)
3. `cp .env.example .env.local` and fill in: Supabase URL, service-role key, and an `ADMIN_PASSWORD` you choose.
4. `npm run dev` → http://localhost:3000 (visitor page) and http://localhost:3000/admin (your list).

## Change the message
Replace `public/message.mp3` with a new ElevenLabs audio file (same file name). Edit the closing text in `lib/config.ts`.
Volume: change `GAIN` at the top of `components/Player.tsx`.

## Deploy (Vercel)
Push to GitHub, import in Vercel, add the three env vars, deploy.

## Notes
- Recorded: the name typed, when the page opened, when audio started/finished, and replay count. Nothing else. It can't prove someone heard it.
- Add rate limiting before sharing the link widely, since anyone can submit names.
- Character art is from a YouTuber's video. Fine for a private gift; check rights before wider use.
