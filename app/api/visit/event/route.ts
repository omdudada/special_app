import { admin } from '@/lib/supabaseAdmin';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req: Request) {
  const { id, type } = await req.json().catch(() => ({}));
  if (typeof id !== 'string' || !UUID.test(id)) return Response.json({ error: 'Invalid' }, { status: 400 });
  const now = new Date().toISOString();
  if (type === 'STARTED') await admin.from('visits').update({ audio_started_at: now }).eq('id', id).is('audio_started_at', null);
  else if (type === 'COMPLETED') await admin.from('visits').update({ audio_completed_at: now }).eq('id', id).is('audio_completed_at', null);
  else if (type === 'REPLAYED') {
    const { data } = await admin.from('visits').select('replay_count').eq('id', id).single();
    if (data) await admin.from('visits').update({ replay_count: data.replay_count + 1 }).eq('id', id);
  } else return Response.json({ error: 'Invalid' }, { status: 400 });
  return Response.json({ ok: true });
}
