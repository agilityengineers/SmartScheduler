import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTutorial } from '@/contexts/TutorialContext';

interface HotspotProps {
  feature: string;
  title: string;
  description: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  onClick?: () => void;
}

/**
 * Hotspot component displays a help icon with tooltip that can guide users
 * through different features of the application
 */
const Hotspot: React.FC<HotspotProps> = ({
  feature,
  title,
  description,
  position = 'top',
  className = '',
  onClick
}) => {
  const { hotspotEnabled, startFeatureTour } = useTutorial();
  
  // If hotspots are disabled, don't render anything
  if (!hotspotEnabled) return null;
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // If no onClick handler is provided, try to start the feature tour
      startFeatureTour(feature as any);
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            className={`relative flex items-center justify-center text-primary w-6 h-6 rounded-full hover:bg-primary/10 transition-colors ${className}`}
            onClick={handleClick}
            aria-label={`Help for ${title}`}
          >
            <HelpCircle className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={position} className="max-w-[250px]">
          <div className="font-semibold">{title}</div>
          <p className="text-sm mt-1">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Hotspot;