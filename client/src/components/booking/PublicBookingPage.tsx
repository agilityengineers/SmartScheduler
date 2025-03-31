import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/hooks/useTimeZone';
import { addDays, format, parseISO, isAfter, isBefore, setHours, setMinutes } from 'date-fns';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface PublicBookingPageProps {
  slug: string;
}

const bookingFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  date: z.date(),
  time: z.string(),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export default function PublicBookingPage({ slug }: PublicBookingPageProps) {
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  // Form setup
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      name: '',
      email: '',
      date: new Date(),
      time: '',
      notes: '',
    },
  });

  // Fetch booking link details
  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/booking/${slug}`);
        
        if (!res.ok) {
          throw new Error('Booking link not found');
        }
        
        const data = await res.json();
        setBookingDetails(data);
        
        // Generate available times
        generateAvailableTimes(data, new Date());
      } catch (error) {
        toast({
          title: 'Error',
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookingDetails();
  }, [slug, toast]);

  // Generate available time slots based on booking link settings
  const generateAvailableTimes = (bookingData: any, date: Date) => {
    if (!bookingData) return [];
    
    const dayOfWeek = date.getDay().toString();
    const availableDays = bookingData.availableDays || ["1", "2", "3", "4", "5"];
    
    // Check if this day is available
    if (!availableDays.includes(dayOfWeek)) {
      setAvailableTimes([]);
      return;
    }
    
    const availableHours = bookingData.availableHours || { start: "09:00", end: "17:00" };
    const duration = bookingData.duration || 30; // minutes
    
    // Parse start and end times
    const [startHour, startMinute] = availableHours.start.split(':').map(Number);
    const [endHour, endMinute] = availableHours.end.split(':').map(Number);
    
    // Calculate slots
    const slots: string[] = [];
    let currentTime = setHours(setMinutes(new Date(date), startMinute), startHour);
    const endTime = setHours(setMinutes(new Date(date), endMinute), endHour);
    
    while (isBefore(currentTime, endTime)) {
      slots.push(format(currentTime, 'h:mm a'));
      currentTime = addDays(currentTime, 0);
      currentTime.setMinutes(currentTime.getMinutes() + duration);
    }
    
    setAvailableTimes(slots);
  };

  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      form.setValue('date', date);
      generateAvailableTimes(bookingDetails, date);
    }
  };

  // Handle form submission
  const onSubmit = async (values: BookingFormValues) => {
    try {
      setSubmitting(true);
      
      // Calculate start and end times
      const bookingDate = values.date;
      const timeString = values.time;
      const [hour, minute] = timeString.split(':').map(Number) || [
        parseInt(timeString.split(' ')[0]), 0
      ];
      
      const startTime = new Date(bookingDate);
      startTime.setHours(hour, minute, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + (bookingDetails?.duration || 30));
      
      // Submit booking
      const res = await apiRequest('POST', `/api/public/booking/${slug}`, {
        name: values.name,
        email: values.email,
        notes: values.notes,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to book appointment');
      }
      
      // Show success
      setSubmitted(true);
      toast({
        title: 'Booking Confirmed',
        description: 'Your appointment has been successfully booked.',
      });
    } catch (error) {
      toast({
        title: 'Booking Failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading booking details...</p>
      </div>
    );
  }

  if (!bookingDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Booking Not Found</CardTitle>
            <CardDescription>This booking link may have expired or been removed.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Booking Confirmed</CardTitle>
            <CardDescription>Your appointment has been successfully booked.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Appointment Details</h3>
                <p className="text-neutral-600">{bookingDetails.title}</p>
                <p className="text-neutral-600">
                  {formatDateTime(form.getValues('date'), bookingDetails.ownerTimezone, { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-neutral-600">{form.getValues('time')}</p>
              </div>
              
              <div>
                <h3 className="font-medium">With</h3>
                <p className="text-neutral-600">{bookingDetails.ownerName}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Book Another Time
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl grid md:grid-cols-2 gap-0">
        <div className="p-6 bg-neutral-50 rounded-l-lg">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-neutral-800">{bookingDetails.title}</h2>
            <p className="text-neutral-600">with {bookingDetails.ownerName}</p>
          </div>
          
          <div className="mb-4">
            <span className="flex items-center text-neutral-700 mb-2">
              <span className="material-icons text-sm mr-2">schedule</span>
              {bookingDetails.duration} minutes
            </span>
            
            <span className="flex items-center text-neutral-700">
              <span className="material-icons text-sm mr-2">public</span>
              {bookingDetails.ownerTimezone}
            </span>
          </div>
          
          {bookingDetails.description && (
            <div className="mt-6 text-neutral-600 text-sm">
              {bookingDetails.description}
            </div>
          )}
        </div>
        
        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-medium">Select a Date & Time</h3>
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={handleDateChange}
                        disabled={(date) => {
                          // Disable dates outside availability window
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          const maxDate = addDays(
                            today, 
                            bookingDetails.availabilityWindow || 30
                          );
                          
                          // Check if day is in available days
                          const dayOfWeek = date.getDay().toString();
                          const availableDays = bookingDetails.availableDays || ["1", "2", "3", "4", "5"];
                          
                          return (
                            date < today ||
                            date > maxDate ||
                            !availableDays.includes(dayOfWeek)
                          );
                        }}
                        className="rounded-md border"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      {availableTimes.length > 0 ? (
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-3 gap-2"
                        >
                          {availableTimes.map((time) => (
                            <FormItem key={time}>
                              <FormControl>
                                <RadioGroupItem
                                  value={time}
                                  id={`time-${time}`}
                                  className="peer sr-only"
                                />
                              </FormControl>
                              <FormLabel
                                htmlFor={`time-${time}`}
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-2 hover:bg-muted hover:text-muted-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                {time}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      ) : (
                        <p className="text-neutral-500 text-sm">No available times on this date.</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="pt-4 border-t border-neutral-200">
                <h3 className="font-medium mb-3">Your Information</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Your email address" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add any notes or questions about this meeting"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={submitting || !form.getValues('time')}>
                {submitting ? 'Scheduling...' : 'Schedule Meeting'}
              </Button>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
}
