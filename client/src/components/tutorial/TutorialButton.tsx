import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useTutorial } from '@/contexts/TutorialContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export const TutorialButton: React.FC = () => {
  const { startTutorial, resetTutorial, isTutorialCompleted } = useTutorial();

  const handleStartTutorial = () => {
    startTutorial();
  };

  const handleResetTutorial = () => {
    resetTutorial();
    startTutorial();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="rounded-full w-8 h-8 p-0">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleStartTutorial}>
          Start Tutorial
        </DropdownMenuItem>
        {isTutorialCompleted && (
          <DropdownMenuItem onClick={handleResetTutorial}>
            Reset Tutorial Progress
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TutorialButton;