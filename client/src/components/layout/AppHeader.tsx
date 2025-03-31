import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface AppHeaderProps {
  user?: {
    displayName?: string;
    username: string;
  };
  notificationCount?: number;
}

export default function AppHeader({ user = { username: 'User' }, notificationCount = 0 }: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    // This would typically be handled by a context or state in a parent component
    setIsSidebarOpen(!isSidebarOpen);
    // Dispatch an event that the app layout can listen to
    window.dispatchEvent(new CustomEvent('toggle-sidebar'));
  };

  const userInitials = user.displayName 
    ? `${user.displayName.split(' ')[0]?.[0] || ''}${user.displayName.split(' ')[1]?.[0] || ''}`
    : user.username.substring(0, 2).toUpperCase();

  return (
    <header className="bg-white border-b border-neutral-300 shadow-sm z-20">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleSidebar}
            className="md:hidden text-neutral-600 hover:text-neutral-800"
            aria-label="Toggle sidebar"
          >
            <span className="material-icons">menu</span>
          </button>
          <Link href="/" className="flex items-center space-x-2">
            <span className="material-icons text-primary">event</span>
            <h1 className="text-xl font-semibold text-neutral-700">SmartScheduler</h1>
          </Link>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="hidden md:flex relative">
            <span className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">search</span>
            <Input 
              type="text" 
              placeholder="Search events" 
              className="pl-10 pr-4 py-2 rounded-full border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
          
          <button className="hidden md:flex text-neutral-600 hover:text-neutral-800 relative">
            <span className="material-icons">notifications</span>
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full text-xs flex items-center justify-center text-white font-bold">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center text-neutral-700 font-medium text-sm hover:bg-neutral-400 transition-colors">
                {userInitials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setLocation('/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuItem>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
