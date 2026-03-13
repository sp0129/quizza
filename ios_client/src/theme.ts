// Quizza unified color system — aligned with colorspec.md
// Dark navy-slate foundation with vibrant purple/blue brand and high-saturation feedback accents.
// Matches the palette in src/theme/colors.ts; this file serves screens that use the flat export shape.

export const colors = {
  bg: '#0F172A',                        // Primary background — deep navy slate
  surface: '#1E293B',                   // Card / elevated container
  surface2: '#334155',                  // Modals, overlays, elevated surface
  border: '#475569',                    // Divider / border
  borderSubtle: 'rgba(71,85,105,0.4)',  // Subtle separation
  textPrimary: '#F1F5F9',              // Near-white — 15.4:1 contrast on #0F172A
  textMuted: '#94A3B8',                // Muted blue-gray — 6.3:1 contrast
  green: '#22C55E',                     // Correct answer
  greenDark: '#16A34A',                 // Correct border / pressed state
  cyan: '#06B6D4',                      // Streak / bonus accent
  cyanDark: '#0E7490',                  // Cyan pressed state
  amber: '#F59E0B',                     // Score / rewards gold
  amberDark: '#B45309',                 // Gold pressed state
  red: '#EF4444',                       // Wrong answer / error
  purple: '#7C3AED',                    // Primary brand purple
  white: '#FFFFFF',
};

export const gradients = {
  bg: ['#0F172A', '#1E293B', '#0F172A'] as [string, string, string],
  game: ['#0F172A', '#1E293B', '#0F172A'] as [string, string, string],
};
