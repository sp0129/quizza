export interface CategoryTheme {
  gradient: string;
  accent: string;
  emoji: string;
}

const DEFAULT_THEME: CategoryTheme = {
  gradient: 'linear-gradient(135deg, #9ca1b2 0%, #abaab2 100%)',
  accent: '#4547a8',
  emoji: '🧠',
};

// Map by Open Trivia DB category ID (and local custom IDs ≥ 2000)
const ID_MAP: Record<number, CategoryTheme> = {
  // Custom local categories
  2001: { gradient: 'linear-gradient(135deg, #74aa91 0%, #a5b1ab 100%)', accent: '#036949', emoji: '🧪' }, // Chemistry
  2002: { gradient: 'linear-gradient(135deg, #82ac91 0%, #a8b1aa 100%)', accent: '#0f7233', emoji: '🧬' }, // Biology
  2003: { gradient: 'linear-gradient(135deg, #a395b2 0%, #b1aab2 100%)', accent: '#6623a3', emoji: '⚡' }, // Harry Potter
  2004: { gradient: 'linear-gradient(135deg, #a1a09f 0%, #afafae 100%)', accent: '#9a1a1a', emoji: '🐉' }, // Game of Thrones
  9:  { gradient: 'linear-gradient(135deg, #82a1b1 0%, #a8aeb2 100%)', accent: '#015c8b', emoji: '🌍' }, // General Knowledge
  10: { gradient: 'linear-gradient(135deg, #9a95b1 0%, #abaab2 100%)', accent: '#5628a5', emoji: '📚' }, // Books
  11: { gradient: 'linear-gradient(135deg, #b1a160 0%, #b2afa4 100%)', accent: '#975304', emoji: '🎬' }, // Film
  12: { gradient: 'linear-gradient(135deg, #a395b2 0%, #b1aab2 100%)', accent: '#6623a3', emoji: '🎵' }, // Music
  13: { gradient: 'linear-gradient(135deg, #82ac91 0%, #a8b1aa 100%)', accent: '#0f7233', emoji: '🎭' }, // Musicals & Theatres
  14: { gradient: 'linear-gradient(135deg, #b1a860 0%, #b1b0a2 100%)', accent: '#8d6002', emoji: '📺' }, // Television
  15: { gradient: 'linear-gradient(135deg, #b19676 0%, #b2aca5 100%)', accent: '#a33d08', emoji: '🎮' }, // Video Games
  16: { gradient: 'linear-gradient(135deg, #8599b1 0%, #a7acb2 100%)', accent: '#1945a4', emoji: '🎲' }, // Board Games
  17: { gradient: 'linear-gradient(135deg, #74aa91 0%, #a5b1ab 100%)', accent: '#036949', emoji: '🔬' }, // Science & Nature
  18: { gradient: 'linear-gradient(135deg, #73aab0 0%, #a5b1b2 100%)', accent: '#05657c', emoji: '💻' }, // Computers
  19: { gradient: 'linear-gradient(135deg, #8599b1 0%, #a7acb2 100%)', accent: '#143697', emoji: '➕' }, // Mathematics
  20: { gradient: 'linear-gradient(135deg, #b1a160 0%, #b1ae88 100%)', accent: '#7d3a06', emoji: '🏛️' }, // Mythology
  21: { gradient: 'linear-gradient(135deg, #82a1b1 0%, #9ca9b1 100%)', accent: '#015c8b', emoji: '⚽' }, // Sports
  22: { gradient: 'linear-gradient(135deg, #82ac91 0%, #9ab0a1 100%)', accent: '#0e592a', emoji: '🗺️' }, // Geography
  23: { gradient: 'linear-gradient(135deg, #b19676 0%, #b2a595 100%)', accent: '#872d08', emoji: '⚔️' }, // History
  24: { gradient: 'linear-gradient(135deg, #8b93b1 0%, #9ca1b2 100%)', accent: '#2e278d', emoji: '🏛️' }, // Politics
  25: { gradient: 'linear-gradient(135deg, #b1a160 0%, #b1aa8b 100%)', accent: '#662c09', emoji: '🎨' }, // Art
  26: { gradient: 'linear-gradient(135deg, #82ac91 0%, #9ab0a1 100%)', accent: '#0e592a', emoji: '⭐' }, // Celebrities
  27: { gradient: 'linear-gradient(135deg, #73aab0 0%, #90afb1 100%)', accent: '#095164', emoji: '🐾' }, // Animals
  28: { gradient: 'linear-gradient(135deg, #b1a160 0%, #b1ae88 100%)', accent: '#662c09', emoji: '🚗' }, // Vehicles
  29: { gradient: 'linear-gradient(135deg, #9a95b1 0%, #a5a3b1 100%)', accent: '#4c1c97', emoji: '📖' }, // Comics
  30: { gradient: 'linear-gradient(135deg, #82a1b1 0%, #99a3b1 100%)', accent: '#024970', emoji: '📡' }, // Gadgets
  31: { gradient: 'linear-gradient(135deg, #ab91b1 0%, #b1aab2 100%)', accent: '#71137a', emoji: '🎌' }, // Anime & Manga
  32: { gradient: 'linear-gradient(135deg, #82a1b1 0%, #9ca9b1 100%)', accent: '#015c8b', emoji: '🃏' }, // Cartoon & Animations
};

// Keyword fallbacks for custom / unmapped categories
const KEYWORD_MAP: Array<[string, CategoryTheme]> = [
  ['harry potter',    { gradient: 'linear-gradient(135deg, #a395b2 0%, #b1aab2 100%)', accent: '#6623a3', emoji: '⚡' }],
  ['game of thrones', { gradient: 'linear-gradient(135deg, #a1a09f 0%, #afafae 100%)', accent: '#9a1a1a', emoji: '🐉' }],
  ['chemistry',       { gradient: 'linear-gradient(135deg, #74aa91 0%, #a5b1ab 100%)', accent: '#036949', emoji: '🧪' }],
  ['biology',         { gradient: 'linear-gradient(135deg, #82ac91 0%, #a8b1aa 100%)', accent: '#0f7233', emoji: '🧬' }],
  ['formula 1',       { gradient: 'linear-gradient(135deg, #b18d8d 0%, #b2a8a9 100%)', accent: '#9a1a1a', emoji: '🏎️' }],
  ['formula one',     { gradient: 'linear-gradient(135deg, #b18d8d 0%, #b2a8a9 100%)', accent: '#9a1a1a', emoji: '🏎️' }],
  ['f1',              { gradient: 'linear-gradient(135deg, #b18d8d 0%, #b2a8a9 100%)', accent: '#9a1a1a', emoji: '🏎️' }],
  ['anime',           { gradient: 'linear-gradient(135deg, #ab91b1 0%, #b1aab2 100%)', accent: '#71137a', emoji: '🎌' }],
  ['manga',           { gradient: 'linear-gradient(135deg, #ab91b1 0%, #b1aab2 100%)', accent: '#71137a', emoji: '🎌' }],
  ['science',         { gradient: 'linear-gradient(135deg, #74aa91 0%, #a5b1ab 100%)', accent: '#036949', emoji: '🔬' }],
  ['nature',          { gradient: 'linear-gradient(135deg, #82ac91 0%, #a8b1aa 100%)', accent: '#0f7233', emoji: '🌿' }],
  ['history',         { gradient: 'linear-gradient(135deg, #b19676 0%, #b2a595 100%)', accent: '#872d08', emoji: '⚔️' }],
  ['sport',           { gradient: 'linear-gradient(135deg, #82a1b1 0%, #9ca9b1 100%)', accent: '#015c8b', emoji: '⚽' }],
  ['music',           { gradient: 'linear-gradient(135deg, #a395b2 0%, #b1aab2 100%)', accent: '#6623a3', emoji: '🎵' }],
  ['film',            { gradient: 'linear-gradient(135deg, #b1a160 0%, #b2afa4 100%)', accent: '#975304', emoji: '🎬' }],
  ['movie',           { gradient: 'linear-gradient(135deg, #b1a160 0%, #b2afa4 100%)', accent: '#975304', emoji: '🎬' }],
  ['geography',       { gradient: 'linear-gradient(135deg, #82ac91 0%, #9ab0a1 100%)', accent: '#0e592a', emoji: '🗺️' }],
  ['computer',        { gradient: 'linear-gradient(135deg, #73aab0 0%, #a5b1b2 100%)', accent: '#05657c', emoji: '💻' }],
  ['video game',      { gradient: 'linear-gradient(135deg, #b19676 0%, #b2aca5 100%)', accent: '#a33d08', emoji: '🎮' }],
  ['television',      { gradient: 'linear-gradient(135deg, #b1a860 0%, #b1b0a2 100%)', accent: '#8d6002', emoji: '📺' }],
  ['tv',              { gradient: 'linear-gradient(135deg, #b1a860 0%, #b1b0a2 100%)', accent: '#8d6002', emoji: '📺' }],
  ['art',             { gradient: 'linear-gradient(135deg, #b1a160 0%, #b1aa8b 100%)', accent: '#662c09', emoji: '🎨' }],
  ['animal',          { gradient: 'linear-gradient(135deg, #73aab0 0%, #90afb1 100%)', accent: '#095164', emoji: '🐾' }],
  ['math',            { gradient: 'linear-gradient(135deg, #8599b1 0%, #a7acb2 100%)', accent: '#143697', emoji: '➕' }],
  ['book',            { gradient: 'linear-gradient(135deg, #9a95b1 0%, #abaab2 100%)', accent: '#5628a5', emoji: '📚' }],
  ['politi',          { gradient: 'linear-gradient(135deg, #8b93b1 0%, #9ca1b2 100%)', accent: '#2e278d', emoji: '🏛️' }],
  ['mytholog',        { gradient: 'linear-gradient(135deg, #b1a160 0%, #b1ae88 100%)', accent: '#7d3a06', emoji: '🏺' }],
  ['cartoon',         { gradient: 'linear-gradient(135deg, #82a1b1 0%, #9ca9b1 100%)', accent: '#015c8b', emoji: '🃏' }],
  ['comic',           { gradient: 'linear-gradient(135deg, #9a95b1 0%, #a5a3b1 100%)', accent: '#4c1c97', emoji: '💥' }],
  ['celebrit',        { gradient: 'linear-gradient(135deg, #82ac91 0%, #9ab0a1 100%)', accent: '#0e592a', emoji: '⭐' }],
  ['vehicle',         { gradient: 'linear-gradient(135deg, #b1a160 0%, #b1ae88 100%)', accent: '#662c09', emoji: '🚗' }],
  ['gadget',          { gradient: 'linear-gradient(135deg, #82a1b1 0%, #99a3b1 100%)', accent: '#024970', emoji: '📡' }],
  ['board game',      { gradient: 'linear-gradient(135deg, #8599b1 0%, #a7acb2 100%)', accent: '#1945a4', emoji: '🎲' }],
];

// Strip OpenTDB qualifier prefixes ("Entertainment: ", "Science: ") and
// apply a few specific renames so category names read cleanly.
export function cleanCategoryName(name: string): string {
  const stripped = name
    .replace(/^Entertainment:\s*/i, '')
    .replace(/^Science:\s*/i, '')
    .trim();

  const renames: Record<string, string> = {
    'Japanese Anime & Manga': 'Anime & Manga',
    'Cartoon & Animations':   'Cartoons',
    'Musicals & Theatres':    'Musicals',
    'Science & Nature':       'Science & Nature', // keep as-is
  };
  return renames[stripped] ?? stripped;
}

// Explicit display order — similar subjects are grouped together.
// Categories not in this list appear at the end, alphabetically.
export const CATEGORY_SORT_ORDER: number[] = [
  // ── STEM ─────────────────────────────────
  19,   // Mathematics
  17,   // Science & Nature
  18,   // Computers
  2001, // Chemistry
  2002, // Biology
  30,   // Gadgets
  // ── History & Society ────────────────────
  23,   // History
  20,   // Mythology
  22,   // Geography
  24,   // Politics
  9,    // General Knowledge
  // ── Entertainment ────────────────────────
  11,   // Film
  14,   // Television
  12,   // Music
  13,   // Musicals
  15,   // Video Games
  16,   // Board Games
  29,   // Comics
  31,   // Anime & Manga
  32,   // Cartoons
  // ── Pop Culture / Franchises ─────────────
  26,   // Celebrities
  2003, // Harry Potter
  2004, // Game of Thrones
  2005, // Marvel Movies
  // ── Sports & Nature ──────────────────────
  21,   // Sports
  27,   // Animals
  28,   // Vehicles
  // ── Arts & Literature ────────────────────
  25,   // Art
  10,   // Books
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
