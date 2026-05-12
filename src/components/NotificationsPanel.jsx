import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ displayName, avatarUrl, size = 38 }) {
  const initials = (displayName || '?').slice(0, 2).toUpperCase();
  if (avatarUrl) return <img className="avatar" src={avatarUrl} alt={displayName} style={{ width: size, height: size, objectFit: 'cover' }} />;
  return <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</div>;
}

function notifMessage(type, actorName, postRecipeName) {
  const name = <strong>{actorName || 'Someone'}</strong>;
  switch (type) {
    case 'like':    return <>{name} liked your {postRecipeName ? `"${postRecipeName}"` : 'post'}</>;
    case 'comment': return <>{name} commented on your {postRecipeName ? `"${postRecipeName}"` : 'post'}</>;
    case 'follow':  return <>{name} started following you</>;
    default:        return <>{name} interacted with your post</>;
  }
}

function NotifRow({ notif }) {
  const actor = notif.actor;
  return (
    <div className={`notif-row${notif.read ? '' : ' notif-row--unread'}`}>
      <Avatar displayName={actor?.display_name} avatarUrl={actor?.avatar_url} size={40} />
      <div className="notif-body">
        <div className="notif-text">{notifMessage(notif.type, actor?.display_name, notif.post?.recipe_name)}</div>
        <div className="notif-time">{timeAgo(notif.created_at)}</div>
      </div>
      {!notif.read && <div className="notif-dot" />}
    </div>
  );
}

export default function NotificationsPanel({ userId, onClose }) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!notifications_actor_id_fkey(id, display_name, avatar_url),
          post:posts!notifications_post_id_fkey(id, recipe_name, content)
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(40);
      setNotifs(data || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="notif-panel" onClick={e => e.stopPropagation()}>
        <div className="notif-panel-header">
          <span className="notif-panel-title">Notifications</span>
          <button className="modal-close-btn" style={{ position: 'static' }} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="app-loading-spinner" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="feed-empty" style={{ padding: '40px 16px' }}>
            <div className="feed-empty-title">No notifications yet</div>
            <div className="feed-empty-sub">When people like or comment on your posts, you'll see it here.</div>
          </div>
        ) : (
          <div className="notif-list">
            {notifs.map(n => <NotifRow key={n.id} notif={n} />)}
          </div>
        )}
      </div>
    </div>
  );
}
