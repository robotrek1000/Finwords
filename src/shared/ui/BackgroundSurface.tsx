import type { CSSProperties } from 'react';
import { PatternTile, type BackgroundId } from './PatternTile';
import styles from './BackgroundSurface.module.css';

interface BackgroundSurfaceProps {
  backgroundId?: BackgroundId;
  className?: string;
}

const COLORS: Record<BackgroundId, [string, string]> = {
  'background-default': ['#111a33', '#080c18'],
  'background-cabin': ['#2f2931', '#171419'],
  'background-port': ['#1b3940', '#0d1d20'],
  'background-open-sea': ['#183e5b', '#0c1f2e'],
  'background-business-harbor': ['#243449', '#121a25'],
  'background-bridge': ['#1f2c39', '#10171d'],
  'background-golden-bay': ['#4b3d24', '#261f12'],
  'background-night-ocean': ['#191936', '#0d0d1b'],
  'background-freedom-horizon': ['#1d4148', '#0f2124'],
  'background-error': ['#4a1820', '#240c0f'],
};

export function BackgroundSurface({
  backgroundId = 'background-default',
  className = '',
}: BackgroundSurfaceProps) {
  const [base, bottom] = COLORS[backgroundId];
  const tiles = Array.from({ length: 18 }, (_, index) => index);

  return (
    <div
      aria-hidden="true"
      className={`${styles.surface} ${className}`}
      data-background-id={backgroundId}
      style={{ '--background-base': base, '--background-bottom': bottom } as CSSProperties}
    >
      <div className={styles.pattern}>
        {tiles.map((index) => (
          <PatternTile key={index} backgroundId={backgroundId} />
        ))}
      </div>
      <div className={styles.topFade} />
      <div className={styles.bottomFade} />
    </div>
  );
}
