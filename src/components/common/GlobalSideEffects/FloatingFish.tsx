'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import fishImage from '@/assets/images/ui/icons/fish.png';
import styles from './GlobalSideEffects.module.scss';

interface FishEffect {
  id: string;
  left: string;
  bottom: string;
  size: number;
  duration: number;
  delay: number;
  travelVw: number;
  waveVh: number;
  rotate: number;
}

const fishEffects: FishEffect[] = [
  { id: 'fish-1', left: '91%', bottom: '13%', size: 154, duration: 28, delay: -4.8, travelVw: 30, waveVh: 7, rotate: -7 },
  { id: 'fish-2', left: '84%', bottom: '2%', size: 184, duration: 34, delay: -21.6, travelVw: 36, waveVh: 9, rotate: 5 },
  { id: 'fish-3', left: '96%', bottom: '25%', size: 132, duration: 31, delay: -13.8, travelVw: 28, waveVh: 8, rotate: -4 },
  { id: 'fish-4', left: '88%', bottom: '-2%', size: 124, duration: 36, delay: -30.4, travelVw: 32, waveVh: 7, rotate: 8 },
];

type FishStyle = CSSProperties & {
  '--fish-x-1': string;
  '--fish-x-2': string;
  '--fish-x-3': string;
  '--fish-x-4': string;
  '--fish-x-5': string;
  '--fish-y-1': string;
  '--fish-y-2': string;
  '--fish-y-3': string;
  '--fish-y-4': string;
  '--fish-y-5': string;
  '--fish-rotate-start': string;
  '--fish-rotate-1': string;
  '--fish-rotate-2': string;
  '--fish-rotate-3': string;
  '--fish-rotate-4': string;
  '--fish-rotate-5': string;
};

export function FloatingFish() {
  return (
    <div className={styles.fishLayer}>
      {fishEffects.map(item => {
        const itemStyle: FishStyle = {
          position: 'absolute',
          display: 'block',
          left: item.left,
          bottom: item.bottom,
          width: item.size,
          height: Math.round(item.size * 0.72),
          animationDelay: `${item.delay}s`,
          animationDuration: `${item.duration}s`,
          '--fish-x-1': `${item.travelVw * -0.22}vw`,
          '--fish-x-2': `${item.travelVw * -0.56}vw`,
          '--fish-x-3': `${item.travelVw * -1}vw`,
          '--fish-x-4': `${item.travelVw * -0.72}vw`,
          '--fish-x-5': `${item.travelVw * -0.32}vw`,
          '--fish-y-1': `${item.waveVh * -0.45}vh`,
          '--fish-y-2': `${item.waveVh * -0.12}vh`,
          '--fish-y-3': `${item.waveVh * 0.34}vh`,
          '--fish-y-4': `${item.waveVh * -0.58}vh`,
          '--fish-y-5': `${item.waveVh * -0.18}vh`,
          '--fish-rotate-start': `${item.rotate - 2}deg`,
          '--fish-rotate-1': `${item.rotate + 2}deg`,
          '--fish-rotate-2': `${item.rotate - 4}deg`,
          '--fish-rotate-3': `${item.rotate + 2}deg`,
          '--fish-rotate-4': `${item.rotate - 1}deg`,
          '--fish-rotate-5': `${item.rotate + 1}deg`,
        };

        return (
          <span
            key={item.id}
            data-effect="swimming-fish"
            className={styles.fishItem}
            style={itemStyle}
          >
            <Image src={fishImage} alt="" fill sizes={`${item.size}px`} className={styles.effectImage} draggable={false} />
          </span>
        );
      })}
    </div>
  );
}
