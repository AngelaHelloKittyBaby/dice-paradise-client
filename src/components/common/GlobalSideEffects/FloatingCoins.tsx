'use client';

import Image, { type StaticImageData } from 'next/image';
import { motion } from 'framer-motion';
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
}

const coinImages = [coin1Image, coin2Image, coin3Image];
const COIN_SIZE_SCALE = 1.22;

type EffectSide = 'left' | 'right';

const baseCoinEffects: CoinEffect[] = [
  { id: 'coin-1', image: coinImages[0], left: '9%', top: '4%', size: 58, duration: 8.6, delay: -1.2, drift: 22, rotation: 300, opacity: 0.74 },
  { id: 'coin-2', image: coinImages[1], left: '38%', top: '9%', size: 104, duration: 10.8, delay: -8.4, drift: -28, rotation: -360, opacity: 0.86 },
  { id: 'coin-3', image: coinImages[2], left: '72%', top: '14%', size: 60, duration: 7.8, delay: -5.1, drift: 20, rotation: 340, opacity: 0.72 },
  { id: 'coin-4', image: coinImages[0], left: '20%', top: '24%', size: 116, duration: 11.7, delay: -3.6, drift: 34, rotation: -300, opacity: 0.82 },
  { id: 'coin-5', image: coinImages[1], left: '58%', top: '31%', size: 68, duration: 8.4, delay: -6.5, drift: -24, rotation: 400, opacity: 0.82 },
  { id: 'coin-6', image: coinImages[2], left: '84%', top: '39%', size: 112, duration: 12, delay: -10.2, drift: 30, rotation: -330, opacity: 0.82 },
  { id: 'coin-7', image: coinImages[0], left: '12%', top: '51%', size: 62, duration: 8.2, delay: -2.6, drift: -20, rotation: 340, opacity: 0.78 },
  { id: 'coin-8', image: coinImages[1], left: '43%', top: '57%', size: 80, duration: 10.2, delay: -7.8, drift: 26, rotation: -400, opacity: 0.72 },
  { id: 'coin-9', image: coinImages[2], left: '76%', top: '66%', size: 58, duration: 7.4, delay: -4.4, drift: -22, rotation: 280, opacity: 0.7 },
  { id: 'coin-10', image: coinImages[0], left: '27%', top: '76%', size: 74, duration: 9.8, delay: -9.6, drift: -32, rotation: -350, opacity: 0.82 },
  { id: 'coin-11', image: coinImages[1], left: '62%', top: '84%', size: 66, duration: 11.2, delay: -11.4, drift: 30, rotation: 320, opacity: 0.72 },
  { id: 'coin-12', image: coinImages[2], left: '88%', top: '91%', size: 108, duration: 10.6, delay: -0.8, drift: -26, rotation: -320, opacity: 0.82 },
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
};

export function FloatingCoins({ side }: { side: EffectSide }) {
  return (
    <div className={styles.coinsLayer}>
      {coinEffects[side].map(item => {
        const displaySize = Math.round(item.size * COIN_SIZE_SCALE);

        return (
          <motion.span
            key={item.id}
            className={styles.coinItem}
            style={{
              left: item.left,
              top: item.top,
              width: displaySize,
              height: displaySize,
            }}
            animate={{
              x: [0, item.drift, item.drift * -0.45, item.drift * 0.35, 0],
              y: ['-8vh', '7vh', '19vh', '32vh'],
              rotate: [0, item.rotation * 0.36, item.rotation * 0.74, item.rotation],
              opacity: [0, item.opacity, item.opacity * 0.58, 0],
              scale: [0.76, 1.12, 0.9, 1.04],
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <Image src={item.image} alt="" fill sizes={`${displaySize}px`} className={styles.effectImage} draggable={false} />
          </motion.span>
        );
      })}
    </div>
  );
}
