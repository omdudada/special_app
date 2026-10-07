import { admin } from '@/lib/supabaseAdmin';
// Visitor typed their name. Stores only the name and the time.
export async function POST(req: Request) {
  const { name } = await req.json().catch(() => ({}));
  const n = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  if (!n || n.length > 60) return Response.json({ error: 'Invalid name' }, { status: 400 });
  const { data, error } = await admin.from('visits').insert({ name: n }).select('id').single();
  if (error || !data) return Response.json({ error: 'Could not save' }, { status: 500 });
  return Response.json({ id: data.id });
}
