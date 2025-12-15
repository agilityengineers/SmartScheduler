import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * MobileLayout wrapper component that adds bottom padding for mobile navigation
 * and handles safe area insets for modern mobile devices.
 */
export default function MobileLayout({ children, className = '' }: MobileLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={`${
        isMobile ? 'pb-20' : ''
      } ${className}`}
      style={{
        // Add safe area insets for devices with notches/home indicators
        paddingBottom: isMobile ? 'max(5rem, env(safe-area-inset-bottom))' : undefined,
      }}
    >
      {children}
    </div>
  );
}
