'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import balloonImage from '@/assets/images/ui/icons/hotAirBalloon.png';
import styles from './GlobalSideEffects.module.scss';

interface BalloonEffect {
  id: string;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  sway: string[];
}

const balloonEffects: BalloonEffect[] = [
  { id: 'balloon-2', left: '42%', top: '102%', size: 154, duration: 20, delay: -15, sway: ['0vw', '-1.8vw', '2vw', '-0.8vw', '0vw'] },
  { id: 'balloon-game-top', left: '34%', top: '15%', size: 92, duration: 6.8, delay: -1.4, sway: ['0px', '18px', '-12px', '10px', '0px'] },
];

export function FloatingBalloons() {
  return (
    <div className={styles.balloonsLayer}>
      {balloonEffects.map(item => (
        <motion.span
          key={item.id}
          className={styles.balloonItem}
          style={{
            left: item.left,
            top: item.top,
            width: item.size,
            height: Math.round(item.size * 1.24),
          }}
          animate={{
            y: item.top === '102%' ? ['8vh', '-118vh'] : [0, -18, 8, -10, 0],
            x: item.sway,
            rotate: [0, -2, 2.5, -1.5, 0],
            opacity: item.top === '102%' ? [0, 0.88, 0.92, 0] : [0.72, 0.96, 0.86, 0.94, 0.72],
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.25, 0.52, 0.78, 1],
          }}
        >
          <Image src={balloonImage} alt="" fill sizes={`${item.size}px`} className={styles.effectImage} draggable={false} />
        </motion.span>
      ))}
    </div>
  );
}
