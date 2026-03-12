// Category card color system for the redesigned CategorySelect screen.
// Each category gets a light bg tint + darker accent color + emoji.
// Uses 12% opacity tint backgrounds on dark surfaces for readability.

export interface CategoryCardColors {
  bg: string;       // Light tinted background (12% opacity)
  accent: string;   // Darker accent for text and icon highlights
  emoji: string;    // Category emoji
}

// Primary category color palette — 12 distinct colors
const CATEGORY_PALETTE: Record<number, CategoryCardColors> = {
  // Science & Tech
  17:   { bg: 'rgba(34,197,94,0.12)',   accent: '#22C55E', emoji: '🔬' },   // Science & Nature
  2001: { bg: 'rgba(34,197,94,0.12)',   accent: '#22C55E', emoji: '🧪' },   // Chemistry
  2002: { bg: 'rgba(16,185,129,0.12)',  accent: '#10B981', emoji: '🧬' },   // Biology
  18:   { bg: 'rgba(6,182,212,0.12)',   accent: '#06B6D4', emoji: '💻' },   // Computers
  2007: { bg: 'rgba(6,182,212,0.12)',   accent: '#06B6D4', emoji: '💻' },   // Technology
  19:   { bg: 'rgba(59,130,246,0.12)',  accent: '#3B82F6', emoji: '➕' },   // Mathematics
  30:   { bg: 'rgba(6,182,212,0.12)',   accent: '#06B6D4', emoji: '📡' },   // Gadgets

  // History & Geography
  23:   { bg: 'rgba(245,158,11,0.12)',  accent: '#F59E0B', emoji: '⚔️' },   // History
  20:   { bg: 'rgba(217,119,6,0.12)',   accent: '#D97706', emoji: '🏛️' },   // Mythology
  22:   { bg: 'rgba(16,185,129,0.12)',  accent: '#10B981', emoji: '🗺️' },   // Geography
  24:   { bg: 'rgba(99,102,241,0.12)',  accent: '#6366F1', emoji: '🏛️' },   // Politics
  9:    { bg: 'rgba(59,130,246,0.12)',  accent: '#3B82F6', emoji: '🌍' },   // General Knowledge

  // Entertainment
  11:   { bg: 'rgba(249,115,22,0.12)',  accent: '#F97316', emoji: '🎬' },   // Film
  14:   { bg: 'rgba(99,102,241,0.12)',  accent: '#6366F1', emoji: '📺' },   // Television
  12:   { bg: 'rgba(168,85,247,0.12)',  accent: '#A855F7', emoji: '🎵' },   // Music
  2006: { bg: 'rgba(236,72,153,0.12)',  accent: '#EC4899', emoji: '🎤' },   // Pop Music
  13:   { bg: 'rgba(16,185,129,0.12)',  accent: '#10B981', emoji: '🎭' },   // Musicals
  15:   { bg: 'rgba(239,68,68,0.12)',   accent: '#EF4444', emoji: '🎮' },   // Video Games
  16:   { bg: 'rgba(59,130,246,0.12)',  accent: '#3B82F6', emoji: '🎲' },   // Board Games
  29:   { bg: 'rgba(168,85,247,0.12)',  accent: '#A855F7', emoji: '📖' },   // Comics
  31:   { bg: 'rgba(236,72,153,0.12)',  accent: '#EC4899', emoji: '🎌' },   // Anime & Manga
  32:   { bg: 'rgba(59,130,246,0.12)',  accent: '#3B82F6', emoji: '🃏' },   // Cartoons

  // People & Culture
  26:   { bg: 'rgba(245,158,11,0.12)',  accent: '#F59E0B', emoji: '⭐' },   // Celebrities
  2003: { bg: 'rgba(168,85,247,0.12)',  accent: '#A855F7', emoji: '⚡' },   // Harry Potter
  2004: { bg: 'rgba(239,68,68,0.12)',   accent: '#EF4444', emoji: '🐉' },   // Game of Thrones
  2005: { bg: 'rgba(59,130,246,0.12)',  accent: '#3B82F6', emoji: '🦸' },   // Superheroes

  // Sports & Nature
  21:   { bg: 'rgba(239,68,68,0.12)',   accent: '#EF4444', emoji: '⚽' },   // Sports
  27:   { bg: 'rgba(20,184,166,0.12)',  accent: '#14B8A6', emoji: '🐾' },   // Animals
  28:   { bg: 'rgba(100,116,139,0.12)', accent: '#64748B', emoji: '🚗' },   // Vehicles

  // Arts & Books
  25:   { bg: 'rgba(249,115,22,0.12)',  accent: '#F97316', emoji: '🎨' },   // Art
  10:   { bg: 'rgba(168,85,247,0.12)',  accent: '#A855F7', emoji: '📚' },   // Books
};

// Keyword-based fallback for categories not in the ID map
const KEYWORD_COLORS: Array<[string, CategoryCardColors]> = [
  ['science',    { bg: 'rgba(34,197,94,0.12)',   accent: '#22C55E', emoji: '🔬' }],
  ['nature',     { bg: 'rgba(16,185,129,0.12)',  accent: '#10B981', emoji: '🌿' }],
  ['history',    { bg: 'rgba(245,158,11,0.12)',  accent: '#F59E0B', emoji: '⚔️' }],
  ['geography',  { bg: 'rgba(16,185,129,0.12)',  accent: '#10B981', emoji: '🗺️' }],
  ['sport',      { bg: 'rgba(239,68,68,0.12)',   accent: '#EF4444', emoji: '⚽' }],
  ['music',      { bg: 'rgba(168,85,247,0.12)',  accent: '#A855F7', emoji: '🎵' }],
  ['film',       { bg: 'rgba(249,115,22,0.12)',  accent: '#F97316', emoji: '🎬' }],
  ['movie',      { bg: 'rgba(249,115,22,0.12)',  accent: '#F97316', emoji: '🎬' }],
  ['computer',   { bg: 'rgba(6,182,212,0.12)',   accent: '#06B6D4', emoji: '💻' }],
  ['video game', { bg: 'rgba(239,68,68,0.12)',   accent: '#EF4444', emoji: '🎮' }],
  ['television', { bg: 'rgba(99,102,241,0.12)',  accent: '#6366F1', emoji: '📺' }],
  ['tv',         { bg: 'rgba(99,102,241,0.12)',  accent: '#6366F1', emoji: '📺' }],
  ['art',        { bg: 'rgba(249,115,22,0.12)',  accent: '#F97316', emoji: '🎨' }],
  ['animal',     { bg: 'rgba(20,184,166,0.12)',  accent: '#14B8A6', emoji: '🐾' }],
  ['math',       { bg: 'rgba(59,130,246,0.12)',  accent: '#3B82F6', emoji: '➕' }],
  ['book',       { bg: 'rgba(168,85,247,0.12)',  accent: '#A855F7', emoji: '📚' }],
  ['anime',      { bg: 'rgba(236,72,153,0.12)',  accent: '#EC4899', emoji: '🎌' }],
  ['manga',      { bg: 'rgba(236,72,153,0.12)',  accent: '#EC4899', emoji: '🎌' }],
  ['comic',      { bg: 'rgba(168,85,247,0.12)',  accent: '#A855F7', emoji: '💥' }],
  ['cartoon',    { bg: 'rgba(59,130,246,0.12)',  accent: '#3B82F6', emoji: '🃏' }],
  ['politi',     { bg: 'rgba(99,102,241,0.12)',  accent: '#6366F1', emoji: '🏛️' }],
  ['celebrit',   { bg: 'rgba(245,158,11,0.12)',  accent: '#F59E0B', emoji: '⭐' }],
  ['vehicle',    { bg: 'rgba(100,116,139,0.12)', accent: '#64748B', emoji: '🚗' }],
  ['gadget',     { bg: 'rgba(6,182,212,0.12)',   accent: '#06B6D4', emoji: '📡' }],
];

const DEFAULT_COLORS: CategoryCardColors = {
  bg: 'rgba(124,58,237,0.12)',
  accent: '#7C3AED',
  emoji: '🧠',
};

export function getCategoryCardColors(
  categoryName: string,
  categoryId?: number,
): CategoryCardColors {
  if (categoryId !== undefined && CATEGORY_PALETTE[categoryId]) {
    return CATEGORY_PALETTE[categoryId];
  }
  const lower = categoryName.toLowerCase();
  for (const [keyword, colors] of KEYWORD_COLORS) {
    if (lower.includes(keyword)) return colors;
  }
  return DEFAULT_COLORS;
}

// Filter chip definitions for horizontal filter bar
export const FILTER_CHIPS = [
  { key: 'all',           label: 'All' },
  { key: 'science',       label: 'Science' },
  { key: 'history',       label: 'History' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'sports',        label: 'Sports' },
  { key: 'arts',          label: 'Arts' },
  { key: 'tech',          label: 'Tech' },
] as const;

// Map filter chip keys to category IDs they include
export const FILTER_CATEGORY_IDS: Record<string, number[]> = {
  science:       [17, 2001, 2002, 19, 27],
  history:       [23, 20, 22, 24, 9],
  entertainment: [11, 14, 12, 2006, 13, 15, 16, 29, 31, 32, 2003, 2004, 2005],
  sports:        [21, 28],
  arts:          [25, 10, 26],
  tech:          [18, 2007, 30],
};
