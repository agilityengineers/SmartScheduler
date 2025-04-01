import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, Play, RefreshCw, BookOpen } from 'lucide-react';
import { useTutorial } from '@/contexts/TutorialContext';
import { useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export const TutorialButton: React.FC = () => {
  const { startTutorial, resetTutorial, isTutorialCompleted } = useTutorial();
  const [, setLocation] = useLocation();

  const handleStartTutorial = () => {
    startTutorial();
  };

  const handleResetTutorial = () => {
    resetTutorial();
    startTutorial();
  };

  // Function to navigate to the tutorials page
  const navigateToTutorials = () => {
    console.log('Navigating to tutorials page');
    setLocation('/help?tab=tutorials');
  };

  // Function to reset localStorage for testing purposes
  const handleResetLocalStorage = () => {
    localStorage.removeItem('tutorialCompleted');
    localStorage.removeItem('hasSeenWelcome');
    alert('Tutorial state has been reset. Please refresh the page to see the welcome modal.');
  };

  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center space-x-1" 
        onClick={navigateToTutorials}
      >
        <BookOpen className="h-4 w-4" />
        <span>Tutorials</span>
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="rounded-full w-8 h-8 p-0">
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Help</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleStartTutorial}>
            <Play className="mr-2 h-4 w-4" />
            Start Tutorial
          </DropdownMenuItem>
          <DropdownMenuItem onClick={navigateToTutorials}>
            <BookOpen className="mr-2 h-4 w-4" />
            View All Tutorials
          </DropdownMenuItem>
          {isTutorialCompleted && (
            <DropdownMenuItem onClick={handleResetTutorial}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Tutorial Progress
            </DropdownMenuItem>
          )}
          {/* For development testing only */}
          <DropdownMenuItem onClick={handleResetLocalStorage}>
            Reset Welcome Modal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TutorialButton;