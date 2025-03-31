import { Link, useLocation } from 'wouter';

interface MobileNavigationProps {
  onCreateEventClick: () => void;
  onShowWelcome?: () => void;
  onShowCalendar?: () => void;
  showWelcome?: boolean;
}

export default function MobileNavigation({ 
  onCreateEventClick, 
  onShowWelcome, 
  onShowCalendar, 
  showWelcome 
}: MobileNavigationProps) {
  const [location] = useLocation();

  return (
    <nav className="md:hidden flex items-center justify-around border-t border-neutral-300 py-2 bg-white dark:bg-slate-900 dark:border-slate-700">
      <button 
        onClick={onShowWelcome}
        className={`flex flex-col items-center px-4 py-1 ${
          showWelcome ? 'text-primary' : 'text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-300'
        }`}
      >
        <span className="material-icons">dashboard</span>
        <span className="text-xs mt-1">Dashboard</span>
      </button>

      <button 
        onClick={onShowCalendar}
        className={`flex flex-col items-center px-4 py-1 ${
          !showWelcome ? 'text-primary' : 'text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-300'
        }`}
      >
        <span className="material-icons">calendar_today</span>
        <span className="text-xs mt-1">Calendar</span>
      </button>
      
      <button
        onClick={onCreateEventClick}
        className="flex flex-col items-center px-4 py-1 text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-300"
      >
        <span className="material-icons">add_circle</span>
        <span className="text-xs mt-1">Create</span>
      </button>
      
      <Link 
        href="/booking" 
        className={`flex flex-col items-center px-4 py-1 ${
          location === '/booking' ? 'text-primary' : 'text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-300'
        }`}
      >
        <span className="material-icons">link</span>
        <span className="text-xs mt-1">Links</span>
      </Link>
      
      <Link 
        href="/profile" 
        className={`flex flex-col items-center px-4 py-1 ${
          location === '/profile' ? 'text-primary' : 'text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-300'
        }`}
      >
        <span className="material-icons">person</span>
        <span className="text-xs mt-1">Profile</span>
      </Link>
      <Link 
        href="/settings" 
        className={`flex flex-col items-center px-4 py-1 ${
          location === '/settings' ? 'text-primary' : 'text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-300'
        }`}
      >
        <span className="material-icons">settings</span>
        <span className="text-xs mt-1">Settings</span>
      </Link>
    </nav>
  );
}
