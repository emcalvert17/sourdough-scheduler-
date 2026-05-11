import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { compressImage } from '../utils/photoStorage.js';
import { generateId } from '../utils/uuid.js';
import UserProfileModal from '../components/UserProfileModal.jsx';
import NotificationsPanel from '../components/NotificationsPanel.jsx';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Avatar({ displayName, avatarUrl, size = 38, onClick }) {
  const initials = (displayName || '?').slice(0, 2).toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.38, cursor: onClick ? 'pointer' : 'default' };
  if (avatarUrl) return <img className="avatar" src={avatarUrl} alt={displayName} style={{ ...style, objectFit: 'cover' }} onClick={onClick} />;
  return <div className="avatar" style={style} onClick={onClick}>{initials}</div>;
}

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function BookmarkIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function CommentRow({ comment }) {
  const p = comment.profiles;
  return (
    <div className="comment-row">
      <Avatar displayName={p?.display_name} avatarUrl={p?.avatar_url} size={28} />
      <div className="comment-body">
        <span className="comment-author">{p?.display_name || 'Baker'}</span>
        <span className="comment-text"> {comment.content}</span>
        <div className="comment-time">{timeAgo(comment.created_at)}</div>
      </div>
    </div>
  );
}

function CreatePostModal({ onClose, onPost }) {
  const [type,         setType]         = useState('bake');
  const [content,      setContent]      = useState('');
  const [recipeName,   setRecipeName]   = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imgLoading,   setImgLoading]   = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    try { setImagePreview(await compressImage(file)); }
    catch { alert('Could not process image.'); }
    finally { setImgLoading(false); e.target.value = ''; }
  };

  const [postError, setPostError] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setPostError('');
    try {
      await onPost({ type, content: content.trim(), recipe_name: recipeName.trim() || null, imagePreview });
      onClose();
    } catch (e) {
      setPostError(e.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Share with the community</h3>
        <div className="post-type-toggle">
          <button className={`post-type-btn${type === 'bake' ? ' active' : ''}`} onClick={() => setType('bake')}>Bake</button>
          <button className={`post-type-btn${type === 'tip'  ? ' active' : ''}`} onClick={() => setType('tip')}>Tip</button>
        </div>
        {type === 'bake' && (
          <div className="form-group">
            <label className="form-label">Recipe name <span className="form-optional">(optional)</span></label>
            <input className="form-input" placeholder="e.g. Country Sourdough"
              value={recipeName} onChange={e => setRecipeName(e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">{type === 'bake' ? 'How did the bake go?' : 'Share your tip'}</label>
          <textarea className="form-input form-textarea"
            placeholder={type === 'bake' ? 'Oven spring, crumb, crust — tell us everything!' : 'What sourdough wisdom would you pass on?'}
            value={content} onChange={e => setContent(e.target.value)} rows={4} />
        </div>
        {imagePreview ? (
          <div className="post-image-preview">
            <img src={imagePreview} alt="Preview" />
            <button className="remove-image-btn" onClick={() => setImagePreview(null)}>✕ Remove photo</button>
          </div>
        ) : (
          <button className="btn btn-ghost add-photo-btn" onClick={() => fileRef.current?.click()} disabled={imgLoading}>
            {imgLoading ? 'Processing…' : 'Add Photo'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        {postError && <div className="auth-error" style={{ marginTop: 12 }}>{postError}</div>}
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !content.trim()}>
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, currentUserId, currentProfile, onTabChange, onDeleted }) {
  const postProfile = post.profiles;
  const isOwn = postProfile?.id === currentUserId;

  const [liked,         setLiked]         = useState(() => post.user_liked);
  const [likeCount,     setLikeCount]     = useState(post.likes_count ?? 0);
  const [saved,         setSaved]         = useState(() => post.user_saved);
  const [liking,        setLiking]        = useState(false);
  const [saving,        setSaving]        = useState(false);

  const [showComments,   setShowComments]   = useState(false);
  const [comments,       setComments]       = useState([]);
  const [commentCount,   setCommentCount]   = useState(post.comments_count ?? 0);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentInput,   setCommentInput]   = useState('');
  const [sending,        setSending]        = useState(false);

  const [showMenu,       setShowMenu]       = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikeCount(c => nowLiked ? c + 1 : c - 1);
    if (nowLiked) {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: post.id });
      if (postProfile?.id !== currentUserId) {
        await supabase.from('notifications').insert({
          recipient_id: postProfile.id, actor_id: currentUserId, type: 'like', post_id: post.id,
        }).then(() => {});
      }
    } else {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', post.id);
    }
    setLiking(false);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const nowSaved = !saved;
    setSaved(nowSaved);
    if (nowSaved) {
      await supabase.from('saves').insert({ user_id: currentUserId, post_id: post.id });
    } else {
      await supabase.from('saves').delete().eq('user_id', currentUserId).eq('post_id', post.id);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    setDeleting(true);
    await supabase.from('posts').delete().eq('id', post.id);
    onDeleted(post.id);
  };

  const toggleComments = async () => {
    if (!showComments && !commentsLoaded) {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(id, username, display_name, avatar_url)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      setComments(data || []);
      setCommentsLoaded(true);
    }
    setShowComments(s => !s);
  };

  const submitComment = async () => {
    if (!commentInput.trim() || sending) return;
    const content = commentInput.trim();
    setCommentInput('');
    setSending(true);
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: currentUserId, content })
      .select('*, profiles(id, username, display_name, avatar_url)')
      .single();
    if (data) {
      setComments(prev => [...prev, data]);
      setCommentCount(c => c + 1);
      if (postProfile?.id !== currentUserId) {
        await supabase.from('notifications').insert({
          recipient_id: postProfile.id, actor_id: currentUserId, type: 'comment', post_id: post.id,
        }).then(() => {});
      }
    }
    setSending(false);
  };

  return (
    <div className={`feed-card${post.type === 'tip' ? ' feed-card--tip' : ''}${deleting ? ' feed-card--deleting' : ''}`}>
      <div className="feed-card-header">
        <div className="feed-header-clickable" onClick={() => setViewingProfile(postProfile?.id)}>
          <Avatar displayName={postProfile?.display_name} avatarUrl={postProfile?.avatar_url} />
          <div className="feed-card-meta">
            <span className="feed-card-name">{postProfile?.display_name || 'Baker'}</span>
            <span className="feed-card-sub">@{postProfile?.username} · {timeAgo(post.created_at)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className={`feed-tag feed-tag--${post.type}`}>{post.type === 'bake' ? 'Bake' : 'Tip'}</span>
          {isOwn && (
            <div style={{ position: 'relative' }}>
              <button className="btn btn-icon btn-ghost post-menu-btn" onClick={() => setShowMenu(s => !s)}>⋯</button>
              {showMenu && (
                <div className="post-menu-dropdown" onClick={() => setShowMenu(false)}>
                  <button className="post-menu-item post-menu-item--danger" onClick={handleDelete}>
                    Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
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
          <HeartIcon filled={liked} /><span>{likeCount > 0 ? likeCount : 'Like'}</span>
        </button>
        <button className={`feed-action-btn${showComments ? ' active' : ''}`} onClick={toggleComments}>
          <CommentIcon /><span>{commentCount > 0 ? commentCount : 'Comment'}</span>
        </button>
        <button className={`feed-action-btn${saved ? ' active saved' : ''}`} onClick={handleSave}>
          <BookmarkIcon filled={saved} /><span>{saved ? 'Saved' : 'Save'}</span>
        </button>
        {post.type === 'bake' && (
          <button className="feed-action-btn" onClick={() => onTabChange('bakes')}>
            <ScheduleIcon /><span>Schedule</span>
          </button>
        )}
      </div>

      {showComments && (
        <div className="comments-section">
          {commentsLoaded && comments.length === 0 && (
            <div className="comments-empty">No comments yet — be the first!</div>
          )}
          {comments.map(c => <CommentRow key={c.id} comment={c} />)}
          <div className="comment-input-row">
            <Avatar displayName={currentProfile?.display_name} avatarUrl={currentProfile?.avatar_url} size={28} />
            <input className="comment-input" placeholder="Add a comment…"
              value={commentInput} onChange={e => setCommentInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()} />
            <button className="btn btn-primary btn-sm" onClick={submitComment}
              disabled={!commentInput.trim() || sending}>{sending ? '…' : 'Post'}</button>
          </div>
        </div>
      )}

      {viewingProfile && viewingProfile !== currentUserId && (
        <UserProfileModal userId={viewingProfile} currentUserId={currentUserId} onClose={() => setViewingProfile(null)} />
      )}
    </div>
  );
}

export default function HomeScreen({ onTabChange }) {
  const { user, profile } = useAuth();
  const [posts,              setPosts]              = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [feedMode,           setFeedMode]           = useState('discover');
  const [showCreate,         setShowCreate]         = useState(false);
  const [showNotifications,  setShowNotifications]  = useState(false);
  const [unreadCount,        setUnreadCount]        = useState(0);

  const loadUnreadCount = useCallback(async () => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('read', false);
    setUnreadCount(count ?? 0);
  }, [user.id]);

  const loadFeed = useCallback(async (mode) => {
    setLoading(true);

    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (mode === 'following') {
      const { data: followingData } = await supabase
        .from('follows').select('following_id').eq('follower_id', user.id);
      const ids = [...(followingData || []).map(f => f.following_id), user.id];
      query = query.in('user_id', ids);
    }

    const { data: postsData, error: feedError } = await query;
    if (feedError) { console.error('Feed load error:', feedError); setLoading(false); return; }
    if (!postsData || postsData.length === 0) { setPosts([]); setLoading(false); return; }

    const userIds = [...new Set(postsData.map(p => p.user_id))];
    const [{ data: profiles }, { data: myLikes }, { data: mySaves }] = await Promise.all([
      supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds),
      supabase.from('likes').select('post_id').eq('user_id', user.id),
      supabase.from('saves').select('post_id').eq('user_id', user.id),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    const likedSet = new Set((myLikes || []).map(l => l.post_id));
    const savedSet = new Set((mySaves || []).map(s => s.post_id));
    setPosts(postsData.map(p => ({
      ...p,
      profiles: profileMap[p.user_id] || null,
      user_liked: likedSet.has(p.id),
      user_saved: savedSet.has(p.id),
    })));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { loadFeed(feedMode); }, [feedMode, loadFeed]);
  useEffect(() => { loadUnreadCount(); }, [loadUnreadCount]);

  const handlePost = async ({ type, content, recipe_name, imagePreview }) => {
    const postId = generateId();
    let image_url = null;
    if (imagePreview) {
      try {
        const blob = await fetch(imagePreview).then(r => r.blob());
        const { error: upErr } = await supabase.storage.from('post-images').upload(`posts/${postId}.jpg`, blob, { contentType: 'image/jpeg' });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(`posts/${postId}.jpg`);
          image_url = publicUrl;
        }
      } catch (e) { console.error('Image upload failed:', e); }
    }
    const { error } = await supabase
      .from('posts')
      .insert({ id: postId, user_id: user.id, type, content, recipe_name, image_url });
    if (error) throw new Error(error.message);
    await loadFeed(feedMode);
  };

  const handleDeleted = (postId) => setPosts(prev => prev.filter(p => p.id !== postId));

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    setUnreadCount(0);
    supabase.from('notifications').update({ read: true }).eq('recipient_id', user.id).eq('read', false).then(() => {});
  };

  const emptyFollowing = feedMode === 'following' && !loading && posts.length === 0;

  return (
    <div className="screen home-screen">
      <div className="screen-header">
        <span className="screen-title-brand">StarterSync</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-icon notif-btn" onClick={handleOpenNotifications}>
            <BellIcon />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Share</button>
        </div>
      </div>

      <div className="feed-mode-toggle">
        <button className={`feed-mode-btn${feedMode === 'discover'   ? ' active' : ''}`} onClick={() => setFeedMode('discover')}>Discover</button>
        <button className={`feed-mode-btn${feedMode === 'following'  ? ' active' : ''}`} onClick={() => setFeedMode('following')}>Following</button>
      </div>

      {loading ? (
        <div className="feed-loading">{[1,2,3].map(i => <div key={i} className="feed-skeleton" />)}</div>
      ) : emptyFollowing ? (
        <div className="feed-empty">
          <div className="feed-empty-title">No posts from people you follow yet</div>
          <div className="feed-empty-sub">Find bakers to follow on your Profile tab</div>
          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setFeedMode('discover')}>Browse Discover</button>
        </div>
      ) : posts.length === 0 ? (
        <div className="feed-empty">
          <div className="feed-empty-title">No posts yet</div>
          <div className="feed-empty-sub">Be the first to share a bake!</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>Share your first bake</button>
        </div>
      ) : (
        <div className="feed">
          {posts.map((post, i) => (
            <div key={post.id} style={{ '--i': i }} className="feed-item-enter">
              <PostCard post={post} currentUserId={user.id} currentProfile={profile}
                onTabChange={onTabChange} onDeleted={handleDeleted} />
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} onPost={handlePost} />}
      {showNotifications && <NotificationsPanel userId={user.id} onClose={() => setShowNotifications(false)} />}
    </div>
  );
}
