type Mood = 'excited' | 'idle' | 'happy' | 'thinking' | 'celebrating' | 'wrong';

interface PizzaMascotProps {
  mood?: Mood;
  size?: number;
  className?: string;
}

interface MoodConfig {
  mouth: string;
  leftArm: string;
  rightArm: string;
  tongue: boolean;
  // pupil y-offset from baseline (87.5)
  pupilDY: number;
}

const MOOD: Record<Mood, MoodConfig> = {
  idle: {
    mouth:    'M 72 108 Q 80 113 88 108',
    leftArm:  'M 28 78 Q 8 90 12 108',
    rightArm: 'M 132 78 Q 152 90 148 108',
    tongue: false, pupilDY: 0,
  },
  happy: {
    mouth:    'M 70 108 Q 80 116 90 108',
    leftArm:  'M 28 78 Q 8 90 12 108',
    rightArm: 'M 132 78 Q 152 90 148 108',
    tongue: false, pupilDY: 0,
  },
  excited: {
    mouth:    'M 68 108 Q 80 120 92 108',
    leftArm:  'M 28 78 Q 8 90 12 108',
    rightArm: 'M 132 78 Q 152 90 148 108',
    tongue: false, pupilDY: 0,
  },
  // Right arm raised toward chin, eyes glance up-right, small "hmm" mouth
  thinking: {
    mouth:    'M 75 107 Q 80 110 85 107',
    leftArm:  'M 28 78 Q 8 90 12 108',
    rightArm: 'M 132 78 Q 122 66 107 82',
    tongue: false, pupilDY: -1.5,
  },
  // Both arms raised, huge open smile, eyes wide
  celebrating: {
    mouth:    'M 63 104 Q 80 124 97 104',
    leftArm:  'M 28 78 Q 8 56 20 40',
    rightArm: 'M 132 78 Q 152 56 140 40',
    tongue: false, pupilDY: -1,
  },
  // Both arms drooped, sad mouth, tongue out, eyes look down
  wrong: {
    mouth:    'M 70 113 Q 80 107 90 113',
    leftArm:  'M 28 78 Q 4 96 5 118',
    rightArm: 'M 132 78 Q 156 96 155 118',
    tongue: true, pupilDY: 2,
  },
};

export default function PizzaMascot({ mood = 'idle', size = 120, className = '' }: PizzaMascotProps) {
  const cfg = MOOD[mood];

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
      <path d="M 20 70 Q 80 10 140 70 L 130 85 Q 80 30 30 85 Z" fill="#c87941" />
      <path d="M 30 72 Q 80 22 130 72" fill="none" stroke="#e8a86a" strokeWidth="4" strokeLinecap="round" />

      {/* ── Cheese body ── */}
      <polygon points="20,70 140,70 80,165" fill="#f5c842" />
      <polygon points="20,70 55,70 80,165"  fill="#e8b830" opacity="0.4" />
      <polygon points="105,70 140,70 80,165" fill="#e8b830" opacity="0.4" />

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

      {/* ── Arms (mood-driven paths) ── */}
      <path className="pizza-arm-left"  d={cfg.leftArm}  fill="none" stroke="#c87941" strokeWidth="10" strokeLinecap="round" />
      <path className="pizza-arm-right" d={cfg.rightArm} fill="none" stroke="#c87941" strokeWidth="10" strokeLinecap="round" />

      {/* ── Thought bubbles for thinking ── */}
      {mood === 'thinking' && (
        <>
          <circle cx="122" cy="64" r="3"   fill="#f5c842" opacity="0.75" />
          <circle cx="133" cy="52" r="4.5" fill="#f5c842" opacity="0.75" />
          <circle cx="146" cy="38" r="6.5" fill="#f5c842" opacity="0.75" />
        </>
      )}

      {/* ── Nerd glasses ── */}
      <line x1="72" y1="88" x2="88" y2="88" stroke="#2d2d2d" strokeWidth="2.5" />
      <line x1="57" y1="86" x2="48" y2="82" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="103" y1="86" x2="112" y2="82" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="57" y="80" width="15" height="14" rx="4" ry="4" fill="none" stroke="#2d2d2d" strokeWidth="2.5" />
      <rect x="88" y="80" width="15" height="14" rx="4" ry="4" fill="none" stroke="#2d2d2d" strokeWidth="2.5" />

      {/* ── Eyes ── */}
      <ellipse cx="64.5" cy="87" rx="5" ry="5.5" fill="white" />
      <ellipse cx="65"   cy={87.5 + cfg.pupilDY} rx="2.5" ry="3" fill="#1a1a2e" />
      <circle  cx="66.5" cy={85.5 + cfg.pupilDY} r="1.2" fill="white" />

      <ellipse cx="95.5" cy="87" rx="5" ry="5.5" fill="white" />
      <ellipse cx="96"   cy={87.5 + cfg.pupilDY} rx="2.5" ry="3" fill="#1a1a2e" />
      <circle  cx="97.5" cy={85.5 + cfg.pupilDY} r="1.2" fill="white" />

      {/* ── Sad brows for wrong ── */}
      {mood === 'wrong' && (
        <>
          <line x1="58" y1="79" x2="71" y2="82" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="89" y1="82" x2="102" y2="79" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* ── Blush marks ── */}
      <ellipse cx="55"  cy="97" rx="7" ry="4" fill="#f87171" opacity="0.45" />
      <ellipse cx="105" cy="97" rx="7" ry="4" fill="#f87171" opacity="0.45" />

      {/* ── Mouth ── */}
      <path d={cfg.mouth} fill="none" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />

      {/* ── Tongue (wrong only) ── */}
      {cfg.tongue && (
        <ellipse cx="80" cy="118" rx="7" ry="5" fill="#f472b6" />
      )}
    </svg>
  );
}
