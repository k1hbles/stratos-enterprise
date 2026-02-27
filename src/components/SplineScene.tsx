'use client';

import Spline from '@splinetool/react-spline';

interface SplineSceneProps {
  url: string;
  className?: string;
}

export function SplineScene({ url, className }: SplineSceneProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Spline scene={url} />
    </div>
  );
}
