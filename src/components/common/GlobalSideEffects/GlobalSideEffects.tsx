'use client';

import type { CSSProperties } from 'react';
import { MotionConfig } from 'framer-motion';
import backgroundImage from '@/assets/images/backgrounds/background.png';
import { FloatingAirship } from './FloatingAirship';
import { FloatingBalloons } from './FloatingBalloons';
import { FloatingCoins } from './FloatingCoins';
import { FloatingDice } from './FloatingDice';
import { FloatingFish } from './FloatingFish';
import { FloatingStars } from './FloatingStars';
import styles from './GlobalSideEffects.module.scss';

type ParticleTone = 'blue' | 'gold' | 'white';
type ParticleSide = 'left' | 'right';

interface ParticleEffect {
  id: string;
  side: ParticleSide;
  tone: ParticleTone;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  driftX: string;
  driftY: string;
}

type ParticleStyle = CSSProperties & {
  '--particle-drift-x': string;
  '--particle-drift-y': string;
};

function seededValue(index: number, salt: number) {
  let seed = Math.imul(index + 1, 0x1f123bb5) ^ Math.imul(salt + 1, 0x5bd1e995);
  seed ^= seed >>> 15;
  seed = Math.imul(seed, 0x2c1b3c6d);
  seed ^= seed >>> 12;

  return ((seed >>> 0) % 10_000) / 10_000;
}

function toCssNumber(value: number, precision = 3) {
  return Number(value.toFixed(precision));
}

function createParticles(count: number): ParticleEffect[] {
  return Array.from({ length: count }, (_, index) => {
    const side: ParticleSide = index % 2 === 0 ? 'left' : 'right';
    const toneIndex = index % 6;
    const tone: ParticleTone = toneIndex === 0 || toneIndex === 4 ? 'gold' : toneIndex === 3 ? 'white' : 'blue';
    const driftDirection = side === 'left' ? 1 : -1;

    return {
      id: `global-particle-${index}`,
      side,
      tone,
      left: `${toCssNumber(3 + seededValue(index, 3) * 92)}%`,
      top: `${toCssNumber(2 + seededValue(index, 5) * 96)}%`,
      size: 3 + Math.round(seededValue(index, 7) * 7),
      duration: toCssNumber(5.4 + seededValue(index, 11) * 7.6),
      delay: toCssNumber(seededValue(index, 13) * -12),
      driftX: `${toCssNumber(driftDirection * (10 + seededValue(index, 17) * 38))}px`,
      driftY: `${toCssNumber(-16 - seededValue(index, 19) * 46)}px`,
    };
  });
}

const particleEffects = createParticles(96);
const leftParticles = particleEffects.filter(item => item.side === 'left');
const rightParticles = particleEffects.filter(item => item.side === 'right');

function getParticleToneClass(tone: ParticleTone) {
  if (tone === 'gold') return styles.particleGold;
  if (tone === 'white') return styles.particleWhite;
  return styles.particleBlue;
}

function renderParticles(particles: ParticleEffect[]) {
  return (
    <div className={styles.particleField}>
      {particles.map(item => {
        const particleStyle: ParticleStyle = {
          left: item.left,
          top: item.top,
          width: item.size,
          height: item.size,
          animationDelay: `${item.delay}s`,
          animationDuration: `${item.duration}s`,
          '--particle-drift-x': item.driftX,
          '--particle-drift-y': item.driftY,
        };

        return <span key={item.id} className={`${styles.particle} ${getParticleToneClass(item.tone)}`} style={particleStyle} />;
      })}
    </div>
  );
}

export function GlobalSideEffects() {
  return (
    <>
      <div
        className={styles.backgroundLayer}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: `url(${backgroundImage.src})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
        aria-hidden="true"
      />
      <MotionConfig reducedMotion="never">
        <div
          className={styles.effectsLayer}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 95,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <section className={`${styles.sideZone} ${styles.leftZone}`}>
            {renderParticles(leftParticles)}
            <FloatingStars side="left" />
            <FloatingCoins side="left" />
            <FloatingDice side="left" />
          </section>

          <section className={`${styles.sideZone} ${styles.rightZone}`}>
            {renderParticles(rightParticles)}
            <FloatingStars side="right" />
            <FloatingCoins side="right" />
            <FloatingDice side="right" />
            <FloatingBalloons />
            <FloatingAirship />
          </section>

          <FloatingCoins side="screen" />
          <FloatingFish />
        </div>
      </MotionConfig>
    </>
  );
}
