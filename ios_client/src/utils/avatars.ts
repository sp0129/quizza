import { ImageSourcePropType } from 'react-native';

export interface AvatarDef {
  id: number;
  image: ImageSourcePropType;
  label: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 1, image: require('../assets/avatars/explorer.png'), label: 'Explorer' },
  { id: 2, image: require('../assets/avatars/rockstar.png'), label: 'Rockstar' },
  { id: 3, image: require('../assets/avatars/scientist.png'), label: 'Scientist' },
  { id: 4, image: require('../assets/avatars/popstar.png'), label: 'Popstar' },
  { id: 5, image: require('../assets/avatars/artist.png'), label: 'Artist' },
  { id: 6, image: require('../assets/avatars/pirate.png'), label: 'Pirate' },
  { id: 7, image: require('../assets/avatars/athlete.png'), label: 'Athlete' },
  { id: 8, image: require('../assets/avatars/coder.png'), label: 'Coder' },
  { id: 9, image: require('../assets/avatars/gothic.png'), label: 'Gothic' },
];

const AVATAR_MAP = new Map(AVATARS.map(a => [a.id, a]));

export function getAvatar(avatarId?: number): AvatarDef | null {
  if (!avatarId) return null;
  return AVATAR_MAP.get(avatarId) ?? null;
}
