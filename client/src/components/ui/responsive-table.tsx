import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper for tables that adds horizontal scroll on mobile
 * On desktop, tables render normally
 * On mobile, tables scroll horizontally to prevent layout breakage
 */
export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className={`overflow-x-auto -mx-4 px-4 ${className}`}>
        <div className="inline-block min-w-full align-middle">
          {children}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ResponsiveTable;
