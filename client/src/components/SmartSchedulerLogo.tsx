interface SmartSchedulerLogoProps {
  size?: number;
  className?: string;
}

export default function SmartSchedulerLogo({ size = 32, className = '' }: SmartSchedulerLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <rect x="4" y="10" width="56" height="48" rx="6" fill="hsl(180, 70%, 35%)" />
      <rect x="4" y="10" width="56" height="14" rx="6" fill="hsl(180, 70%, 28%)" />
      <rect x="4" y="18" width="56" height="6" fill="hsl(180, 70%, 28%)" />
      <rect x="16" y="4" width="4" height="14" rx="2" fill="hsl(180, 70%, 28%)" />
      <rect x="44" y="4" width="4" height="14" rx="2" fill="hsl(180, 70%, 28%)" />
      <rect x="14" y="32" width="8" height="6" rx="1.5" fill="white" opacity="0.9" />
      <rect x="28" y="32" width="8" height="6" rx="1.5" fill="white" opacity="0.9" />
      <rect x="42" y="32" width="8" height="6" rx="1.5" fill="white" opacity="0.9" />
      <rect x="14" y="44" width="8" height="6" rx="1.5" fill="white" opacity="0.9" />
      <rect x="28" y="44" width="8" height="6" rx="1.5" fill="white" opacity="0.9" />
      <circle cx="46" cy="47" r="3.5" fill="hsl(180, 70%, 85%)" />
      <path d="M44.5 47L45.5 48L47.5 46" stroke="hsl(180, 70%, 28%)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
