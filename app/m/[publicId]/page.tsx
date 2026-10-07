'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Player from '@/components/Player';

export default function Recipient() {
  const { publicId } = useParams<{ publicId: string }>();
  const preview = useSearchParams().get('preview') === '1';
  const [m, setM] = useState<any>(null), [missing, setMissing] = useState(false);
  useEffect(() => { fetch(`/api/public/${publicId}`).then(r => r.ok ? r.json() : Promise.reject()).then(setM).catch(() => setMissing(true)); }, [publicId]);
  if (missing) return <div className="scene"><div className="screen on"><h1>This message isn&apos;t available.</h1><p className="sub">The link may have expired or been removed.</p></div></div>;
  if (!m) return <div className="scene"><div className="screen on"><div className="pulse" /></div></div>;
  return <Player publicId={publicId} audioUrl={m.audio_url} recipient={m.recipient_name} closing={m.closing_line} preview={preview} />;
}
