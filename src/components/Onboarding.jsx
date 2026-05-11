import { useState } from 'react';
import { saveProfile } from '../utils/socialStorage.js';

const SLIDES = [
  {
    id: 'welcome',
    illustration: <BreadIllustration />,
    title: 'Welcome to StarterSync',
    body: 'The sourdough scheduler built for bakers who take their crumb seriously.',
  },
  {
    id: 'schedule',
    illustration: <ClockIllustration />,
    title: 'Perfect timing, every time',
    body: 'Tell us when you want to eat. We work backwards through every fold, proof, and feed.',
  },
  {
    id: 'community',
    illustration: <CommunityIllustration />,
    title: 'Bake with the community',
    body: 'Share your loaves, discover tips, and follow bakers who inspire you.',
  },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep]           = useState(0); // 0–2 = slides, 3 = profile form
  const [name, setName]           = useState('');
  const [starterName, setStarterName] = useState('');
  const [location, setLocation]   = useState('');
  const [bio, setBio]             = useState('');

  const isSlide   = step < SLIDES.length;
  const isLast    = step === SLIDES.length - 1;
  const slide     = isSlide ? SLIDES[step] : null;
  const progress  = isSlide ? step / (SLIDES.length) : 1;

  const handleNext = () => {
    if (isLast) { setStep(SLIDES.length); return; }
    setStep(s => s + 1);
  };

  const handleSave = () => {
    if (!name.trim()) { alert('Please enter your name to get started.'); return; }
    const handle = name.trim().toLowerCase().replace(/\s+/g, '_');
    saveProfile({
      name: name.trim(),
      handle,
      starterName: starterName.trim(),
      location: location.trim(),
      bio: bio.trim(),
      updatedAt: new Date().toISOString(),
    });
    onComplete();
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding">
        {/* Progress bar */}
        <div className="onboarding-progress">
          <div className="onboarding-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>

        {isSlide ? (
          <div key={step} className="onboarding-slide">
            <div className="onboarding-illustration">{slide.illustration}</div>
            <h2 className="onboarding-title">{slide.title}</h2>
            <p className="onboarding-body">{slide.body}</p>

            <div className="onboarding-dots">
              {SLIDES.map((_, i) => (
                <div key={i} className={`onboarding-dot${i === step ? ' active' : ''}`} />
              ))}
            </div>

            <button className="btn btn-primary btn-lg onboarding-cta" onClick={handleNext}>
              {isLast ? 'Get Started' : 'Next'}
            </button>

            {!isLast && (
              <button className="btn btn-ghost onboarding-skip" onClick={() => setStep(SLIDES.length)}>
                Skip
              </button>
            )}
          </div>
        ) : (
          <div key="profile" className="onboarding-slide onboarding-profile">
            <div className="onboarding-profile-icon">
              {name ? name.slice(0, 2).toUpperCase() : '?'}
            </div>
            <h2 className="onboarding-title">Tell us about yourself</h2>
            <p className="onboarding-body" style={{ marginBottom: 28 }}>
              Just the basics — you can always update this later.
            </p>

            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input className="form-input" placeholder="e.g. Alex Baker"
                value={name} onChange={e => setName(e.target.value)}
                autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">Starter's Name (optional)</label>
              <input className="form-input" placeholder="e.g. Bubbles, Doughvid, Levain Eastwood…"
                value={starterName} onChange={e => setStarterName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Location (optional)</label>
              <input className="form-input" placeholder="e.g. Portland, OR"
                value={location} onChange={e => setLocation(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Bio (optional)</label>
              <input className="form-input" placeholder="What's your sourdough story?"
                value={bio} onChange={e => setBio(e.target.value)} />
            </div>

            <button className="btn btn-primary btn-lg onboarding-cta" onClick={handleSave}
              style={{ marginTop: 28 }}>
              Start Baking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BreadIllustration() {
  return (
    <svg width="160" height="120" viewBox="0 0 160 120" fill="none">
      <ellipse cx="80" cy="90" rx="70" ry="18" fill="#e4d4c0" opacity="0.6" />
      <path d="M20 80 Q30 30 80 25 Q130 30 140 80 Q120 95 80 97 Q40 95 20 80Z"
        fill="#c07845" />
      <path d="M30 78 Q40 35 80 30 Q120 35 130 78"
        fill="#a05a2c" />
      <path d="M55 50 Q80 38 105 50" stroke="#d4904a" strokeWidth="2.5"
        strokeLinecap="round" fill="none" />
      <path d="M60 42 Q80 33 100 42" stroke="#d4904a" strokeWidth="1.5"
        strokeLinecap="round" fill="none" opacity="0.6" />
      <ellipse cx="80" cy="88" rx="50" ry="9" fill="#7b4f2e" opacity="0.15" />
    </svg>
  );
}

function ClockIllustration() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
      <circle cx="70" cy="70" r="58" fill="#fef3e8" stroke="#e4d4c0" strokeWidth="2.5" />
      <circle cx="70" cy="70" r="50" fill="none" stroke="#c07845" strokeWidth="1.5" opacity="0.3" />
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const a = (i * 30 - 90) * Math.PI / 180;
        const r1 = i % 3 === 0 ? 42 : 45;
        return (
          <line key={i}
            x1={70 + r1 * Math.cos(a)} y1={70 + r1 * Math.sin(a)}
            x2={70 + 49 * Math.cos(a)} y2={70 + 49 * Math.sin(a)}
            stroke="#c07845" strokeWidth={i % 3 === 0 ? 2.5 : 1.2}
            strokeLinecap="round" opacity={i % 3 === 0 ? 0.9 : 0.4}
          />
        );
      })}
      <line x1="70" y1="70" x2="70" y2="34" stroke="#6b3d1e" strokeWidth="3" strokeLinecap="round" />
      <line x1="70" y1="70" x2="95" y2="70" stroke="#b8682e" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="70" cy="70" r="4" fill="#6b3d1e" />
    </svg>
  );
}

function CommunityIllustration() {
  const users = [
    { x: 40,  y: 70,  initials: 'MC', color: '#6b3d1e' },
    { x: 100, y: 70,  initials: 'TE', color: '#2d6b4a' },
    { x: 70,  y: 42,  initials: 'LF', color: '#b8682e' },
  ];
  return (
    <svg width="160" height="130" viewBox="0 0 160 130" fill="none">
      <line x1="70" y1="52" x2="48" y2="62" stroke="#e4d4c0" strokeWidth="2" />
      <line x1="70" y1="52" x2="92" y2="62" stroke="#e4d4c0" strokeWidth="2" />
      <line x1="48" y1="78" x2="92" y2="78" stroke="#e4d4c0" strokeWidth="2" />
      {users.map(u => (
        <g key={u.initials}>
          <circle cx={u.x} cy={u.y} r="22" fill={u.color} opacity="0.12" />
          <circle cx={u.x} cy={u.y} r="18" fill={u.color} />
          <text x={u.x} y={u.y + 5} textAnchor="middle"
            fill="#fff" fontSize="11" fontWeight="800" fontFamily="system-ui">
            {u.initials}
          </text>
        </g>
      ))}
      <circle cx="126" cy="48" r="10" fill="#fef3e8" stroke="#e4d4c0" strokeWidth="1.5" />
      <text x="126" y="53" textAnchor="middle" fill="#c07845" fontSize="12">♥</text>
      <circle cx="30" cy="98" r="10" fill="#fef3e8" stroke="#e4d4c0" strokeWidth="1.5" />
      <text x="30" y="103" textAnchor="middle" fill="#2d6b4a" fontSize="11">✓</text>
    </svg>
  );
}
