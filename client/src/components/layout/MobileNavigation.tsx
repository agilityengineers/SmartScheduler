import { Link, useLocation } from 'wouter';

interface MobileNavigationProps {
  onCreateEventClick: () => void;
}

export default function MobileNavigation({ onCreateEventClick }: MobileNavigationProps) {
  const [location] = useLocation();

  return (
    <nav className="md:hidden flex items-center justify-around border-t border-neutral-300 py-2 bg-white">
      <Link 
        href="/" 
        className={`flex flex-col items-center px-4 py-1 ${
          location === '/' ? 'text-primary' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        <span className="material-icons">calendar_today</span>
        <span className="text-xs mt-1">Calendar</span>
      </Link>
      
      <Link 
        href="/events" 
        className={`flex flex-col items-center px-4 py-1 ${
          location === '/events' ? 'text-primary' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        <span className="material-icons">schedule</span>
        <span className="text-xs mt-1">Events</span>
      </Link>
      
      <button
        onClick={onCreateEventClick}
        className="flex flex-col items-center px-4 py-1 text-neutral-500 hover:text-neutral-700"
      >
        <span className="material-icons">add_circle</span>
        <span className="text-xs mt-1">Create</span>
      </button>
      
      <Link 
        href="/booking" 
        className={`flex flex-col items-center px-4 py-1 ${
          location === '/booking' ? 'text-primary' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        <span className="material-icons">link</span>
        <span className="text-xs mt-1">Links</span>
      </Link>
      
      <Link 
        href="/settings" 
        className={`flex flex-col items-center px-4 py-1 ${
          location === '/settings' ? 'text-primary' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        <span className="material-icons">settings</span>
        <span className="text-xs mt-1">Settings</span>
      </Link>
    </nav>
  );
}
