const TABS = [
  { id: 'home',    label: 'Feed',    icon: FeedIcon    },
  { id: 'bakes',   label: 'Bakes',   icon: BakesIcon   },
  { id: 'starter', label: 'Starter', icon: StarterIcon },
  { id: 'gallery', label: 'Gallery', icon: GalleryIcon },
  { id: 'profile', label: 'Profile', icon: ProfileIcon },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-tab${isActive ? ' nav-tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <Icon active={isActive} />
            <span className="nav-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* Feed — a folded newspaper / scroll */
function FeedIcon({ active }) {
  const w = active ? 2.2 : 1.6;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M15 4h3a2 2 0 0 1 2 2v11" />
      <line x1="6" y1="9"  x2="13" y2="9" />
      <line x1="6" y1="13" x2="11" y2="13" />
    </svg>
  );
}

/* Bakes — a scored boule loaf */
function BakesIcon({ active }) {
  const w = active ? 2.2 : 1.6;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {/* base / tray */}
      <path d="M3 18h18" />
      {/* loaf dome */}
      <path d="M5 18c0-5.5 2.5-9 7-9s7 3.5 7 9" />
      {/* score lines on top — the baker's signature */}
      <path d="M9.5 11.5c1.5-2 3.5-2 5-1" strokeWidth={w * 0.75} />
      <path d="M8.5 14c1.5-1.5 4-1.5 5.5-0.5" strokeWidth={w * 0.75} />
    </svg>
  );
}

/* Starter — mason jar with bubbles */
function StarterIcon({ active }) {
  const w = active ? 2.2 : 1.6;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {/* jar neck */}
      <path d="M9.5 4.5h5" />
      {/* lid band */}
      <rect x="8" y="5.5" width="8" height="2" rx="0.5" />
      {/* jar body */}
      <path d="M7 7.5v11c0 .8.9 1.5 2 1.5h6c1.1 0 2-.7 2-1.5v-11" />
      {/* bubbles */}
      <circle cx="10.5" cy="13" r="1"   fill="currentColor" stroke="none" opacity="0.5" />
      <circle cx="14"   cy="11" r="0.8" fill="currentColor" stroke="none" opacity="0.4" />
      <circle cx="12"   cy="15.5" r="0.7" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

/* Gallery — polaroid with a little landscape inside */
function GalleryIcon({ active }) {
  const w = active ? 2.2 : 1.6;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {/* polaroid outer frame */}
      <rect x="3" y="3" width="18" height="17" rx="2" />
      {/* white bottom strip of polaroid */}
      <line x1="3" y1="17" x2="21" y2="17" />
      {/* landscape inside */}
      <circle cx="8" cy="9" r="1.5" />
      <path d="M5 14l4-4 3 3 3-2 4 3" />
    </svg>
  );
}

/* Profile — hand-drawn person with slight character */
function ProfileIcon({ active }) {
  const w = active ? 2.2 : 1.6;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {/* head — slightly organic oval */}
      <path d="M12 3.5c-2.5 0-4.5 1.8-4.5 4s2 4 4.5 4 4.5-1.8 4.5-4-2-4-4.5-4z" />
      {/* shoulders / body */}
      <path d="M4.5 20.5c0-4 3.4-7 7.5-7s7.5 3 7.5 7" />
    </svg>
  );
}
