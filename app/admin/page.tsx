'use client';

import { useState, useMemo } from 'react';

interface Visit {
  id: string;
  name: string;
  created_at: string;
  audio_started_at: string | null;
  audio_completed_at: string | null;
  replay_count: number;
}

interface LegacyMessage {
  id: string;
  recipient_name: string;
  title: string;
  created_at: string;
}

const SUPABASE_PROJECT_REF = 'uwlfjvjspqkuxouxlsut';
const SUPABASE_RESTORE_URL = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}`;

function formatDateTime(d: string | null) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return d;
  }
}

function timeAgo(dateString: string | null) {
  if (!dateString) return '';
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    if (diffMs < 0) return 'just now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  } catch {
    return '';
  }
}

export default function AdminPage() {
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rows, setRows] = useState<Visit[] | null>(null);
  const [legacyRows, setLegacyRows] = useState<LegacyMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [errCode, setErrCode] = useState('');
  const [filterText, setFilterText] = useState('');

  async function loadData() {
    if (!pw.trim()) {
      setErr('Please enter the admin password');
      return;
    }
    setLoading(true);
    setErr('');
    setErrCode('');

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(data.error || 'Failed to authenticate');
        setErrCode(data.code || '');
        setLoading(false);
        return;
      }

      if (Array.isArray(data)) {
        setRows(data);
      } else if (data && Array.isArray(data.visits)) {
        setRows(data.visits);
        setLegacyRows(data.legacyMessages || []);
      } else {
        setRows([]);
      }
    } catch (e: any) {
      setErr('Network request failed. Check your internet connection.');
      setErrCode('NETWORK_ERROR');
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    if (!filterText.trim()) return rows;
    const q = filterText.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, filterText]);

  const stats = useMemo(() => {
    if (!rows) return { total: 0, started: 0, completed: 0, replays: 0, completionRate: 0 };
    const total = rows.length;
    const started = rows.filter((r) => r.audio_started_at).length;
    const completed = rows.filter((r) => r.audio_completed_at).length;
    const replays = rows.reduce((sum, r) => sum + (r.replay_count || 0), 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, started, completed, replays, completionRate };
  }, [rows]);

  return (
    <div className="admin-viewport">
      {/* Background glow ambiance */}
      <div className="bg-glow-container" aria-hidden>
        <div className="bg-glow bg-glow-1" style={{ opacity: 0.45 }} />
        <div className="bg-glow bg-glow-2" style={{ opacity: 0.35 }} />
        <div className="vignette-overlay" />
      </div>

      <div className="admin-container">
        {/* Header */}
        <header className="admin-header-row">
          <div className="admin-title-area">
            <h1>Visitor Log & Activity</h1>
            <p>Real-time records of who opened your special message and listened to it</p>
            <div className="admin-badge-row">
              <span className={`admin-pill ${errCode === 'PROJECT_PAUSED_OR_UNREACHABLE' ? 'warning' : rows ? 'live' : ''}`}>
                <span className={`dot ${rows && !err ? 'pulsing' : ''}`} />
                {errCode === 'PROJECT_PAUSED_OR_UNREACHABLE'
                  ? 'Supabase Paused / Unreachable'
                  : rows
                  ? 'Connected to Supabase'
                  : 'Supabase Database'}
              </span>
              <span className="admin-pill">
                Ref: <code>{SUPABASE_PROJECT_REF}</code>
              </span>
            </div>
          </div>

          {rows !== null && (
            <div className="admin-actions-group">
              <button
                className={`btn-refresh ${loading ? 'loading' : ''}`}
                onClick={loadData}
                disabled={loading}
              >
                <span className="refresh-icon">↺</span>
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setRows(null);
                  setLegacyRows([]);
                  setErr('');
                  setErrCode('');
                }}
              >
                Lock
              </button>
            </div>
          )}
        </header>

        {/* Database Unreachable / Paused Banner */}
        {errCode === 'PROJECT_PAUSED_OR_UNREACHABLE' && (
          <div className="admin-alert-banner danger">
            <span className="admin-alert-icon">⚠️</span>
            <div className="admin-alert-content">
              <div className="admin-alert-title">Supabase Database is Unreachable (Project Paused)</div>
              <p className="admin-alert-desc">
                Supabase free tier automatically pauses projects after 7 days of inactivity. When a project is paused,
                the domain (<code>{SUPABASE_PROJECT_REF}.supabase.co</code>) stops resolving, so past records cannot be loaded
                and new visits cannot be saved.
              </p>
              <div className="admin-alert-actions">
                <a
                  href={SUPABASE_RESTORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-admin-action"
                >
                  <span>Restore Project in Supabase ↗</span>
                </a>
                <button
                  onClick={loadData}
                  className="btn-secondary"
                  style={{ background: '#fff', borderColor: '#fca5a5' }}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Missing Table Banner */}
        {errCode === 'TABLE_NOT_FOUND' && (
          <div className="admin-alert-banner warning">
            <span className="admin-alert-icon">📋</span>
            <div className="admin-alert-content">
              <div className="admin-alert-title">Table &ldquo;visits&rdquo; Not Found in Supabase</div>
              <p className="admin-alert-desc">
                The database is connected, but the <code>visits</code> table has not been created yet.
                Open the Supabase SQL Editor and execute the code in <code>supabase/schema.sql</code>.
              </p>
              <div className="admin-alert-actions">
                <a
                  href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/sql/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-admin-action"
                  style={{ background: '#b45309' }}
                >
                  <span>Open Supabase SQL Editor ↗</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Generic Error (like wrong password) */}
        {err && errCode !== 'PROJECT_PAUSED_OR_UNREACHABLE' && errCode !== 'TABLE_NOT_FOUND' && (
          <div className="admin-alert-banner danger">
            <span className="admin-alert-icon">✕</span>
            <div className="admin-alert-content">
              <div className="admin-alert-title">Error</div>
              <p className="admin-alert-desc">{err}</p>
            </div>
          </div>
        )}

        {/* Password Screen */}
        {rows === null ? (
          <div className="admin-card admin-login-box">
            <h2>Enter Admin Password</h2>
            <p>Enter your secret password to view visitor records</p>

            <div className="admin-input-group">
              <input
                id="pw"
                className="admin-input"
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                autoFocus
              />
              <button
                type="button"
                className="admin-input-toggle"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? '👁️' : '🙈'}
              </button>
            </div>

            <button
              className="main-btn"
              style={{ width: '100%', marginTop: 8 }}
              onClick={loadData}
              disabled={loading || !pw.trim()}
            >
              <span>{loading ? 'Verifying...' : 'Unlock Dashboard'}</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>
        ) : (
          /* Logged In Dashboard View */
          <div>
            {/* Stats Grid */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <span className="admin-stat-label">Total Opens</span>
                <span className="admin-stat-value">{stats.total}</span>
                <span className="admin-stat-sub">Typed name & entered</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-label">Audio Started</span>
                <span className="admin-stat-value">{stats.started}</span>
                <span className="admin-stat-sub">
                  {stats.total > 0 ? `${Math.round((stats.started / stats.total) * 100)}% of visitors` : '0%'}
                </span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-label">Audio Completed</span>
                <span className="admin-stat-value">{stats.completed}</span>
                <span className="admin-stat-sub">{stats.completionRate}% completion rate</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-label">Replays</span>
                <span className="admin-stat-value">{stats.replays}</span>
                <span className="admin-stat-sub">Played again</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            {rows.length > 0 && (
              <div className="admin-controls-bar">
                <div className="admin-search-wrap">
                  <input
                    className="admin-input"
                    style={{ padding: '8px 14px', fontSize: 14 }}
                    placeholder="Search by visitor name..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>
                <div style={{ fontSize: 13, color: 'var(--soft)' }}>
                  Showing {filteredRows.length} of {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                </div>
              </div>
            )}

            {/* Empty State */}
            {rows.length === 0 && !err && (
              <div className="admin-card admin-empty-state">
                <div className="admin-empty-icon">💌</div>
                <div className="admin-empty-title">Nobody has opened it yet</div>
                <p>When someone types their name on the opening screen, their record will instantly appear here.</p>
              </div>
            )}

            {/* Filtered Out Empty State */}
            {rows.length > 0 && filteredRows.length === 0 && (
              <div className="admin-card admin-empty-state">
                <div className="admin-empty-icon">🔍</div>
                <div className="admin-empty-title">No matching names found</div>
                <p>Try searching with different letters or clear the search field.</p>
              </div>
            )}

            {/* Visit Cards List */}
            <div className="admin-visits-list">
              {filteredRows.map((v) => {
                const isCompleted = Boolean(v.audio_completed_at);
                const isStarted = Boolean(v.audio_started_at);

                return (
                  <div className="admin-visit-card" key={v.id}>
                    <div className="admin-visit-header">
                      <div className="admin-visitor-name">
                        <span>{v.name}</span>
                        {v.replay_count > 0 && (
                          <span className="replay-badge">
                            🔁 Replayed {v.replay_count}×
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          className={`status-tag ${
                            isCompleted ? 'completed' : isStarted ? 'started' : 'opened'
                          }`}
                        >
                          {isCompleted ? '💖 Audio completed' : isStarted ? '🎧 Audio started' : '📖 Opened page'}
                        </span>
                        <span className="admin-visit-time">{timeAgo(v.created_at)}</span>
                      </div>
                    </div>

                    <div className="admin-timeline">
                      <div className="timeline-step">
                        <span className="timeline-step-label">Opened Page</span>
                        <span className="timeline-step-val">{formatDateTime(v.created_at) || '—'}</span>
                      </div>

                      <div className="timeline-step">
                        <span className="timeline-step-label">Audio Started</span>
                        <span className="timeline-step-val">
                          {formatDateTime(v.audio_started_at) || (
                            <span style={{ color: '#9ca3af' }}>Did not start</span>
                          )}
                        </span>
                      </div>

                      <div className="timeline-step">
                        <span className="timeline-step-label">Audio Completed</span>
                        <span className="timeline-step-val">
                          {formatDateTime(v.audio_completed_at) || (
                            <span style={{ color: '#9ca3af' }}>Left before end</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legacy Messages section (if user had entries in the previous version) */}
            {legacyRows.length > 0 && (
              <div className="admin-legacy-box">
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
                  Archived Messages ({legacyRows.length} from previous version)
                </h3>
                <p style={{ fontSize: 13, color: 'var(--soft)', marginBottom: 14 }}>
                  These records are from the earlier version of the application that stored recipient links in the <code>messages</code> table.
                </p>
                <div className="admin-visits-list">
                  {legacyRows.map((msg) => (
                    <div className="admin-visit-card" key={msg.id} style={{ opacity: 0.85 }}>
                      <div className="admin-visit-header">
                        <div className="admin-visitor-name">
                          <span>{msg.recipient_name}</span>
                          <span className="admin-pill" style={{ fontSize: 11 }}>Legacy Message</span>
                        </div>
                        <span className="admin-visit-time">{formatDateTime(msg.created_at)}</span>
                      </div>
                      {msg.title && (
                        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Title: {msg.title}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
