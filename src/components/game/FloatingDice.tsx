'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import goldenDice from '@/assets/images/dice/黄金骰子.png';
import magicCircle from '@/assets/images/ui/icons/circle.png';

export function FloatingDice() {
  return (
    <div className="pointer-events-none relative h-full w-full" aria-hidden="true">
      <div className="absolute bottom-[70px] left-1/2 h-[312px] w-[470px]" style={{ transform: 'translateX(-50%)' }}>
        <motion.div
          className="relative h-full w-full"
          animate={{
            scale: [0.95, 1.05, 0.95],
            opacity: [0.84, 1, 0.84],
          }}
          transition={{
            scale: {
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            opacity: {
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
          style={{
            filter: 'drop-shadow(0 0 26px rgba(174, 85, 255, 0.92)) drop-shadow(0 0 58px rgba(124, 58, 237, 0.72))',
          }}
        >
          <Image src={magicCircle} alt="" fill sizes="470px" className="object-contain" />
        </motion.div>
      </div>

      <div className="absolute bottom-[146px] left-1/2 h-[236px] w-[118px]" style={{ transform: 'translateX(-50%)' }}>
        <motion.div
          className="h-full w-full rounded-full blur-[2px]"
          animate={{
            opacity: [0.42, 0.92, 0.42],
            scaleY: [0.88, 1.1, 0.88],
            scaleX: [0.84, 1.02, 0.84],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            background:
              'linear-gradient(180deg, rgba(255, 247, 166, 0.92) 0%, rgba(255, 194, 49, 0.72) 44%, rgba(255, 116, 22, 0) 100%)',
            clipPath: 'polygon(48% 0%, 58% 0%, 100% 100%, 0% 100%)',
            filter: 'drop-shadow(0 0 22px rgba(255, 210, 72, 0.9))',
          }}
        />
      </div>

      <div className="absolute left-1/2 top-[108px] z-10 h-[218px] w-[218px]" style={{ transform: 'translateX(-50%)' }}>
        <motion.div
          className="relative h-full w-full"
          animate={{
            y: [-12, 12],
            rotate: [-4, 4],
          }}
          transition={{
            y: {
              duration: 2.5,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            },
            rotate: {
              duration: 4.8,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            },
          }}
          style={{
            filter: 'drop-shadow(0 0 28px rgba(255, 230, 95, 0.95)) drop-shadow(0 0 66px rgba(245, 158, 11, 0.82))',
          }}
        >
          <Image src={goldenDice} alt="" fill sizes="218px" className="object-contain" />
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-[116px] left-1/2 h-16 w-64 rounded-full"
        animate={{
          opacity: [0.45, 0.84, 0.45],
          scale: [0.92, 1.08, 0.92],
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse at center, rgba(255, 224, 80, 0.78) 0%, rgba(196, 69, 255, 0.54) 38%, transparent 72%)',
          filter: 'blur(12px)',
        }}
      />
    </div>
  );
}
