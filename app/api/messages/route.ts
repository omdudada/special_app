import { randomBytes } from 'crypto';
import { admin, getUser } from '@/lib/supabaseAdmin';
import { tts } from '@/lib/tts';
import { VOICES, CHARACTERS } from '@/lib/config';

const str = (v: unknown, max: number, req = false) => {
  if (typeof v !== 'string') return req ? null : '';
  const t = v.trim();
  return (req && !t) || t.length > max ? null : t;
};

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const recipient = str(b.recipient_name, 80, true), title = str(b.title, 120, true);
  const body = str(b.message_text, 2500, true), opening = str(b.opening, 300), closing = str(b.closing, 300);
  const speed = Number(b.speed ?? 1);
  if (!recipient || !title || !body || opening === null || closing === null || !(speed >= 0.7 && speed <= 1.2)
    || !VOICES.some(v => v.id === b.voice_id) || !CHARACTERS.includes(b.character_id ?? 'default'))
    return Response.json({ error: 'Invalid input' }, { status: 400 });

  // "[pause]" in the text becomes a short break
  const script = [opening, body, closing].filter(Boolean).join(' <break time="0.7s" /> ').replace(/\[pause\]/gi, '<break time="0.6s" />');
  let audio: Buffer;
  try { audio = await tts.synthesize(script, { voiceId: b.voice_id, speed }); }
  catch (e) { console.error(e); return Response.json({ error: 'Voice generation failed' }, { status: 502 }); }

  const publicId = randomBytes(9).toString('base64url');
  const up = await admin.storage.from('audio').upload(`${publicId}.mp3`, audio, { contentType: 'audio/mpeg' });
  if (up.error) return Response.json({ error: 'Upload failed' }, { status: 500 });
  const audio_url = admin.storage.from('audio').getPublicUrl(`${publicId}.mp3`).data.publicUrl;

  const { error } = await admin.from('messages').insert({
    public_id: publicId, owner_id: user.id, recipient_name: recipient, title, message_text: body,
    closing_line: closing || null, audio_url, character_id: b.character_id ?? 'default',
    expires_at: new Date(Date.now() + 90 * 864e5).toISOString() });
  if (error) return Response.json({ error: 'Save failed' }, { status: 500 });
  return Response.json({ public_id: publicId });
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await admin.from('messages')
    .select('id,public_id,title,recipient_name,created_at,message_events(event_type,created_at)')
    .eq('owner_id', user.id).order('created_at', { ascending: false });
  if (error) return Response.json({ error: 'Load failed' }, { status: 500 });
  const rows = (data ?? []).map((m: any) => {
    const ev = (t: string) => m.message_events.filter((e: any) => e.event_type === t).map((e: any) => e.created_at).sort();
    const opened = ev('OPENED')[0] ?? null, started = ev('AUDIO_STARTED')[0] ?? null, done = ev('AUDIO_COMPLETED')[0] ?? null;
    return { id: m.id, public_id: m.public_id, title: m.title, recipient_name: m.recipient_name, created_at: m.created_at,
      opened_at: opened, audio_started_at: started, audio_completed_at: done, replay_count: ev('REPLAYED').length,
      status: done ? 'COMPLETED' : started ? 'PLAYED' : opened ? 'OPENED' : 'UNOPENED' };
  });
  return Response.json(rows);
}
