export interface CategoryTheme {
  gradient: string;
  accent: string;
  emoji: string;
}

const DEFAULT_THEME: CategoryTheme = {
  gradient: 'linear-gradient(135deg, #e0e7ff 0%, #f5f3ff 100%)',
  accent: '#6366f1',
  emoji: '🧠',
};

// Map by Open Trivia DB category ID (and local custom IDs ≥ 2000)
const ID_MAP: Record<number, CategoryTheme> = {
  // Custom local categories
  2001: { gradient: 'linear-gradient(135deg, #a7f3d0 0%, #ecfdf5 100%)', accent: '#059669', emoji: '🧪' }, // Chemistry
  2002: { gradient: 'linear-gradient(135deg, #bbf7d0 0%, #f0fdf4 100%)', accent: '#16a34a', emoji: '🧬' }, // Biology
  2003: { gradient: 'linear-gradient(135deg, #e9d5ff 0%, #fdf4ff 100%)', accent: '#9333ea', emoji: '⚡' }, // Harry Potter
  2004: { gradient: 'linear-gradient(135deg, #e7e5e4 0%, #fafaf9 100%)', accent: '#dc2626', emoji: '🐉' }, // Game of Thrones
  9:  { gradient: 'linear-gradient(135deg, #bae6fd 0%, #f0f9ff 100%)', accent: '#0284c7', emoji: '🌍' }, // General Knowledge
  10: { gradient: 'linear-gradient(135deg, #ddd6fe 0%, #f5f3ff 100%)', accent: '#7c3aed', emoji: '📚' }, // Books
  11: { gradient: 'linear-gradient(135deg, #fde68a 0%, #fffbeb 100%)', accent: '#d97706', emoji: '🎬' }, // Film
  12: { gradient: 'linear-gradient(135deg, #e9d5ff 0%, #fdf4ff 100%)', accent: '#9333ea', emoji: '🎵' }, // Music
  13: { gradient: 'linear-gradient(135deg, #bbf7d0 0%, #f0fdf4 100%)', accent: '#16a34a', emoji: '🎭' }, // Musicals & Theatres
  14: { gradient: 'linear-gradient(135deg, #fef08a 0%, #fefce8 100%)', accent: '#ca8a04', emoji: '📺' }, // Television
  15: { gradient: 'linear-gradient(135deg, #fed7aa 0%, #fff7ed 100%)', accent: '#ea580c', emoji: '🎮' }, // Video Games
  16: { gradient: 'linear-gradient(135deg, #bfdbfe 0%, #eff6ff 100%)', accent: '#2563eb', emoji: '🎲' }, // Board Games
  17: { gradient: 'linear-gradient(135deg, #a7f3d0 0%, #ecfdf5 100%)', accent: '#059669', emoji: '🔬' }, // Science & Nature
  18: { gradient: 'linear-gradient(135deg, #a5f3fc 0%, #ecfeff 100%)', accent: '#0891b2', emoji: '💻' }, // Computers
  19: { gradient: 'linear-gradient(135deg, #bfdbfe 0%, #eff6ff 100%)', accent: '#1d4ed8', emoji: '➕' }, // Mathematics
  20: { gradient: 'linear-gradient(135deg, #fde68a 0%, #fef9c3 100%)', accent: '#b45309', emoji: '🏛️' }, // Mythology
  21: { gradient: 'linear-gradient(135deg, #bae6fd 0%, #e0f2fe 100%)', accent: '#0284c7', emoji: '⚽' }, // Sports
  22: { gradient: 'linear-gradient(135deg, #bbf7d0 0%, #dcfce7 100%)', accent: '#15803d', emoji: '🗺️' }, // Geography
  23: { gradient: 'linear-gradient(135deg, #fed7aa 0%, #ffedd5 100%)', accent: '#c2410c', emoji: '⚔️' }, // History
  24: { gradient: 'linear-gradient(135deg, #c7d2fe 0%, #e0e7ff 100%)', accent: '#4338ca', emoji: '🏛️' }, // Politics
  25: { gradient: 'linear-gradient(135deg, #fde68a 0%, #fef3c7 100%)', accent: '#92400e', emoji: '🎨' }, // Art
  26: { gradient: 'linear-gradient(135deg, #bbf7d0 0%, #dcfce7 100%)', accent: '#15803d', emoji: '⭐' }, // Celebrities
  27: { gradient: 'linear-gradient(135deg, #a5f3fc 0%, #cffafe 100%)', accent: '#0e7490', emoji: '🐾' }, // Animals
  28: { gradient: 'linear-gradient(135deg, #fde68a 0%, #fef9c3 100%)', accent: '#92400e', emoji: '🚗' }, // Vehicles
  29: { gradient: 'linear-gradient(135deg, #ddd6fe 0%, #ede9fe 100%)', accent: '#6d28d9', emoji: '📖' }, // Comics
  30: { gradient: 'linear-gradient(135deg, #bae6fd 0%, #dbeafe 100%)', accent: '#0369a1', emoji: '📡' }, // Gadgets
  31: { gradient: 'linear-gradient(135deg, #f5d0fe 0%, #fdf4ff 100%)', accent: '#a21caf', emoji: '🎌' }, // Anime & Manga
  32: { gradient: 'linear-gradient(135deg, #bae6fd 0%, #e0f2fe 100%)', accent: '#0284c7', emoji: '🃏' }, // Cartoon & Animations
};

// Keyword fallbacks for custom / unmapped categories
const KEYWORD_MAP: Array<[string, CategoryTheme]> = [
  ['harry potter',    { gradient: 'linear-gradient(135deg, #e9d5ff 0%, #fdf4ff 100%)', accent: '#9333ea', emoji: '⚡' }],
  ['game of thrones', { gradient: 'linear-gradient(135deg, #e7e5e4 0%, #fafaf9 100%)', accent: '#dc2626', emoji: '🐉' }],
  ['chemistry',       { gradient: 'linear-gradient(135deg, #a7f3d0 0%, #ecfdf5 100%)', accent: '#059669', emoji: '🧪' }],
  ['biology',         { gradient: 'linear-gradient(135deg, #bbf7d0 0%, #f0fdf4 100%)', accent: '#16a34a', emoji: '🧬' }],
  ['formula 1',       { gradient: 'linear-gradient(135deg, #fecaca 0%, #fff1f2 100%)', accent: '#dc2626', emoji: '🏎️' }],
  ['formula one',     { gradient: 'linear-gradient(135deg, #fecaca 0%, #fff1f2 100%)', accent: '#dc2626', emoji: '🏎️' }],
  ['f1',              { gradient: 'linear-gradient(135deg, #fecaca 0%, #fff1f2 100%)', accent: '#dc2626', emoji: '🏎️' }],
  ['anime',           { gradient: 'linear-gradient(135deg, #f5d0fe 0%, #fdf4ff 100%)', accent: '#a21caf', emoji: '🎌' }],
  ['manga',           { gradient: 'linear-gradient(135deg, #f5d0fe 0%, #fdf4ff 100%)', accent: '#a21caf', emoji: '🎌' }],
  ['science',         { gradient: 'linear-gradient(135deg, #a7f3d0 0%, #ecfdf5 100%)', accent: '#059669', emoji: '🔬' }],
  ['nature',          { gradient: 'linear-gradient(135deg, #bbf7d0 0%, #f0fdf4 100%)', accent: '#16a34a', emoji: '🌿' }],
  ['history',         { gradient: 'linear-gradient(135deg, #fed7aa 0%, #ffedd5 100%)', accent: '#c2410c', emoji: '⚔️' }],
  ['sport',           { gradient: 'linear-gradient(135deg, #bae6fd 0%, #e0f2fe 100%)', accent: '#0284c7', emoji: '⚽' }],
  ['music',           { gradient: 'linear-gradient(135deg, #e9d5ff 0%, #fdf4ff 100%)', accent: '#9333ea', emoji: '🎵' }],
  ['film',            { gradient: 'linear-gradient(135deg, #fde68a 0%, #fffbeb 100%)', accent: '#d97706', emoji: '🎬' }],
  ['movie',           { gradient: 'linear-gradient(135deg, #fde68a 0%, #fffbeb 100%)', accent: '#d97706', emoji: '🎬' }],
  ['geography',       { gradient: 'linear-gradient(135deg, #bbf7d0 0%, #dcfce7 100%)', accent: '#15803d', emoji: '🗺️' }],
  ['computer',        { gradient: 'linear-gradient(135deg, #a5f3fc 0%, #ecfeff 100%)', accent: '#0891b2', emoji: '💻' }],
  ['video game',      { gradient: 'linear-gradient(135deg, #fed7aa 0%, #fff7ed 100%)', accent: '#ea580c', emoji: '🎮' }],
  ['television',      { gradient: 'linear-gradient(135deg, #fef08a 0%, #fefce8 100%)', accent: '#ca8a04', emoji: '📺' }],
  ['tv',              { gradient: 'linear-gradient(135deg, #fef08a 0%, #fefce8 100%)', accent: '#ca8a04', emoji: '📺' }],
  ['art',             { gradient: 'linear-gradient(135deg, #fde68a 0%, #fef3c7 100%)', accent: '#92400e', emoji: '🎨' }],
  ['animal',          { gradient: 'linear-gradient(135deg, #a5f3fc 0%, #cffafe 100%)', accent: '#0e7490', emoji: '🐾' }],
  ['math',            { gradient: 'linear-gradient(135deg, #bfdbfe 0%, #eff6ff 100%)', accent: '#1d4ed8', emoji: '➕' }],
  ['book',            { gradient: 'linear-gradient(135deg, #ddd6fe 0%, #f5f3ff 100%)', accent: '#7c3aed', emoji: '📚' }],
  ['politi',          { gradient: 'linear-gradient(135deg, #c7d2fe 0%, #e0e7ff 100%)', accent: '#4338ca', emoji: '🏛️' }],
  ['mytholog',        { gradient: 'linear-gradient(135deg, #fde68a 0%, #fef9c3 100%)', accent: '#b45309', emoji: '🏺' }],
  ['cartoon',         { gradient: 'linear-gradient(135deg, #bae6fd 0%, #e0f2fe 100%)', accent: '#0284c7', emoji: '🃏' }],
  ['comic',           { gradient: 'linear-gradient(135deg, #ddd6fe 0%, #ede9fe 100%)', accent: '#6d28d9', emoji: '💥' }],
  ['celebrit',        { gradient: 'linear-gradient(135deg, #bbf7d0 0%, #dcfce7 100%)', accent: '#15803d', emoji: '⭐' }],
  ['vehicle',         { gradient: 'linear-gradient(135deg, #fde68a 0%, #fef9c3 100%)', accent: '#92400e', emoji: '🚗' }],
  ['gadget',          { gradient: 'linear-gradient(135deg, #bae6fd 0%, #dbeafe 100%)', accent: '#0369a1', emoji: '📡' }],
  ['board game',      { gradient: 'linear-gradient(135deg, #bfdbfe 0%, #eff6ff 100%)', accent: '#2563eb', emoji: '🎲' }],
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
