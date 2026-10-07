import { createClient } from '@supabase/supabase-js';
// SERVER ONLY: uses the service-role key. Never import from a client component.
export const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
export async function getUser(req: Request) {
  const t = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!t) return null;
  const { data } = await admin.auth.getUser(t);
  return data.user ?? null;
}
