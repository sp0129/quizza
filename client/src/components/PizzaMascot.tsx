import idleImg from '../assets/mascot/idle.png';
import happyImg from '../assets/mascot/happy.png';
import excitedImg from '../assets/mascot/excited.png';
import thinkingImg from '../assets/mascot/thinking.png';
import celebratingImg from '../assets/mascot/celebrating.png';
import wrongImg from '../assets/mascot/wrong.png';

type Mood = 'excited' | 'idle' | 'happy' | 'thinking' | 'celebrating' | 'wrong';

const MOOD_IMAGES: Record<Mood, string> = {
  idle: idleImg,
  happy: happyImg,
  excited: excitedImg,
  thinking: thinkingImg,
  celebrating: celebratingImg,
  wrong: wrongImg,
};

interface PizzaMascotProps {
  mood?: Mood;
  size?: number;
  className?: string;
}

export default function PizzaMascot({ mood = 'idle', size = 120, className = '' }: PizzaMascotProps) {
  return (
    <img
      src={MOOD_IMAGES[mood]}
      alt={`Pizza mascot - ${mood}`}
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', objectFit: 'contain' }}
      draggable={false}
    />
  );
}
