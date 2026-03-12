// Quizza color system
// Dark foundation palette inspired by Tailwind Slate, with trivia-game accent colors.
// Feedback colors follow the universal trivia convention: green = correct, red = wrong.
// Timer colors use a progressive urgency gradient: blue → yellow → orange → pulsing red.

export const colors = {
  // Foundation — dark slate backgrounds
  bg: {
    primary: '#0F172A',     // Main screen background
    surface: '#1E293B',     // Card / elevated container
    elevated: '#334155',    // Modals, overlays
  },
  border: '#475569',

  // Brand
  brand: {
    primary: '#7C3AED',     // Purple accent
    secondary: '#2563EB',   // Blue accent
  },

  // Answer button default — calm blue that doesn't bias toward correct/wrong
  button: '#3B82F6',
  buttonBorder: '#2563EB',

  // Feedback — immediate, unmistakable state communication
  correct: '#22C55E',       // Green for correct answers
  correctBg: 'rgba(34,197,94,0.15)',
  wrong: '#EF4444',         // Red for wrong answers
  wrongBg: 'rgba(239,68,68,0.15)',

  // Timer urgency gradient
  timer: {
    safe: '#3B82F6',        // Blue — plenty of time
    warning: '#F59E0B',     // Yellow — 50% time left
    danger: '#F97316',      // Orange — 25% time left
    critical: '#EF4444',    // Pulsing red — below 10s
  },

  // Scoring & accents
  gold: '#F59E0B',
  goldMax: '#FFD700',
  cyan: '#06B6D4',
  cta: '#F97316',

  // Text — high contrast on dark backgrounds (passes WCAG AA)
  text: {
    primary: '#F1F5F9',     // 15.4:1 contrast on #0F172A
    secondary: '#94A3B8',   // 6.3:1 contrast on #0F172A
    onButton: '#FFFFFF',    // White text on colored buttons
  },
};

// Background gradients for LinearGradient
export const gradients = {
  game: ['#0F172A', '#1E293B', '#0F172A'] as [string, string, string],
};
