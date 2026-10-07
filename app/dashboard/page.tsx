'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseBrowser';
import { VOICES } from '@/lib/config';

const LABEL: Record<string, string> = { UNOPENED: 'Not opened yet', OPENED: 'Link opened', PLAYED: 'Audio started', COMPLETED: 'Audio completed' };
const fmt = (d: string | null) => d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : null;
const empty = { recipient_name: '', title: '', message_text: '', opening: '', closing: '', voice_id: VOICES[0].id, speed: 1 };

export default function Dashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]), [f, setF] = useState(empty), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [token, setToken] = useState('');
  const call = useCallback(async (url: string, init: RequestInit = {}, t = token) =>
    fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } }), [token]);
  const load = useCallback(async (t: string) => { const r = await call('/api/messages', {}, t); if (r.ok) setRows(await r.json()); }, [call]);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (!data.session) return router.replace('/login'); setToken(data.session.access_token); load(data.session.access_token); }); }, []); // eslint-disable-line

  async function create() {
    setBusy(true); setErr('');
    const r = await call('/api/messages', { method: 'POST', body: JSON.stringify(f) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error || 'Something went wrong');
    setF(empty); load(token); window.open(`/m/${j.public_id}?preview=1`, '_blank');
  }
  const link = (id: string) => `${location.origin}/m/${id}`;
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="wrap">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 400 }}>New message</h1>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}>Sign out</button>
      </div>
      <label>Title (only you see this)</label><input value={f.title} maxLength={120} onChange={set('title')} />
      <label>Recipient name</label><input value={f.recipient_name} maxLength={80} onChange={set('recipient_name')} />
      <label>Opening line (optional)</label><input value={f.opening} maxLength={300} onChange={set('opening')} />
      <label>Message (use [pause] for a short break)</label><textarea rows={6} value={f.message_text} maxLength={2500} onChange={set('message_text')} />
      <label>Closing line (optional)</label><input value={f.closing} maxLength={300} onChange={set('closing')} />
      <label>Voice</label><select value={f.voice_id} onChange={set('voice_id')}>{VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select>
      <label>Speed: {Number(f.speed).toFixed(2)}x</label><input type="range" min={0.7} max={1.2} step={0.05} value={f.speed} onChange={e => setF({ ...f, speed: Number(e.target.value) })} />
      <div style={{ marginTop: 22 }}><button className="main" disabled={busy || !f.title || !f.recipient_name || !f.message_text} onClick={create}>{busy ? 'Making your message…' : 'Generate and preview'}</button></div>
      {err && <p className="err">{err}</p>}

      <h2 style={{ marginTop: 44, fontFamily: 'Georgia,serif', fontWeight: 400 }}>My messages</h2>
      {rows.length === 0 && <p className="sub">Nothing yet. Make your first message above.</p>}
      {rows.map(m => (
        <div className="msg" key={m.id}>
          <h3>{m.title} <small>for {m.recipient_name}</small></h3>
          <p>{LABEL[m.status]}</p>
          <small>
            {m.opened_at && <>Opened {fmt(m.opened_at)}<br /></>}
            {m.audio_started_at && <>Audio started {fmt(m.audio_started_at)}<br /></>}
            {m.audio_completed_at && <>Audio completed {fmt(m.audio_completed_at)}<br /></>}
            {m.replay_count > 0 && <>Replayed {m.replay_count}×</>}
          </small>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="main" onClick={() => navigator.clipboard.writeText(link(m.public_id))}>Copy link</button>
            <button onClick={() => window.open(`/m/${m.public_id}?preview=1`, '_blank')}>Preview</button>
            <button onClick={async () => { if (confirm('Delete this message and its link?')) { await call(`/api/messages/${m.id}`, { method: 'DELETE' }); load(token); } }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
