import { timingSafeEqual } from 'crypto';
import { admin } from '@/lib/supabaseAdmin';

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  const real = process.env.ADMIN_PASSWORD;
  if (!real || typeof password !== 'string' || !same(password, real)) {
    return Response.json({ error: 'Wrong password' }, { status: 401 });
  }

  try {
    const { data, error } = await admin.from('visits').select('*').order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase admin query error:', error);
      const msg = error.message || '';
      const isDnsOrNetwork = msg.includes('fetch failed') || msg.includes('ENOTFOUND') || (error as any).cause?.includes?.('ENOTFOUND');
      const isMissingTable = msg.includes('relation "public.visits" does not exist') || error.code === '42P01';

      if (isDnsOrNetwork) {
        return Response.json({
          error: 'Supabase project is unreachable. If you are on Supabase free tier, the project may be paused due to inactivity.',
          code: 'PROJECT_PAUSED_OR_UNREACHABLE',
          details: msg
        }, { status: 503 });
      }

      if (isMissingTable) {
        return Response.json({
          error: 'The table "public.visits" does not exist in Supabase yet. Please execute supabase/schema.sql in the Supabase SQL Editor.',
          code: 'TABLE_NOT_FOUND',
          details: msg
        }, { status: 500 });
      }

      return Response.json({
        error: msg || 'Database query failed',
        code: error.code || 'DB_ERROR',
        details: error
      }, { status: 500 });
    }

    // Check if there are any archived entries from previous version
    let legacyMessages: any[] = [];
    try {
      const { data: legacy } = await admin.from('messages').select('id, recipient_name, title, created_at').order('created_at', { ascending: false }).limit(25);
      if (legacy && legacy.length > 0) {
        legacyMessages = legacy;
      }
    } catch {
      // Legacy table might not exist; safe to ignore
    }

    return Response.json({
      visits: data ?? [],
      legacyMessages
    });
  } catch (err: any) {
    console.error('Admin API exception:', err);
    const msg = err?.message || String(err);
    const isDns = msg.includes('ENOTFOUND') || msg.includes('fetch failed');
    return Response.json({
      error: isDns
        ? 'Supabase project is unreachable. If you are on Supabase free tier, the project may be paused due to inactivity.'
        : 'Failed to connect to database',
      code: isDns ? 'PROJECT_PAUSED_OR_UNREACHABLE' : 'SERVER_ERROR',
      details: msg
    }, { status: 503 });
  }
}

