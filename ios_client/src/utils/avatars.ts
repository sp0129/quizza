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
];

const AVATAR_MAP = new Map(AVATARS.map(a => [a.id, a]));

export function getAvatar(avatarId?: number): AvatarDef | null {
  if (!avatarId) return null;
  return AVATAR_MAP.get(avatarId) ?? null;
}
