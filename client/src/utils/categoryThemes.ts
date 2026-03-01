export interface CategoryTheme {
  gradient: string;
  accent: string;
  emoji: string;
}

const DEFAULT_THEME: CategoryTheme = {
  gradient: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
  accent: '#6366f1',
  emoji: '🧠',
};

// Map by Open Trivia DB category ID
const ID_MAP: Record<number, CategoryTheme> = {
  9:  { gradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', accent: '#38bdf8', emoji: '🌍' }, // General Knowledge
  10: { gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', accent: '#a78bfa', emoji: '📚' }, // Books
  11: { gradient: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)', accent: '#fb923c', emoji: '🎬' }, // Film
  12: { gradient: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)', accent: '#c084fc', emoji: '🎵' }, // Music
  13: { gradient: 'linear-gradient(135deg, #14532d 0%, #052e16 100%)', accent: '#4ade80', emoji: '🎭' }, // Musicals & Theatres
  14: { gradient: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)', accent: '#fde047', emoji: '📺' }, // Television
  15: { gradient: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 100%)', accent: '#f97316', emoji: '🎮' }, // Video Games
  16: { gradient: 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)', accent: '#60a5fa', emoji: '🎲' }, // Board Games
  17: { gradient: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', accent: '#34d399', emoji: '🔬' }, // Science & Nature
  18: { gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 100%)', accent: '#22d3ee', emoji: '💻' }, // Computers
  19: { gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', accent: '#93c5fd', emoji: '➕' }, // Mathematics
  20: { gradient: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)', accent: '#d4a574', emoji: '🏛️' }, // Mythology
  21: { gradient: 'linear-gradient(135deg, #0f4c75 0%, #1b262c 100%)', accent: '#38bdf8', emoji: '⚽' }, // Sports
  22: { gradient: 'linear-gradient(135deg, #14532d 0%, #1a3a1a 100%)', accent: '#86efac', emoji: '🗺️' }, // Geography
  23: { gradient: 'linear-gradient(135deg, #7c2d12 0%, #431407 100%)', accent: '#fb923c', emoji: '⚔️' }, // History
  24: { gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', accent: '#818cf8', emoji: '🏛️' }, // Politics
  25: { gradient: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)', accent: '#f5d0a9', emoji: '🎨' }, // Art
  26: { gradient: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', accent: '#86efac', emoji: '⭐' }, // Celebrities
  27: { gradient: 'linear-gradient(135deg, #1e3a5f 0%, #164e63 100%)', accent: '#67e8f9', emoji: '🐾' }, // Animals
  28: { gradient: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)', accent: '#fcd34d', emoji: '🚗' }, // Vehicles
  29: { gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', accent: '#a78bfa', emoji: '📖' }, // Comics
  30: { gradient: 'linear-gradient(135deg, #172554 0%, #0f172a 100%)', accent: '#7dd3fc', emoji: '📡' }, // Gadgets
  31: { gradient: 'linear-gradient(135deg, #1a0936 0%, #2e1065 100%)', accent: '#d8b4fe', emoji: '🎌' }, // Anime & Manga
  32: { gradient: 'linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)', accent: '#38bdf8', emoji: '🃏' }, // Cartoon & Animations
};

// Keyword fallbacks for custom / unmapped categories
const KEYWORD_MAP: Array<[string, CategoryTheme]> = [
  ['formula 1',   { gradient: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)', accent: '#f87171', emoji: '🏎️' }],
  ['formula one', { gradient: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)', accent: '#f87171', emoji: '🏎️' }],
  ['f1',          { gradient: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)', accent: '#f87171', emoji: '🏎️' }],
  ['anime',       { gradient: 'linear-gradient(135deg, #1a0936 0%, #2e1065 100%)', accent: '#d8b4fe', emoji: '🎌' }],
  ['manga',       { gradient: 'linear-gradient(135deg, #1a0936 0%, #2e1065 100%)', accent: '#d8b4fe', emoji: '🎌' }],
  ['science',     { gradient: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', accent: '#34d399', emoji: '🔬' }],
  ['nature',      { gradient: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', accent: '#34d399', emoji: '🌿' }],
  ['history',     { gradient: 'linear-gradient(135deg, #7c2d12 0%, #431407 100%)', accent: '#fb923c', emoji: '⚔️' }],
  ['sport',       { gradient: 'linear-gradient(135deg, #0f4c75 0%, #1b262c 100%)', accent: '#38bdf8', emoji: '⚽' }],
  ['music',       { gradient: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)', accent: '#c084fc', emoji: '🎵' }],
  ['film',        { gradient: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)', accent: '#fb923c', emoji: '🎬' }],
  ['movie',       { gradient: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)', accent: '#fb923c', emoji: '🎬' }],
  ['geography',   { gradient: 'linear-gradient(135deg, #14532d 0%, #1a3a1a 100%)', accent: '#86efac', emoji: '🗺️' }],
  ['computer',    { gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 100%)', accent: '#22d3ee', emoji: '💻' }],
  ['video game',  { gradient: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 100%)', accent: '#f97316', emoji: '🎮' }],
  ['television',  { gradient: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)', accent: '#fde047', emoji: '📺' }],
  ['tv',          { gradient: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)', accent: '#fde047', emoji: '📺' }],
  ['art',         { gradient: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)', accent: '#f5d0a9', emoji: '🎨' }],
  ['animal',      { gradient: 'linear-gradient(135deg, #1e3a5f 0%, #164e63 100%)', accent: '#67e8f9', emoji: '🐾' }],
  ['math',        { gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', accent: '#93c5fd', emoji: '➕' }],
  ['book',        { gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', accent: '#a78bfa', emoji: '📚' }],
  ['politi',      { gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', accent: '#818cf8', emoji: '🏛️' }],
  ['mytholog',    { gradient: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)', accent: '#d4a574', emoji: '🏺' }],
  ['cartoon',     { gradient: 'linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)', accent: '#38bdf8', emoji: '🃏' }],
  ['comic',       { gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', accent: '#a78bfa', emoji: '💥' }],
  ['celebrit',    { gradient: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', accent: '#86efac', emoji: '⭐' }],
  ['vehicle',     { gradient: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)', accent: '#fcd34d', emoji: '🚗' }],
  ['gadget',      { gradient: 'linear-gradient(135deg, #172554 0%, #0f172a 100%)', accent: '#7dd3fc', emoji: '📡' }],
  ['board game',  { gradient: 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)', accent: '#60a5fa', emoji: '🎲' }],
];

export function getCategoryTheme(categoryName: string, categoryId?: number): CategoryTheme {
  if (categoryId !== undefined && ID_MAP[categoryId]) {
    return ID_MAP[categoryId];
  }
  const lower = categoryName.toLowerCase();
  for (const [keyword, theme] of KEYWORD_MAP) {
    if (lower.includes(keyword)) return theme;
  }
  return DEFAULT_THEME;
}
