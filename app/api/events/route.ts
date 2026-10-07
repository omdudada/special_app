import { admin } from '@/lib/supabaseAdmin';
const TYPES = ['OPENED', 'AUDIO_STARTED', 'AUDIO_COMPLETED', 'REPLAYED'];
// Anonymous: stores only message id, event type and time. No IP, UA or location.
export async function POST(req: Request) {
  const { publicId, type } = await req.json().catch(() => ({}));
  if (typeof publicId !== 'string' || !TYPES.includes(type)) return Response.json({ error: 'Invalid' }, { status: 400 });
  const { data } = await admin.from('messages').select('id').eq('public_id', publicId).eq('active', true).single();
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 });
  await admin.from('message_events').insert({ message_id: data.id, event_type: type });
  return Response.json({ ok: true });
}
