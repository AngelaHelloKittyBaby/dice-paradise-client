'use client';

import Image from 'next/image';
import { Copy, Edit3 } from 'lucide-react';
import userInfoBackground from '@/assets/images/ui/panels/userinfo.png';
import type { ProfileUser } from '@/types/profile';

export interface ProfileHeaderProps {
  user: ProfileUser;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const progress = Math.min(100, Math.round((user.exp / user.nextLevelExp) * 100));

  return (
    <section className="relative h-[322px] overflow-hidden rounded-[32px] border-2 border-[#76d8ff]/80 shadow-[0_24px_60px_rgba(0,56,160,0.34),0_0_28px_rgba(92,199,255,0.5)]">
      <Image src={userInfoBackground} alt="" fill className="object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(237,249,255,0.78)_0%,rgba(235,247,255,0.42)_42%,rgba(255,255,255,0.04)_100%)]" />

      <div className="relative z-10 flex h-full items-center px-[46px]">
        <div className="flex items-center gap-8">
          <div className="relative grid h-[190px] w-[190px] place-items-center rounded-full bg-gradient-to-br from-[#fff8c5] via-white to-[#58baff] p-[8px] shadow-[0_12px_28px_rgba(0,55,160,0.28),0_0_28px_rgba(255,231,115,0.68)]">
            <span className="absolute inset-[10px] rounded-full border-[5px] border-white/90" />
            <span
              className="relative h-full w-full rounded-full bg-cover bg-center shadow-[inset_0_6px_18px_rgba(255,255,255,0.32)]"
              style={{ backgroundImage: `url(${user.avatar})` }}
              aria-label={`${user.name}头像`}
            />
          </div>

          <div className="min-w-[520px] rounded-[26px] border border-white/55 bg-white/72 px-8 py-6 shadow-[0_18px_40px_rgba(18,92,180,0.16),inset_0_2px_0_rgba(255,255,255,0.82)] backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <h1 className="m-0 text-[43px] font-black leading-none text-[#073c9e] drop-shadow-[0_2px_0_rgba(255,255,255,0.65)]">
                {user.name}
              </h1>
              <span className="rounded-full bg-gradient-to-r from-[#ffd970] to-[#ff8b20] px-4 py-2 text-[17px] font-black leading-none text-[#8a4200] shadow-[0_6px_12px_rgba(150,75,0,0.22)]">
                {user.vip}
              </span>
            </div>

            <div className="mt-5 flex items-center gap-3 text-[19px] font-black text-[#062d82]">
              <span>ID：{user.uid}</span>
              <button className="grid h-8 w-8 place-items-center rounded-lg bg-[#dff2ff] text-[#1169d9] shadow-[inset_0_2px_0_rgba(255,255,255,0.8)]" type="button" aria-label="复制 UID">
                <Copy size={19} strokeWidth={2.8} />
              </button>
            </div>

            <div className="mt-9 flex items-center gap-4">
              <strong className="text-[25px] font-black text-[#062f91]">Lv.{user.level}</strong>
              <div className="h-[14px] w-[250px] overflow-hidden rounded-full bg-[#214e9c]/35 shadow-[inset_0_2px_5px_rgba(0,25,80,0.25)]">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-[#ffd042] via-[#ffb722] to-[#2f82ff] shadow-[0_0_12px_rgba(255,200,45,0.7)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[20px] font-black text-[#0b3b97]">
                {user.exp}/{user.nextLevelExp}
              </span>
            </div>

            <div className="mt-8 flex items-center gap-4 text-[20px] font-black text-[#1552a5]">
              <span>{user.signature}</span>
              <button className="grid h-9 w-9 place-items-center rounded-lg bg-[#e7f5ff] text-[#126fe7] shadow-[inset_0_2px_0_rgba(255,255,255,0.86)]" type="button" aria-label="编辑个性签名">
                <Edit3 size={19} strokeWidth={2.8} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
