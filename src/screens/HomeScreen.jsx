import { useState, useCallback } from 'react';
import { MOCK_POSTS, MOCK_USERS } from '../data/mockCommunity.js';
import { getLikes, toggleLike, getSaves, toggleSave } from '../utils/socialStorage.js';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Avatar({ user, size = 38 }) {
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {user.avatar}
    </div>
  );
}

function PostCard({ post, onTabChange }) {
  const user = MOCK_USERS.find(u => u.id === post.userId);
  const [liked,  setLiked]  = useState(() => getLikes().has(post.id));
  const [saved,  setSaved]  = useState(() => getSaves().has(post.id));
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = () => {
    const nowLiked = toggleLike(post.id);
    setLiked(nowLiked);
    setLikeCount(c => nowLiked ? c + 1 : c - 1);
  };

  return (
    <div className={`feed-card${post.type === 'tip' ? ' feed-card--tip' : ''}`}>
      <div className="feed-card-header">
        <Avatar user={user} />
        <div className="feed-card-meta">
          <span className="feed-card-name">{user.name}</span>
          <span className="feed-card-sub">@{user.handle} · {timeAgo(post.createdAt)}</span>
        </div>
        <span className={`feed-tag feed-tag--${post.type}`}>
          {post.type === 'bake' ? 'Bake' : 'Tip'}
        </span>
      </div>

      {post.image && (
        <div className="feed-card-img-wrap">
          <img src={post.image} alt={post.caption} className="feed-card-img" loading="lazy" />
        </div>
      )}

      <div className="feed-card-body">
        {post.recipeName && <div className="feed-recipe-label">{post.recipeName}</div>}
        <p className="feed-caption">{post.caption}</p>
      </div>

      <div className="feed-card-actions">
        <button className={`feed-action-btn${liked ? ' active' : ''}`} onClick={handleLike}>
          <HeartIcon filled={liked} />
          <span>{likeCount}</span>
        </button>
        <button className={`feed-action-btn${saved ? ' active saved' : ''}`} onClick={() => setSaved(toggleSave(post.id))}>
          <BookmarkIcon filled={saved} />
          <span>{saved ? 'Saved' : 'Save'}</span>
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

function ScheduleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function HomeScreen({ onTabChange }) {
  return (
    <div className="screen home-screen">
      <div className="screen-header">
        <span className="screen-title-brand">StarterSync</span>
        <span className="screen-title-sub">Community</span>
      </div>

      <div className="feed">
        {MOCK_POSTS.map((post, i) => (
          <div key={post.id} style={{ '--i': i }} className="feed-item-enter">
            <PostCard post={post} onTabChange={onTabChange} />
          </div>
        ))}
      </div>
    </div>
  );
}
