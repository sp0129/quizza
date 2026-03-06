import React from 'react';
import Svg, { Path, Circle, Ellipse, Polygon, Line, Rect } from 'react-native-svg';

export type MascotMood = 'excited' | 'idle' | 'happy' | 'thinking' | 'celebrating' | 'wrong';

interface MoodConfig {
  mouth: string;
  leftArm: string;
  rightArm: string;
  tongue: boolean;
  pupilDY: number;
}

const MOOD: Record<MascotMood, MoodConfig> = {
  idle: {
    mouth: 'M 72 108 Q 80 113 88 108',
    leftArm: 'M 28 78 Q 8 90 12 108',
    rightArm: 'M 132 78 Q 152 90 148 108',
    tongue: false, pupilDY: 0,
  },
  happy: {
    mouth: 'M 70 108 Q 80 116 90 108',
    leftArm: 'M 28 78 Q 8 90 12 108',
    rightArm: 'M 132 78 Q 152 90 148 108',
    tongue: false, pupilDY: 0,
  },
  excited: {
    mouth: 'M 68 108 Q 80 120 92 108',
    leftArm: 'M 28 78 Q 8 90 12 108',
    rightArm: 'M 132 78 Q 152 90 148 108',
    tongue: false, pupilDY: 0,
  },
  thinking: {
    mouth: 'M 75 107 Q 80 110 85 107',
    leftArm: 'M 28 78 Q 8 90 12 108',
    rightArm: 'M 132 78 Q 122 66 107 82',
    tongue: false, pupilDY: -1.5,
  },
  celebrating: {
    mouth: 'M 63 104 Q 80 124 97 104',
    leftArm: 'M 28 78 Q 8 56 20 40',
    rightArm: 'M 132 78 Q 152 56 140 40',
    tongue: false, pupilDY: -1,
  },
  wrong: {
    mouth: 'M 70 113 Q 80 107 90 113',
    leftArm: 'M 28 78 Q 4 96 5 118',
    rightArm: 'M 132 78 Q 156 96 155 118',
    tongue: true, pupilDY: 2,
  },
};

interface Props {
  mood?: MascotMood;
  size?: number;
}

export default function PizzaMascot({ mood = 'idle', size = 120 }: Props) {
  const cfg = MOOD[mood];

  return (
    <Svg viewBox="0 0 160 180" width={size} height={size}>
      {/* Crust */}
      <Path d="M 20 70 Q 80 10 140 70 L 130 85 Q 80 30 30 85 Z" fill="#c87941" />
      <Path d="M 30 72 Q 80 22 130 72" fill="none" stroke="#e8a86a" strokeWidth="4" strokeLinecap="round" />

      {/* Cheese body */}
      <Polygon points="20,70 140,70 80,165" fill="#f5c842" />
      <Polygon points="20,70 55,70 80,165" fill="#e8b830" fillOpacity="0.4" />
      <Polygon points="105,70 140,70 80,165" fill="#e8b830" fillOpacity="0.4" />

      {/* Sauce patches */}
      <Ellipse cx="65" cy="130" rx="12" ry="8" fill="#c0392b" fillOpacity="0.7" />
      <Ellipse cx="95" cy="140" rx="9" ry="6" fill="#c0392b" fillOpacity="0.7" />
      <Ellipse cx="80" cy="155" rx="6" ry="4" fill="#c0392b" fillOpacity="0.6" />

      {/* Pepperoni */}
      <Circle cx="68" cy="128" r="10" fill="#9b2335" />
      <Circle cx="68" cy="128" r="7" fill="#c0392b" />
      <Circle cx="68" cy="126" r="2" fill="#e05c5c" fillOpacity="0.5" />
      <Circle cx="95" cy="138" r="8" fill="#9b2335" />
      <Circle cx="95" cy="138" r="5" fill="#c0392b" />
      <Circle cx="95" cy="136" r="1.5" fill="#e05c5c" fillOpacity="0.5" />

      {/* Arms */}
      <Path d={cfg.leftArm} fill="none" stroke="#c87941" strokeWidth="10" strokeLinecap="round" />
      <Path d={cfg.rightArm} fill="none" stroke="#c87941" strokeWidth="10" strokeLinecap="round" />

      {/* Thinking bubbles */}
      {mood === 'thinking' && (
        <>
          <Circle cx="122" cy="64" r="3" fill="#f5c842" fillOpacity="0.75" />
          <Circle cx="133" cy="52" r="4.5" fill="#f5c842" fillOpacity="0.75" />
          <Circle cx="146" cy="38" r="6.5" fill="#f5c842" fillOpacity="0.75" />
        </>
      )}

      {/* Glasses */}
      <Line x1="72" y1="88" x2="88" y2="88" stroke="#2d2d2d" strokeWidth="2.5" />
      <Line x1="57" y1="86" x2="48" y2="82" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="103" y1="86" x2="112" y2="82" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />
      <Rect x="57" y="80" width="15" height="14" rx="4" ry="4" fill="none" stroke="#2d2d2d" strokeWidth="2.5" />
      <Rect x="88" y="80" width="15" height="14" rx="4" ry="4" fill="none" stroke="#2d2d2d" strokeWidth="2.5" />

      {/* Eyes */}
      <Ellipse cx="64.5" cy="87" rx="5" ry="5.5" fill="white" />
      <Ellipse cx="65" cy={87.5 + cfg.pupilDY} rx="2.5" ry="3" fill="#1a1a2e" />
      <Circle cx="66.5" cy={85.5 + cfg.pupilDY} r="1.2" fill="white" />
      <Ellipse cx="95.5" cy="87" rx="5" ry="5.5" fill="white" />
      <Ellipse cx="96" cy={87.5 + cfg.pupilDY} rx="2.5" ry="3" fill="#1a1a2e" />
      <Circle cx="97.5" cy={85.5 + cfg.pupilDY} r="1.2" fill="white" />

      {/* Sad brows for wrong */}
      {mood === 'wrong' && (
        <>
          <Line x1="58" y1="79" x2="71" y2="82" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="89" y1="82" x2="102" y2="79" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* Blush */}
      <Ellipse cx="55" cy="97" rx="7" ry="4" fill="#f87171" fillOpacity="0.45" />
      <Ellipse cx="105" cy="97" rx="7" ry="4" fill="#f87171" fillOpacity="0.45" />

      {/* Mouth */}
      <Path d={cfg.mouth} fill="none" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" />

      {/* Tongue */}
      {cfg.tongue && <Ellipse cx="80" cy="118" rx="7" ry="5" fill="#f472b6" />}
    </Svg>
  );
}
