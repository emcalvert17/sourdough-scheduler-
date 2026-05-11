import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') +
    '_' + Math.floor(Math.random() * 9000 + 1000);
}

export default function AuthScreen() {
  const [tab,     setTab]     = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [done,    setDone]    = useState(false); // post-signup confirmation

  // sign in fields
  const [siEmail,    setSiEmail]    = useState('');
  const [siPassword, setSiPassword] = useState('');

  // sign up fields
  const [suName,     setSuName]     = useState('');
  const [suStarter,  setSuStarter]  = useState('');
  const [suEmail,    setSuEmail]    = useState('');
  const [suPassword, setSuPassword] = useState('');

  const switchTab = (t) => { setTab(t); setError(''); setDone(false); };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPassword });
    if (err) setError(err.message);
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!suName.trim()) { setError('Please enter your name.'); return; }
    if (suPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');

    const { data, error: authErr } = await supabase.auth.signUp({ email: suEmail, password: suPassword });
    if (authErr) { setError(authErr.message); setLoading(false); return; }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: slugify(suName),
        display_name: suName.trim(),
        starter_name: suStarter.trim() || null,
      });
    }

    setLoading(false);
    // if session is already set (email confirm disabled), onAuthStateChange fires app into the app
    // otherwise show "check email" message
    if (!data.session) setDone(true);
  };

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="auth-logo-mark">
          <svg viewBox="0 0 48 48" width="56" height="56" fill="none">
            <ellipse cx="24" cy="28" rx="18" ry="13" fill="#c8a96e" />
            <ellipse cx="24" cy="22" rx="14" ry="10" fill="#e8c87e" />
            <ellipse cx="24" cy="19" rx="10" ry="7" fill="#f5dfa0" />
            <path d="M16 22 Q24 16 32 22" stroke="#c8a96e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <div className="auth-brand-name">StarterSync</div>
        <div className="auth-brand-sub">The sourdough community</div>
      </div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'signin' ? ' active' : ''}`} onClick={() => switchTab('signin')}>
            Sign In
          </button>
          <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => switchTab('signup')}>
            Create Account
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com"
                value={siEmail} onChange={e => setSiEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={siPassword} onChange={e => setSiPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : done ? (
          <div className="auth-confirm">
            <div className="auth-confirm-icon">✉️</div>
            <div className="auth-confirm-title">Check your email</div>
            <div className="auth-confirm-sub">
              We sent a confirmation link to <strong>{suEmail}</strong>.
              Click it to activate your account, then come back and sign in.
            </div>
            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => switchTab('signin')}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignUp} className="auth-form">
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input className="form-input" placeholder="e.g. Emily Calvert"
                value={suName} onChange={e => setSuName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Starter's Name <span className="form-optional">(optional)</span></label>
              <input className="form-input" placeholder="e.g. Bubbles, Doughvid…"
                value={suStarter} onChange={e => setSuStarter(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com"
                value={suEmail} onChange={e => setSuEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="At least 6 characters"
                value={suPassword} onChange={e => setSuPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
