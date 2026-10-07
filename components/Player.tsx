'use client';
import { useEffect, useRef, useState } from 'react';
import { SPRITE, CLOSING_LINE, AUDIO_START_DELAY_MS } from '@/lib/config';

const SHAPES = ['closed', 'o', 'narrow', 'mid', 'wide'] as const;
const pct = (v: number, t: number) => `${(v / t) * 100}%`;
const GAIN = 2.4; // playback boost; the compressor stops clipping
const COLORS = ['#8a4b0f', '#c2410c', '#be123c', '#a21caf', '#7a5a1c', '#b45309'];
const makeTags = () => Array.from({ length: 24 }, () => ({
  left: Math.random() * 90, top: Math.random() * 82, size: 12 + Math.random() * 13,
  dx: (Math.random() - 0.5) * 170, dy: (Math.random() - 0.5) * 170, r: (Math.random() - 0.5) * 28,
  d: 6 + Math.random() * 7, delay: -Math.random() * 10, c: COLORS[Math.floor(Math.random() * COLORS.length)],
}));
const post = (url: string, body: object) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export default function Player() {
  const [screen, setScreen] = useState<'gate' | 'name' | 'stage' | 'end'>('gate');
  const [name, setName] = useState('');
  const [tags, setTags] = useState<ReturnType<typeof makeTags>>([]);
  const audio = useRef<HTMLAudioElement>(null), fig = useRef<HTMLDivElement>(null), bob = useRef<HTMLDivElement>(null);
  const shapes = useRef<Record<string, HTMLImageElement | null>>({});
  const playing = useRef(false), ctxRef = useRef<AudioContext | null>(null), an = useRef<AnalyserNode | null>(null);
  const visit = useRef<Promise<string | null>>(Promise.resolve(null)), started = useRef(false);
  const playTimer = useRef<any>(null);

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
    return () => { cancelAnimationFrame(raf); clearTimeout(bt); clearTimeout(playTimer.current); };
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
  // Runs from tap to unlock audio; introduces a short delay for smooth stage fade-in.
  function play(delayMs = AUDIO_START_DELAY_MS) {
    clearTimeout(playTimer.current);
    setupAudio(); ctxRef.current?.resume();
    started.current = false; setScreen('stage');
    const el = audio.current;
    if (!el) return;
    el.currentTime = 0;
    if (delayMs > 0) {
      playTimer.current = setTimeout(() => {
        el.play().catch(() => {});
      }, delayMs);
    } else {
      el.play().catch(() => {});
    }
  }
  function submitName() {
    const n = name.trim(); if (!n) return;
    visit.current = post('/api/visit', { name: n }).then(r => r.json()).then(j => j.id ?? null).catch(() => null);
    setTags(makeTags());
    play(AUDIO_START_DELAY_MS);
  }
  function replay() { track('REPLAYED'); play(AUDIO_START_DELAY_MS); }


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
        <div className="names" aria-hidden>
          {tags.map((t, i) => <span key={i} style={{ left: `${t.left}%`, top: `${t.top}%`, fontSize: t.size, color: t.c, animationDuration: `${t.d}s`, animationDelay: `${t.delay}s`, ['--dx' as any]: `${t.dx}px`, ['--dy' as any]: `${t.dy}px`, ['--r' as any]: `${t.r}deg` }}>{name.trim()}</span>)}
        </div>
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
