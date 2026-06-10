'use client';

import Image, { type StaticImageData } from 'next/image';
import type { CSSProperties } from 'react';
import coin1Image from '@/assets/images/ui/icons/coin1.png';
import coin2Image from '@/assets/images/ui/icons/coin2.png';
import coin3Image from '@/assets/images/ui/icons/coin3.png';
import styles from './GlobalSideEffects.module.scss';

interface CoinEffect {
  id: string;
  image: StaticImageData;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  rotation: number;
  opacity: number;
  falls?: boolean;
}

const coinImages = [coin1Image, coin2Image, coin3Image];
const COIN_SIZE_SCALE = 1.22;

type EffectSide = 'left' | 'right' | 'screen';

type CoinStyle = CSSProperties & {
  '--coin-drift-a': string;
  '--coin-drift-b': string;
  '--coin-drift-c': string;
  '--coin-float-drift-a': string;
  '--coin-float-drift-b': string;
  '--coin-float-drift-c': string;
  '--coin-rotation': string;
  '--coin-fall-rotation-a': string;
  '--coin-fall-rotation-b': string;
  '--coin-float-rotation-a': string;
  '--coin-float-rotation-b': string;
  '--coin-float-rotation-c': string;
  '--coin-opacity': number;
  '--coin-opacity-soft': number;
  '--coin-opacity-mid': number;
  '--coin-opacity-bright': number;
};

const baseCoinEffects: CoinEffect[] = [
  { id: 'coin-1', image: coinImages[0], left: '9%', top: '4%', size: 58, duration: 8.6, delay: -1.2, drift: 22, rotation: 300, opacity: 0.74 },
  { id: 'coin-2', image: coinImages[1], left: '38%', top: '9%', size: 104, duration: 10.8, delay: -8.4, drift: -28, rotation: -360, opacity: 0.86, falls: true },
  { id: 'coin-4', image: coinImages[0], left: '20%', top: '24%', size: 116, duration: 11.7, delay: -3.6, drift: 34, rotation: -300, opacity: 0.82 },
  { id: 'coin-6', image: coinImages[2], left: '84%', top: '39%', size: 112, duration: 12, delay: -10.2, drift: 30, rotation: -330, opacity: 0.82, falls: true },
];

const coinEffects: Record<EffectSide, CoinEffect[]> = {
  left: baseCoinEffects.map(item => ({ ...item, id: `${item.id}-left` })),
  right: baseCoinEffects.map((item, index) => ({
    ...item,
    id: `${item.id}-right`,
    image: coinImages[(index + 1) % coinImages.length],
    left: `${100 - Number.parseFloat(item.left)}%`,
    top: index % 2 === 0 ? item.top : `${Math.max(3, Number.parseFloat(item.top) - 5)}%`,
    drift: item.drift * -1,
    rotation: item.rotation * -1,
    delay: item.delay - 1.7,
  })),
  screen: [],
};

export function FloatingCoins({ side }: { side: EffectSide }) {
  return (
    <div className={styles.coinsLayer}>
      {coinEffects[side].map(item => {
        const displaySize = Math.round(item.size * COIN_SIZE_SCALE);
        const itemStyle: CoinStyle = {
          position: 'absolute',
          display: 'block',
          overflow: 'visible',
          left: item.left,
          top: item.falls ? '-28vh' : item.top,
          width: displaySize,
          height: displaySize,
          animationDelay: `${item.delay}s`,
          animationDuration: `${item.falls ? item.duration * 1.22 : item.duration}s`,
          '--coin-drift-a': `${item.drift * 0.72}px`,
          '--coin-drift-b': `${item.drift * -0.28}px`,
          '--coin-drift-c': `${item.drift * 0.5}px`,
          '--coin-float-drift-a': `${item.drift * 0.44}px`,
          '--coin-float-drift-b': `${item.drift * -0.28}px`,
          '--coin-float-drift-c': `${item.drift * 0.24}px`,
          '--coin-rotation': `${item.rotation}deg`,
          '--coin-fall-rotation-a': `${item.rotation * 0.32}deg`,
          '--coin-fall-rotation-b': `${item.rotation * 0.72}deg`,
          '--coin-float-rotation-a': `${item.rotation * 0.12}deg`,
          '--coin-float-rotation-b': `${item.rotation * -0.06}deg`,
          '--coin-float-rotation-c': `${item.rotation * 0.08}deg`,
          '--coin-opacity': item.opacity,
          '--coin-opacity-soft': item.opacity * 0.62,
          '--coin-opacity-mid': item.opacity * 0.76,
          '--coin-opacity-bright': item.opacity * 0.9,
        };

        return (
          <span
            key={item.id}
            data-effect={item.falls ? 'falling-coin' : 'floating-coin'}
            className={`${styles.coinItem} ${item.falls ? styles.coinItemFalling : styles.coinItemFloating}`}
            style={itemStyle}
          >
            <Image src={item.image} alt="" fill sizes={`${displaySize}px`} className={styles.effectImage} draggable={false} />
          </span>
        );
      })}
    </div>
  );
}
