import { timingSafeEqual } from 'crypto';
import { admin } from '@/lib/supabaseAdmin';
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  const real = process.env.ADMIN_PASSWORD;
  if (!real || typeof password !== 'string' || !same(password, real)) return Response.json({ error: 'Wrong password' }, { status: 401 });
  const { data } = await admin.from('visits').select('*').order('created_at', { ascending: false });
  return Response.json(data ?? []);
}
