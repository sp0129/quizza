// Avatar system — emoji placeholders for now, swap for illustrations later.
// Store only the avatar_id (integer) in the DB.

export interface AvatarDef {
  id: number;
  emoji: string;
  label: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 1, emoji: '🦊', label: 'Fox' },
  { id: 2, emoji: '🐻', label: 'Bear' },
  { id: 3, emoji: '🐧', label: 'Penguin' },
  { id: 4, emoji: '🦁', label: 'Lion' },
  { id: 5, emoji: '🐉', label: 'Dragon' },
  { id: 6, emoji: '🦄', label: 'Unicorn' },
  { id: 7, emoji: '🐼', label: 'Panda' },
];

const AVATAR_MAP = new Map(AVATARS.map(a => [a.id, a]));

export function getAvatar(avatarId?: number): AvatarDef | null {
  if (!avatarId) return null;
  return AVATAR_MAP.get(avatarId) ?? null;
}
