'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import yachtArt from '@/assets/images/ui/icons/游艇.png';
import waveArt from '@/assets/images/effects/wave.png';
import styles from './YachtScoreEffect.module.css';

export interface YachtScoreEffectProps {
  triggerKey: number;
}

const sparkleItems = Array.from({ length: 18 }, (_, index) => index);
const diceBurstItems = Array.from({ length: 6 }, (_, index) => index);

export function YachtScoreEffect({ triggerKey }: YachtScoreEffectProps) {
  const [activeKey, setActiveKey] = useState<number | null>(null);

  useEffect(() => {
    if (!triggerKey) return undefined;

    setActiveKey(triggerKey);

    const timer = window.setTimeout(() => {
      setActiveKey(null);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [triggerKey]);

  return (
    <AnimatePresence>
      {activeKey ? (
        <motion.div
          key={activeKey}
          className={styles.effectLayer}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className={styles.scoreCallout}
            initial={{ opacity: 0, y: 38, scale: 0.78, filter: 'blur(8px)' }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [38, 0, -8, -22],
              scale: [0.78, 1.06, 1, 0.96],
              filter: ['blur(8px)', 'blur(0px)', 'blur(0px)', 'blur(5px)'],
            }}
            transition={{ duration: 2.25, ease: 'easeOut', times: [0, 0.18, 0.72, 1] }}
          >
            <span>快艇</span>
            <strong>+50</strong>
          </motion.div>

          <motion.div
            className={styles.rippleField}
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: [0, 0.9, 0.55, 0], scale: [0.86, 1, 1.18, 1.32] }}
            transition={{ duration: 2.55, ease: 'easeOut', times: [0, 0.18, 0.7, 1] }}
          >
            <span />
            <span />
            <span />
          </motion.div>

          <div className={styles.diceBurst}>
            {diceBurstItems.map(item => (
              <span key={item}>{item + 1}</span>
            ))}
          </div>

          <motion.div
            className={styles.route}
            initial={{
              x: -620,
              y: 810,
              opacity: 0,
              rotate: -23,
              scale: 0.78,
              filter: 'blur(8px) brightness(1.2)',
            }}
            animate={{
              x: 1960,
              y: -250,
              opacity: [0, 1, 1, 0],
              rotate: [-23, -20, -22, -18],
              scale: [0.78, 0.98, 1.05, 0.95],
              filter: [
                'blur(8px) brightness(1.22)',
                'blur(0px) brightness(1.08)',
                'blur(2px) brightness(1.14)',
                'blur(9px) brightness(1.25)',
              ],
            }}
            transition={{
              duration: 2.72,
              ease: [0.16, 0.86, 0.24, 1],
              times: [0, 0.18, 0.76, 1],
            }}
          >
            <motion.div
              className={styles.wakeGroup}
              initial={{ opacity: 0, x: -28, y: 18, scaleX: 0.72, scaleY: 0.78 }}
              animate={{
                opacity: [0, 1, 0.88, 0],
                x: [-28, -64, -128, -230],
                y: [18, 28, 38, 52],
                scaleX: [0.72, 1.08, 1.28, 1.54],
                scaleY: [0.78, 0.98, 1.1, 1.18],
              }}
              transition={{ duration: 2.72, ease: 'easeOut', times: [0, 0.2, 0.76, 1] }}
            >
              <div className={styles.trailMist} />
              <div className={styles.surgeFoam} />
              <Image
                src={waveArt}
                alt=""
                className={`${styles.waveImage} ${styles.waveImageBack}`}
                width={760}
                height={500}
                draggable={false}
                priority
              />
              <Image
                src={waveArt}
                alt=""
                className={`${styles.waveImage} ${styles.waveImageMiddle}`}
                width={760}
                height={500}
                draggable={false}
                priority
              />
              <Image
                src={waveArt}
                alt=""
                className={`${styles.waveImage} ${styles.waveImageFront}`}
                width={640}
                height={360}
                draggable={false}
                priority
              />
              <div className={styles.sparkleField}>
                {sparkleItems.map(item => (
                  <span key={item} />
                ))}
              </div>
            </motion.div>

            <motion.div
              className={styles.yachtFloat}
              animate={{ y: [0, -15, 7, -10, 0], rotate: [0, 1.6, -1.2, 1, 0] }}
              transition={{ duration: 0.78, repeat: 3, ease: 'easeInOut' }}
            >
              <Image
                src={yachtArt}
                alt=""
                className={styles.yachtImage}
                width={620}
                height={360}
                draggable={false}
                priority
              />
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
