'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import roomChoiceImage from '@/assets/images/ui/panels/roomchoice.png';
import { FloatingDice } from './FloatingDice';
import { MagicParticles } from './MagicParticles';
import { RoomCard } from './RoomCard';

export interface RoomHallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  isLoading?: boolean;
  waitingRoomCount?: number;
}

export function RoomHallModal({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  isLoading = false,
  waitingRoomCount = 0,
}: RoomHallModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.section
            className="relative z-10 flex h-[680px] w-[1110px] items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="房间大厅"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 22,
              mass: 0.9,
            }}
            onClick={event => event.stopPropagation()}
            style={{
              filter:
                'drop-shadow(0 30px 60px rgba(8, 4, 35, 0.52)) drop-shadow(0 0 54px rgba(160, 91, 255, 0.42)) drop-shadow(0 0 78px rgba(255, 184, 49, 0.34))',
            }}
          >
            <div className="absolute left-[-18px] top-[12px] z-20 h-[660px] w-[430px]">
              <MagicParticles />
              <FloatingDice />
            </div>

            <div className="absolute right-[10px] top-[42px] h-[592px] w-[888px]">
              <Image
                src={roomChoiceImage}
                alt=""
                fill
                sizes="888px"
                className="pointer-events-none object-contain"
              />

              <motion.p
                className="absolute left-0 right-0 top-[140px] z-10 text-center text-[24px] font-black leading-none text-[#7e4308]"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                style={{
                  textShadow: '0 2px 0 rgba(255, 231, 156, 0.65), 0 4px 9px rgba(94, 46, 2, 0.18)',
                }}
              >
                选择房间模式
              </motion.p>

              <div className="absolute left-1/2 top-[194px] z-10 flex -translate-x-1/2 items-center justify-center gap-[42px]">
                <motion.div
                  initial={{ opacity: 0, x: -34, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.18, type: 'spring', stiffness: 260, damping: 23 }}
                >
                  <RoomCard type="create" onClick={onCreateRoom} disabled={isLoading} />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 34, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.24, type: 'spring', stiffness: 260, damping: 23 }}
                >
                  <RoomCard type="join" onClick={onJoinRoom} disabled={isLoading} />
                </motion.div>
              </div>

              <motion.button
                type="button"
                aria-label="关闭房间大厅"
                className="absolute right-[58px] top-[47px] z-20 grid h-[66px] w-[66px] place-items-center rounded-full border-[5px] border-[#ffd987] bg-gradient-to-b from-[#ff6c53] to-[#d7282b] text-white shadow-[inset_0_5px_0_rgba(255,255,255,0.36),inset_0_-7px_0_rgba(120,7,22,0.28),0_9px_0_rgba(122,53,17,0.42),0_0_22px_rgba(255,214,92,0.58)] outline-none"
                onClick={onClose}
                disabled={isLoading}
                initial={{ opacity: 0, scale: 0.68, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.28, type: 'spring', stiffness: 360, damping: 18 }}
                whileHover={!isLoading ? { scale: 1.08, rotate: 4 } : undefined}
                whileTap={!isLoading ? { scale: 0.92 } : undefined}
              >
                <X size={40} strokeWidth={4.5} aria-hidden="true" />
              </motion.button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
