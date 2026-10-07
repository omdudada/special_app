'use client';
import { useState } from 'react';

const fmt = (d: string | null) => d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : null;
const status = (v: any) => v.audio_completed_at ? 'Audio completed' : v.audio_started_at ? 'Audio started' : 'Page opened';

export default function Admin() {
  const [pw, setPw] = useState(''), [rows, setRows] = useState<any[] | null>(null), [err, setErr] = useState('');
  async function load() {
    setErr('');
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    if (!r.ok) return setErr('Wrong password');
    setRows(await r.json());
  }
  return (
    <div className="wrap">
      <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 400 }}>Who opened it</h1>
      {!rows ? (<>
        <label htmlFor="pw">Admin password</label>
        <input id="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
        <div style={{ marginTop: 18 }}><button className="main" onClick={load}>Open</button></div>
        {err && <p className="err">{err}</p>}
      </>) : (<>
        <div style={{ margin: '12px 0' }}><button onClick={load}>Refresh</button></div>
        {rows.length === 0 && <p className="sub">Nobody yet.</p>}
        {rows.map(v => (
          <div className="msg" key={v.id}>
            <h3>{v.name}</h3>
            <p>{status(v)}</p>
            <small>
              Opened {fmt(v.created_at)}<br />
              {v.audio_started_at && <>Audio started {fmt(v.audio_started_at)}<br /></>}
              {v.audio_completed_at && <>Audio completed {fmt(v.audio_completed_at)}<br /></>}
              {v.replay_count > 0 && <>Replayed {v.replay_count}×</>}
            </small>
          </div>
        ))}
      </>)}
    </div>
  );
}
