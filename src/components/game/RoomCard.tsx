import React from 'react';
import { motion } from 'framer-motion';
import Image, { type StaticImageData } from 'next/image';
import createRoomImage from '@/assets/images/ui/panels/createroom.png';
import joinRoomImage from '@/assets/images/ui/panels/joinroom.png';

interface RoomCardProps {
  type: 'create' | 'join';
  onClick: () => void;
  disabled?: boolean;
}

interface RoomCardContent {
  image: StaticImageData;
  label: string;
  subtitle: string;
  tone: string;
}

const cardContent: Record<RoomCardProps['type'], RoomCardContent> = {
  create: {
    image: createRoomImage,
    label: '创建房间',
    subtitle: '创建属于你的房间',
    tone: 'from-[#9b520c]/10 via-[#c96d15]/74 to-[#8a4307]/92',
  },
  join: {
    image: joinRoomImage,
    label: '加入房间',
    subtitle: '加入好友的房间',
    tone: 'from-[#33228d]/10 via-[#4432ad]/76 to-[#2a206f]/94',
  },
};

const hoverSparks = [
  { x: '12%', y: '18%', delay: 0 },
  { x: '84%', y: '20%', delay: 0.16 },
  { x: '18%', y: '76%', delay: 0.32 },
  { x: '74%', y: '72%', delay: 0.48 },
  { x: '50%', y: '12%', delay: 0.64 },
];

export function RoomCard({ type, onClick, disabled = false }: RoomCardProps) {
  const content = cardContent[type];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={content.label}
      whileHover={!disabled ? { scale: 1.05, y: -5 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      className="group relative h-[306px] w-[218px] overflow-hidden rounded-[27px] border-0 bg-transparent p-0 outline-none disabled:cursor-wait disabled:saturate-50"
      style={{
        filter: 'drop-shadow(0 18px 18px rgba(73, 39, 7, 0.28))',
      }}
    >
      <Image
        src={content.image}
        alt=""
        fill
        sizes="218px"
        className="pointer-events-none object-contain"
      />

      <div
        className={`pointer-events-none absolute inset-x-[14px] bottom-[16px] h-[76px] rounded-[19px] bg-gradient-to-b ${content.tone}`}
        style={{
          boxShadow: 'inset 0 2px 0 rgba(255, 246, 181, 0.22), 0 -10px 22px rgba(255, 213, 92, 0.18)',
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-[27px] text-center">
        <strong
          className="block text-[27px] font-black leading-none text-white"
          style={{
            textShadow:
              '0 3px 0 rgba(116, 55, 7, 0.48), 0 0 16px rgba(255, 225, 103, 0.34), 0 6px 12px rgba(61, 23, 5, 0.32)',
          }}
        >
          {content.label}
        </strong>
        <span
          className="mt-2 block text-[13px] font-black leading-none text-[#fff1aa]"
          style={{
            textShadow: '0 2px 5px rgba(55, 21, 5, 0.44)',
          }}
        >
          {content.subtitle}
        </span>
      </div>

      <motion.div
        className="pointer-events-none absolute inset-[5px] rounded-[24px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
        animate={
          disabled
            ? undefined
            : {
                boxShadow: [
                  '0 0 0 2px rgba(255, 241, 171, 0.66), 0 0 18px rgba(255, 214, 72, 0.5), inset 0 0 18px rgba(255, 231, 118, 0.24)',
                  '0 0 0 4px rgba(255, 234, 132, 0.82), 0 0 34px rgba(255, 190, 49, 0.76), inset 0 0 26px rgba(255, 228, 107, 0.34)',
                  '0 0 0 2px rgba(255, 241, 171, 0.66), 0 0 18px rgba(255, 214, 72, 0.5), inset 0 0 18px rgba(255, 231, 118, 0.24)',
                ],
              }
        }
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {hoverSparks.map(spark => (
        <motion.span
          key={`${spark.x}-${spark.y}`}
          className="pointer-events-none absolute h-2 w-2 rounded-full bg-[#ffe56d] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{
            left: spark.x,
            top: spark.y,
            boxShadow: '0 0 12px rgba(255, 229, 109, 0.95)',
          }}
          animate={{
            y: [0, -12, 0],
            scale: [0.7, 1.18, 0.7],
          }}
          transition={{
            duration: 1.6,
            delay: spark.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.button>
  );
}
