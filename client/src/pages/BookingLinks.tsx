import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BookingLink, CalendarIntegration, insertBookingLinkSchema } from '@shared/schema';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { useTimeZones, useCurrentTimeZone } from '@/hooks/useTimeZone';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, parse, setHours, setMinutes } from 'date-fns';

// Extend booking link schema with frontend validation
const createBookingLinkSchema = insertBookingLinkSchema
  .omit({ userId: true })
  .extend({
    slug: z.string()
      .min(3, { message: 'Slug must be at least 3 characters' })
      .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' }),
    availability: z.object({
      hours: z.object({
        start: z.string(),
        end: z.string(),
      }),
      days: z.array(z.string()),
      window: z.number().default(30),
    }),
    startTimeDate: z.date().optional(),  // For DatePicker
    endTimeDate: z.date().optional(),    // For DatePicker
    bufferBefore: z.number().default(0),
    bufferAfter: z.number().default(0),
    maxBookingsPerDay: z.number().default(0),
    leadTime: z.number().default(60),
    meetingType: z.string().default('in-person'), // Type of meeting (in-person, zoom, custom)
    location: z.string().optional(),     // Optional location for in-person meetings
    meetingUrl: z.string().optional(),   // Optional URL for virtual meetings
  });

type CreateBookingLinkFormValues = z.infer<typeof createBookingLinkSchema>;

export default function BookingLinks() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<BookingLink | null>(null);
  const [meetingType, setMeetingType] = useState<string>('in-person');
  const { toast } = useToast();

  // Fetch booking links
  const { data: bookingLinks = [], isLoading } = useQuery<BookingLink[]>({
    queryKey: ['/api/booking'],
  });

  // Fetch Zoom integrations
  const { data: calendarIntegrations = [] } = useQuery<CalendarIntegration[]>({
    queryKey: ['/api/integrations'],
  });

  // Check if user has Zoom integration set up
  const hasZoomIntegration = calendarIntegrations.some(
    integration => integration.type === 'zoom' && integration.isConnected
  );

  // Create/Update booking link mutation
  const bookingLinkMutation = useMutation({
    mutationFn: async (data: CreateBookingLinkFormValues) => {
      const method = selectedLink ? 'PUT' : 'POST';
      const endpoint = selectedLink ? `/api/booking/${selectedLink.id}` : '/api/booking';
      const res = await apiRequest(method, endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: selectedLink ? 'Booking link updated successfully' : 'Booking link created successfully',
      });
      setShowCreateModal(false);
      setSelectedLink(null);
      queryClient.invalidateQueries({ queryKey: ['/api/booking'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete booking link mutation
  const deleteBookingLink = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/booking/${id}`, null);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Booking link deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/booking'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Note: We removed the toggleActive mutation since isActive field has been removed from the schema

  // Get current timezone
  const { timeZone: currentTimeZone } = useCurrentTimeZone();

  // Default start and end times (9:00 AM and 5:00 PM today)
  const today = new Date();
  const defaultStartTime = new Date(today);
  defaultStartTime.setHours(9, 0, 0, 0);
  const defaultEndTime = new Date(today);
  defaultEndTime.setHours(17, 0, 0, 0);

  // Form setup
  const form = useForm<CreateBookingLinkFormValues>({
    resolver: zodResolver(createBookingLinkSchema),
    defaultValues: {
      slug: '',
      title: '',
      description: '',
      duration: 30,
      availability: {
        window: 30,
        days: ["1", "2", "3", "4", "5"],
        hours: { start: "09:00", end: "17:00" }
      },
      startTimeDate: defaultStartTime,
      endTimeDate: defaultEndTime,
      bufferBefore: 0,
      bufferAfter: 0,
      maxBookingsPerDay: 0,
      leadTime: 60,
      meetingType: 'in-person',
      location: '',
      meetingUrl: '',
    }
  });

  // Function to create a Zoom meeting info to store with booking link
  const addZoomIntegrationInfo = async (values: CreateBookingLinkFormValues) => {
    if (values.meetingType === 'zoom' && hasZoomIntegration) {
      try {
        // We don't actually create the Zoom meeting yet - that will happen when someone books
        // We just need to store that this booking link should use Zoom
        // No changes needed to the API endpoint
        return {
          ...values,
          meetingType: 'zoom',
        };
      } catch (error) {
        console.error('Error setting up Zoom meeting:', error);
        toast({
          title: 'Warning',
          description: 'Could not set up Zoom integration. Using in-person meeting instead.',
          variant: 'destructive',
        });
        return {
          ...values,
          meetingType: 'in-person',
        };
      }
    }
    return values;
  };

  const onSubmit = async (values: CreateBookingLinkFormValues) => {
    // Make a copy without the date objects since the API doesn't need them
    const { startTimeDate, endTimeDate, ...submitValues } = values;

    // If the meeting type is Zoom, add Zoom meeting info
    const processedValues = await addZoomIntegrationInfo(submitValues);

    // We're using the availableHours.start and availableHours.end string values
    // that were updated in the DatePicker onChange handlers
    bookingLinkMutation.mutate(processedValues);
  };

  // Handle creation of a new event
  const handleCreateEvent = () => {
    setIsCreateEventModalOpen(true);
  };

  // Generate a booking link URL
  const getBookingUrl = (slug: string) => {
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol;
    return `${protocol}//${hostname}${port}/booking/${slug}`;
  };

  // Copy booking link to clipboard
  const copyBookingLink = (slug: string) => {
    const url = getBookingUrl(slug);
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link Copied',
      description: 'Booking link copied to clipboard',
    });
  };

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (showCreateModal && selectedLink) {
      // Set form values for editing
      form.reset({
        ...selectedLink,
        startTimeDate: parse(selectedLink.availability.hours.start, 'HH:mm', new Date()),
        endTimeDate: parse(selectedLink.availability.hours.end, 'HH:mm', new Date()),
      });
    } else if (!showCreateModal) {
      // Reset form when modal is closed
      form.reset();
      setSelectedLink(null);
    }
  }, [showCreateModal, selectedLink, form]);

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />

        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="border-b border-neutral-300 p-4 flex items-center justify-between bg-white">
            <h1 className="text-xl font-semibold text-neutral-700">Booking Links</h1>
            <Button onClick={() => setShowCreateModal(true)}>
              <span className="material-icons mr-1 text-sm">add_link</span>
              Create Booking Link
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-neutral-500">Loading booking links...</p>
              </div>
            ) : bookingLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <span className="material-icons text-4xl text-neutral-400 mb-2">link_off</span>
                <h2 className="text-lg font-medium text-neutral-600 mb-1">No booking links yet</h2>
                <p className="text-neutral-500 mb-4">
                  Create booking links to allow others to schedule time with you
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <span className="material-icons mr-1 text-sm">add_link</span>
                  Create Booking Link
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookingLinks.map((link) => (
                  <Card key={link.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle>{link.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {link.description || 'No description'}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-green-600">
                            Active
                          </span>
                          <Switch 
                            checked={true}
                            disabled={true}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                      <div className="flex items-center text-sm text-neutral-600">
                        <span className="material-icons text-sm mr-2">schedule</span>
                        <span>{link.duration} minutes</span>
                      </div>

                      {/* Meeting Type Information */}
                      <div className="flex items-center text-sm text-neutral-600">
                        <span className="material-icons text-sm mr-2">
                          {link.meetingType === 'zoom' ? 'videocam' : 
                           link.meetingType === 'custom' ? 'link' : 'place'}
                        </span>
                        <span>
                          {link.meetingType === 'zoom' ? 'Zoom Meeting' : 
                           link.meetingType === 'custom' ? 'Custom Meeting URL' : 
                           link.location || 'In-Person'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center text-sm text-neutral-600">
                        <span className="material-icons text-sm mr-2">today</span>
                        <span>
                          {link.availability && 
                            typeof link.availability === 'object' && 
                            'days' in link.availability && 
                            Array.isArray(link.availability.days) && 
                            link.availability.days.length > 0 ? 
                              link.availability.days.map((day: string) => {
                                switch(day) {
                                  case "0": return "Sun";
                                  case "1": return "Mon";
                                  case "2": return "Tue";
                                  case "3": return "Wed";
                                  case "4": return "Thu";
                                  case "5": return "Fri";
                                  case "6": return "Sat";
                                  default: return day;
                                }
                              }).join(", ")
                              : 'No available days'
                          }
                        </span>
                      </div>

                      <div className="flex items-center text-sm text-neutral-600">
                        <span className="material-icons text-sm mr-2">access_time</span>
                        <span>
                          {link.availability && 
                           typeof link.availability === 'object' && 
                           'hours' in link.availability && 
                           typeof link.availability.hours === 'object' &&
                           link.availability.hours !== null ? 
                            `${(link.availability.hours as any).start || '00:00'} - ${(link.availability.hours as any).end || '00:00'}`
                            : 'No available hours'
                          }
                        </span>
                      </div>

                      <div className="border-t border-neutral-100 mt-2 pt-2">
                        <p className="text-xs text-neutral-500 mb-1">Scheduling Rules:</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div className="flex items-center text-xs text-neutral-600">
                            <span className="material-icons text-xs mr-1">timer</span>
                            <span>
                              {(link.leadTime ?? 0) > 0 
                                ? `${link.leadTime} min notice` 
                                : "No min notice"}
                            </span>
                          </div>

                          <div className="flex items-center text-xs text-neutral-600">
                            <span className="material-icons text-xs mr-1">event_busy</span>
                            <span>
                              {(link.maxBookingsPerDay ?? 0) > 0 
                                ? `Max ${link.maxBookingsPerDay}/day` 
                                : "Unlimited bookings"}
                            </span>
                          </div>

                          {((link.bufferBefore ?? 0) > 0 || (link.bufferAfter ?? 0) > 0) && (
                            <div className="flex items-center text-xs text-neutral-600 col-span-2">
                              <span className="material-icons text-xs mr-1">safety_divider</span>
                              <span>
                                {(link.bufferBefore ?? 0) > 0 && (link.bufferAfter ?? 0) > 0
                                  ? `${link.bufferBefore ?? 0}min before / ${link.bufferAfter ?? 0}min after`
                                  : (link.bufferBefore ?? 0) > 0 
                                    ? `${link.bufferBefore ?? 0}min buffer before` 
                                    : `${link.bufferAfter ?? 0}min buffer after`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-primary break-all">
                        <span className="material-icons text-sm mr-2">link</span>
                        <span className="truncate">{getBookingUrl(link.slug)}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyBookingLink(link.slug)}>
                        <span className="material-icons text-sm mr-1">content_copy</span>
                        Copy Link
                      </Button>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedLink(link);
                            setShowCreateModal(true);
                          }}
                        >
                          <span className="material-icons text-sm mr-1">edit</span>
                          Edit
                        </Button>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50" 
                          onClick={() => deleteBookingLink.mutate(link.id)}
                          disabled={deleteBookingLink.isPending}
                        >
                          <span className="material-icons text-sm mr-1">delete</span>
                          Delete
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNavigation onCreateEventClick={handleCreateEvent} />

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{selectedLink ? 'Edit Booking Link' : 'Create Booking Link'}</DialogTitle>
            <DialogDescription>
              {selectedLink ? 'Update your booking link settings' : 'Set up your availability and booking preferences'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Basic Information Section - 3 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Coffee Chat" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <span className="text-neutral-500 mr-1">/booking/</span>
                          <Input placeholder="coffee-chat" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <Select 
                        value={field.value.toString()} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the purpose of this meeting"
                        className="resize-none"
                        rows={2}
                        value={field.value || ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meeting Location Section - 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Meeting Type</FormLabel>
                  <Select 
                    value={meetingType} 
                    onValueChange={(value) => {
                      setMeetingType(value);
                      form.setValue('meetingType', value);

                      // Clear location and meetingUrl when changing types
                      if (value === 'in-person') {
                        form.setValue('meetingUrl', '');
                      } else if (value === 'custom') {
                        form.setValue('location', '');
                      } else if (value === 'zoom') {
                        form.setValue('location', '');
                        form.setValue('meetingUrl', '');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select meeting type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-person">In-Person</SelectItem>
                      <SelectItem value="custom">Custom URL (Manual)</SelectItem>
                      {hasZoomIntegration && (
                        <SelectItem value="zoom">Zoom Meeting</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {meetingType === 'zoom' && !hasZoomIntegration && (
                    <p className="text-red-500 text-sm mt-1">
                      Zoom integration not available. Please connect Zoom in Integrations.
                    </p>
                  )}
                </div>

                {meetingType === 'in-person' && (
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Add meeting location" 
                            value={field.value || ''} 
                            onChange={field.onChange} 
                            onBlur={field.onBlur} 
                            ref={field.ref} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {meetingType === 'custom' && (
                  <FormField
                    control={form.control}
                    name="meetingUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Add meeting link" 
                            value={field.value || ''} 
                            onChange={field.onChange} 
                            onBlur={field.onBlur} 
                            ref={field.ref} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* If Zoom is selected, display info message */}
                {meetingType === 'zoom' && hasZoomIntegration && (
                  <div className="lg:col-span-2 text-sm text-neutral-600 bg-neutral-50 p-3 rounded-md border border-neutral-200">
                    <p>A Zoom meeting will be automatically created when someone books through this link.</p>
                  </div>
                )}
              </div>

              {/* Availability Section - 3 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="availability.days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Days</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "1", label: "Mon" },
                          { value: "2", label: "Tue" },
                          { value: "3", label: "Wed" },
                          { value: "4", label: "Thu" },
                          { value: "5", label: "Fri" },
                          { value: "6", label: "Sat" },
                          { value: "0", label: "Sun" },
                        ].map((day) => (
                          <FormItem
                            key={day.value}
                            className="flex items-center space-x-1"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value && Array.isArray(field.value) && field.value.includes(day.value)}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value && Array.isArray(field.value) ? [...field.value] : [];
                                  if (checked === true) {
                                    field.onChange([...currentValue, day.value]);
                                  } else if (checked === false) {
                                    field.onChange(currentValue.filter((val: string) => val !== day.value));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {day.label}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTimeDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <DatePicker
                          selected={field.value}
                          onChange={(date: Date | null) => {
                            if (date) {
                              field.onChange(date);

                              // Update the string representation
                              const timeString = format(date, "HH:mm");
                              form.setValue("availability.hours.start", timeString);
                            }
                          }}
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeFormat="h:mm aa"
                          dateFormat="h:mm aa"
                          wrapperClassName="w-full"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTimeDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <DatePicker
                          selected={field.value}
                          onChange={(date: Date | null) => {
                            if (date) {
                              field.onChange(date);

                              // Update the string representation
                              const timeString = format(date, "HH:mm");
                              form.setValue("availability.hours.end", timeString);
                            }
                          }}
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeFormat="h:mm aa"
                          dateFormat="h:mm aa"
                          wrapperClassName="w-full"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Scheduling Rules Section - horizontal */}
              <div className="border-t border-neutral-200 pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-sm text-neutral-800">Scheduling Rules</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="leadTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Notice</FormLabel>
                        <Select 
                          value={(field.value ?? 0).toString()} 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select minimum notice" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No minimum</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                            <SelectItem value="240">4 hours</SelectItem>
                            <SelectItem value="480">8 hours</SelectItem>
                            <SelectItem value="1440">24 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Minimum time required before a booking
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxBookingsPerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Bookings Per Day</FormLabel>
                        <Select 
                          value={(field.value ?? 0).toString()} 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select maximum bookings" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Unlimited</SelectItem>
                            <SelectItem value="1">1 booking</SelectItem>
                            <SelectItem value="2">2 bookings</SelectItem>
                            <SelectItem value="3">3 bookings</SelectItem>
                            <SelectItem value="4">4 bookings</SelectItem>
                            <SelectItem value="5">5 bookings</SelectItem>
                            <SelectItem value="10">10 bookings</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Maximum bookings per day (0 = unlimited)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bufferBefore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buffer Before</FormLabel>
                        <Select 
                          value={(field.value ?? 0).toString()} 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select buffer time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No buffer</SelectItem>
                            <SelectItem value="5">5 minutes</SelectItem>
                            <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Time buffer before meetings
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bufferAfter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buffer After</FormLabel>
                        <Select 
                          value={(field.value ?? 0).toString()} 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select buffer time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No buffer</SelectItem>
                            <SelectItem value="5">5 minutes</SelectItem>
                            <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem</SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Time buffer after meetings
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={bookingLinkMutation.isPending}>
                  {bookingLinkMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <CreateEventModal 
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
      />
    </div>
  );
}