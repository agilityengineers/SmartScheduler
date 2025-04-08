import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addMinutes, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { useTimeZones, formatDateTime } from '@/hooks/useTimeZone';
import { Separator } from '@/components/ui/separator';

interface BookingLink {
  id: number;
  title: string;
  description: string | null;
  duration: number;
  ownerName: string;
  ownerTimezone: string;
  availableDays: string[];
  availableHours: {
    start: string;
    end: string;
  };
  isTeamBooking?: boolean;
  teamName?: string;
  ownerProfilePicture?: string | null;
  ownerAvatarColor?: string | null;
}

interface TimeSlot {
  start: Date;
  end: Date;
}

export function PublicBookingPage({ slug, userPath }: { slug: string, userPath?: string }) {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { data: timeZones, userTimeZone } = useTimeZones();
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>(userTimeZone);
  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null);
  
  // Update selectedTimeZone when userTimeZone is detected or when booking link is loaded
  useEffect(() => {
    if (bookingLink?.ownerTimezone) {
      // Use the booking link owner's preferred timezone first if available
      console.log(`[Timezone] Setting to owner's preferred timezone: ${bookingLink.ownerTimezone}`);
      setSelectedTimeZone(bookingLink.ownerTimezone);
    } else if (userTimeZone) {
      // Fall back to the user's detected timezone
      console.log(`[Timezone] Setting to user's detected timezone: ${userTimeZone}`);
      setSelectedTimeZone(userTimeZone);
    }
  }, [userTimeZone, bookingLink]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Fetch booking link data
  useEffect(() => {
    async function fetchBookingLink() {
      try {
        // Use the user path format if provided, otherwise use the legacy format
        let endpoint = userPath 
          ? `/api/public/${userPath}/booking/${slug}`
          : `/api/public/booking/${slug}`;
        
        console.log(`[PublicBookingPage] Fetching booking link with endpoint: ${endpoint}`);
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          console.error(`[PublicBookingPage] Error fetching booking link: ${response.status} ${response.statusText}`);
          throw new Error('Booking link not found or inactive');
        }
        
        const data = await response.json();
        console.log(`[PublicBookingPage] Booking link fetched successfully:`, data.title);
        setBookingLink(data);
      } catch (error) {
        console.error('[PublicBookingPage] Error loading booking link:', error);
        setError('This booking link could not be found or is no longer active.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchBookingLink();
  }, [slug, userPath]);
  
  // Fetch available time slots when date is selected or timezone changes
  useEffect(() => {
    if (!selectedDate || !bookingLink) return;
    
    async function fetchTimeSlots() {
      setLoadingSlots(true);
      try {
        const start = selectedDate ? startOfDay(selectedDate) : startOfDay(new Date());
        const end = selectedDate ? endOfDay(selectedDate) : endOfDay(new Date());
        
        // Use the user path format if provided, otherwise use the legacy format
        let endpoint = userPath 
          ? `/api/public/${userPath}/booking/${slug}/availability`
          : `/api/public/booking/${slug}/availability`;
        
        // Add query parameters
        const params = new URLSearchParams({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          timezone: selectedTimeZone || 'UTC'
        });
        
        const response = await fetch(`${endpoint}?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to load available time slots');
        }
        
        const data = await response.json();
        
        // Convert strings to Date objects
        const slots = data.map((slot: any) => ({
          start: parseISO(slot.start),
          end: parseISO(slot.end)
        }));
        
        setTimeSlots(slots);
        // Clear selected slot when timezone or date changes
        setSelectedSlot(null);
      } catch (error) {
        console.error('Error loading time slots:', error);
        toast({
          title: 'Error',
          description: 'Failed to load available time slots. Please try again.',
          variant: 'destructive',
        });
        setTimeSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    
    fetchTimeSlots();
  }, [selectedDate, bookingLink, slug, selectedTimeZone, toast]);
  
  // Helper function to check if a day is available for booking
  const isDayAvailable = (date: Date) => {
    if (!bookingLink) return false;
    
    const dayOfWeek = date.getDay().toString();
    return bookingLink.availableDays.includes(dayOfWeek);
  };
  
  // Format time slot for display
  const formatTimeSlot = (slot: TimeSlot) => {
    console.log(`Formatting slot: ${slot.start.toISOString()} to ${slot.end.toISOString()} in ${selectedTimeZone}`);
    
    // Use the formatDateTime function to format in the selected timezone
    // The backend already prepared times that should display as 9AM-5PM in target timezone
    return `${formatDateTime(slot.start, selectedTimeZone, 'h:mm a')} - ${formatDateTime(slot.end, selectedTimeZone, 'h:mm a')}`;
  };
  
  // Handle booking submission
  const handleSubmit = async () => {
    if (!selectedSlot || !bookingLink) return;
    
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your name',
        variant: 'destructive',
      });
      return;
    }
    
    if (!email.trim() || !email.includes('@')) {
      toast({
        title: 'Valid email required',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const bookingData = {
        name,
        email,
        notes,
        startTime: selectedSlot.start.toISOString(),
        endTime: selectedSlot.end.toISOString(),
        timezone: selectedTimeZone
      };
      
      // Use the user path format if provided, otherwise use the legacy format
      const endpoint = userPath 
        ? `/api/public/${userPath}/booking/${slug}`
        : `/api/public/booking/${slug}`;
        
      console.log(`[PublicBookingPage] Submitting booking to: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }
      
      setSuccess(true);
      toast({
        title: 'Booking Confirmed',
        description: 'Your booking has been successfully scheduled.',
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Booking Failed',
        description: (error as Error).message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading booking information...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Booking Unavailable</CardTitle>
          <CardDescription>
            There was a problem accessing this booking link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => setLocation('/')}>
            Return to Home
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Booking Confirmed</CardTitle>
          <CardDescription>
            Your meeting has been scheduled successfully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Meeting Details</h3>
              <p>{bookingLink?.title}</p>
              <p>
                {selectedSlot && formatDateTime(selectedSlot.start, selectedTimeZone, 'EEEE, MMMM d, yyyy')}
                <br />
                {selectedSlot && formatTimeSlot(selectedSlot)}
                <br />
                {selectedTimeZone}
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium">With</h3>
              <p>{bookingLink?.isTeamBooking ? bookingLink.teamName : bookingLink?.ownerName}</p>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium">Your Information</h3>
              <p>{name}</p>
              <p>{email}</p>
              {notes && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium">Notes</h4>
                  <p className="text-sm text-muted-foreground">{notes}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setLocation('/')}>
            Return to Home
          </Button>
          <Button onClick={() => window.location.reload()}>
            Book Another Time
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 sm:py-10">
      {/* Header with profile picture */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{bookingLink?.title}</h1>
        <div className="flex items-center">
          <div className="bg-primary/10 text-primary font-medium px-3 py-1 rounded-full text-sm mr-3">
            {bookingLink?.duration} min
          </div>
          <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-primary/30 shadow-sm">
            {bookingLink?.ownerProfilePicture ? (
              <img 
                src={bookingLink.ownerProfilePicture} 
                alt={bookingLink.ownerName || "Meeting host"}
                className="h-full w-full object-cover" 
              />
            ) : bookingLink?.ownerName ? (
              <div 
                className="h-full w-full flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: bookingLink?.ownerAvatarColor || '#3f51b5' }}
              >
                {bookingLink.ownerName.charAt(0)}
              </div>
            ) : (
              <div className="bg-muted h-full w-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-muted-foreground">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Booking info - sidebar */}
        <div className="lg:col-span-4">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Booking Details</CardTitle>
              <CardDescription className="text-sm">
                {bookingLink?.isTeamBooking
                  ? `Team booking with ${bookingLink.teamName}`
                  : `Meeting with ${bookingLink?.ownerName}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-muted-foreground">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium">Duration</h3>
                    <p className="text-sm">{bookingLink?.duration} minutes</p>
                  </div>
                </div>
                
                {bookingLink?.description && (
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-muted-foreground mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium">Description</h3>
                      <p className="text-sm text-muted-foreground">{bookingLink.description}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-muted-foreground">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    <h3 className="text-sm font-medium">Time Zone</h3>
                  </div>
                  {timeZones && timeZones.length > 0 ? (
                    <Select
                      value={selectedTimeZone}
                      onValueChange={(value) => setSelectedTimeZone(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select time zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeZones.map((tz) => (
                          <SelectItem key={tz.id} value={tz.id}>
                            {tz.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{selectedTimeZone}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Booking form - main content */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Schedule Your Meeting</CardTitle>
              <CardDescription>
                Select a date and time for your meeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Calendar and Time slot selection */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                {/* Calendar */}
                <div className="md:col-span-6">
                  <Label className="mb-2 block font-medium">Select a Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => !isDayAvailable(date) || isBefore(date, new Date())}
                    className="rounded-md border mx-auto"
                  />
                </div>
                
                {/* Time slots */}
                <div className="md:col-span-6">
                  <Label className="mb-2 block font-medium">Select a Time</Label>
                  <div className="h-full flex flex-col">
                    {selectedDate ? (
                      <div className="space-y-2 flex-grow">
                        {loadingSlots ? (
                          <div className="flex items-center justify-center h-[240px]">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                          </div>
                        ) : timeSlots.length > 0 ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="h-2 w-2 rounded-full bg-primary"></div>
                              <span className="text-sm text-muted-foreground">Available in {selectedTimeZone}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                              {timeSlots.map((slot, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`
                                    px-4 py-3 rounded-md text-left transition-colors flex flex-col justify-between
                                    ${selectedSlot && selectedSlot.start.toISOString() === slot.start.toISOString() 
                                      ? 'bg-primary text-primary-foreground shadow-sm'
                                      : 'bg-muted hover:bg-primary/10'
                                    }
                                  `}
                                >
                                  <div className="font-medium">
                                    {formatDateTime(slot.start, selectedTimeZone, 'h:mm a')}
                                  </div>
                                  <div className="text-xs mt-1 opacity-90">
                                    {formatDateTime(slot.end, selectedTimeZone, 'h:mm a')} ({bookingLink?.duration} min)
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 border-2 border-dashed rounded-lg h-full flex flex-col items-center justify-center">
                            <div className="text-muted-foreground">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto mb-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                              </svg>
                              <p className="font-medium">No available time slots</p>
                              <p className="text-sm mt-1">Please select another date.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg h-full flex flex-col items-center justify-center">
                        <div className="text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto mb-2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                          <p className="font-medium">Select a date first</p>
                          <p className="text-sm mt-1">Available time slots will appear here.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Selected time confirmation */}
              {selectedSlot && (
                <div className="mb-8">
                  <div className="bg-primary/10 p-4 rounded-md flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <h3 className="font-medium flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-primary">
                          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                        Selected Time
                      </h3>
                      <p className="text-sm ml-7">
                        {formatDateTime(selectedSlot.start, selectedTimeZone, 'EEEE, MMMM d, yyyy')}
                        <br />
                        {formatTimeSlot(selectedSlot)} ({selectedTimeZone})
                      </p>
                    </div>
                    <Button
                      className="mt-2 sm:mt-0"
                      onClick={handleSubmit}
                      disabled={submitting || !name || !email}
                    >
                      {submitting ? 'Scheduling...' : 'Schedule Meeting'}
                    </Button>
                  </div>
                </div>
              )}

              <Separator className="my-6" />
              
              {/* User Information */}
              <div>
                <h3 className="font-medium mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-muted-foreground">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Your Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <Label htmlFor="phone">Phone Number (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(123) 456-7890"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional information or questions you'd like to share before the meeting."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}