'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseBrowser';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [err, setErr] = useState(''), [mode, setMode] = useState<'in' | 'up'>('in');
  async function go() {
    setErr('');
    const { error } = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    if (error) return setErr(error.message);
    if (mode === 'up') return setErr('Check your email to confirm, then sign in.');
    router.push('/dashboard');
  }
  return (
    <div className="wrap">
      <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 400 }}>{mode === 'in' ? 'Sign in' : 'Create your account'}</h1>
      <label htmlFor="e">Email</label><input id="e" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="p">Password</label><input id="p" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <div className="row" style={{ marginTop: 22 }}>
        <button className="main" onClick={go}>{mode === 'in' ? 'Sign in' : 'Sign up'}</button>
        <button onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'Create account' : 'I have an account'}</button>
      </div>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
