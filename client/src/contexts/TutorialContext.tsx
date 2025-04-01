import React, { createContext, useState, useContext, useEffect } from 'react';

type TutorialContextType = {
  isTutorialActive: boolean;
  isTutorialCompleted: boolean;
  startTutorial: () => void;
  endTutorial: () => void;
  markTutorialCompleted: () => void;
  resetTutorial: () => void;
  tutorialStep: number;
  setTutorialStep: (step: number) => void;
  currentRoute: string;
  setCurrentRoute: (route: string) => void;
};

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [isTutorialCompleted, setIsTutorialCompleted] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [currentRoute, setCurrentRoute] = useState('/');

  // Check local storage for tutorial completion status on initialization
  useEffect(() => {
    const completedStatus = localStorage.getItem('tutorialCompleted');
    if (completedStatus === 'true') {
      setIsTutorialCompleted(true);
    }
  }, []);

  const startTutorial = () => {
    setIsTutorialActive(true);
    setTutorialStep(0);
  };

  const endTutorial = () => {
    setIsTutorialActive(false);
  };

  const markTutorialCompleted = () => {
    setIsTutorialCompleted(true);
    setIsTutorialActive(false);
    localStorage.setItem('tutorialCompleted', 'true');
  };

  const resetTutorial = () => {
    setIsTutorialCompleted(false);
    localStorage.setItem('tutorialCompleted', 'false');
  };

  return (
    <TutorialContext.Provider
      value={{
        isTutorialActive,
        isTutorialCompleted,
        startTutorial,
        endTutorial,
        markTutorialCompleted,
        resetTutorial,
        tutorialStep,
        setTutorialStep,
        currentRoute,
        setCurrentRoute,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = (): TutorialContextType => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};