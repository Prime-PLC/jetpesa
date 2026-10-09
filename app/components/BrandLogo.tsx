import Image from 'next/image';
import styles from './BrandLogo.module.css';

type BrandLogoProps = {
  compact?: boolean;
  inverted?: boolean;
  priority?: boolean;
};

export function BrandLogo({ compact = false, inverted = false, priority = false }: BrandLogoProps) {
  return (
    <span className={`${styles.frame} ${compact ? styles.compact : ''} ${inverted ? styles.inverted : ''}`}>
      <Image className={styles.icon} src="/branding/jetpesa-icon.png" alt="" width={1024} height={1024} sizes={compact ? '44px' : '52px'} priority={priority} />
      <span className={styles.wordmark}>JetPesa</span>
    </span>
  );
}