import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Avatar({ displayName, avatarUrl, size = 38 }) {
  const initials = (displayName || '?').slice(0, 2).toUpperCase();
  if (avatarUrl) {
    return <img className="avatar" src={avatarUrl} alt={displayName} style={{ width: size, height: size, objectFit: 'cover' }} />;
  }
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ScheduleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CreatePostModal({ onClose, onPost }) {
  const [type,       setType]       = useState('bake');
  const [content,    setContent]    = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [loading,    setLoading]    = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    await onPost({ type, content: content.trim(), recipe_name: recipeName.trim() || null });
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Share with the community</h3>
        <div className="post-type-toggle">
          <button className={`post-type-btn${type === 'bake' ? ' active' : ''}`} onClick={() => setType('bake')}>🍞 Bake</button>
          <button className={`post-type-btn${type === 'tip'  ? ' active' : ''}`} onClick={() => setType('tip')}>💡 Tip</button>
        </div>
        {type === 'bake' && (
          <div className="form-group">
            <label className="form-label">Recipe name <span className="form-optional">(optional)</span></label>
            <input className="form-input" placeholder="e.g. Country Sourdough"
              value={recipeName} onChange={e => setRecipeName(e.target.value)} />
          </div>
        )}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">{type === 'bake' ? 'How did the bake go?' : 'Share your tip'}</label>
          <textarea
            className="form-input form-textarea"
            placeholder={type === 'bake'
              ? 'Oven spring, crumb, crust — tell us everything!'
              : 'What sourdough wisdom would you pass on?'}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !content.trim()}>
            {loading ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, currentUserId, onTabChange }) {
  const profile = post.profiles;
  const [liked,     setLiked]     = useState(() => post.user_liked);
  const [likeCount, setLikeCount] = useState(post.likes_count ?? 0);
  const [liking,    setLiking]    = useState(false);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikeCount(c => nowLiked ? c + 1 : c - 1);

    if (nowLiked) {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: post.id });
    } else {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', post.id);
    }
    setLiking(false);
  };

  return (
    <div className={`feed-card${post.type === 'tip' ? ' feed-card--tip' : ''}`}>
      <div className="feed-card-header">
        <Avatar displayName={profile?.display_name} avatarUrl={profile?.avatar_url} />
        <div className="feed-card-meta">
          <span className="feed-card-name">{profile?.display_name || 'Baker'}</span>
          <span className="feed-card-sub">@{profile?.username} · {timeAgo(post.created_at)}</span>
        </div>
        <span className={`feed-tag feed-tag--${post.type}`}>
          {post.type === 'bake' ? 'Bake' : 'Tip'}
        </span>
      </div>

      {post.image_url && (
        <div className="feed-card-img-wrap">
          <img src={post.image_url} alt="" className="feed-card-img" loading="lazy" />
        </div>
      )}

      <div className="feed-card-body">
        {post.recipe_name && <div className="feed-recipe-label">{post.recipe_name}</div>}
        <p className="feed-caption">{post.content}</p>
      </div>

      <div className="feed-card-actions">
        <button className={`feed-action-btn${liked ? ' active' : ''}`} onClick={handleLike}>
          <HeartIcon filled={liked} />
          <span>{likeCount}</span>
        </button>
        {post.type === 'bake' && (
          <button className="feed-action-btn" onClick={() => onTabChange('bakes')}>
            <ScheduleIcon />
            <span>Schedule</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function HomeScreen({ onTabChange }) {
  const { user } = useAuth();
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, profiles(id, username, display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!postsData) { setLoading(false); return; }

    // find which posts the current user has liked
    const { data: myLikes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id);

    const likedSet = new Set((myLikes || []).map(l => l.post_id));
    setPosts(postsData.map(p => ({ ...p, user_liked: likedSet.has(p.id) })));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const handlePost = async ({ type, content, recipe_name }) => {
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: user.id, type, content, recipe_name })
      .select('*, profiles(id, username, display_name, avatar_url)')
      .single();

    if (!error && data) {
      setPosts(prev => [{ ...data, user_liked: false }, ...prev]);
    }
  };

  return (
    <div className="screen home-screen">
      <div className="screen-header">
        <span className="screen-title-brand">StarterSync</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Share</button>
      </div>

      {loading ? (
        <div className="feed-loading">
          {[1,2,3].map(i => <div key={i} className="feed-skeleton" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="feed-empty">
          <div className="feed-empty-icon">🍞</div>
          <div className="feed-empty-title">No posts yet</div>
          <div className="feed-empty-sub">Be the first to share a bake!</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
            Share your first bake
          </button>
        </div>
      ) : (
        <div className="feed">
          {posts.map((post, i) => (
            <div key={post.id} style={{ '--i': i }} className="feed-item-enter">
              <PostCard post={post} currentUserId={user.id} onTabChange={onTabChange} />
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreatePostModal onClose={() => setShowCreate(false)} onPost={handlePost} />
      )}
    </div>
  );
}
