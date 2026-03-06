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

const ID_MAP: Record<number, CategoryTheme> = {
  2001: { gradient: 'linear-gradient(135deg, #74aa91 0%, #a5b1ab 100%)', accent: '#036949', emoji: '🧪' },
  2002: { gradient: 'linear-gradient(135deg, #82ac91 0%, #a8b1aa 100%)', accent: '#0f7233', emoji: '🧬' },
  2003: { gradient: 'linear-gradient(135deg, #a395b2 0%, #b1aab2 100%)', accent: '#6623a3', emoji: '⚡' },
  2004: { gradient: 'linear-gradient(135deg, #a1a09f 0%, #afafae 100%)', accent: '#9a1a1a', emoji: '🐉' },
  2005: { gradient: 'linear-gradient(135deg, #b18d8d 0%, #b2a8a8 100%)', accent: '#9a1a1a', emoji: '🦸' },
  2006: { gradient: 'linear-gradient(135deg, #c47eb5 0%, #b19ab1 100%)', accent: '#9b1a9b', emoji: '🎤' },
  2007: { gradient: 'linear-gradient(135deg, #6b8fb5 0%, #8faab2 100%)', accent: '#1a5c8b', emoji: '💻' },
  9:  { gradient: 'linear-gradient(135deg, #82a1b1 0%, #a8aeb2 100%)', accent: '#015c8b', emoji: '🌍' },
  10: { gradient: 'linear-gradient(135deg, #9a95b1 0%, #abaab2 100%)', accent: '#5628a5', emoji: '📚' },
  11: { gradient: 'linear-gradient(135deg, #b1a160 0%, #b2afa4 100%)', accent: '#975304', emoji: '🎬' },
  12: { gradient: 'linear-gradient(135deg, #a395b2 0%, #b1aab2 100%)', accent: '#6623a3', emoji: '🎵' },
  13: { gradient: 'linear-gradient(135deg, #82ac91 0%, #a8b1aa 100%)', accent: '#0f7233', emoji: '🎭' },
  14: { gradient: 'linear-gradient(135deg, #b1a860 0%, #b1b0a2 100%)', accent: '#8d6002', emoji: '📺' },
  15: { gradient: 'linear-gradient(135deg, #b19676 0%, #b2aca5 100%)', accent: '#a33d08', emoji: '🎮' },
  16: { gradient: 'linear-gradient(135deg, #8599b1 0%, #a7acb2 100%)', accent: '#1945a4', emoji: '🎲' },
  17: { gradient: 'linear-gradient(135deg, #74aa91 0%, #a5b1ab 100%)', accent: '#036949', emoji: '🔬' },
  18: { gradient: 'linear-gradient(135deg, #73aab0 0%, #a5b1b2 100%)', accent: '#05657c', emoji: '💻' },
  19: { gradient: 'linear-gradient(135deg, #8599b1 0%, #a7acb2 100%)', accent: '#143697', emoji: '➕' },
  20: { gradient: 'linear-gradient(135deg, #b1a160 0%, #b1ae88 100%)', accent: '#7d3a06', emoji: '🏛️' },
  21: { gradient: 'linear-gradient(135deg, #82a1b1 0%, #9ca9b1 100%)', accent: '#015c8b', emoji: '⚽' },
  22: { gradient: 'linear-gradient(135deg, #82ac91 0%, #9ab0a1 100%)', accent: '#0e592a', emoji: '🗺️' },
  23: { gradient: 'linear-gradient(135deg, #b19676 0%, #b2a595 100%)', accent: '#872d08', emoji: '⚔️' },
  24: { gradient: 'linear-gradient(135deg, #8b93b1 0%, #9ca1b2 100%)', accent: '#2e278d', emoji: '🏛️' },
  25: { gradient: 'linear-gradient(135deg, #b1a160 0%, #b1aa8b 100%)', accent: '#662c09', emoji: '🎨' },
  26: { gradient: 'linear-gradient(135deg, #82ac91 0%, #9ab0a1 100%)', accent: '#0e592a', emoji: '⭐' },
  27: { gradient: 'linear-gradient(135deg, #73aab0 0%, #90afb1 100%)', accent: '#095164', emoji: '🐾' },
  28: { gradient: 'linear-gradient(135deg, #b1a160 0%, #b1ae88 100%)', accent: '#662c09', emoji: '🚗' },
  29: { gradient: 'linear-gradient(135deg, #9a95b1 0%, #a5a3b1 100%)', accent: '#4c1c97', emoji: '📖' },
  30: { gradient: 'linear-gradient(135deg, #82a1b1 0%, #99a3b1 100%)', accent: '#024970', emoji: '📡' },
  31: { gradient: 'linear-gradient(135deg, #ab91b1 0%, #b1aab2 100%)', accent: '#71137a', emoji: '🎌' },
  32: { gradient: 'linear-gradient(135deg, #82a1b1 0%, #9ca9b1 100%)', accent: '#015c8b', emoji: '🃏' },
};

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
  ['pop music',       { gradient: 'linear-gradient(135deg, #c47eb5 0%, #b19ab1 100%)', accent: '#9b1a9b', emoji: '🎤' }],
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

export function cleanCategoryName(name: string): string {
  const stripped = name
    .replace(/^Entertainment:\s*/i, '')
    .replace(/^Science:\s*/i, '')
    .trim();
  const renames: Record<string, string> = {
    'Japanese Anime & Manga': 'Anime & Manga',
    'Cartoon & Animations':   'Cartoons',
    'Musicals & Theatres':    'Musicals',
  };
  return renames[stripped] ?? stripped;
}

export const CATEGORY_SORT_ORDER: number[] = [
  19, 17, 18, 2007, 2001, 2002, 30,
  23, 20, 22, 24, 9,
  11, 14, 12, 2006, 13, 15, 16, 29, 31, 32,
  26, 2003, 2004, 2005,
  21, 27, 28,
  25, 10,
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

// Parse CSS gradient string to extract two hex colors for expo-linear-gradient
export function parseGradientColors(gradient: string): [string, string] {
  const matches = gradient.match(/#[a-f0-9]{6}/gi);
  if (matches && matches.length >= 2) return [matches[0], matches[1]];
  return ['#111525', '#1a1b2e'];
}
