export interface CategoryTheme {
  gradient: string;
  accent: string;
  emoji: string;
}

const DEFAULT_THEME: CategoryTheme = {
  gradient: 'linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)',
  accent: '#4547a8',
  emoji: '🧠',
};

const ID_MAP: Record<number, CategoryTheme> = {
  2001: { gradient: 'linear-gradient(135deg, #166534 0%, #052e16 100%)', accent: '#036949', emoji: '🧪' },
  2002: { gradient: 'linear-gradient(135deg, #065f46 0%, #022c22 100%)', accent: '#0f7233', emoji: '🧬' },
  2003: { gradient: 'linear-gradient(135deg, #6d28d9 0%, #2e1065 100%)', accent: '#6623a3', emoji: '⚡' },
  2004: { gradient: 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)', accent: '#9a1a1a', emoji: '🐉' },
  2005: { gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)', accent: '#1a5c8b', emoji: '🦸' },
  2006: { gradient: 'linear-gradient(135deg, #9d174d 0%, #500724 100%)', accent: '#9b1a9b', emoji: '🎤' },
  2007: { gradient: 'linear-gradient(135deg, #0e7490 0%, #052e3d 100%)', accent: '#1a5c8b', emoji: '💻' },
  9:  { gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)', accent: '#015c8b', emoji: '🌍' },
  10: { gradient: 'linear-gradient(135deg, #7e22ce 0%, #3b0764 100%)', accent: '#5628a5', emoji: '📚' },
  11: { gradient: 'linear-gradient(135deg, #92400e 0%, #451a03 100%)', accent: '#975304', emoji: '🎬' },
  12: { gradient: 'linear-gradient(135deg, #6d28d9 0%, #2e1065 100%)', accent: '#6623a3', emoji: '🎵' },
  13: { gradient: 'linear-gradient(135deg, #065f46 0%, #022c22 100%)', accent: '#0f7233', emoji: '🎭' },
  14: { gradient: 'linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%)', accent: '#8d6002', emoji: '📺' },
  15: { gradient: 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)', accent: '#a33d08', emoji: '🎮' },
  16: { gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', accent: '#1945a4', emoji: '🎲' },
  17: { gradient: 'linear-gradient(135deg, #166534 0%, #052e16 100%)', accent: '#036949', emoji: '🔬' },
  18: { gradient: 'linear-gradient(135deg, #0e7490 0%, #052e3d 100%)', accent: '#05657c', emoji: '💻' },
  19: { gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', accent: '#143697', emoji: '➕' },
  20: { gradient: 'linear-gradient(135deg, #92400e 0%, #451a03 100%)', accent: '#7d3a06', emoji: '🏛️' },
  21: { gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', accent: '#015c8b', emoji: '⚽' },
  22: { gradient: 'linear-gradient(135deg, #047857 0%, #022c22 100%)', accent: '#0e592a', emoji: '🗺️' },
  23: { gradient: 'linear-gradient(135deg, #92400e 0%, #451a03 100%)', accent: '#872d08', emoji: '⚔️' },
  24: { gradient: 'linear-gradient(135deg, #1e3a8a 0%, #0c1d4d 100%)', accent: '#2e278d', emoji: '🏛️' },
  25: { gradient: 'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)', accent: '#662c09', emoji: '🎨' },
  26: { gradient: 'linear-gradient(135deg, #065f46 0%, #022c22 100%)', accent: '#0e592a', emoji: '⭐' },
  27: { gradient: 'linear-gradient(135deg, #0f766e 0%, #042f2e 100%)', accent: '#095164', emoji: '🐾' },
  28: { gradient: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)', accent: '#662c09', emoji: '🚗' },
  29: { gradient: 'linear-gradient(135deg, #7e22ce 0%, #3b0764 100%)', accent: '#4c1c97', emoji: '📖' },
  30: { gradient: 'linear-gradient(135deg, #0e7490 0%, #052e3d 100%)', accent: '#024970', emoji: '📡' },
  31: { gradient: 'linear-gradient(135deg, #9d174d 0%, #500724 100%)', accent: '#71137a', emoji: '🎌' },
  32: { gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', accent: '#015c8b', emoji: '🃏' },
  2008: { gradient: 'linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%)', accent: '#8d6002', emoji: '📺' },
  2009: { gradient: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)', accent: '#7c3aed', emoji: '🎲' },
  2010: { gradient: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)', accent: '#10B981', emoji: '🏳️' },
  2011: { gradient: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', accent: '#f97316', emoji: '🍕' },
  2012: { gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', accent: '#dc2626', emoji: '🎬' },
};

const KEYWORD_MAP: Array<[string, CategoryTheme]> = [
  ['mixed bag',       { gradient: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)', accent: '#7c3aed', emoji: '🎲' }],
  ['flags',           { gradient: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)', accent: '#10B981', emoji: '🏳️' }],
  ['harry potter',    { gradient: 'linear-gradient(135deg, #6d28d9 0%, #2e1065 100%)', accent: '#6623a3', emoji: '⚡' }],
  ['game of thrones', { gradient: 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)', accent: '#9a1a1a', emoji: '🐉' }],
  ['chemistry',       { gradient: 'linear-gradient(135deg, #166534 0%, #052e16 100%)', accent: '#036949', emoji: '🧪' }],
  ['biology',         { gradient: 'linear-gradient(135deg, #065f46 0%, #022c22 100%)', accent: '#0f7233', emoji: '🧬' }],
  ['formula 1',       { gradient: 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)', accent: '#9a1a1a', emoji: '🏎️' }],
  ['formula one',     { gradient: 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)', accent: '#9a1a1a', emoji: '🏎️' }],
  ['f1',              { gradient: 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)', accent: '#9a1a1a', emoji: '🏎️' }],
  ['anime',           { gradient: 'linear-gradient(135deg, #9d174d 0%, #500724 100%)', accent: '#71137a', emoji: '🎌' }],
  ['manga',           { gradient: 'linear-gradient(135deg, #9d174d 0%, #500724 100%)', accent: '#71137a', emoji: '🎌' }],
  ['science',         { gradient: 'linear-gradient(135deg, #166534 0%, #052e16 100%)', accent: '#036949', emoji: '🔬' }],
  ['nature',          { gradient: 'linear-gradient(135deg, #065f46 0%, #022c22 100%)', accent: '#0f7233', emoji: '🌿' }],
  ['history',         { gradient: 'linear-gradient(135deg, #92400e 0%, #451a03 100%)', accent: '#872d08', emoji: '⚔️' }],
  ['sport',           { gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', accent: '#015c8b', emoji: '⚽' }],
  ['pop music',       { gradient: 'linear-gradient(135deg, #9d174d 0%, #500724 100%)', accent: '#9b1a9b', emoji: '🎤' }],
  ['music',           { gradient: 'linear-gradient(135deg, #6d28d9 0%, #2e1065 100%)', accent: '#6623a3', emoji: '🎵' }],
  ['film',            { gradient: 'linear-gradient(135deg, #92400e 0%, #451a03 100%)', accent: '#975304', emoji: '🎬' }],
  ['movie',           { gradient: 'linear-gradient(135deg, #92400e 0%, #451a03 100%)', accent: '#975304', emoji: '🎬' }],
  ['geography',       { gradient: 'linear-gradient(135deg, #047857 0%, #022c22 100%)', accent: '#0e592a', emoji: '🗺️' }],
  ['computer',        { gradient: 'linear-gradient(135deg, #0e7490 0%, #052e3d 100%)', accent: '#05657c', emoji: '💻' }],
  ['video game',      { gradient: 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)', accent: '#a33d08', emoji: '🎮' }],
  ['bingeworthy',     { gradient: 'linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%)', accent: '#8d6002', emoji: '📺' }],
  ['television',      { gradient: 'linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%)', accent: '#8d6002', emoji: '📺' }],
  ['tv',              { gradient: 'linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%)', accent: '#8d6002', emoji: '📺' }],
  ['art',             { gradient: 'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)', accent: '#662c09', emoji: '🎨' }],
  ['animal',          { gradient: 'linear-gradient(135deg, #0f766e 0%, #042f2e 100%)', accent: '#095164', emoji: '🐾' }],
  ['math',            { gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', accent: '#143697', emoji: '➕' }],
  ['book',            { gradient: 'linear-gradient(135deg, #7e22ce 0%, #3b0764 100%)', accent: '#5628a5', emoji: '📚' }],
  ['politi',          { gradient: 'linear-gradient(135deg, #1e3a8a 0%, #0c1d4d 100%)', accent: '#2e278d', emoji: '🏛️' }],
  ['mytholog',        { gradient: 'linear-gradient(135deg, #92400e 0%, #451a03 100%)', accent: '#7d3a06', emoji: '🏺' }],
  ['cartoon',         { gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', accent: '#015c8b', emoji: '🃏' }],
  ['comic',           { gradient: 'linear-gradient(135deg, #7e22ce 0%, #3b0764 100%)', accent: '#4c1c97', emoji: '💥' }],
  ['celebrit',        { gradient: 'linear-gradient(135deg, #065f46 0%, #022c22 100%)', accent: '#0e592a', emoji: '⭐' }],
  ['vehicle',         { gradient: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)', accent: '#662c09', emoji: '🚗' }],
  ['gadget',          { gradient: 'linear-gradient(135deg, #0e7490 0%, #052e3d 100%)', accent: '#024970', emoji: '📡' }],
  ['board game',      { gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', accent: '#1945a4', emoji: '🎲' }],
  ['food',            { gradient: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', accent: '#f97316', emoji: '🍕' }],
  ['drink',           { gradient: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', accent: '#f97316', emoji: '🍕' }],
  ['blockbuster',     { gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', accent: '#dc2626', emoji: '🎬' }],
  ['christmas',       { gradient: 'linear-gradient(135deg, #16a34a 0%, #991b1b 100%)', accent: '#16a34a', emoji: '🎄' }],
  ['halloween',       { gradient: 'linear-gradient(135deg, #f97316 0%, #7c2d12 100%)', accent: '#f97316', emoji: '🎃' }],
  ['special event',   { gradient: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)', accent: '#eab308', emoji: '🎆' }],
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
  // Top picks — shown first, not preselected
  2009,  // Mixed Bag (recommended for new players)
  9,     // General Knowledge
  2006,  // Pop Music
  2008,  // Bingeworthy
  27,    // Animals
  2012,  // Blockbusters
  23,    // History
  22,    // Geography
  20,    // Mythology
  2010,  // Flags & Capitals
  2011,  // Food & Drinks
  // Entertainment (deeper)
  14,    // Television
  11,    // Film
  12,    // Music
  26,    // Celebrities
  2003,  // Harry Potter
  2004,  // Game of Thrones
  2005,  // Marvel
  15,    // Video Games
  21,    // Sports
  13,    // Musicals & Theatre
  31,    // Anime & Manga
  32,    // Cartoons
  16,    // Board Games
  // Culture & knowledge
  29,    // Books
  25,    // Art
  10,    // Books (general)
  24,    // Politics
  // STEM
  17,    // Science & Nature
  2001,  // Chemistry
  2002,  // Biology
  2007,  // Computer Science
  18,    // Computers
  30,    // Gadgets
  19,    // Mathematics
  28,    // Vehicles
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
