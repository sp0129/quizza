interface PizzaMascotProps {
  mood?: 'excited' | 'idle' | 'happy';
  size?: number;
  className?: string;
}

export default function PizzaMascot({ mood = 'idle', size = 120, className = '' }: PizzaMascotProps) {
  const mouthPath =
    mood === 'excited' ? 'M 68 108 Q 80 120 92 108' :
    mood === 'happy'   ? 'M 70 108 Q 80 116 90 108' :
                         'M 72 108 Q 80 113 88 108';

  return (
    <svg
      viewBox="0 0 160 180"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* ── Crust (top arc) ── */}
      <path
        d="M 20 70 Q 80 10 140 70 L 130 85 Q 80 30 30 85 Z"
        fill="#c87941"
      />
      {/* Crust highlight */}
      <path
        d="M 30 72 Q 80 22 130 72"
        fill="none"
        stroke="#e8a86a"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* ── Cheese body (triangle narrowing to tip) ── */}
      <polygon
        points="20,70 140,70 80,165"
        fill="#f5c842"
      />
      {/* Cheese shading on sides */}
      <polygon
        points="20,70 55,70 80,165"
        fill="#e8b830"
        opacity="0.4"
      />
      <polygon
        points="105,70 140,70 80,165"
        fill="#e8b830"
        opacity="0.4"
      />

      {/* ── Sauce patches ── */}
      <ellipse cx="65" cy="130" rx="12" ry="8" fill="#c0392b" opacity="0.7" />
      <ellipse cx="95" cy="140" rx="9"  ry="6" fill="#c0392b" opacity="0.7" />
      <ellipse cx="80" cy="155" rx="6"  ry="4" fill="#c0392b" opacity="0.6" />

      {/* ── Pepperoni ── */}
      <circle cx="68" cy="128" r="10" fill="#9b2335" />
      <circle cx="68" cy="128" r="7"  fill="#c0392b" />
      <circle cx="68" cy="126" r="2"  fill="#e05c5c" opacity="0.5" />

      <circle cx="95" cy="138" r="8"  fill="#9b2335" />
      <circle cx="95" cy="138" r="5"  fill="#c0392b" />
      <circle cx="95" cy="136" r="1.5" fill="#e05c5c" opacity="0.5" />

      {/* ── Left arm ── */}
      <path
        className="pizza-arm-left"
        d="M 28 78 Q 8 90 12 108"
        fill="none"
        stroke="#c87941"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* ── Right arm ── */}
      <path
        className="pizza-arm-right"
        d="M 132 78 Q 152 90 148 108"
        fill="none"
        stroke="#c87941"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* ── Nerd glasses ── */}
      {/* Bridge */}
      <line x1="72" y1="88" x2="88" y2="88" stroke="#2d2d2d" strokeWidth="2.5" />
      {/* Left temple */}
      <line x1="57" y1="86" x2="48" y2="82" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />
      {/* Right temple */}
      <line x1="103" y1="86" x2="112" y2="82" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />
      {/* Left frame */}
      <rect x="57" y="80" width="15" height="14" rx="4" ry="4" fill="none" stroke="#2d2d2d" strokeWidth="2.5" />
      {/* Right frame */}
      <rect x="88" y="80" width="15" height="14" rx="4" ry="4" fill="none" stroke="#2d2d2d" strokeWidth="2.5" />

      {/* ── Eyes ── */}
      {/* Left eye white */}
      <ellipse cx="64.5" cy="87" rx="5" ry="5.5" fill="white" />
      {/* Left pupil */}
      <ellipse cx="65" cy="87.5" rx="2.5" ry="3" fill="#1a1a2e" />
      {/* Left shine */}
      <circle cx="66.5" cy="85.5" r="1.2" fill="white" />

      {/* Right eye white */}
      <ellipse cx="95.5" cy="87" rx="5" ry="5.5" fill="white" />
      {/* Right pupil */}
      <ellipse cx="96" cy="87.5" rx="2.5" ry="3" fill="#1a1a2e" />
      {/* Right shine */}
      <circle cx="97.5" cy="85.5" r="1.2" fill="white" />

      {/* ── Blush marks ── */}
      <ellipse cx="55" cy="97" rx="7" ry="4" fill="#f87171" opacity="0.45" />
      <ellipse cx="105" cy="97" rx="7" ry="4" fill="#f87171" opacity="0.45" />

      {/* ── Mouth ── */}
      <path
        d={mouthPath}
        fill="none"
        stroke="#2d2d2d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
