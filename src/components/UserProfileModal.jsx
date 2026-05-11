import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

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

function FollowListPanel({ userId, mode, currentUserId, onClose, onViewProfile }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const joinCol = mode === 'followers' ? 'follower_id' : 'following_id';
    const filterCol = mode === 'followers' ? 'following_id' : 'follower_id';
    supabase.from('follows')
      .select(`${joinCol}, profiles!follows_${joinCol}_fkey(id, display_name, username, avatar_url, starter_name)`)
      .eq(filterCol, userId)
      .then(({ data }) => {
        setUsers((data || []).map(r => r.profiles).filter(Boolean));
        setLoading(false);
      });
  }, [userId, mode]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="user-profile-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <h3 style={{ marginBottom: 16, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          {mode === 'followers' ? 'Followers' : 'Following'}
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><div className="app-loading-spinner" /></div>
        ) : users.length === 0 ? (
          <div className="feed-empty" style={{ padding: '16px 0' }}>
            <div className="feed-empty-title">{mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</div>
          </div>
        ) : (
          <div className="friends-list" style={{ marginTop: 0 }}>
            {users.map(u => (
              <div key={u.id} className="friend-card" style={{ cursor: 'pointer' }}
                onClick={() => { onClose(); onViewProfile(u.id); }}>
                <Avatar displayName={u.display_name} avatarUrl={u.avatar_url} />
                <div className="friend-card-info">
                  <div className="friend-card-name">{u.display_name || u.username}</div>
                  <div className="friend-card-sub">@{u.username}</div>
                  {u.starter_name && <div className="friend-card-bio">Starter: <span className="starter-accent">{u.starter_name}</span></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PostDetailPanel({ post, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden', maxWidth: 420 }}>
        {post.image_url && (
          <img src={post.image_url} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ padding: '16px 20px 20px' }}>
          {post.recipe_name && (
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>
              {post.recipe_name}
            </div>
          )}
          {post.content && <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text)' }}>{post.content}</p>}
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12 }}>{timeAgo(post.created_at)}</div>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function UserProfileModal({ userId, currentUserId, onClose }) {
  const [profile,        setProfile]        = useState(null);
  const [posts,          setPosts]          = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing,    setIsFollowing]    = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [toggling,       setToggling]       = useState(false);
  const [followPanel,    setFollowPanel]    = useState(null); // 'followers' | 'following'
  const [viewingPost,    setViewingPost]    = useState(null);
  const [viewingUserId,  setViewingUserId]  = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const load = async () => {
      const [
        { data: prof },
        { data: userPosts },
        { count: fc },
        { count: fgc },
        { data: followCheck },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('posts')
          .select('id, type, content, image_url, recipe_name, likes_count, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(12),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('follows')
          .select('follower_id')
          .eq('follower_id', currentUserId)
          .eq('following_id', userId)
          .maybeSingle(),
      ]);

      setProfile(prof);
      setPosts(userPosts || []);
      setFollowersCount(fc ?? 0);
      setFollowingCount(fgc ?? 0);
      setIsFollowing(!!followCheck);
      setLoading(false);
    };
    load();
  }, [userId, currentUserId]);

  const handleToggleFollow = async () => {
    if (toggling) return;
    setToggling(true);
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId).eq('following_id', userId);
      setIsFollowing(false);
      setFollowersCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId });
      setIsFollowing(true);
      setFollowersCount(c => c + 1);
    }
    setToggling(false);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="user-profile-modal" onClick={e => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={onClose}>✕</button>

          {loading ? (
            <div className="profile-modal-loading">
              <div className="app-loading-spinner" />
            </div>
          ) : !profile ? (
            <div className="profile-modal-loading">User not found</div>
          ) : (
            <>
              {/* Centered hero — Beli-style */}
              <div className="profile-modal-hero">
                <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={80} />
                <div className="profile-modal-name">{profile.display_name || profile.username}</div>
                <div className="profile-modal-handle">@{profile.username}</div>
                {profile.location && <div className="profile-modal-detail">{profile.location}</div>}
                {profile.starter_name && (
                  <div className="profile-modal-detail">
                    Starter: <span className="starter-accent">{profile.starter_name}</span>
                  </div>
                )}
                {profile.bio && <p className="profile-modal-bio">{profile.bio}</p>}
              </div>

              {/* Clickable stats */}
              <div className="profile-modal-stats">
                <div className="profile-modal-stat stat-block--clickable" onClick={() => setFollowPanel('followers')}>
                  <div className="stat-value">{followersCount}</div>
                  <div className="stat-label">Followers</div>
                </div>
                <div className="profile-modal-stat stat-block--clickable" onClick={() => setFollowPanel('following')}>
                  <div className="stat-value">{followingCount}</div>
                  <div className="stat-label">Following</div>
                </div>
                <div className="profile-modal-stat">
                  <div className="stat-value">{posts.length}</div>
                  <div className="stat-label">Posts</div>
                </div>
              </div>

              {userId !== currentUserId && (
                <button
                  className={`btn follow-modal-btn ${isFollowing ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={handleToggleFollow}
                  disabled={toggling}
                >
                  {isFollowing ? 'Following' : '+ Follow'}
                </button>
              )}

              {posts.length > 0 && (
                <>
                  <div className="profile-modal-posts-label">Posts</div>
                  <div className="profile-modal-posts-grid">
                    {posts.map(p => (
                      <div key={p.id} className="profile-modal-post" onClick={() => setViewingPost(p)}
                        style={{ cursor: 'pointer' }}>
                        {p.image_url ? (
                          <img src={p.image_url} alt="" loading="lazy" />
                        ) : (
                          <div className="profile-modal-post-text">
                            <span className={`feed-tag feed-tag--${p.type}`} style={{ marginBottom: 6 }}>
                              {p.type}
                            </span>
                            <p>{p.recipe_name || (p.content.length > 55 ? p.content.slice(0, 55) + '…' : p.content)}</p>
                            <span className="profile-post-time">{timeAgo(p.created_at)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {followPanel && (
        <FollowListPanel
          userId={userId}
          mode={followPanel}
          currentUserId={currentUserId}
          onClose={() => setFollowPanel(null)}
          onViewProfile={id => { setFollowPanel(null); setViewingUserId(id); }}
        />
      )}

      {viewingPost && <PostDetailPanel post={viewingPost} onClose={() => setViewingPost(null)} />}

      {viewingUserId && (
        <UserProfileModal
          userId={viewingUserId}
          currentUserId={currentUserId}
          onClose={() => setViewingUserId(null)}
        />
      )}
    </>
  );
}
