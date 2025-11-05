import { useState, useEffect } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { formatDateTimeRange } from '@/hooks/useTimeZone';
import { Event } from '@shared/schema';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import EventDetails from '@/components/calendar/EventDetails';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCurrentTimeZone } from '@/hooks/useTimeZone';
import { addDays, format, isAfter, isBefore, isEqual, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Search, Filter, X, Plus, CalendarCheck, MapPin, Video, ClockAlert, History } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface FilterOptions {
  teams: number[];
  hosts: number[];
  eventTypes: string[];
  statuses: string[];
  inviteEmails: string[];
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

export default function ScheduledEvents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { timeZone: currentTimeZone } = useCurrentTimeZone();
  
  // Mock user role - in a real app, this would come from an auth context
  // Possible values: 'admin', 'org_manager', 'team_manager', 'team_member', 'user'
  const [userRole, setUserRole] = useState('user');
  
  // Check if user has access to team-level features
  const hasTeamAccess = ['admin', 'org_manager', 'team_manager', 'team_member'].includes(userRole);

  // Filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    teams: [],
    hosts: [],
    eventTypes: [],
    statuses: [],
    inviteEmails: [],
    dateRange: {}
  });
  
  // Filter applied indicator
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  
  // Get all events without date filtering
  const { data: events = [], isLoading } = useEvents();

  // Effect to check if any filters are applied
  useEffect(() => {
    const hasActiveFilters = 
      filterOptions.teams.length > 0 || 
      filterOptions.hosts.length > 0 || 
      filterOptions.eventTypes.length > 0 || 
      filterOptions.statuses.length > 0 || 
      filterOptions.inviteEmails.length > 0 || 
      !!filterOptions.dateRange.from || 
      !!filterOptions.dateRange.to;
    
    setIsFilterApplied(hasActiveFilters);
  }, [filterOptions]);
  
  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };
  
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEventEdit = (event: Event) => {
    setSelectedEvent(event);
    setShowCreateModal(true);
  };
  
  const handleFilterOpen = () => {
    setShowFilterDialog(true);
  };
  
  const handleFilterClose = () => {
    setShowFilterDialog(false);
  };
  
  const handleFilterApply = () => {
    // Convert DateRange to FilterOptions compatible format
    const dateRangeForFilter = dateRange ? {
      from: dateRange.from,
      to: dateRange.to
    } : {};
    
    // Update the date range filter
    setFilterOptions(prev => ({
      ...prev,
      dateRange: dateRangeForFilter
    }));
    setShowFilterDialog(false);
  };
  
  const handleFilterReset = () => {
    setFilterOptions({
      teams: [],
      hosts: [],
      eventTypes: [],
      statuses: [],
      inviteEmails: [],
      dateRange: {}
    });
    setDateRange(undefined);
    setShowFilterDialog(false);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };
  
  // Categorize events based on current date
  const now = new Date();
  const today = startOfDay(now);
  
  // Apply filters to events
  const applyFilters = (events: Event[]) => {
    return events.filter(event => {
      // Text search filter
      const matchesSearch = 
        searchQuery === '' || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;
      
      // Date range filter
      const eventStartDate = new Date(event.startTime);
      const eventEndDate = new Date(event.endTime);
      
      if (filterOptions.dateRange.from && isBefore(eventEndDate, startOfDay(filterOptions.dateRange.from))) {
        return false;
      }
      
      if (filterOptions.dateRange.to && isAfter(eventStartDate, endOfDay(filterOptions.dateRange.to))) {
        return false;
      }
      
      // Event type filter
      if (filterOptions.eventTypes.length > 0 && 
          !filterOptions.eventTypes.includes(event.calendarType || 'local')) {
        return false;
      }
      
      // At this point we would filter by other criteria if we had the data
      // For now, we'll assume the event passes all other filters
      
      return true;
    });
  };
  
  const filteredEvents = applyFilters(events);
  
  // Categorize events
  const upcomingEvents = filteredEvents.filter(event => {
    const eventStart = new Date(event.startTime);
    return isAfter(eventStart, now) || isEqual(startOfDay(eventStart), today);
  });
  
  const pastEvents = filteredEvents.filter(event => {
    const eventEnd = new Date(event.endTime);
    return isBefore(eventEnd, now) && !isEqual(startOfDay(eventEnd), today);
  });
  
  // For demo purposes, we'll consider "pending" events as those awaiting confirmation
  // In a real implementation, this would depend on an event status field
  const pendingEvents = filteredEvents.filter(event => {
    // This is a mock implementation - in reality you'd check a status field
    // For now, we'll consider an event "pending" if it has the word "tentative" in the title or description
    return (
      event.title.toLowerCase().includes('tentative') || 
      (event.description && event.description.toLowerCase().includes('tentative'))
    );
  });
  
  // Group events by date
  const groupEventsByDate = (events: Event[]) => {
    const grouped: Record<string, Event[]> = {};
    
    events.forEach(event => {
      const date = new Date(event.startTime).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    
    return {
      grouped,
      sortedDates: Object.keys(grouped).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      )
    };
  };
  
  // Type definition for the result of groupEventsByDate
  type GroupedEvents = {
    grouped: Record<string, Event[]>;
    sortedDates: string[];
  };
  
  const { grouped: upcomingGrouped, sortedDates: upcomingSortedDates }: GroupedEvents = groupEventsByDate(upcomingEvents);
  const { grouped: pendingGrouped, sortedDates: pendingSortedDates }: GroupedEvents = groupEventsByDate(pendingEvents);
  const { grouped: pastGrouped, sortedDates: pastSortedDates }: GroupedEvents = groupEventsByDate(pastEvents);
  
  const getEventTypeLabel = (calendarType: string) => {
    switch(calendarType) {
      case 'google': return 'Google Calendar';
      case 'outlook': return 'Outlook Calendar';
      case 'ical': return 'iCalendar';
      default: return 'Local Calendar';
    }
  };
  
  const getEventTypeColor = (calendarType: string) => {
    switch(calendarType) {
      case 'google': return 'bg-blue-100 text-primary';
      case 'outlook': return 'bg-purple-100 text-purple-700';
      case 'ical': return 'bg-amber-100 text-amber-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />
        
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Header section with title, search and action buttons */}
          <div className="border-b border-neutral-300 p-4 flex flex-wrap items-center justify-between gap-2 bg-white">
            <h1 className="text-xl font-semibold text-neutral-700">Scheduled Events</h1>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date Range Picker */}
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 min-w-[240px]"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {filterOptions.dateRange.from && filterOptions.dateRange.to ? (
                      <>
                        {format(filterOptions.dateRange.from, "MMM d, yyyy")} - {format(filterOptions.dateRange.to, "MMM d, yyyy")}
                      </>
                    ) : filterOptions.dateRange.from ? (
                      <>From {format(filterOptions.dateRange.from, "MMM d, yyyy")}</>
                    ) : filterOptions.dateRange.to ? (
                      <>Until {format(filterOptions.dateRange.to, "MMM d, yyyy")}</>
                    ) : (
                      <span>Select date range</span>
                    )}
                    {(filterOptions.dateRange.from || filterOptions.dateRange.to) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterOptions(prev => ({
                            ...prev,
                            dateRange: {}
                          }));
                          setDateRange(undefined);
                        }}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear date range</span>
                      </Button>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: dateRange?.from || filterOptions.dateRange.from,
                      to: dateRange?.to || filterOptions.dateRange.to
                    }}
                    onSelect={handleDateRangeChange}
                    initialFocus
                    numberOfMonths={2}
                  />
                  <div className="flex items-center justify-end gap-2 p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateRange(undefined);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        // Convert DateRange to FilterOptions compatible format
                        const dateRangeForFilter = dateRange ? {
                          from: dateRange.from,
                          to: dateRange.to
                        } : {};
                        
                        setFilterOptions(prev => ({
                          ...prev,
                          dateRange: dateRangeForFilter
                        }));
                        setIsCalendarOpen(false);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Search */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                <Input 
                  type="text" 
                  placeholder="Search events" 
                  className="pl-10 pr-4 py-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm min-w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Filter button */}
              <Button 
                variant={isFilterApplied ? "default" : "outline"} 
                onClick={handleFilterOpen}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
                {isFilterApplied && (
                  <Badge className="ml-1 bg-white text-primary" variant="outline">
                    {Object.values(filterOptions).flat().filter(Boolean).length}
                  </Badge>
                )}
              </Button>
              
              {/* Create button */}
              <Button onClick={handleCreateEvent} className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Create Event</span>
              </Button>
            </div>
          </div>
          
          {/* Tabs section */}
          <div className="border-b border-neutral-300 bg-white">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full px-4"
            >
              <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
                <TabsTrigger value="upcoming" className="relative">
                  Upcoming
                  {upcomingEvents.length > 0 && (
                    <Badge className="ml-2">{upcomingEvents.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pending" className="relative">
                  Pending
                  {pendingEvents.length > 0 && (
                    <Badge className="ml-2">{pendingEvents.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="past" className="relative">
                  Past
                  {pastEvents.length > 0 && (
                    <Badge className="ml-2">{pastEvents.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Main content section with events */}
          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-neutral-500">Loading events...</p>
              </div>
            ) : (
              <Tabs value={activeTab} className="w-full">
                {/* Upcoming Events Tab */}
                <TabsContent value="upcoming" className="mt-0">
                  {upcomingEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <CalendarCheck className="h-16 w-16 text-neutral-400 mb-2" />
                      <h2 className="text-lg font-medium text-neutral-600 mb-1">No upcoming events</h2>
                      <p className="text-neutral-500 mb-4">
                        {isFilterApplied 
                          ? "No events match your filter criteria" 
                          : "You don't have any upcoming events scheduled"}
                      </p>
                      <Button onClick={handleCreateEvent}>
                        <Plus className="h-4 w-4 mr-1" />
                        Create Event
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {upcomingSortedDates.map(date => (
                        <div key={date} className="space-y-2">
                          <h2 className="text-lg font-semibold text-neutral-700 pb-2 border-b border-neutral-200">
                            {new Date(date).toLocaleDateString(undefined, { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </h2>
                          <div className="space-y-2">
                            {upcomingGrouped[date].map(event => (
                              <div 
                                key={event.id} 
                                className="p-4 border rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                                onClick={() => handleEventClick(event)}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-medium text-neutral-800">{event.title}</h3>
                                    <p className="text-sm text-neutral-600 mt-1">
                                      {formatDateTimeRange(event.startTime, event.endTime, event.timezone || currentTimeZone)}
                                    </p>
                                    {event.location && (
                                      <p className="text-sm text-neutral-600 mt-1 flex items-center">
                                        {event.meetingUrl ? (
                                          <Video className="h-4 w-4 mr-1" />
                                        ) : (
                                          <MapPin className="h-4 w-4 mr-1" />
                                        )}
                                        {event.location}
                                      </p>
                                    )}
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs ${getEventTypeColor(event.calendarType || 'local')}`}>
                                    {getEventTypeLabel(event.calendarType || 'local')}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Pending Events Tab */}
                <TabsContent value="pending" className="mt-0">
                  {pendingEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <ClockAlert className="h-16 w-16 text-neutral-400 mb-2" />
                      <h2 className="text-lg font-medium text-neutral-600 mb-1">No pending events</h2>
                      <p className="text-neutral-500 mb-4">
                        {isFilterApplied 
                          ? "No events match your filter criteria" 
                          : "You don't have any events awaiting confirmation"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pendingSortedDates.map(date => (
                        <div key={date} className="space-y-2">
                          <h2 className="text-lg font-semibold text-neutral-700 pb-2 border-b border-neutral-200">
                            {new Date(date).toLocaleDateString(undefined, { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </h2>
                          <div className="space-y-2">
                            {pendingGrouped[date].map(event => (
                              <div 
                                key={event.id} 
                                className="p-4 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                                onClick={() => handleEventClick(event)}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center">
                                      <h3 className="font-medium text-neutral-800">{event.title}</h3>
                                      <Badge variant="outline" className="ml-2 text-amber-600 bg-amber-100 border-amber-200">
                                        Pending
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-neutral-600 mt-1">
                                      {formatDateTimeRange(event.startTime, event.endTime, event.timezone || currentTimeZone)}
                                    </p>
                                    {event.location && (
                                      <p className="text-sm text-neutral-600 mt-1 flex items-center">
                                        {event.meetingUrl ? (
                                          <Video className="h-4 w-4 mr-1" />
                                        ) : (
                                          <MapPin className="h-4 w-4 mr-1" />
                                        )}
                                        {event.location}
                                      </p>
                                    )}
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs ${getEventTypeColor(event.calendarType || 'local')}`}>
                                    {getEventTypeLabel(event.calendarType || 'local')}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Past Events Tab */}
                <TabsContent value="past" className="mt-0">
                  {pastEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <History className="h-16 w-16 text-neutral-400 mb-2" />
                      <h2 className="text-lg font-medium text-neutral-600 mb-1">No past events</h2>
                      <p className="text-neutral-500 mb-4">
                        {isFilterApplied 
                          ? "No events match your filter criteria" 
                          : "You don't have any past events in your history"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pastSortedDates.map(date => (
                        <div key={date} className="space-y-2">
                          <h2 className="text-lg font-semibold text-neutral-700 pb-2 border-b border-neutral-200">
                            {new Date(date).toLocaleDateString(undefined, { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </h2>
                          <div className="space-y-2">
                            {pastGrouped[date].map(event => (
                              <div 
                                key={event.id} 
                                className="p-4 border border-neutral-200 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                                onClick={() => handleEventClick(event)}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-medium text-neutral-600">{event.title}</h3>
                                    <p className="text-sm text-neutral-500 mt-1">
                                      {formatDateTimeRange(event.startTime, event.endTime, event.timezone || currentTimeZone)}
                                    </p>
                                    {event.location && (
                                      <p className="text-sm text-neutral-500 mt-1 flex items-center">
                                        {event.meetingUrl ? (
                                          <Video className="h-4 w-4 mr-1" />
                                        ) : (
                                          <MapPin className="h-4 w-4 mr-1" />
                                        )}
                                        {event.location}
                                      </p>
                                    )}
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs bg-neutral-200 text-neutral-700`}>
                                    {getEventTypeLabel(event.calendarType || 'local')}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
        
        {/* Event Details Modal */}
        <EventDetails
          event={selectedEvent}
          onClose={() => setShowEventDetails(false)}
          onEdit={handleEventEdit}
          isOpen={showEventDetails}
        />
      </div>
      
      <MobileNavigation onCreateEventClick={handleCreateEvent} />
      
      {/* Create Event Modal */}
      <CreateEventModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      
      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={handleFilterClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Events</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Teams Filter - Only visible for users with team access */}
            {hasTeamAccess && (
              <div>
                <Label className="block mb-2">Teams</Label>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    <SelectItem value="1">Marketing Team</SelectItem>
                    <SelectItem value="2">Engineering Team</SelectItem>
                    <SelectItem value="3">Sales Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Host Filter - Only visible for team managers, org managers, and admins */}
            {['admin', 'org_manager', 'team_manager'].includes(userRole) && (
              <div>
                <Label className="block mb-2">Host</Label>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Hosts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hosts</SelectItem>
                    <SelectItem value="1">John Doe</SelectItem>
                    <SelectItem value="2">Jane Smith</SelectItem>
                    <SelectItem value="3">Sam Wilson</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Event Type Filter */}
            <div>
              <Label className="block mb-2">Event Type</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="eventTypeLocal" />
                  <label htmlFor="eventTypeLocal" className="text-sm">Local Calendar</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="eventTypeGoogle" />
                  <label htmlFor="eventTypeGoogle" className="text-sm">Google Calendar</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="eventTypeOutlook" />
                  <label htmlFor="eventTypeOutlook" className="text-sm">Outlook</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="eventTypeIcal" />
                  <label htmlFor="eventTypeIcal" className="text-sm">iCalendar</label>
                </div>
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <Label className="block mb-2">Status</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="statusActive" />
                  <label htmlFor="statusActive" className="text-sm">Active</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="statusCancelled" />
                  <label htmlFor="statusCancelled" className="text-sm">Cancelled</label>
                </div>
              </div>
            </div>
            
            {/* Invite Email Filter */}
            <div>
              <Label htmlFor="inviteEmail" className="block mb-2">Invite Email</Label>
              <Input
                id="inviteEmail"
                placeholder="example@domain.com"
                className="w-full"
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={handleFilterReset}>
              Reset
            </Button>
            <Button type="submit" onClick={handleFilterApply}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
