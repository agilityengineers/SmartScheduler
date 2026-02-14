import { Link, useLocation } from 'wouter';
import { LinkIcon, CalendarIcon, Clock, Users, Settings } from 'lucide-react';

interface MobileNavigationProps {
  onCreateEventClick: () => void;
}

export default function MobileNavigation({ onCreateEventClick }: MobileNavigationProps) {
  const [location] = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around border-t border-neutral-200 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] bg-white dark:bg-slate-900 dark:border-slate-700 z-50 shadow-lg">
      {/* Scheduling */}
      <Link
        href="/"
        className={`flex flex-col items-center min-w-[48px] min-h-[48px] justify-center px-2 ${
          location === '/' || location === '/booking'
            ? 'text-primary'
            : 'text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-300'
        }`}
      >
        <LinkIcon className="h-5 w-5" />
        <span className="text-[10px] mt-0.5 leading-tight">Schedule</span>
      </Link>

      {/* Meetings */}
      <Link
        href="/events"
        className={`flex flex-col items-center min-w-[48px] min-h-[48px] justify-center px-2 ${
          location === '/events'
            ? 'text-primary'
            : 'text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-300'
        }`}
      >
        <CalendarIcon className="h-5 w-5" />
        <span className="text-[10px] mt-0.5 leading-tight">Meetings</span>
      </Link>

      {/* Create Button - Prominent */}
      <button
        onClick={onCreateEventClick}
        className="flex flex-col items-center px-2 -mt-3"
      >
        <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          <span className="text-2xl font-light">+</span>
        </div>
      </button>

      {/* Availability */}
      <Link
        href="/availability"
        className={`flex flex-col items-center min-w-[48px] min-h-[48px] justify-center px-2 ${
          location === '/availability'
            ? 'text-primary'
            : 'text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-300'
        }`}
      >
        <Clock className="h-5 w-5" />
        <span className="text-[10px] mt-0.5 leading-tight">Availability</span>
      </Link>

      {/* Settings */}
      <Link
        href="/settings"
        className={`flex flex-col items-center min-w-[48px] min-h-[48px] justify-center px-2 ${
          location === '/settings'
            ? 'text-primary'
            : 'text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-300'
        }`}
      >
        <Settings className="h-5 w-5" />
        <span className="text-[10px] mt-0.5 leading-tight">Settings</span>
      </Link>
    </nav>
  );
}
