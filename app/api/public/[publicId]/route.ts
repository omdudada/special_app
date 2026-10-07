import { admin } from '@/lib/supabaseAdmin';
// Returns ONLY what the recipient page needs. Never the message text or owner.
export async function GET(_: Request, { params }: { params: { publicId: string } }) {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(params.publicId)) return Response.json({ error: 'Not found' }, { status: 404 });
  const { data } = await admin.from('messages').select('recipient_name,audio_url,closing_line,character_id,theme,expires_at,active')
    .eq('public_id', params.publicId).single();
  if (!data || !data.active || (data.expires_at && new Date(data.expires_at) < new Date()))
    return Response.json({ error: 'Not found' }, { status: 404 });
  const { expires_at, active, ...pub } = data;
  return Response.json(pub, { headers: { 'Cache-Control': 'no-store' } });
}
