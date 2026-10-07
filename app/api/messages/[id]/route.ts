import { admin, getUser } from '@/lib/supabaseAdmin';
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await admin.from('messages').select('public_id').eq('id', params.id).eq('owner_id', user.id).single();
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 });
  await admin.storage.from('audio').remove([`${data.public_id}.mp3`]);
  await admin.from('messages').delete().eq('id', params.id).eq('owner_id', user.id);
  return Response.json({ ok: true });
}
