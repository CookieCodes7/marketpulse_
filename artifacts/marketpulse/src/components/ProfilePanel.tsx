import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from 'wouter';

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
  watchlistCount?: number;
  activeMarkets?: number;
}

const ACCENT = '#3b9eff';

export default function ProfilePanel({ open, onClose, watchlistCount = 0, activeMarkets = 5 }: ProfilePanelProps) {
  const { user, logout, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'profile' | 'prefs'>('profile');
  const [notifNews, setNotifNews] = useState(true);
  const [notifAlert, setNotifAlert] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditBio(user.bio ?? '');
    }
  }, [user, open]);

  if (!user) return null;

  const handleAvatarClick = () => fileRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateProfile({ avatar: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    updateProfile({ name: editName.trim() || user.name, bio: editBio.trim() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => { onClose(); logout(); navigate('/landing'); };

  const joinedDate = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Unknown';

  const planColors = { free: '#5a7a94', pro: '#f5c242' };
  const planLabel = user.plan === 'pro' ? '★ PRO' : '◆ FREE';
  const planCol = planColors[user.plan ?? 'free'];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 199,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(1px)',
          }}
        />
      )}

      {/* Slide-in panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 200,
        width: 320, background: '#0d1520',
        borderLeft: '1px solid #1e2d3d',
        boxShadow: '-12px 0 48px #00000088',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)',
        fontFamily: 'IBM Plex Mono, monospace',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid #1e2d3d',
          background: '#0a1218',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: 1.5 }}>{t('prof_title')}</span>
          <button onClick={onClose} style={ghostBtn} title="Close">✕</button>
        </div>

        {/* Avatar + name hero */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '24px 16px 18px', borderBottom: '1px solid #1e2d3d',
          background: 'linear-gradient(180deg, #0d1a28 0%, #0d1520 100%)',
          gap: 10,
        }}>
          {/* Avatar circle */}
          <div
            onClick={handleAvatarClick}
            title={t('prof_avatar_hint')}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              border: `2px solid ${ACCENT}55`,
              background: user.avatar ? 'transparent' : `${ACCENT}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
              flexShrink: 0,
              transition: 'border-color .2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = `${ACCENT}55`)}
          >
            {user.avatar ? (
              <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700, color: ACCENT }}>{user.initials}</span>
            )}
            {/* Camera overlay */}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity .2s', fontSize: 18,
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >📷</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{user.name}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{user.email}</div>
          </div>

          {/* Plan badge + joined */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 1,
              color: planCol, border: `1px solid ${planCol}55`,
              background: `${planCol}12`, padding: '2px 8px', borderRadius: 3,
            }}>{planLabel}</span>
            <span style={{ fontSize: 9, color: '#3a5a74' }}>{t('prof_member_since')} {joinedDate}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e2d3d' }}>
          {(['profile', 'prefs'] as const).map(tabId => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              style={{
                flex: 1, padding: '9px 0', background: 'none',
                border: 'none', borderBottom: `2px solid ${tab === tabId ? ACCENT : 'transparent'}`,
                color: tab === tabId ? ACCENT : 'var(--muted)',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 700,
                letterSpacing: 0.8, cursor: 'pointer', transition: 'color .15s',
                textTransform: 'uppercase',
              }}
            >{tabId === 'profile' ? t('prof_tab_profile') : t('prof_tab_prefs')}</button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: t('prof_markets'), val: activeMarkets },
                { label: t('prof_watchlist'), val: watchlistCount },
                { label: t('prof_plan'), val: (user.plan ?? 'free').toUpperCase() },
              ].map(s => (
                <div key={s.label} style={{
                  background: '#111c28', border: '1px solid #1e2d3d', borderRadius: 6,
                  padding: '8px 6px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{s.val}</div>
                  <div style={{ fontSize: 8, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Display name */}
            <div>
              <label style={labelStyle}>{t('prof_display_name')}</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={40}
                style={inputStyle}
                placeholder="Your name"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label style={labelStyle}>{t('prof_email')}</label>
              <input value={user.email} readOnly style={{ ...inputStyle, color: 'var(--muted)', cursor: 'default' }} />
            </div>

            {/* Bio */}
            <div>
              <label style={labelStyle}>{t('prof_bio')} <span style={{ color: '#3a5a74' }}>({160 - editBio.length} {t('prof_chars_left')})</span></label>
              <textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value.slice(0, 160))}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 } as React.CSSProperties}
                placeholder="Short bio, e.g. Quant trader · NSE/NYSE enthusiast"
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '9px', borderRadius: 6, border: 'none',
                background: saved ? '#006644' : ACCENT,
                color: '#fff', fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                letterSpacing: 0.8, transition: 'background .2s',
              }}
            >
              {saving ? t('btn_saving') : saved ? t('btn_saved') : t('btn_save')}
            </button>

            {/* Plan upgrade (if free) */}
            {user.plan !== 'pro' && (
              <div style={{
                background: '#1a1400', border: '1px solid #f5c24222',
                borderRadius: 6, padding: '12px 14px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#f5c242', marginBottom: 4 }}>{t('prof_upgrade_title')}</div>
                <div style={{ fontSize: 9, color: '#7a6a30', lineHeight: 1.6 }}>{t('prof_upgrade_desc')}</div>
                <button
                  style={{
                    marginTop: 10, width: '100%', padding: '7px', borderRadius: 4,
                    background: '#f5c24222', border: '1px solid #f5c24244',
                    color: '#f5c242', fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5,
                  }}
                  onClick={() => updateProfile({ plan: 'pro' })}
                >{t('btn_upgrade')}</button>
              </div>
            )}
          </div>
        )}

        {/* ── PREFS TAB ── */}
        {tab === 'prefs' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>

            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, marginBottom: 4 }}>{t('prof_notif')}</div>

            {[
              { label: t('prof_notif_news'), sub: t('prof_notif_news_sub'), val: notifNews, set: setNotifNews },
              { label: t('prof_notif_price'), sub: t('prof_notif_price_sub'), val: notifAlert, set: setNotifAlert },
            ].map(p => (
              <PrefRow key={p.label} label={p.label} sub={p.sub} value={p.val} onChange={p.set} />
            ))}

            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, margin: '12px 0 4px' }}>{t('prof_display')}</div>

            <PrefRow label={t('prof_compact')} sub={t('prof_compact_sub')} value={compactMode} onChange={setCompactMode} />

            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, margin: '12px 0 4px' }}>{t('prof_theme')}</div>
            <div style={{
              display: 'flex', gap: 8,
            }}>
              {[
                { id: 'dark', label: t('prof_theme_dark'), active: true },
                { id: 'light', label: t('prof_theme_light'), active: false },
              ].map(th => (
                <button key={th.id} style={{
                  flex: 1, padding: '7px', borderRadius: 4, cursor: th.active ? 'default' : 'not-allowed',
                  background: th.active ? `${ACCENT}18` : '#111c28',
                  border: `1px solid ${th.active ? ACCENT + '55' : '#1e2d3d'}`,
                  color: th.active ? ACCENT : '#3a5a74',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 700,
                }}>{th.label}</button>
              ))}
            </div>

            <div style={{ fontSize: 9, color: '#3a5a74', marginTop: 4, lineHeight: 1.6 }}>
              {t('prof_prefs_note')}
            </div>
          </div>
        )}

        {/* Footer — logout */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2d3d', background: '#0a1218' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '9px', borderRadius: 6,
              background: '#ff4d4f10', border: '1px solid #ff4d4f33',
              color: '#ff4d4f', fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.8,
              transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#ff4d4f22')}
            onMouseLeave={e => (e.currentTarget.style.background = '#ff4d4f10')}
          >{t('btn_sign_out')}</button>
        </div>
      </div>
    </>
  );
}

function PrefRow({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#111c28', border: '1px solid #1e2d3d', borderRadius: 6,
        padding: '9px 12px', cursor: 'pointer', gap: 10,
      }}
    >
      <div>
        <div style={{ fontSize: 10, color: 'var(--text)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{
        width: 32, height: 18, borderRadius: 9, flexShrink: 0,
        background: value ? '#3b9eff' : '#1e2d3d',
        position: 'relative', transition: 'background .2s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 16 : 2,
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          transition: 'left .2s', boxShadow: '0 1px 4px #0004',
        }} />
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--muted)',
  fontSize: 14, cursor: 'pointer', padding: '2px 6px',
  fontFamily: 'IBM Plex Mono, monospace',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 9, color: 'var(--muted)',
  letterSpacing: 0.8, marginBottom: 5, textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#111c28', border: '1px solid #1e2d3d',
  borderRadius: 5, padding: '7px 10px', color: 'var(--text)',
  fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
  outline: 'none', boxSizing: 'border-box',
};
