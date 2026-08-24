import type { CSSProperties } from 'react';
import { assetUrl } from '../assetUrl';
import styles from './PatternTile.module.css';

export type BackgroundId =
  | 'background-default'
  | 'background-cabin'
  | 'background-port'
  | 'background-open-sea'
  | 'background-business-harbor'
  | 'background-bridge'
  | 'background-golden-bay'
  | 'background-night-ocean'
  | 'background-freedom-horizon'
  | 'background-error';

interface PatternTileProps {
  backgroundId?: BackgroundId;
  className?: string;
}

export function PatternTile({
  backgroundId = 'background-default',
  className = '',
}: PatternTileProps) {
  const pattern = assetUrl(`assets/p1/pattern-${backgroundId.replace('background-', '')}.svg`);

  return (
    <span
      aria-hidden="true"
      className={`${styles.tile} ${className}`}
      data-background-id={backgroundId}
      style={{ '--pattern-image': `url(${pattern})` } as CSSProperties}
    />
  );
}
