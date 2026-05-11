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

export default function UserProfileModal({ userId, currentUserId, onClose }) {
  const [profile,        setProfile]        = useState(null);
  const [posts,          setPosts]          = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing,    setIsFollowing]    = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [toggling,       setToggling]       = useState(false);

  useEffect(() => {
    if (!userId) return;
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
            <div className="profile-modal-hero">
              <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={72} />
              <div className="profile-modal-info">
                <div className="profile-modal-name">{profile.display_name || profile.username}</div>
                <div className="profile-modal-handle">@{profile.username}</div>
                {profile.location    && <div className="profile-modal-detail">{profile.location}</div>}
                {profile.starter_name && (
                  <div className="profile-modal-detail">Starter: <strong>{profile.starter_name}</strong></div>
                )}
              </div>
            </div>

            {profile.bio && <p className="profile-modal-bio">{profile.bio}</p>}

            <div className="profile-modal-stats">
              <div className="profile-modal-stat">
                <div className="stat-value">{followersCount}</div>
                <div className="stat-label">Followers</div>
              </div>
              <div className="profile-modal-stat">
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
                    <div key={p.id} className="profile-modal-post">
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
  );
}
