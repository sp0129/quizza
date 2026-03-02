interface FloatingIconsProps {
  emoji: string;
}

// Fixed scatter positions — mix of edges AND center so the space below
// the question card doesn't look bare. Each gets its own size, opacity,
// float duration and delay so they move independently.
const SPOTS = [
  // ── top strip ──
  { top:  3, left:  5, size: 2.6, opacity: 0.40, dur: 5.2, delay: 0.0  },
  { top:  6, left: 80, size: 3.4, opacity: 0.35, dur: 6.8, delay: 1.1  },
  { top: 14, left: 48, size: 2.8, opacity: 0.32, dur: 6.4, delay: 1.8  },
  { top: 18, left: 15, size: 2.0, opacity: 0.37, dur: 5.8, delay: 0.6  },
  { top: 24, left: 88, size: 3.8, opacity: 0.33, dur: 7.4, delay: 2.0  },
  // ── upper-center band ──
  { top: 32, left: 35, size: 2.4, opacity: 0.37, dur: 6.0, delay: 0.8  },
  { top: 36, left: 62, size: 2.8, opacity: 0.34, dur: 5.6, delay: 2.6  },
  // ── left / right edges ──
  { top: 42, left:  3, size: 2.8, opacity: 0.38, dur: 6.2, delay: 0.3  },
  { top: 50, left: 86, size: 3.2, opacity: 0.34, dur: 5.6, delay: 1.7  },
  // ── center — the "blank space under questions" ──
  { top: 46, left: 42, size: 3.0, opacity: 0.36, dur: 7.2, delay: 1.0  },
  { top: 54, left: 60, size: 2.2, opacity: 0.33, dur: 6.8, delay: 3.2  },
  { top: 60, left: 30, size: 3.4, opacity: 0.37, dur: 5.8, delay: 0.5  },
  { top: 66, left: 52, size: 2.6, opacity: 0.35, dur: 7.0, delay: 2.2  },
  // ── lower strip ──
  { top: 62, left: 10, size: 3.6, opacity: 0.34, dur: 7.0, delay: 2.4  },
  { top: 70, left: 74, size: 2.4, opacity: 0.38, dur: 5.4, delay: 0.9  },
  { top: 80, left: 30, size: 3.0, opacity: 0.36, dur: 6.6, delay: 1.4  },
  { top: 88, left: 82, size: 2.2, opacity: 0.37, dur: 5.0, delay: 0.5  },
];

export default function FloatingIcons({ emoji }: FloatingIconsProps) {
  if (!emoji) return null;

  return (
    <div className="floating-icons-layer" aria-hidden="true">
      {SPOTS.map((s, i) => (
        <span
          key={i}
          className="floating-icon"
          style={{
            top:              `${s.top}%`,
            left:             `${s.left}%`,
            fontSize:         `${s.size}rem`,
            opacity:          s.opacity,
            animationDuration:`${s.dur}s`,
            animationDelay:   `${s.delay}s`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
