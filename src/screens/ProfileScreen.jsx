import { useState } from 'react';
import { getProfile, saveProfile, getFriends, toggleFriend } from '../utils/socialStorage.js';
import { getBakeLog, getBakeStreak } from '../utils/bakeLog.js';
import { getRecipes } from '../utils/storage.js';
import { MOCK_USERS } from '../data/mockCommunity.js';

function StatBlock({ label, value }) {
  return (
    <div className="stat-block">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function FriendCard({ user, isFriend, onToggle }) {
  return (
    <div className="friend-card">
      <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>{user.avatar}</div>
      <div className="friend-card-info">
        <div className="friend-card-name">{user.name}</div>
        <div className="friend-card-sub">@{user.handle} · {user.location}</div>
        <div className="friend-card-bio">{user.bio}</div>
      </div>
      <button
        className={`btn btn-sm ${isFriend ? 'btn-ghost' : 'btn-secondary'}`}
        onClick={onToggle}
      >
        {isFriend ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState(() => getProfile());
  const [editing, setEditing] = useState(!getProfile());
  const [form,    setForm]    = useState(() => {
    const p = getProfile();
    return { name: p?.name || '', bio: p?.bio || '', location: p?.location || '', starterName: p?.starterName || '' };
  });
  const [friends, setFriends] = useState(() => getFriends());

  const log      = getBakeLog();
  const streak   = getBakeStreak();
  const recipes  = getRecipes();

  const handleSave = () => {
    if (!form.name.trim()) { alert('Please enter your name.'); return; }
    const p = { ...form, handle: form.name.trim().toLowerCase().replace(/\s+/g, '_'), updatedAt: new Date().toISOString() };
    saveProfile(p);
    setProfile(p);
    setEditing(false);
  };

  const handleToggleFriend = (userId) => {
    toggleFriend(userId);
    setFriends(getFriends());
  };

  if (editing) {
    return (
      <div className="screen profile-screen">
        <div className="screen-header">
          <span className="screen-title">{profile ? 'Edit Profile' : 'Set Up Profile'}</span>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input className="form-input" placeholder="e.g. Alex Baker"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Location (optional)</label>
            <input className="form-input" placeholder="e.g. San Francisco, CA"
              value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Starter's Name (optional)</label>
            <input className="form-input" placeholder="e.g. Bubbles, Doughvid…"
              value={form.starterName} onChange={e => setForm(f => ({ ...f, starterName: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bio (optional)</label>
            <input className="form-input" placeholder="What's your sourdough story?"
              value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
          </div>
        </div>
        <div className="builder-actions">
          {profile && <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>}
          <button className="btn btn-primary" onClick={handleSave}>Save Profile</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen profile-screen">
      <div className="screen-header">
        <span className="screen-title">Profile</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
      </div>

      <div className="profile-hero">
        <div className="avatar avatar--lg">
          {profile.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="profile-hero-info">
          <div className="profile-name">{profile.name}</div>
          <div className="profile-handle">@{profile.handle}</div>
          {profile.location && <div className="profile-location">{profile.location}</div>}
          {profile.starterName && <div className="profile-location">Starter: <strong>{profile.starterName}</strong></div>}
          {profile.bio && <div className="profile-bio">{profile.bio}</div>}
        </div>
      </div>

      <div className="stats-row">
        <StatBlock label="Bakes logged" value={log.length} />
        <StatBlock label="Recipes" value={recipes.length} />
        <StatBlock label="Day streak" value={streak} />
        <StatBlock label="Following" value={friends.size} />
      </div>

      <div className="section-title" style={{ marginTop: 28 }}>Bakers to Follow</div>
      <div className="friends-list">
        {MOCK_USERS.map(user => (
          <FriendCard
            key={user.id}
            user={user}
            isFriend={friends.has(user.id)}
            onToggle={() => handleToggleFriend(user.id)}
          />
        ))}
      </div>
    </div>
  );
}
