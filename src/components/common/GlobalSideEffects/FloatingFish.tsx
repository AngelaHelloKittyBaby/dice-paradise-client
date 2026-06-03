'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import fishImage from '@/assets/images/ui/icons/fish.png';
import styles from './GlobalSideEffects.module.scss';

interface FishEffect {
  id: string;
  left: string;
  bottom: string;
  size: number;
  duration: number;
  delay: number;
  distance: number;
  height: number;
  rotate: number;
}

const fishEffects: FishEffect[] = [
  { id: 'fish-1', left: '76%', bottom: '8%', size: 124, duration: 7.2, delay: -1.2, distance: 270, height: 82, rotate: -8 },
  { id: 'fish-2', left: '58%', bottom: '4%', size: 150, duration: 8.4, delay: -5.4, distance: 330, height: 104, rotate: 6 },
  { id: 'fish-3', left: '88%', bottom: '17%', size: 98, duration: 7.6, delay: -3.4, distance: 230, height: 76, rotate: -6 },
  { id: 'fish-4', left: '68%', bottom: '1%', size: 92, duration: 8.8, delay: -7.1, distance: 300, height: 74, rotate: 10 },
];

export function FloatingFish() {
  return (
    <div className={styles.fishLayer}>
      {fishEffects.map(item => (
        <motion.span
          key={item.id}
          className={styles.fishItem}
          style={{
            left: item.left,
            bottom: item.bottom,
            width: item.size,
            height: Math.round(item.size * 0.72),
          }}
          animate={{
            x: [0, item.distance * -0.18, item.distance * -0.42, item.distance * -0.7, item.distance * -1],
            y: [0, item.height * -0.22, item.height * -0.42, item.height * -0.2, 0],
            rotate: [item.rotate, item.rotate + 4, item.rotate - 3, item.rotate + 2, item.rotate - 6],
            opacity: [0, 0.88, 0.96, 0.86, 0],
            scale: [0.94, 1.04, 1.02, 1, 0.96],
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            ease: 'linear',
            times: [0, 0.22, 0.48, 0.74, 1],
          }}
        >
          <Image src={fishImage} alt="" fill sizes={`${item.size}px`} className={styles.effectImage} draggable={false} />
        </motion.span>
      ))}
    </div>
  );
}
