'use client';
import { useEffect, useRef, useState } from 'react';
import { SPRITE, CLOSING_LINE, AUDIO_START_DELAY_MS } from '@/lib/config';

const SHAPES = ['closed', 'o', 'narrow', 'mid', 'wide'] as const;
const pct = (v: number, t: number) => `${(v / t) * 100}%`;
const GAIN = 2.4; // playback boost; the compressor stops clipping
const COLORS = ['#9a3412', '#c2410c', '#be123c', '#e11d48', '#b45309', '#854d0e'];
const makeTags = () => Array.from({ length: 24 }, () => ({
  left: Math.random() * 90, top: Math.random() * 82, size: 13 + Math.random() * 12,
  dx: (Math.random() - 0.5) * 170, dy: (Math.random() - 0.5) * 170, r: (Math.random() - 0.5) * 26,
  d: 6 + Math.random() * 7, delay: -Math.random() * 10, c: COLORS[Math.floor(Math.random() * COLORS.length)],
}));
const post = (url: string, body: object) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export default function Player() {
  const [screen, setScreen] = useState<'gate' | 'name' | 'stage' | 'end'>('gate');
  const [name, setName] = useState('');
  const [tags, setTags] = useState<ReturnType<typeof makeTags>>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
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
    <div className={`scene scene-${screen}`}>
      {/* Dynamic ambient lighting & glowing gradient orbs */}
      <div className="bg-glow-container" aria-hidden>
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
        <div className="bg-glow bg-glow-3" />
        <div className="vignette-overlay" />
        {/* Floating subtle ambient stars */}
        <div className="ambient-stars">
          <span className="star s1">✦</span>
          <span className="star s2">✧</span>
          <span className="star s3">✦</span>
          <span className="star s4">✧</span>
          <span className="star s5">✦</span>
          <span className="star s6">✧</span>
        </div>
      </div>

      {/* Slide 1: Gate / The Opening Invitation */}
      <section className={`screen screen-gate ${screen === 'gate' ? 'on' : ''}`}>
        <div className="pulse-wrapper" aria-hidden>
          <div className="pulse-aura" />
          <div className="pulse-ring ring-1" />
          <div className="pulse-ring ring-2" />
          <div className="pulse-core">
            <span className="pulse-sparkle">✨</span>
          </div>
        </div>

        <h1 className="gate-title">
          Someone made<br />
          <em>something special</em> for you.
        </h1>

        <div className="sound-pill">
          <svg className="sound-pill-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5 0L6.5 7.5H3c-.55 0-1 .45-1 1v7c0 .55.45 1 1 1h3.5l5 4.27c.67.57 1.5.09 1.5-.77V4c0-.86-.83-1.34-1.5-.77zM14 8.83v6.34c1.24-.62 2-1.9 2-3.17s-.76-2.55-2-3.17z"/>
          </svg>
          <span>Sound on, please</span>
        </div>

        <button className="main-btn btn-gate" onClick={() => setScreen('name')}>
          <span>Tap to open</span>
          <span className="btn-arrow">✦</span>
        </button>
      </section>

      {/* Slide 2: Name Input */}
      <section className={`screen screen-name ${screen === 'name' ? 'on' : ''}`}>
        <div className="glass-card name-card">
          <div className="card-badge">
            <span className="badge-sparkle">✨</span> A personal message
          </div>

          <h1 className="card-title">What&apos;s your name?</h1>
          <p className="card-sub">So the message knows who it&apos;s speaking to</p>

          <div className="input-wrap">
            <input
              aria-label="Your name"
              value={name}
              maxLength={60}
              placeholder="Type your name here..."
              autoComplete="given-name"
              autoFocus
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitName()}
            />
          </div>

          <button className="main-btn btn-continue" disabled={!name.trim()} onClick={submitName}>
            <span>Continue</span>
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </section>

      {/* Slide 3: Stage / Character Lip-Sync & Floating Names */}
      <section className={`screen stage ${screen === 'stage' ? 'on' : ''}`}>
        <div className="stage-spotlight" aria-hidden />

        <div className="names" aria-hidden>
          {tags.map((t, i) => (
            <span
              key={i}
              className="floating-name-tag"
              style={{
                left: `${t.left}%`,
                top: `${t.top}%`,
                fontSize: t.size,
                color: t.c,
                animationDuration: `${t.d}s`,
                animationDelay: `${t.delay}s`,
                ['--dx' as any]: `${t.dx}px`,
                ['--dy' as any]: `${t.dy}px`,
                ['--r' as any]: `${t.r}deg`
              }}
            >
              <span className="tag-sparkle">✦</span> {name.trim()}
            </span>
          ))}
        </div>

        <div className="fig" ref={fig} role="img" aria-label="Animated character speaking to you">
          <div className="bob" ref={bob}>
            <img src="/character/base.png" alt="" style={{ inset: 0, width: '100%', height: '100%' }} />
            {SHAPES.map(k => (
              <img
                key={k}
                ref={el => { shapes.current[k] = el; }}
                className="m"
                src={`/character/${k}.png`}
                alt=""
                style={{
                  left: pct(SPRITE.box[0], SPRITE.w),
                  top: pct(SPRITE.box[1], SPRITE.h),
                  width: pct(SPRITE.box[2] - SPRITE.box[0], SPRITE.w)
                }}
              />
            ))}
            {SPRITE.eyes.map(([x0, x1]) => (
              <div
                key={x0}
                className="eye"
                style={{
                  left: pct(x0, SPRITE.w),
                  top: pct(SPRITE.eyeY, SPRITE.h),
                  width: pct(x1 - x0, SPRITE.w),
                  height: pct(SPRITE.eyeH, SPRITE.h)
                }}
              />
            ))}
          </div>
          <div className="character-pedestal" aria-hidden />
        </div>

        {/* Live Audio playing indicator badge */}
        {isPlayingAudio && (
          <div className="audio-live-pill" aria-hidden>
            <div className="live-bars">
              <span /><span /><span /><span />
            </div>
            <span>Speaking to you...</span>
          </div>
        )}
      </section>

      {/* Slide 4: End / Celebration Finale */}
      <section className={`screen screen-end ${screen === 'end' ? 'on' : ''}`}>
        {/* Floating celebration hearts and sparkles */}
        <div className="celebration-particles" aria-hidden>
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="celebration-item"
              style={{
                left: `${4 + (i * 5.6) % 92}%`,
                animationDelay: `${(i * 0.35) % 3.2}s`,
                animationDuration: `${3.6 + (i % 3) * 0.9}s`,
                fontSize: `${16 + (i % 3) * 6}px`
              }}
            >
              {['💖', '✨', '💛', '🌸', '✦'][i % 5]}
            </span>
          ))}
        </div>

        <div className={`glass-card end-card fin ${screen === 'end' ? 'on' : ''}`}>
          <div className="end-badge-icon">💖</div>
          <h1 className="end-title">
            That was for you,<br />
            <span className="end-name-highlight">{name.trim()}</span>.
          </h1>
          {CLOSING_LINE && (
            <p className="end-closing-line">
              &ldquo;{CLOSING_LINE}&rdquo;
            </p>
          )}
          <button className="main-btn btn-replay" onClick={replay}>
            <span className="btn-replay-icon">↺</span>
            <span>Play again</span>
          </button>
        </div>
      </section>

      {/* Audio element - note disclaimer at top has been removed */}
      <audio
        ref={audio}
        src="/message.mp3"
        preload="auto"
        playsInline
        onPlaying={() => {
          playing.current = true;
          setIsPlayingAudio(true);
          if (!started.current) {
            started.current = true;
            track('STARTED');
          }
        }}
        onPause={() => {
          playing.current = false;
          setIsPlayingAudio(false);
        }}
        onEnded={() => {
          playing.current = false;
          setIsPlayingAudio(false);
          track('COMPLETED');
          setTimeout(() => setScreen('end'), 900);
        }}
      />
    </div>
  );
}
