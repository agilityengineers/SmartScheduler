import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isBefore, startOfDay, endOfDay, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { useTimeZones, formatDateTime } from '@/hooks/useTimeZone';
import { Separator } from '@/components/ui/separator';
import { Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, Globe, Menu, User, ArrowLeft } from 'lucide-react';

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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [step, setStep] = useState<'select' | 'contact'>('select');
  
  useEffect(() => {
    if (bookingLink?.ownerTimezone) {
      setSelectedTimeZone(bookingLink.ownerTimezone);
    } else if (userTimeZone) {
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
  
  useEffect(() => {
    async function fetchBookingLink() {
      try {
        let endpoint = userPath 
          ? `/api/public/${userPath}/booking/${slug}`
          : `/api/public/booking/${slug}`;
        
        const response = await fetch(endpoint);
        
        if (response.status === 307) {
          const data = await response.json();
          if (data.redirectUrl) {
            window.history.replaceState(null, '', data.redirectUrl);
            const pathMatch = data.redirectUrl.match(/\/([^\/]+)\/booking\//);
            if (pathMatch && pathMatch[1]) {
              const newUserPath = pathMatch[1];
              const newEndpoint = `/api/public/${newUserPath}/booking/${slug}`;
              const redirectResponse = await fetch(newEndpoint);
              if (!redirectResponse.ok) {
                throw new Error('Booking link not found or inactive');
              }
              const redirectData = await redirectResponse.json();
              setBookingLink(redirectData);
              return;
            }
          }
        }
        
        if (!response.ok) {
          throw new Error('Booking link not found or inactive');
        }
        
        const data = await response.json();
        setBookingLink(data);
      } catch (error) {
        setError('This booking link could not be found or is no longer active.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchBookingLink();
  }, [slug, userPath]);
  
  useEffect(() => {
    if (!selectedDate || !bookingLink) return;
    
    async function fetchTimeSlots() {
      setLoadingSlots(true);
      try {
        const start = selectedDate ? startOfDay(selectedDate) : startOfDay(new Date());
        const end = selectedDate ? endOfDay(selectedDate) : endOfDay(new Date());
        
        let endpoint = userPath 
          ? `/api/public/${userPath}/booking/${slug}/availability`
          : `/api/public/booking/${slug}/availability`;
        
        const params = new URLSearchParams({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          timezone: selectedTimeZone || 'UTC'
        });
        
        const response = await fetch(`${endpoint}?${params.toString()}`);
        
        if (response.status === 307) {
          const redirectData = await response.json();
          if (redirectData.redirectUrl) {
            const pathMatch = redirectData.redirectUrl.match(/\/([^\/]+)\/booking\//);
            if (pathMatch && pathMatch[1]) {
              const newUserPath = pathMatch[1];
              const currentUrl = window.location.pathname;
              const newUrl = currentUrl.replace(`/${userPath}/`, `/${newUserPath}/`);
              window.history.replaceState(null, '', newUrl);
              const newEndpoint = `/api/public/${newUserPath}/booking/${slug}/availability`;
              const redirectResponse = await fetch(`${newEndpoint}?${params.toString()}`);
              if (!redirectResponse.ok) {
                throw new Error('Failed to load available time slots after redirection');
              }
              const rData = await redirectResponse.json();
              const slots = rData.map((slot: any) => ({
                start: parseISO(slot.start),
                end: parseISO(slot.end)
              }));
              setTimeSlots(slots);
              setSelectedSlot(null);
              return;
            }
          }
        }
        
        if (!response.ok) {
          throw new Error('Failed to load available time slots');
        }
        
        const data = await response.json();
        const slots = data.map((slot: any) => ({
          start: parseISO(slot.start),
          end: parseISO(slot.end)
        }));
        
        setTimeSlots(slots);
        setSelectedSlot(null);
      } catch (error) {
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
  
  const isDayAvailable = (date: Date) => {
    if (!bookingLink) return false;
    const dayOfWeek = date.getDay().toString();
    return bookingLink.availableDays.includes(dayOfWeek);
  };
  
  const formatTimeSlotSimple = (slot: TimeSlot) => {
    return formatDateTime(slot.start, selectedTimeZone, 'h:mm a');
  };
  
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
      
      const endpoint = userPath 
        ? `/api/public/${userPath}/booking/${slug}`
        : `/api/public/booking/${slug}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });
      
      if (response.status === 307) {
        const redirectData = await response.json();
        if (redirectData.redirectUrl) {
          const pathMatch = redirectData.redirectUrl.match(/\/([^\/]+)\/booking\//);
          if (pathMatch && pathMatch[1]) {
            const newUserPath = pathMatch[1];
            const currentUrl = window.location.pathname;
            const newUrl = currentUrl.replace(`/${userPath}/`, `/${newUserPath}/`);
            window.history.replaceState(null, '', newUrl);
            const newEndpoint = `/api/public/${newUserPath}/booking/${slug}`;
            const redirectResponse = await fetch(newEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(bookingData)
            });
            
            if (!redirectResponse.ok) {
              const errorData = await redirectResponse.json();
              throw new Error(errorData.message || 'Failed to create booking after redirection');
            }
            
            setSuccess(true);
            toast({
              title: 'Booking Confirmed',
              description: 'Your booking has been successfully scheduled.',
            });
            return;
          }
        }
      }
      
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
      toast({
        title: 'Booking Failed',
        description: (error as Error).message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const startDay = getDay(monthStart);
    const paddingDays: (Date | null)[] = Array(startDay).fill(null);
    
    return [...paddingDays, ...days];
  };
  
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  const handleContinue = () => {
    if (selectedSlot) {
      setStep('contact');
    }
  };
  
  const handleBack = () => {
    setStep('select');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking information...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Booking Unavailable</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button variant="outline" onClick={() => setLocation('/')}>
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Booking Confirmed!</h2>
              <p className="text-gray-600 mb-4">Your meeting has been scheduled successfully.</p>
              
              <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
                <div className="mb-3">
                  <p className="text-sm text-gray-500">Meeting</p>
                  <p className="font-medium">{bookingLink?.title}</p>
                </div>
                <div className="mb-3">
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-medium">
                    {selectedSlot && formatDateTime(selectedSlot.start, selectedTimeZone, 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm">
                    {selectedSlot && `${formatDateTime(selectedSlot.start, selectedTimeZone, 'h:mm a')} - ${formatDateTime(selectedSlot.end, selectedTimeZone, 'h:mm a')}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">With</p>
                  <p className="font-medium">{bookingLink?.isTeamBooking ? bookingLink.teamName : bookingLink?.ownerName}</p>
                </div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setLocation('/')}>
                  Return to Home
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Book Another Time
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardContent className="p-0">
          {step === 'select' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left Panel - Meeting Info + Calendar */}
              <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r">
                {/* Host Info */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/30 flex-shrink-0">
                    {bookingLink?.ownerProfilePicture ? (
                      <img 
                        src={bookingLink.ownerProfilePicture} 
                        alt={bookingLink.ownerName || "Meeting host"}
                        className="h-full w-full object-cover" 
                      />
                    ) : bookingLink?.ownerName ? (
                      <div 
                        className="h-full w-full flex items-center justify-center text-white font-bold text-xl"
                        style={{ backgroundColor: bookingLink?.ownerAvatarColor || '#0d9488' }}
                      >
                        {bookingLink.ownerName.charAt(0)}
                      </div>
                    ) : (
                      <div className="bg-gray-200 h-full w-full flex items-center justify-center">
                        <User className="w-7 h-7 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {bookingLink?.isTeamBooking ? bookingLink.teamName : bookingLink?.ownerName}
                    </h3>
                    <div className="flex items-center text-primary text-sm">
                      <Clock className="w-4 h-4 mr-1" />
                      {bookingLink?.duration} Minutes Meeting
                    </div>
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  {bookingLink?.title}
                </h2>
                
                {bookingLink?.description && (
                  <div className="flex items-start text-gray-600 text-sm mb-6">
                    <Menu className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <p>{bookingLink.description}</p>
                  </div>
                )}
                
                <Separator className="my-6" />
                
                {/* Calendar Section */}
                <div className="flex items-center gap-2 mb-4">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-gray-700">Select a Date</h3>
                </div>
                
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-primary">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h4>
                  <div className="flex gap-1">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
                
                {/* Days of Week */}
                <div className="grid grid-cols-7 mb-2">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth().map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }
                    
                    const isAvailable = isDayAvailable(day) && !isBefore(day, startOfDay(new Date()));
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isPast = isBefore(day, startOfDay(new Date()));
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => isAvailable && setSelectedDate(day)}
                        disabled={!isAvailable}
                        className={`
                          aspect-square flex items-center justify-center text-sm font-medium rounded-full
                          transition-colors
                          ${isSelected 
                            ? 'bg-primary text-white' 
                            : isAvailable
                              ? 'text-primary hover:bg-primary/10 border border-primary'
                              : isPast
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 cursor-not-allowed'
                          }
                        `}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
                
                {/* Timezone Selector */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    {timeZones && timeZones.length > 0 ? (
                      <Select
                        value={selectedTimeZone}
                        onValueChange={(value) => setSelectedTimeZone(value)}
                      >
                        <SelectTrigger className="flex-1 border-none shadow-none p-0 h-auto text-sm">
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
                      <span className="text-sm text-gray-600">{selectedTimeZone}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right Panel - Time Slots */}
              <div className="p-6 lg:p-8 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-gray-700">Select a Time</h3>
                </div>
                
                {selectedDate ? (
                  <>
                    <h4 className="text-lg font-semibold text-primary mb-4">
                      {format(selectedDate, 'EEEE, MMMM do')}
                    </h4>
                    
                    <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2 mb-6">
                      {loadingSlots ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      ) : timeSlots.length > 0 ? (
                        timeSlots.map((slot, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedSlot(slot)}
                            className={`
                              w-full py-3 px-4 rounded-lg border text-center transition-colors font-medium
                              ${selectedSlot && selectedSlot.start.toISOString() === slot.start.toISOString()
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-gray-200 hover:border-primary hover:text-primary'
                              }
                            `}
                          >
                            {formatTimeSlotSimple(slot)}
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <CalendarIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                          <p className="font-medium">No available times</p>
                          <p className="text-sm">Please select another date</p>
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      className="w-full"
                      size="lg"
                      disabled={!selectedSlot}
                      onClick={handleContinue}
                    >
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">Select a date</p>
                      <p className="text-sm">to view available times</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Contact Information */
            <div className="p-6 lg:p-8 max-w-lg mx-auto">
              {/* Back Button */}
              <button 
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to calendar</span>
              </button>
              
              {/* Booking Summary */}
              <div className="bg-primary/5 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    {bookingLink?.ownerProfilePicture ? (
                      <img 
                        src={bookingLink.ownerProfilePicture} 
                        alt={bookingLink.ownerName || "Meeting host"}
                        className="h-full w-full object-cover" 
                      />
                    ) : bookingLink?.ownerName ? (
                      <div 
                        className="h-full w-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: bookingLink?.ownerAvatarColor || '#0d9488' }}
                      >
                        {bookingLink.ownerName.charAt(0)}
                      </div>
                    ) : (
                      <div className="bg-gray-200 h-full w-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{bookingLink?.title}</h3>
                    <p className="text-sm text-gray-600">
                      with {bookingLink?.isTeamBooking ? bookingLink.teamName : bookingLink?.ownerName}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-700">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    {selectedSlot && formatDateTime(selectedSlot.start, selectedTimeZone, 'EEE, MMM d')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-primary" />
                    {selectedSlot && formatTimeSlotSimple(selectedSlot)}
                  </div>
                  <div className="text-gray-500">
                    {bookingLink?.duration} min
                  </div>
                </div>
              </div>
              
              {/* Contact Form */}
              <h2 className="text-xl font-bold text-gray-900 mb-6">Enter your details</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-gray-700">Full Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-gray-700">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone" className="text-gray-700">Phone Number (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(123) 456-7890"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes" className="text-gray-700">Additional Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional information..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <Button 
                className="w-full mt-6"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting || !name || !email}
              >
                {submitting ? 'Scheduling...' : 'Schedule Meeting'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
