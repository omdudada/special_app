'use client';
import { useEffect, useRef, useState } from 'react';
import { SPRITE, CLOSING_LINE } from '@/lib/config';

const SHAPES = ['closed', 'o', 'narrow', 'mid', 'wide'] as const;
const pct = (v: number, t: number) => `${(v / t) * 100}%`;
const GAIN = 2.4; // playback boost; the compressor stops clipping
const post = (url: string, body: object) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export default function Player() {
  const [screen, setScreen] = useState<'gate' | 'name' | 'stage' | 'end'>('gate');
  const [name, setName] = useState('');
  const audio = useRef<HTMLAudioElement>(null), fig = useRef<HTMLDivElement>(null), bob = useRef<HTMLDivElement>(null);
  const shapes = useRef<Record<string, HTMLImageElement | null>>({});
  const playing = useRef(false), ctxRef = useRef<AudioContext | null>(null), an = useRef<AnalyserNode | null>(null);
  const visit = useRef<Promise<string | null>>(Promise.resolve(null)), started = useRef(false);

  const track = (type: string) => { visit.current.then(id => { if (id) post('/api/visit/event', { id, type }).catch(() => {}); }); };

  // mouth loop: loudness + brightness of the audio pick the sprite
  useEffect(() => {
    let raf = 0, cur = 'closed', last = 0, env = 0, peak = 0.05;
    const set = (v: string, t: number) => { if (v === cur || t - last < 70) return; shapes.current[cur]?.classList.remove('on'); shapes.current[v]?.classList.add('on'); cur = v; last = t; };
    shapes.current.closed?.classList.add('on');
    const loop = (t: number) => {
      const a = an.current;
      if (playing.current && a) {
        const td = new Uint8Array(a.fftSize), fd = new Uint8Array(a.frequencyBinCount);
        a.getByteTimeDomainData(td); a.getByteFrequencyData(fd);
        let s = 0; for (const x of td) { const v = (x - 128) / 128; s += v * v; }
        const rms = Math.sqrt(s / td.length); env += (rms - env) * (rms > env ? 0.7 : 0.25); peak = Math.max(peak * 0.9985, env, 0.04);
        const n = env / peak; let num = 0, den = 0; for (let i = 2; i < 120; i++) { num += i * fd[i]; den += fd[i]; }
        const cen = den ? (num / den) * (a.context.sampleRate / a.fftSize) : 0;
        set(n < 0.14 ? 'closed' : cen < 650 && n < 0.62 ? 'o' : n < 0.32 ? 'narrow' : n < 0.62 ? 'mid' : 'wide', t);
        if (bob.current) bob.current.style.transform = `translateY(${-n * 4}px)`;
      } else { set('closed', t + 999); if (bob.current) bob.current.style.transform = ''; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    let bt: any; const blink = () => { fig.current?.classList.add('blink'); setTimeout(() => fig.current?.classList.remove('blink'), 130); bt = setTimeout(blink, 2400 + Math.random() * 3400); };
    bt = setTimeout(blink, 2200);
    return () => { cancelAnimationFrame(raf); clearTimeout(bt); };
  }, []);

  function setupAudio() {
    if (ctxRef.current || !audio.current) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext, ctx = new AC();
    const src = ctx.createMediaElementSource(audio.current), a = ctx.createAnalyser(); a.fftSize = 1024; a.smoothingTimeConstant = 0.3;
    const g = ctx.createGain(); g.gain.value = GAIN;
    const c = ctx.createDynamicsCompressor(); c.threshold.value = -20; c.ratio.value = 6;
    src.connect(a); src.connect(g); g.connect(c); c.connect(ctx.destination);
    ctxRef.current = ctx; an.current = a;
  }
  // Must run straight from a tap so phones allow sound.
  function play() {
    setupAudio(); ctxRef.current?.resume();
    const el = audio.current!; el.currentTime = 0; el.play().catch(() => {});
    started.current = false; setScreen('stage');
  }
  function submitName() {
    const n = name.trim(); if (!n) return;
    visit.current = post('/api/visit', { name: n }).then(r => r.json()).then(j => j.id ?? null).catch(() => null);
    play();
  }
  function replay() { track('REPLAYED'); play(); }

  return (
    <div className="scene">
      <section className={`screen ${screen === 'gate' ? 'on' : ''}`}>
        <div className="pulse" aria-hidden />
        <h1 style={{ marginTop: 28 }}>Someone made something for you.</h1>
        <p className="sub">Sound on, please.</p>
        <button className="main" onClick={() => setScreen('name')}>Tap to open</button>
      </section>
      <section className={`screen ${screen === 'name' ? 'on' : ''}`}>
        <h1>What&apos;s your name?</h1>
        <input aria-label="Your name" value={name} maxLength={60} placeholder="Type your name" autoComplete="given-name"
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitName()}
          style={{ marginTop: 26, maxWidth: 300, textAlign: 'center', fontSize: 18 }} />
        <button className="main" disabled={!name.trim()} onClick={submitName}>Continue</button>
      </section>
      <section className={`screen stage ${screen === 'stage' ? 'on' : ''}`}>
        <div className="fig" ref={fig} role="img" aria-label="Animated character speaking to you">
          <div className="bob" ref={bob}>
            <img src="/character/base.png" alt="" style={{ inset: 0, width: '100%', height: '100%' }} />
            {SHAPES.map(k => <img key={k} ref={el => { shapes.current[k] = el; }} className="m" src={`/character/${k}.png`} alt=""
              style={{ left: pct(SPRITE.box[0], SPRITE.w), top: pct(SPRITE.box[1], SPRITE.h), width: pct(SPRITE.box[2] - SPRITE.box[0], SPRITE.w) }} />)}
            {SPRITE.eyes.map(([x0, x1]) => <div key={x0} className="eye" style={{ left: pct(x0, SPRITE.w), top: pct(SPRITE.eyeY, SPRITE.h), width: pct(x1 - x0, SPRITE.w), height: pct(SPRITE.eyeH, SPRITE.h) }} />)}
          </div>
        </div>
      </section>
      <section className={`screen ${screen === 'end' ? 'on' : ''}`}>
        <div className={`fin ${screen === 'end' ? 'on' : ''}`}>
          <h1>That was for you, {name.trim()}.</h1>
          {CLOSING_LINE && <p className="sub">{CLOSING_LINE}</p>}
          <button onClick={replay}>Play again</button>
        </div>
      </section>
      <p className="note">Your name and whether the message played are recorded so the sender knows it arrived.</p>
      <audio ref={audio} src="/message.mp3" preload="auto" playsInline
        onPlaying={() => { playing.current = true; if (!started.current) { started.current = true; track('STARTED'); } }}
        onPause={() => { playing.current = false; }}
        onEnded={() => { playing.current = false; track('COMPLETED'); setTimeout(() => setScreen('end'), 900); }} />
    </div>
  );
}
