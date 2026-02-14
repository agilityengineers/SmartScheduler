import { Link, useLocation } from 'wouter';
import { useUser } from '@/context/UserContext';
import {
  CalendarIcon,
  Clock,
  Link as LinkIcon,
  Settings,
  HelpCircle,
  Users,
  Building,
  Plug,
  BarChart3,
  Workflow,
  LogOut,
  User,
  ChevronRight
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useMutation } from '@tanstack/react-query';

interface NavigationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NavigationDrawer({ open, onOpenChange }: NavigationDrawerProps) {
  const [location] = useLocation();
  const { user, isAdmin, isCompanyAdmin } = useUser();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Logout failed');
    },
    onSuccess: () => {
      window.location.href = '/login';
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleNavClick = () => {
    // Close drawer when navigation item is clicked
    onOpenChange(false);
  };

  const navItems = [
    { href: '/', label: 'Scheduling', icon: LinkIcon, match: ['/', '/booking'] },
    { href: '/events', label: 'Meetings', icon: CalendarIcon, match: ['/events'] },
    { href: '/availability', label: 'Availability', icon: Clock, match: ['/availability'] },
    { href: '/contacts', label: 'Contacts', icon: Users, match: ['/contacts'] },
    { href: '/workflows', label: 'Workflows', icon: Workflow, match: ['/workflows'] },
    { href: '/integrations', label: 'Integrations & apps', icon: Plug, match: ['/integrations'] },
    { href: '/settings', label: 'Settings', icon: Settings, match: ['/settings'] },
  ];

  const bottomNavItems = [
    { href: '/analytics', label: 'Analytics', icon: BarChart3, match: ['/analytics'] },
    { href: '/help', label: 'Help', icon: HelpCircle, match: ['/help'] },
  ];

  const adminNavItems = isAdmin ? [
    { href: '/admin', label: 'Admin Dashboard', icon: Building },
    { href: '/user-management', label: 'User Management', icon: Users },
    { href: '/admin?tab=organizations', label: 'Organizations', icon: Building },
  ] : [];

  const isActive = (matchPaths: string[]) => {
    return matchPaths.some(path => location === path || location.startsWith(path));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>

        {/* User Profile Section */}
        {user && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-slate-800">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
                <p className="text-xs text-neutral-500 dark:text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.match);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleNavClick}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        active
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <Separator className="my-4" />

            {/* Bottom Navigation Items */}
            <ul className="space-y-1">
              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.match);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleNavClick}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        active
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Admin Section */}
            {isAdmin && adminNavItems.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="mb-2">
                  <p className="px-4 text-xs font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                    Admin Center
                  </p>
                </div>
                <ul className="space-y-1">
                  {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                            location === item.href || location.startsWith(item.href.split('?')[0])
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {/* Company Admin Section */}
            {isCompanyAdmin && !isAdmin && (
              <>
                <Separator className="my-4" />
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/admin?tab=organizations"
                      onClick={handleNavClick}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        location.includes('organizations')
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Building className="h-5 w-5 flex-shrink-0" />
                      <span>Organization</span>
                    </Link>
                  </li>
                </ul>
              </>
            )}
          </div>
        </nav>

        <Separator />

        {/* Logout Button */}
        <div className="p-4">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
            <span>{logoutMutation.isPending ? 'Logging out...' : 'Logout'}</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
