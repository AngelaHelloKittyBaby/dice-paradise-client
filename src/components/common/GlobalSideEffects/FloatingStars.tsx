'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import starImage from '@/assets/images/ui/icons/star.png';
import styles from './GlobalSideEffects.module.scss';

const STAR_SIZE_SCALE = 1.38;

interface StarEffect {
  id: string;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  opacity: number;
}

type EffectSide = 'left' | 'right';

const starSizes = [18, 26, 38, 54, 30, 66, 22, 46, 34, 58, 24, 72, 28, 42, 20, 62, 36, 50, 24, 68, 32];

const starGrid = [
  [10, 6],
  [36, 9],
  [68, 7],
  [88, 14],
  [20, 19],
  [52, 23],
  [80, 27],
  [8, 32],
  [34, 38],
  [62, 35],
  [90, 43],
  [18, 49],
  [48, 54],
  [75, 58],
  [11, 64],
  [37, 70],
  [66, 67],
  [88, 74],
  [22, 82],
  [51, 87],
  [78, 91],
] as const;

const starEffects: Record<EffectSide, StarEffect[]> = {
  left: starGrid.map(([left, top], index) => ({
    id: `star-left-${index}`,
    left: `${left}%`,
    top: `${top}%`,
    size: starSizes[index % starSizes.length],
    duration: 2.2 + (index % 4) * 0.45,
    delay: index * -0.28,
    rotation: -20 + (index % 7) * 7,
    opacity: 0.4 + (index % 6) * 0.07,
  })),
  right: starGrid.map(([left, top], index) => ({
    id: `star-right-${index}`,
    left: `${100 - left}%`,
    top: `${Math.min(94, top + (index % 3) * 2)}%`,
    size: starSizes[(index + 5) % starSizes.length],
    duration: 2.35 + ((index + 1) % 4) * 0.42,
    delay: index * -0.31,
    rotation: 22 - (index % 7) * 7,
    opacity: 0.38 + ((index + 3) % 6) * 0.07,
  })),
};

export function FloatingStars({ side }: { side: EffectSide }) {
  return (
    <div className={styles.starsLayer}>
      {starEffects[side].map(item => {
        const displaySize = Math.round(item.size * STAR_SIZE_SCALE);

        return (
          <motion.span
            key={item.id}
            className={styles.starItem}
            style={{
              left: item.left,
              top: item.top,
              width: displaySize,
              height: displaySize,
            }}
            animate={{
              x: [0, 6, -4, 0],
              y: [0, -5, 4, 0],
              opacity: [item.opacity * 0.32, item.opacity, item.opacity * 0.58, item.opacity * 0.32],
              scale: [0.64, 1.36, 0.88, 1.12],
              rotate: [item.rotation, item.rotation + 22, item.rotation - 16, item.rotation + 8],
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Image src={starImage} alt="" fill sizes={`${displaySize}px`} className={styles.effectImage} draggable={false} />
          </motion.span>
        );
      })}
    </div>
  );
}
