import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { UserIcon, LogOut, Settings, Building, Users, Globe, ChevronDown, Menu } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface AppHeaderProps {
  onCreateEvent?: () => void;
}

export default function AppHeader({ onCreateEvent }: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, organization, team, isAdmin, isCompanyAdmin, isTeamManager, logout } = useUser();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    window.dispatchEvent(new CustomEvent('toggle-sidebar'));
  };

  const getUserRoleDisplay = () => {
    if (isAdmin) return 'Admin';
    if (isCompanyAdmin) return 'Company Admin';
    if (isTeamManager) return 'Team Manager';
    return 'User';
  };

  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm z-20 dark:bg-slate-900 dark:border-slate-700">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left: Logo + Mobile Menu Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleSidebar}
            className="md:hidden text-neutral-600 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-300"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link href="/" className="flex items-center">
            <h1 className="text-xl font-semibold text-neutral-800 dark:text-slate-100">
              SmartScheduler
            </h1>
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              {/* User Role Badge */}
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {getUserRoleDisplay()}
              </Badge>

              {/* User Avatar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-9 h-9 overflow-hidden rounded-full hover:opacity-80 transition-opacity">
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
                      <p className="text-sm font-medium leading-none">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-xs leading-none text-neutral-500 dark:text-slate-400">
                        {user.email}
                      </p>
                      {organization && (
                        <p className="text-xs leading-none text-neutral-500 dark:text-slate-400 mt-1">
                          {organization.name}
                          {team && ` • ${team.name}`}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Admin-only options */}
                  {isAdmin && (
                    <>
                      <DropdownMenuItem
                        onSelect={() => setLocation('/admin/users')}
                        className="cursor-pointer"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        <span>Manage Users</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setLocation('/admin/organizations')}
                        className="cursor-pointer"
                      >
                        <Building className="mr-2 h-4 w-4" />
                        <span>Manage Organizations</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Company Admin options */}
                  {isCompanyAdmin && !isAdmin && (
                    <>
                      <DropdownMenuItem
                        onSelect={() => setLocation('/organization/teams')}
                        className="cursor-pointer"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        <span>Manage Teams</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Profile and settings for all users */}
                  <DropdownMenuItem
                    onSelect={() => setLocation('/profile')}
                    className="cursor-pointer"
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setLocation('/settings')}
                    className="cursor-pointer"
                  >
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
            <div className="flex space-x-3">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
