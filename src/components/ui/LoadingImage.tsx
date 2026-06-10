'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import loadingImage from '@/assets/images/ui/icons/loading.png';
import styles from './LoadingImage.module.css';

export interface LoadingImageProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'stage';
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}

const loadingImageWidthMap: Record<NonNullable<LoadingImageProps['size']>, number> = {
  sm: 180,
  md: 300,
  lg: 460,
  xl: 720,
  stage: 1920,
};

type LoadingImageStyle = CSSProperties & {
  '--loading-image-width': string;
};

export function LoadingImage({ size = 'md', priority = false, className, style }: LoadingImageProps) {
  const width = loadingImageWidthMap[size];
  const wrapClassName = [
    styles.loadingImageWrap,
    size === 'stage' ? styles.loadingImageWrapStage : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <span
      className={wrapClassName}
      style={{ ...style, '--loading-image-width': `${width}px` } as LoadingImageStyle}
      aria-hidden="true"
    >
      <Image
        src={loadingImage}
        alt=""
        width={width}
        height={Math.round(width * 9 / 16)}
        priority={priority}
        sizes={`${width}px`}
        className={styles.loadingImage}
      />
    </span>
  );
}
