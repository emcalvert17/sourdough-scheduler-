import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { compressImage } from '../utils/photoStorage.js';
import { getBakeLog, getBakeStreak } from '../utils/bakeLog.js';
import { getRecipes } from '../utils/storage.js';
import UserProfileModal from '../components/UserProfileModal.jsx';

function Avatar({ displayName, avatarUrl, size = 44, onClick }) {
  const initials = (displayName || '?').slice(0, 2).toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.36, cursor: onClick ? 'pointer' : 'default' };
  if (avatarUrl) return <img className="avatar" src={avatarUrl} alt={displayName} style={{ ...style, objectFit: 'cover' }} onClick={onClick} />;
  return <div className="avatar" style={style} onClick={onClick}>{initials}</div>;
}

function StatBlock({ label, value, onClick }) {
  return (
    <div className={`stat-block${onClick ? ' stat-block--clickable' : ''}`} onClick={onClick}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function UserCard({ profile, isFollowing, onToggle, disabled, onViewProfile }) {
  return (
    <div className="friend-card" onClick={onViewProfile} style={{ cursor: 'pointer' }}>
      <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} />
      <div className="friend-card-info">
        <div className="friend-card-name">{profile.display_name || profile.username}</div>
        <div className="friend-card-sub">@{profile.username}{profile.location ? ` · ${profile.location}` : ''}</div>
        {profile.starter_name && <div className="friend-card-bio">Starter: <span className="starter-accent">{profile.starter_name}</span></div>}
        {profile.bio && <div className="friend-card-bio">{profile.bio}</div>}
      </div>
      <button className={`btn btn-sm ${isFollowing ? 'btn-ghost' : 'btn-secondary'}`}
        onClick={e => { e.stopPropagation(); onToggle(); }} disabled={disabled}>
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}

function FollowListPanel({ userId, currentUserId, mode, onClose, onViewProfile }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const col = mode === 'followers' ? 'follower_id' : 'following_id';
    const joinCol = mode === 'followers' ? 'follower_id' : 'following_id';
    supabase.from('follows')
      .select(`${joinCol}, profiles!follows_${joinCol}_fkey(id, display_name, username, avatar_url, starter_name)`)
      .eq(mode === 'followers' ? 'following_id' : 'follower_id', userId)
      .then(({ data }) => {
        setUsers((data || []).map(r => r.profiles).filter(Boolean));
        setLoading(false);
      });
  }, [userId, mode]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="user-profile-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <h3 style={{ marginBottom: 16 }}>{mode === 'followers' ? 'Followers' : 'Following'}</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><div className="app-loading-spinner" /></div>
        ) : users.length === 0 ? (
          <div className="feed-empty" style={{ padding: '16px 0' }}>
            <div>{mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</div>
          </div>
        ) : (
          <div className="friends-list" style={{ marginTop: 0 }}>
            {users.map(u => (
              <div key={u.id} className="friend-card" style={{ cursor: 'pointer' }} onClick={() => onViewProfile(u.id)}>
                <Avatar displayName={u.display_name} avatarUrl={u.avatar_url} />
                <div className="friend-card-info">
                  <div className="friend-card-name">{u.display_name || u.username}</div>
                  <div className="friend-card-sub">@{u.username}</div>
                  {u.starter_name && <div className="friend-card-bio">Starter: {u.starter_name}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BakeLogPanel({ onClose }) {
  const log = getBakeLog();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="user-profile-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <h3 style={{ marginBottom: 16 }}>Bake History</h3>
        {log.length === 0 ? (
          <div className="feed-empty" style={{ padding: '16px 0' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>No bakes logged yet</div>
            <div>Use a recipe to start your history.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {log.map(entry => (
              <div key={entry.id} className="starter-log-row">
                <div className="starter-log-details">
                  <div className="starter-log-date" style={{ fontWeight: 600 }}>{entry.recipeName}</div>
                  <div className="starter-log-meta">{new Date(entry.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
                <span className="feed-tag feed-tag--bake">bake</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SavedPostsSection({ userId }) {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('saves')
      .select('post_id, posts(id, type, content, image_url, recipe_name, created_at, user_id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(async ({ data }) => {
        const posts = (data || []).map(s => s.posts).filter(Boolean);
        const userIds = [...new Set(posts.map(p => p.user_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
          const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
          setPosts(posts.map(p => ({ ...p, profiles: profileMap[p.user_id] || null })));
        } else {
          setPosts(posts);
        }
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div className="field-hint" style={{ padding: '16px 0' }}>Loading saved posts…</div>;
  if (posts.length === 0) return (
    <div className="feed-empty" style={{ padding: '24px 0' }}>
      <div className="feed-empty-title">No saved posts yet</div>
      <div className="field-hint">Tap the bookmark icon on any post to save it here</div>
    </div>
  );

  return (
    <div className="saved-posts-grid">
      {posts.map(p => (
        <div key={p.id} className="saved-post-card">
          {p.image_url
            ? <img src={p.image_url} alt="" className="saved-post-img" loading="lazy" />
            : <div className="saved-post-text">
                <span className={`feed-tag feed-tag--${p.type}`} style={{ marginBottom: 6 }}>{p.type}</span>
                <p>{p.recipe_name || (p.content.length > 50 ? p.content.slice(0, 50) + '…' : p.content)}</p>
              </div>
          }
        </div>
      ))}
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSave }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    username:     profile?.username     || '',
    starter_name: profile?.starter_name || '',
    location:     profile?.location     || '',
    bio:          profile?.bio          || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null);
  const [avatarFile,    setAvatarFile]    = useState(null); // compressed data URL
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const fileRef = useRef(null);

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 0.88);
      setAvatarPreview(compressed);
      setAvatarFile(compressed);
    } catch { alert('Could not process image.'); }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) { setError('Name is required.'); return; }
    setLoading(true);

    let avatar_url = profile?.avatar_url || null;
    if (avatarFile) {
      try {
        const blob = await fetch(avatarFile).then(r => r.blob());
        const path = `avatars/${user.id}.jpg`;
        await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        avatar_url = publicUrl + `?t=${Date.now()}`;
      } catch (e) { console.error('Avatar upload failed:', e); }
    }

    const { error: err } = await supabase.from('profiles').update({
      display_name: form.display_name.trim(),
      username:     form.username.trim().toLowerCase().replace(/\s+/g, '_'),
      starter_name: form.starter_name.trim() || null,
      location:     form.location.trim()     || null,
      bio:          form.bio.trim()           || null,
      avatar_url,
      updated_at:   new Date().toISOString(),
    }).eq('id', profile.id);

    if (err) { setError(err.message); setLoading(false); return; }
    onSave();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Edit Profile</h3>
        {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="avatar-upload-row">
          <div className="avatar-upload-wrap" onClick={() => fileRef.current?.click()}>
            <Avatar displayName={form.display_name} avatarUrl={avatarPreview} size={72} />
            <div className="avatar-upload-overlay">edit</div>
          </div>
          <span className="field-hint">Tap to change photo</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />

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

export default function ProfileScreen({ onTabChange }) {
  const { user, profile, refreshProfile } = useAuth();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [discoverUsers,  setDiscoverUsers]  = useState([]);
  const [followingSet,   setFollowingSet]   = useState(new Set());
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchResults,  setSearchResults]  = useState(null);
  const [toggling,       setToggling]       = useState(new Set());
  const [showEdit,       setShowEdit]       = useState(false);
  const [activeSection,  setActiveSection]  = useState('discover'); // 'discover' | 'saved'
  const [viewingUserId,  setViewingUserId]  = useState(null);
  const [followPanel,    setFollowPanel]    = useState(null); // 'followers' | 'following'
  const [showBakeLog,    setShowBakeLog]    = useState(false);

  const bakeLog = getBakeLog();
  const streak  = getBakeStreak();
  const recipes = getRecipes();

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
    setDiscoverUsers((discover || []).sort((a, b) => (fSet.has(a.id) ? 1 : 0) - (fSet.has(b.id) ? 1 : 0)));
  }, [user]);

  useEffect(() => { loadSocial(); }, [loadSocial]);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults(null); return; }
    const { data } = await supabase.from('profiles').select('*')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).neq('id', user.id).limit(20);
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
      await supabase.from('notifications').insert({ recipient_id: targetId, actor_id: user.id, type: 'follow' }).then(() => {});
      setFollowingSet(prev => new Set(prev).add(targetId));
      setFollowingCount(c => c + 1);
    }
    setToggling(prev => { const s = new Set(prev); s.delete(targetId); return s; });
  };

  const displayUsers = searchResults !== null ? searchResults : discoverUsers;

  return (
    <div className="screen profile-screen">
      <div className="screen-header">
        <span className="screen-title">Profile</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

      <div className="profile-hero">
        <Avatar displayName={profile?.display_name} avatarUrl={profile?.avatar_url} size={88}
          onClick={() => setShowEdit(true)} />
        <div className="profile-name">{profile?.display_name || 'Unnamed Baker'}</div>
        <div className="profile-handle">@{profile?.username}</div>
        {profile?.location     && <div className="profile-location">{profile.location}</div>}
        {profile?.starter_name && <div className="profile-location">Starter: <span className="starter-accent">{profile.starter_name}</span></div>}
        {profile?.bio          && <div className="profile-bio">{profile.bio}</div>}
      </div>

      <div className="stats-row">
        <StatBlock label="Followers"  value={followersCount} onClick={() => setFollowPanel('followers')} />
        <StatBlock label="Following"  value={followingCount} onClick={() => setFollowPanel('following')} />
        <StatBlock label="Bakes"      value={bakeLog.length} onClick={() => setShowBakeLog(true)} />
        <StatBlock label="Recipes"    value={recipes.length} onClick={() => onTabChange?.('bakes')} />
        <div className={`stat-block stat-block--clickable`} onClick={() => setShowBakeLog(true)}>
          <div className="stat-value">{streak}</div>
          {streak > 0 && (
            <div className="streak-scores">
              {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
                <div key={i} className="streak-score-mark" />
              ))}
            </div>
          )}
          <div className="stat-label">Streak</div>
        </div>
      </div>

      <div className="profile-section-tabs">
        <button className={`profile-section-tab${activeSection === 'discover' ? ' active' : ''}`}
          onClick={() => setActiveSection('discover')}>Find Bakers</button>
        <button className={`profile-section-tab${activeSection === 'saved' ? ' active' : ''}`}
          onClick={() => setActiveSection('saved')}>Saved Posts</button>
      </div>

      {activeSection === 'discover' ? (
        <>
          <div className="search-row" style={{ marginTop: 12 }}>
            <input className="form-input search-input" placeholder="Search by name or username…"
              value={searchQuery} onChange={e => handleSearch(e.target.value)} />
            {searchQuery && <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setSearchResults(null); }}>Clear</button>}
          </div>
          <div className="friends-list">
            {displayUsers.length === 0 && searchResults !== null
              ? <div className="feed-empty" style={{ padding: '24px 0' }}>No bakers found for "{searchQuery}"</div>
              : displayUsers.map(u => (
                  <UserCard key={u.id} profile={u} isFollowing={followingSet.has(u.id)}
                    onToggle={() => handleToggleFollow(u.id)} disabled={toggling.has(u.id)}
                    onViewProfile={() => setViewingUserId(u.id)} />
                ))
            }
          </div>
        </>
      ) : (
        <SavedPostsSection userId={user.id} />
      )}

      {showEdit && profile && (
        <EditProfileModal profile={profile} onClose={() => setShowEdit(false)} onSave={refreshProfile} />
      )}

      {followPanel && (
        <FollowListPanel
          userId={user.id}
          currentUserId={user.id}
          mode={followPanel}
          onClose={() => setFollowPanel(null)}
          onViewProfile={id => { setFollowPanel(null); setViewingUserId(id); }}
        />
      )}

      {showBakeLog && <BakeLogPanel onClose={() => setShowBakeLog(false)} />}

      {viewingUserId && (
        <UserProfileModal
          userId={viewingUserId}
          currentUserId={user.id}
          onClose={() => setViewingUserId(null)}
        />
      )}
    </div>
  );
}
