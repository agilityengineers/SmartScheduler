import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Footer from '@/components/layout/Footer';
import LandingPage from '@/components/landing/LandingPage';
import BookingLinkCard from '@/components/booking/BookingLinkCard';
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { BookingLink } from '@shared/schema';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, ExternalLink, Plus } from 'lucide-react';

export default function Home() {
  const { user } = useUser();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLinks, setSelectedLinks] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('event-types');
  const [filterActive, setFilterActive] = useState(true);
  const [filterInactive, setFilterInactive] = useState(true);
  const [filterMeetingType, setFilterMeetingType] = useState<string>('all');

  // Fetch booking links
  const { data: bookingLinks = [], isLoading } = useQuery<BookingLink[]>({
    queryKey: ['/api/booking'],
    enabled: !!user,
  });

  // Delete booking link mutation
  const deleteBookingLinkMutation = useMutation({
    mutationFn: async (linkId: number) => {
      await apiRequest('DELETE', `/api/booking/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/booking'] });
      toast({
        title: 'Success',
        description: 'Booking link deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete booking link',
        variant: 'destructive',
      });
    },
  });

  // Copy booking link
  const copyBookingLink = async (slug: string) => {
    try {
      // Generate the full URL
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const displayDomain = hostname === 'localhost' ? hostname : 'smart-scheduler.ai';
      const port = window.location.port ? `:${window.location.port}` : '';

      try {
        const response = await fetch('/api/users/current');
        if (response.ok) {
          const currentUser = await response.json();
          let userPath = '';

          if (currentUser.firstName && currentUser.lastName) {
            userPath = `${currentUser.firstName.toLowerCase()}.${currentUser.lastName.toLowerCase()}`;
          } else if (currentUser.displayName && currentUser.displayName.includes(' ')) {
            const nameParts = currentUser.displayName.split(' ');
            if (nameParts.length >= 2) {
              userPath = `${nameParts[0].toLowerCase()}.${nameParts[nameParts.length - 1].toLowerCase()}`;
            }
          }

          if (!userPath) {
            userPath = currentUser.username.toLowerCase();
          }

          const url = `${protocol}//${displayDomain}${port}/${userPath}/booking/${slug}`;
          await navigator.clipboard.writeText(url);
        } else {
          // Fallback
          const url = `${protocol}//${displayDomain}${port}/booking/${slug}`;
          await navigator.clipboard.writeText(url);
        }
      } catch (error) {
        // Fallback
        const url = `${protocol}//${displayDomain}${port}/booking/${slug}`;
        await navigator.clipboard.writeText(url);
      }

      toast({
        title: 'Link Copied',
        description: 'Booking link copied to clipboard',
      });
    } catch (error) {
      console.error('Error copying booking link:', error);
      toast({
        title: 'Error',
        description: 'Could not copy booking link',
        variant: 'destructive',
      });
    }
  };

  // Filter booking links based on search query and filters
  const filteredLinks = bookingLinks.filter((link) => {
    // Search filter
    const matchesSearch = link.title.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter (assuming all links are active for now)
    const matchesStatus = filterActive; // Can be extended with actual status field

    // Meeting type filter
    const matchesMeetingType =
      filterMeetingType === 'all' ||
      link.meetingType === filterMeetingType;

    return matchesSearch && matchesStatus && matchesMeetingType;
  });

  // Handle checkbox selection
  const handleSelectLink = (linkId: number, selected: boolean) => {
    setSelectedLinks((prev) =>
      selected ? [...prev, linkId] : prev.filter((id) => id !== linkId)
    );
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    setSelectedLinks(selected ? filteredLinks.map((link) => link.id) : []);
  };

  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };

  const handleEdit = (link: BookingLink) => {
    // Navigate to edit page or open edit modal
    window.location.href = `/booking?edit=${link.id}`;
  };

  const handleDelete = (linkId: number) => {
    if (confirm('Are you sure you want to delete this booking link?')) {
      deleteBookingLinkMutation.mutate(linkId);
    }
  };

  // If user is not logged in, show the landing page
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader onCreateEvent={handleCreateEvent} />
        <LandingPage />
        <Footer />
      </div>
    );
  }

  // Main dashboard for logged-in users
  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-slate-900">
      <AppHeader onCreateEvent={handleCreateEvent} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />

        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-800">
          {/* Page Header - consolidated */}
          <div className="border-b border-neutral-200 dark:border-slate-700 px-4 md:px-8 py-5">
            <div className="max-w-6xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-1">
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-slate-100">
                    Scheduling
                  </h1>
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                    Create and manage booking links to let others schedule time with you.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {bookingLinks.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-sm"
                      onClick={async () => {
                        try {
                          if (!bookingLinks || bookingLinks.length === 0) return;
                          const response = await fetch('/api/users/current');
                          if (response.ok) {
                            const currentUser = await response.json();
                            let userPath = '';
                            if (currentUser.firstName && currentUser.lastName) {
                              userPath = `${currentUser.firstName.toLowerCase()}.${currentUser.lastName.toLowerCase()}`;
                            } else if (currentUser.displayName && currentUser.displayName.includes(' ')) {
                              const nameParts = currentUser.displayName.split(' ');
                              if (nameParts.length >= 2) {
                                userPath = `${nameParts[0].toLowerCase()}.${nameParts[nameParts.length - 1].toLowerCase()}`;
                              }
                            }
                            if (!userPath) userPath = currentUser.username.toLowerCase();
                            const protocol = window.location.protocol;
                            const hostname = window.location.hostname;
                            const port = window.location.port ? `:${window.location.port}` : '';
                            const url = `${protocol}//${hostname}${port}/${userPath}/booking/${bookingLinks[0].slug}`;
                            window.open(url, '_blank');
                          }
                        } catch (error) {
                          console.error('Error opening landing page:', error);
                          toast({ title: 'Error', description: 'Could not open landing page', variant: 'destructive' });
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      View landing page
                    </Button>
                  )}
                  <Button
                    onClick={() => (window.location.href = '/booking')}
                    className="bg-primary text-white hover:bg-primary/90 flex-1 sm:flex-none"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">New Event Type</span>
                    <span className="sm:hidden">Create</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs + Search bar */}
          <div className="border-b border-neutral-200 dark:border-slate-700 px-4 md:px-8">
            <div className="max-w-6xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                  <TabsList className="bg-transparent rounded-none p-0 h-auto">
                    <TabsTrigger
                      value="event-types"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-3 text-sm whitespace-nowrap"
                    >
                      Event types
                    </TabsTrigger>
                    <TabsTrigger
                      value="single-use"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-3 text-sm opacity-50 cursor-not-allowed whitespace-nowrap"
                      disabled
                    >
                      Single-use
                      <span className="ml-1.5 text-xs bg-neutral-200 dark:bg-slate-600 px-1.5 py-0.5 rounded hidden sm:inline">Soon</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="polls"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-3 text-sm opacity-50 cursor-not-allowed whitespace-nowrap"
                      disabled
                    >
                      Polls
                      <span className="ml-1.5 text-xs bg-neutral-200 dark:bg-slate-600 px-1.5 py-0.5 rounded hidden sm:inline">Soon</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-2 w-full sm:w-auto pb-2 sm:pb-0">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      placeholder="Search event types..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem
                        checked={filterActive}
                        onCheckedChange={setFilterActive}
                      >
                        Active
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filterInactive}
                        onCheckedChange={setFilterInactive}
                      >
                        Inactive
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setFilterMeetingType('all')}>
                        All Types
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterMeetingType('zoom')}>
                        Zoom Meetings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterMeetingType('custom')}>
                        Custom URL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterMeetingType('in-person')}>
                        In-Person
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-20 md:pb-6">
            <div className="max-w-6xl">
              <Tabs value={activeTab} className="w-full">
                <TabsContent value="event-types" className="mt-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-neutral-500 dark:text-slate-400">Loading booking links...</p>
                    </div>
                  ) : filteredLinks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Plus className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
                        {searchQuery ? 'No matches found' : 'Create your first event type'}
                      </h3>
                      <p className="text-neutral-500 dark:text-slate-400 mb-4 max-w-md">
                        {searchQuery
                          ? 'No booking links match your search. Try adjusting your filters or search term.'
                          : 'Event types are booking links that let others schedule time with you. Configure your availability, meeting duration, and location preferences.'}
                      </p>
                      {!searchQuery && (
                        <>
                          <Button onClick={() => (window.location.href = '/booking')} size="lg" className="mb-3">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Event Type
                          </Button>
                          <p className="text-xs text-neutral-400 dark:text-slate-500">
                            Set up a 30-minute meeting in just a few clicks
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {filteredLinks.map((link, index) => (
                        <BookingLinkCard
                          key={link.id}
                          link={link}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onCopyLink={copyBookingLink}
                          selected={selectedLinks.includes(link.id)}
                          onSelect={(selected) => handleSelectLink(link.id, selected)}
                          colorIndex={index}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="single-use" className="mt-0">
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                      <Plus className="h-8 w-8 text-neutral-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
                      Single-use links
                    </h3>
                    <p className="text-neutral-500 dark:text-slate-400">
                      This feature is coming soon!
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="polls" className="mt-0">
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                      <Plus className="h-8 w-8 text-neutral-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
                      Meeting polls
                    </h3>
                    <p className="text-neutral-500 dark:text-slate-400">
                      This feature is coming soon!
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>

      <MobileNavigation onCreateEventClick={handleCreateEvent} />

      <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

      <OnboardingChecklist />

      <Footer />
    </div>
  );
}
