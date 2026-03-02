interface FloatingIconsProps {
  emoji: string;
}

// Fixed scatter positions — biased toward edges/corners so they don't
// crowd the centred content column. Each gets its own size, opacity,
// float duration and delay so they move independently.
const SPOTS = [
  { top:  3, left:  5, size: 2.6, opacity: 0.18, dur: 5.2, delay: 0    },
  { top:  7, left: 78, size: 3.4, opacity: 0.14, dur: 6.8, delay: 1.1  },
  { top: 18, left: 14, size: 2.0, opacity: 0.16, dur: 5.8, delay: 0.6  },
  { top: 25, left: 88, size: 4.0, opacity: 0.11, dur: 7.4, delay: 2.0  },
  { top: 40, left:  3, size: 2.8, opacity: 0.15, dur: 6.2, delay: 0.3  },
  { top: 48, left: 84, size: 3.2, opacity: 0.13, dur: 5.6, delay: 1.7  },
  { top: 62, left: 10, size: 3.6, opacity: 0.12, dur: 7.0, delay: 2.4  },
  { top: 70, left: 72, size: 2.4, opacity: 0.17, dur: 5.4, delay: 0.9  },
  { top: 82, left: 28, size: 3.0, opacity: 0.14, dur: 6.6, delay: 1.4  },
  { top: 88, left: 82, size: 2.2, opacity: 0.16, dur: 5.0, delay: 0.5  },
  { top: 55, left: 50, size: 1.8, opacity: 0.09, dur: 8.0, delay: 3.0  },
  { top: 14, left: 50, size: 2.8, opacity: 0.10, dur: 6.4, delay: 1.8  },
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
