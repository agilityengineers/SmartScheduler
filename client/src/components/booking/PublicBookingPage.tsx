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
}

interface TimeSlot {
  start: Date;
  end: Date;
}

export function PublicBookingPage({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { data: timeZones, userTimeZone } = useTimeZones();
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>(userTimeZone);
  
  // Update selectedTimeZone when userTimeZone is detected
  useEffect(() => {
    if (userTimeZone) {
      setSelectedTimeZone(userTimeZone);
    }
  }, [userTimeZone]);
  
  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null);
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
        const response = await fetch(`/api/public/booking/${slug}`);
        
        if (!response.ok) {
          throw new Error('Booking link not found or inactive');
        }
        
        const data = await response.json();
        setBookingLink(data);
      } catch (error) {
        console.error('Error loading booking link:', error);
        setError('This booking link could not be found or is no longer active.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchBookingLink();
  }, [slug]);
  
  // Fetch available time slots when date is selected or timezone changes
  useEffect(() => {
    if (!selectedDate || !bookingLink) return;
    
    async function fetchTimeSlots() {
      setLoadingSlots(true);
      try {
        const start = selectedDate ? startOfDay(selectedDate) : startOfDay(new Date());
        const end = selectedDate ? endOfDay(selectedDate) : endOfDay(new Date());
        
        let endpoint = `/api/public/booking/${slug}/availability`;
        
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
    // Use the formatDateTime function to format in the selected timezone
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
      
      const response = await fetch(`/api/public/booking/${slug}`, {
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
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Booking info */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{bookingLink?.title}</CardTitle>
              <CardDescription>
                {bookingLink?.isTeamBooking
                  ? `Team booking with ${bookingLink.teamName}`
                  : `Meeting with ${bookingLink?.ownerName}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Duration</h3>
                  <p>{bookingLink?.duration} minutes</p>
                </div>
                
                {bookingLink?.description && (
                  <div>
                    <h3 className="text-sm font-medium">Description</h3>
                    <p className="text-sm text-muted-foreground">{bookingLink.description}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Time Zone</h3>
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
                    <p>{selectedTimeZone}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Booking form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Your Meeting</CardTitle>
              <CardDescription>
                Select a date and time for your meeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* User Information */}
              <div className="space-y-4 mb-6">
                <h3 className="font-medium">Your Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
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
                    placeholder="Add any additional information"
                    rows={4}
                  />
                </div>
              </div>

              <Separator className="my-6" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Calendar */}
                <div>
                  <Label className="mb-2 block">Select a Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => !isDayAvailable(date) || isBefore(date, new Date())}
                    className="rounded-md border"
                  />
                </div>
                
                {/* Time slots */}
                <div>
                  <Label className="mb-2 block">Select a Time</Label>
                  {selectedDate ? (
                    <div className="space-y-2">
                      {loadingSlots ? (
                        <div className="flex items-center justify-center h-[200px]">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      ) : timeSlots.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="h-2 w-2 rounded-full bg-primary"></div>
                            <span className="text-sm text-muted-foreground">Available time slots in timezone ({selectedTimeZone})</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {timeSlots.map((slot, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={`
                                  px-4 py-3 rounded-md text-left transition-colors
                                  ${selectedSlot && selectedSlot.start.toISOString() === slot.start.toISOString() 
                                    ? 'bg-primary text-primary-foreground font-medium'
                                    : 'bg-muted hover:bg-muted/80'
                                  }
                                `}
                              >
                                <div className="font-medium">
                                  {formatDateTime(slot.start, selectedTimeZone, 'h:mm a')}
                                </div>
                                <div className="text-xs opacity-90">
                                  {formatDateTime(slot.start, selectedTimeZone, 'h:mm a')} - {formatDateTime(slot.end, selectedTimeZone, 'h:mm a')}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                          <div className="text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto mb-2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                            <p>No available time slots on this date.</p>
                            <p className="text-sm mt-1">Please select another date.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border rounded-md">
                      Please select a date first.
                    </div>
                  )}
                </div>
              </div>
              
              {selectedSlot && (
                <div className="mt-6">
                  <Separator />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              {selectedSlot && (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !name || !email}
                >
                  {submitting ? 'Scheduling...' : 'Schedule Meeting'}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}