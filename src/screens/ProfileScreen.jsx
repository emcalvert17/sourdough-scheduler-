import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getBakeLog, getBakeStreak } from '../utils/bakeLog.js';
import { getRecipes } from '../utils/storage.js';

function Avatar({ displayName, avatarUrl, size = 44 }) {
  const initials = (displayName || '?').slice(0, 2).toUpperCase();
  if (avatarUrl) {
    return <img className="avatar" src={avatarUrl} alt={displayName}
      style={{ width: size, height: size, objectFit: 'cover' }} />;
  }
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

function StatBlock({ label, value, onClick }) {
  return (
    <div className={`stat-block${onClick ? ' stat-block--clickable' : ''}`} onClick={onClick}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function UserCard({ profile, isFollowing, onToggle, disabled }) {
  return (
    <div className="friend-card">
      <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} />
      <div className="friend-card-info">
        <div className="friend-card-name">{profile.display_name || profile.username}</div>
        <div className="friend-card-sub">@{profile.username}{profile.location ? ` · ${profile.location}` : ''}</div>
        {profile.starter_name && <div className="friend-card-bio">Starter: {profile.starter_name}</div>}
        {profile.bio && <div className="friend-card-bio">{profile.bio}</div>}
      </div>
      <button
        className={`btn btn-sm ${isFollowing ? 'btn-ghost' : 'btn-secondary'}`}
        onClick={onToggle}
        disabled={disabled}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSave }) {
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    username:     profile?.username     || '',
    starter_name: profile?.starter_name || '',
    location:     profile?.location     || '',
    bio:          profile?.bio          || '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSave = async () => {
    if (!form.display_name.trim()) { setError('Name is required.'); return; }
    setLoading(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name.trim(),
        username:     form.username.trim().toLowerCase().replace(/\s+/g, '_'),
        starter_name: form.starter_name.trim() || null,
        location:     form.location.trim()     || null,
        bio:          form.bio.trim()           || null,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (err) { setError(err.message); setLoading(false); return; }
    onSave();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Edit Profile</h3>
        {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input className="form-input" value={form.display_name}
            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Starter's Name <span className="form-optional">(optional)</span></label>
          <input className="form-input" placeholder="e.g. Bubbles" value={form.starter_name}
            onChange={e => setForm(f => ({ ...f, starter_name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Location <span className="form-optional">(optional)</span></label>
          <input className="form-input" placeholder="e.g. San Francisco, CA" value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Bio <span className="form-optional">(optional)</span></label>
          <textarea className="form-input form-textarea" rows={3} placeholder="Your sourdough story…"
            value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [discoverUsers,  setDiscoverUsers]  = useState([]);
  const [followingSet,   setFollowingSet]   = useState(new Set());
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchResults,  setSearchResults]  = useState(null); // null = no search yet
  const [toggling,       setToggling]       = useState(new Set());
  const [showEdit,       setShowEdit]       = useState(false);

  const bakeLog  = getBakeLog();
  const streak   = getBakeStreak();
  const recipes  = getRecipes();

  const loadSocial = useCallback(async () => {
    if (!user) return;

    const [{ count: fc }, { count: fgc }, { data: following }, { data: discover }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
      supabase.from('profiles').select('*').neq('id', user.id).limit(20),
    ]);

    setFollowersCount(fc ?? 0);
    setFollowingCount(fgc ?? 0);

    const fSet = new Set((following || []).map(r => r.following_id));
    setFollowingSet(fSet);

    // show people you're not following first
    const sorted = (discover || []).sort((a, b) =>
      (fSet.has(a.id) ? 1 : 0) - (fSet.has(b.id) ? 1 : 0)
    );
    setDiscoverUsers(sorted);
  }, [user]);

  useEffect(() => { loadSocial(); }, [loadSocial]);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults(null); return; }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq('id', user.id)
      .limit(20);
    setSearchResults(data || []);
  };

  const handleToggleFollow = async (targetId) => {
    if (toggling.has(targetId)) return;
    setToggling(prev => new Set(prev).add(targetId));

    const isFollowing = followingSet.has(targetId);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
      setFollowingSet(prev => { const s = new Set(prev); s.delete(targetId); return s; });
      setFollowingCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      setFollowingSet(prev => new Set(prev).add(targetId));
      setFollowingCount(c => c + 1);
    }

    setToggling(prev => { const s = new Set(prev); s.delete(targetId); return s; });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const displayUsers = searchResults !== null ? searchResults : discoverUsers;

  return (
    <div className="screen profile-screen">
      <div className="screen-header">
        <span className="screen-title">Profile</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      <div className="profile-hero">
        <Avatar displayName={profile?.display_name} avatarUrl={profile?.avatar_url} size={64} />
        <div className="profile-hero-info">
          <div className="profile-name">{profile?.display_name || 'Unnamed Baker'}</div>
          <div className="profile-handle">@{profile?.username}</div>
          {profile?.location    && <div className="profile-location">{profile.location}</div>}
          {profile?.starter_name && <div className="profile-location">Starter: <strong>{profile.starter_name}</strong></div>}
          {profile?.bio         && <div className="profile-bio">{profile.bio}</div>}
        </div>
      </div>

      <div className="stats-row">
        <StatBlock label="Followers"   value={followersCount} />
        <StatBlock label="Following"   value={followingCount} />
        <StatBlock label="Bakes"       value={bakeLog.length} />
        <StatBlock label="Recipes"     value={recipes.length} />
        <StatBlock label="Day streak"  value={streak} />
      </div>

      <div className="section-title" style={{ marginTop: 28, marginBottom: 12 }}>Find Bakers</div>
      <div className="search-row">
        <input
          className="form-input search-input"
          placeholder="Search by name or username…"
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
        />
        {searchQuery && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setSearchResults(null); }}>
            Clear
          </button>
        )}
      </div>

      <div className="friends-list">
        {displayUsers.length === 0 && searchResults !== null ? (
          <div className="feed-empty" style={{ padding: '24px 0' }}>No bakers found for "{searchQuery}"</div>
        ) : (
          displayUsers.map(u => (
            <UserCard
              key={u.id}
              profile={u}
              isFollowing={followingSet.has(u.id)}
              onToggle={() => handleToggleFollow(u.id)}
              disabled={toggling.has(u.id)}
            />
          ))
        )}
      </div>

      {showEdit && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSave={refreshProfile}
        />
      )}
    </div>
  );
}
