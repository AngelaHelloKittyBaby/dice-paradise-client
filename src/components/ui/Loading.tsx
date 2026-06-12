import React from 'react';
import type { CSSProperties } from 'react';
import clsx from 'clsx';
import { LoadingImage } from './LoadingImage';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'stage';
  text?: string;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text,
  fullScreen = false,
}) => {
  const resolvedImageSize = fullScreen ? 'stage' : size;
  const fullScreenImageStyle: CSSProperties | undefined = fullScreen
    ? {
        width: '177.77777778vh',
        height: '100vh',
      }
    : undefined;

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <LoadingImage size={resolvedImageSize} style={fullScreenImageStyle} />
      {text && (
        <p className={clsx(
          fullScreen
            ? 'sr-only'
            : 'max-w-[82vw] text-center font-black animate-pulse text-gray-500 text-sm'
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-[rgba(5,14,36,0.88)]">
        {content}
      </div>
    );
  }

  return content;
};
