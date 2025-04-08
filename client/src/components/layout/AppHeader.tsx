import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/context/UserContext';
import { UserIcon, LogOut, Settings, Building, Users, HelpCircle } from 'lucide-react';
import TutorialButton from '@/components/tutorial/TutorialButton';
import { getInitials } from '@/lib/utils';

interface AppHeaderProps {
  notificationCount?: number;
}

export default function AppHeader({ notificationCount = 0 }: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, organization, team, isAdmin, isCompanyAdmin, isTeamManager, logout } = useUser();

  const toggleSidebar = () => {
    // This would typically be handled by a context or state in a parent component
    setIsSidebarOpen(!isSidebarOpen);
    // Dispatch an event that the app layout can listen to
    window.dispatchEvent(new CustomEvent('toggle-sidebar'));
  };

  // Get the role display text
  const getRoleDisplay = () => {
    if (isAdmin) return "Admin";
    if (isCompanyAdmin) return "Company Admin";
    if (isTeamManager) return "Team Manager";
    return "User";
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "U";
    
    if (user.displayName) {
      const nameParts = user.displayName.split(' ');
      if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
      return user.displayName[0].toUpperCase();
    }
    
    return user.username[0].toUpperCase();
  };

  return (
    <header className="bg-white border-b border-neutral-300 shadow-sm z-20 dark:bg-slate-950 dark:border-slate-800">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleSidebar}
            className="md:hidden text-neutral-600 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-300"
            aria-label="Toggle sidebar"
          >
            <span className="material-icons">menu</span>
          </button>
          <Link href="/" className="flex items-center space-x-2">
            <span className="material-icons text-primary">event</span>
            <h1 className="text-xl font-semibold text-neutral-700 dark:text-slate-300">SmartScheduler</h1>
          </Link>
        </div>
        
        {user && (
          <div className="hidden md:block text-sm text-neutral-500 dark:text-slate-400">
            <span className="font-medium text-neutral-700 dark:text-slate-300">{getRoleDisplay()}</span>
            {organization && (
              <span className="ml-2">
                • {organization.name}
                {team && <span> • {team.name}</span>}
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-center space-x-6">
          {user ? (
            // Only show these elements when user is logged in
            <>
              <div className="hidden md:flex relative">
                <span className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-slate-500">search</span>
                <Input 
                  type="text" 
                  placeholder="Search events" 
                  className="pl-10 pr-4 py-2 rounded-full border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm dark:border-slate-700"
                />
              </div>
              
              <button className="hidden md:flex text-neutral-600 hover:text-neutral-800 relative dark:text-slate-400 dark:hover:text-slate-300">
                <span className="material-icons">notifications</span>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full text-xs flex items-center justify-center text-white font-bold">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              
              <div className="hidden md:block">
                <TutorialButton />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 overflow-hidden rounded-full">
                    <Avatar className="w-full h-full">
                      {user && user.profilePicture ? (
                        <AvatarImage 
                          src={user.profilePicture} 
                          alt={user.displayName || user.username}
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback 
                          style={{ backgroundColor: user?.avatarColor || '#3f51b5' }}
                          className="text-white font-medium"
                        >
                          {getInitials(user?.displayName || user?.username || "U")}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || user.username}</p>
                      <p className="text-xs leading-none text-neutral-500 dark:text-slate-400">{user.email}</p>
                      <p className="text-xs leading-none text-neutral-500 dark:text-slate-400 mt-1">{getRoleDisplay()}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Admin-only options */}
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onSelect={() => setLocation('/admin/users')} className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Manage Users</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setLocation('/admin/organizations')} className="cursor-pointer">
                        <Building className="mr-2 h-4 w-4" />
                        <span>Manage Organizations</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  {/* Company Admin options */}
                  {isCompanyAdmin && (
                    <>
                      <DropdownMenuItem onSelect={() => setLocation('/organization/teams')} className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Manage Teams</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  {/* Profile and settings for all users */}
                  <DropdownMenuItem onSelect={() => setLocation('/profile')} className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setLocation('/settings')} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            // Show these buttons when user is not logged in
            <div className="flex space-x-4">
              <Link href="/login">
                <div className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                  Login
                </div>
              </Link>
              <Link href="/register">
                <div className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                  Register
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
