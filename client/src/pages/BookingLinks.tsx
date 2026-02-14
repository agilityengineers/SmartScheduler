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
import CustomQuestionsBuilder from '@/components/booking/CustomQuestionsBuilder';
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
import {
  Link as LinkIcon,
  Link2Off,
  Clock,
  Video,
  MapPin,
  Calendar,
  Timer,
  CalendarOff,
  Minus,
  Copy,
  Edit,
  Trash2,
  Plus,
  Palette,
  Code,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';

// Component to display booking URL with proper loading state
const URLDisplay = ({ slug }: { slug: string }) => {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUrl = async () => {
      try {
        setIsLoading(true);
        // Call the getBookingUrl function that's defined in the parent component
        // We'll need to define the function before using this component
        const getUrl = async () => {
          const hostname = window.location.hostname;
          // In production, we want to show smart-scheduler.ai instead of the actual hostname
          const displayDomain = hostname === 'localhost' ? hostname : 'smart-scheduler.ai';
          const port = window.location.port ? `:${window.location.port}` : '';
          const protocol = window.location.protocol;
          
          try {
            console.log('Fetching current user for URL generation');
            const response = await fetch('/api/users/current');
            if (!response.ok) {
              console.error('Failed to fetch user:', response.status, response.statusText);
              // Fallback to the legacy URL format if we can't get the user info
              return `${protocol}//${displayDomain}${port}/booking/${slug}`;
            }
            
            const user = await response.json();
            console.log('User data retrieved:', JSON.stringify(user));
            
            // Generate the user path
            let userPath = '';
            
            // If first and last name are available, use them
            if (user.firstName && user.lastName) {
              userPath = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}`;
              console.log('Using first+last name for path:', userPath);
            }
            // If display name is available, try to extract first and last name
            else if (user.displayName && user.displayName.includes(" ")) {
              const nameParts = user.displayName.split(" ");
              if (nameParts.length >= 2) {
                const firstName = nameParts[0];
                const lastName = nameParts[nameParts.length - 1];
                userPath = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
                console.log('Using display name parts for path:', userPath);
              }
            }
            
            // If we couldn't generate a path from name, use username
            if (!userPath) {
              userPath = user.username.toLowerCase();
              console.log('Falling back to username for path:', userPath);
            }
            
            // Check for name collisions
            try {
              console.log('Checking for path collisions');
              const allUsersResponse = await fetch('/api/users');
              if (allUsersResponse.ok) {
                const allUsers = await allUsersResponse.json();
                console.log(`Checking among ${allUsers.length} users for collisions`);
                
                const hasCollision = allUsers.some((otherUser: any) => 
                  otherUser.id !== user.id && 
                  ((otherUser.firstName && otherUser.lastName && 
                    `${otherUser.firstName.toLowerCase()}.${otherUser.lastName.toLowerCase()}` === userPath) ||
                  (otherUser.displayName && otherUser.displayName.includes(" ") &&
                    (() => {
                      const parts = otherUser.displayName.split(" ");
                      return parts.length >= 2 && 
                        `${parts[0].toLowerCase()}.${parts[parts.length - 1].toLowerCase()}` === userPath;
                    })()
                  ))
                );
                
                // If there's a collision, use username instead
                if (hasCollision) {
                  console.log('Collision detected, using username instead:', user.username);
                  userPath = user.username.toLowerCase();
                }
              } else {
                console.error('Failed to fetch all users for collision check');
              }
            } catch (collisionError) {
              console.error('Error during collision check:', collisionError);
            }
            
            // Return the custom URL with the user path
            // Only use the custom path format in production
            const finalUrl = `${protocol}//${displayDomain}${port}/${userPath}/booking/${slug}`;
            console.log('Generated URL:', finalUrl);
            return finalUrl;
          } catch (error) {
            console.error('Error generating custom booking URL:', error);
            // Fallback to the legacy URL format if anything fails
            return `${protocol}//${displayDomain}${port}/booking/${slug}`;
          }
        };
        
        const generatedUrl = await getUrl();
        setUrl(generatedUrl);
      } catch (error) {
        console.error('Error generating URL:', error);
        // Set a fallback URL in case of errors
        const hostname = window.location.hostname;
        const displayDomain = hostname === 'localhost' ? hostname : 'smart-scheduler.ai';
        const port = window.location.port ? `:${window.location.port}` : '';
        const protocol = window.location.protocol;
        setUrl(`${protocol}//${displayDomain}${port}/booking/${slug}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUrl();
  }, [slug]);

  if (isLoading) {
    return <span className="truncate text-neutral-400">Loading URL...</span>;
  }

  return <span className="truncate">{url}</span>;
};

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
    startTimeIncrement: z.number().default(30),
    isHidden: z.boolean().default(false),
    availabilityScheduleId: z.number().nullable().optional(),
    brandLogo: z.string().nullable().optional(),
    brandColor: z.string().nullable().optional(),
    removeBranding: z.boolean().default(false),
    redirectUrl: z.string().nullable().optional(),
    confirmationMessage: z.string().nullable().optional(),
    confirmationCta: z.any().nullable().optional(),
    isOneOff: z.boolean().default(false),
    isExpired: z.boolean().default(false),
    // Phase 3
    requirePayment: z.boolean().default(false),
    price: z.number().nullable().optional(),
    currency: z.string().default('usd'),
    autoCreateMeetLink: z.boolean().default(false),
    // Phase 4
    maxBookingsPerWeek: z.number().default(0),
    maxBookingsPerMonth: z.number().default(0),
    isCollective: z.boolean().default(false),
    assignmentMethod: z.string().default('round-robin'),
    teamMemberWeights: z.any().default({}),
  });

type CreateBookingLinkFormValues = z.infer<typeof createBookingLinkSchema>;

// Embed Code Section component
function EmbedCodeSection({ bookingLinkId }: { bookingLinkId: number }) {
  const { toast } = useToast();
  const { data: embedData } = useQuery<{
    bookingUrl: string;
    inlineEmbed: string;
    popupWidget: string;
    popupLink: string;
  }>({
    queryKey: [`/api/booking/${bookingLinkId}/embed`],
  });

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied', description: `${label} embed code copied to clipboard` });
  };

  if (!embedData) return null;

  return (
    <div>
      <h3 className="font-medium text-sm text-neutral-800 mb-3 flex items-center">
        <Code className="h-4 w-4 mr-2" />
        Embed Code
      </h3>
      <Tabs defaultValue="inline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inline">Inline</TabsTrigger>
          <TabsTrigger value="popup-widget">Popup Widget</TabsTrigger>
          <TabsTrigger value="popup-link">Popup Link</TabsTrigger>
        </TabsList>
        <TabsContent value="inline" className="space-y-2">
          <p className="text-xs text-muted-foreground">Embed the booking form directly in your webpage.</p>
          <div className="relative">
            <pre className="bg-neutral-50 p-3 rounded text-xs overflow-x-auto border max-h-32">
              {embedData.inlineEmbed}
            </pre>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => copyCode(embedData.inlineEmbed, 'Inline')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="popup-widget" className="space-y-2">
          <p className="text-xs text-muted-foreground">Add a floating button that opens the booking form in a popup.</p>
          <div className="relative">
            <pre className="bg-neutral-50 p-3 rounded text-xs overflow-x-auto border max-h-32">
              {embedData.popupWidget}
            </pre>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => copyCode(embedData.popupWidget, 'Popup Widget')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="popup-link" className="space-y-2">
          <p className="text-xs text-muted-foreground">Add a text link that opens the booking form in a popup.</p>
          <div className="relative">
            <pre className="bg-neutral-50 p-3 rounded text-xs overflow-x-auto border max-h-32">
              {embedData.popupLink}
            </pre>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => copyCode(embedData.popupLink, 'Popup Link')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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

  // Fetch availability schedules
  const { data: availabilitySchedules = [] } = useQuery<any[]>({
    queryKey: ['/api/availability-schedules'],
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
      startTimeIncrement: 30,
      isHidden: false,
      availabilityScheduleId: null,
      brandLogo: null,
      brandColor: null,
      removeBranding: false,
      redirectUrl: null,
      confirmationMessage: null,
      confirmationCta: null,
      isOneOff: false,
      isExpired: false,
      requirePayment: false,
      price: null,
      currency: 'usd',
      autoCreateMeetLink: false,
      maxBookingsPerWeek: 0,
      maxBookingsPerMonth: 0,
      isCollective: false,
      assignmentMethod: 'round-robin',
      teamMemberWeights: {},
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

  // Generate a booking link URL with user path
  const getBookingUrl = async (slug: string) => {
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol;
    
    // Get the current user info
    try {
      const response = await fetch('/api/users/current');
      if (!response.ok) {
        // Fallback to the legacy URL format if we can't get the user info
        return `${protocol}//${hostname}${port}/booking/${slug}`;
      }
      
      const user = await response.json();
      
      // Generate the user path
      let userPath = '';
      
      // If first and last name are available, use them
      if (user.firstName && user.lastName) {
        userPath = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}`;
      }
      // If display name is available, try to extract first and last name
      else if (user.displayName && user.displayName.includes(" ")) {
        const nameParts = user.displayName.split(" ");
        if (nameParts.length >= 2) {
          const firstName = nameParts[0];
          const lastName = nameParts[nameParts.length - 1];
          userPath = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
        }
      }
      
      // If we couldn't generate a path from name, use username
      if (!userPath) {
        userPath = user.username.toLowerCase();
      }
      
      // Check for name collisions
      const allUsersResponse = await fetch('/api/users');
      if (allUsersResponse.ok) {
        const allUsers = await allUsersResponse.json();
        const hasCollision = allUsers.some((otherUser: any) => 
          otherUser.id !== user.id && 
          ((otherUser.firstName && otherUser.lastName && 
            `${otherUser.firstName.toLowerCase()}.${otherUser.lastName.toLowerCase()}` === userPath) ||
           (otherUser.displayName && otherUser.displayName.includes(" ") &&
            (() => {
              const parts = otherUser.displayName.split(" ");
              return parts.length >= 2 && 
                `${parts[0].toLowerCase()}.${parts[parts.length - 1].toLowerCase()}` === userPath;
            })()
          ))
        );
        
        // If there's a collision, use username instead
        if (hasCollision) {
          userPath = user.username.toLowerCase();
        }
      }
      
      // Return the custom URL with the user path
      return `${protocol}//${hostname}${port}/${userPath}/booking/${slug}`;
    } catch (error) {
      console.error('Error generating custom booking URL:', error);
      // Fallback to the legacy URL format if anything fails
      return `${protocol}//${hostname}${port}/booking/${slug}`;
    }
  };

  // Copy booking link to clipboard
  const copyBookingLink = async (slug: string) => {
    try {
      const url = await getBookingUrl(slug);
      await navigator.clipboard.writeText(url);
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

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (showCreateModal && selectedLink) {
      // Set form values for editing
      const availability = selectedLink.availability && typeof selectedLink.availability === 'object' 
        ? selectedLink.availability as { hours: { start: string, end: string }, days: string[], window: number } 
        : { hours: { start: "09:00", end: "17:00" }, days: ["1", "2", "3", "4", "5"], window: 30 };
        
      form.reset({
        ...selectedLink,
        meetingType: selectedLink.meetingType || 'in-person',
        startTimeDate: parse(availability.hours.start, 'HH:mm', new Date()),
        endTimeDate: parse(availability.hours.end, 'HH:mm', new Date()),
        availability: availability,
        bufferBefore: selectedLink.bufferBefore ?? 0,
        bufferAfter: selectedLink.bufferAfter ?? 0,
        maxBookingsPerDay: selectedLink.maxBookingsPerDay ?? 0,
        leadTime: selectedLink.leadTime ?? 60,
        duration: selectedLink.duration,
        startTimeIncrement: selectedLink.startTimeIncrement ?? 30,
        isHidden: selectedLink.isHidden ?? false,
        availabilityScheduleId: selectedLink.availabilityScheduleId ?? null,
      } as any);
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
              <Plus className="h-4 w-4 mr-2" />
              <span>Create Booking Link</span>
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-neutral-500">Loading booking links...</p>
              </div>
            ) : bookingLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Link2Off className="h-16 w-16 text-neutral-400 mb-2" />
                <h2 className="text-lg font-medium text-neutral-600 mb-1">No booking links yet</h2>
                <p className="text-neutral-500 mb-4">
                  Create booking links to allow others to schedule time with you
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Create Booking Link</span>
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
                          {link.isHidden && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 font-medium">
                              Hidden
                            </span>
                          )}
                          {link.isOneOff && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              link.isExpired
                                ? 'bg-red-100 text-red-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {link.isExpired ? 'Expired' : 'One-Off'}
                            </span>
                          )}
                          <span className={`text-xs font-medium ${link.isExpired ? 'text-red-600' : 'text-green-600'}`}>
                            {link.isExpired ? 'Used' : 'Active'}
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
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{link.duration} minutes</span>
                      </div>

                      {/* Meeting Type Information */}
                      <div className="flex items-center text-sm text-neutral-600">
                        {link.meetingType === 'zoom' ? (
                          <Video className="h-4 w-4 mr-2" />
                        ) : link.meetingType === 'custom' ? (
                          <LinkIcon className="h-4 w-4 mr-2" />
                        ) : (
                          <MapPin className="h-4 w-4 mr-2" />
                        )}
                        <span>
                          {link.meetingType === 'zoom' ? 'Zoom Meeting' :
                           link.meetingType === 'custom' ? 'Custom Meeting URL' :
                           link.location || 'In-Person'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center text-sm text-neutral-600">
                        <Calendar className="h-4 w-4 mr-2" />
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
                        <Clock className="h-4 w-4 mr-2" />
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
                            <Timer className="h-3 w-3 mr-1" />
                            <span>
                              {(link.leadTime ?? 0) > 0 
                                ? `${link.leadTime} min notice` 
                                : "No min notice"}
                            </span>
                          </div>

                          <div className="flex items-center text-xs text-neutral-600">
                            <CalendarOff className="h-3 w-3 mr-1" />
                            <span>
                              {(link.maxBookingsPerDay ?? 0) > 0 
                                ? `Max ${link.maxBookingsPerDay}/day` 
                                : "Unlimited bookings"}
                            </span>
                          </div>

                          {((link.bufferBefore ?? 0) > 0 || (link.bufferAfter ?? 0) > 0) && (
                            <div className="flex items-center text-xs text-neutral-600 col-span-2">
                              <Minus className="h-3 w-3 mr-1" />
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
                        <LinkIcon className="h-4 w-4 mr-2" />
                        <span className="truncate">
                          <URLDisplay slug={link.slug} />
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyBookingLink(link.slug)}>
                        <Copy className="h-4 w-4 mr-1" />
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
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteBookingLink.mutate(link.id)}
                          disabled={deleteBookingLink.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
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
                            <SelectItem value="60">1 hour</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Time buffer after meetings
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startTimeIncrement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time Increments</FormLabel>
                        <Select
                          value={(field.value ?? 30).toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select increment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 minutes</SelectItem>
                            <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="20">20 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Time between available start times
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isHidden"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility</FormLabel>
                        <Select
                          value={field.value ? 'hidden' : 'visible'}
                          onValueChange={(value) => field.onChange(value === 'hidden')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visible">Public</SelectItem>
                            <SelectItem value="hidden">Hidden</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Hidden links are only accessible via direct URL
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {availabilitySchedules.length > 0 && (
                    <FormField
                      control={form.control}
                      name="availabilityScheduleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Availability Schedule</FormLabel>
                          <Select
                            value={field.value ? field.value.toString() : 'default'}
                            onValueChange={(value) => field.onChange(value === 'default' ? null : parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Use default availability" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Use booking link availability</SelectItem>
                              {availabilitySchedules.map((schedule: any) => (
                                <SelectItem key={schedule.id} value={schedule.id.toString()}>
                                  {schedule.name}{schedule.isDefault ? ' (Default)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Override with a named availability schedule
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              {/* Custom Questions Section - only for existing booking links */}
              {selectedLink && (
                <div className="border-t border-neutral-200 pt-4 mt-4">
                  <CustomQuestionsBuilder bookingLinkId={selectedLink.id} />
                </div>
              )}

              {/* Phase 2: Branding & Customization Section */}
              <div className="border-t border-neutral-200 pt-4 mt-4">
                <h3 className="font-medium text-sm text-neutral-800 mb-3 flex items-center">
                  <Palette className="h-4 w-4 mr-2" />
                  Branding & Customization
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="brandLogo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/logo.png"
                            value={field.value || ''}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Custom logo for your booking page</p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brandColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={field.value || '#4F46E5'}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-10 h-10 rounded border border-input cursor-pointer"
                            />
                            <Input
                              placeholder="#4F46E5"
                              value={field.value || ''}
                              onChange={field.onChange}
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="removeBranding"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remove Branding</FormLabel>
                        <div className="flex items-center gap-2 pt-1">
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm text-muted-foreground">
                            {field.value ? 'SmartScheduler branding hidden' : 'SmartScheduler branding shown'}
                          </span>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Phase 2: Post-Booking Settings */}
              <div className="border-t border-neutral-200 pt-4 mt-4">
                <h3 className="font-medium text-sm text-neutral-800 mb-3 flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Post-Booking Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="redirectUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Redirect URL (after booking)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/thank-you"
                            value={field.value || ''}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Redirect invitees after they book</p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmationMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Confirmation Message</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Thanks for booking! We'll see you soon."
                            value={field.value || ''}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Shown on the confirmation page</p>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Phase 2: One-Off Meeting */}
              <div className="border-t border-neutral-200 pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isOneOff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>One-Off Meeting</FormLabel>
                        <div className="flex items-center gap-2 pt-1">
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm text-muted-foreground">
                            {field.value ? 'Expires after one booking' : 'Reusable link'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          One-off links automatically expire after a single booking
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Phase 3: Google Meet Auto-Link */}
              <div className="border-t border-neutral-200 pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="autoCreateMeetLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Meet Auto-Link</FormLabel>
                        <div className="flex items-center gap-2 pt-1">
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm text-muted-foreground">
                            {field.value ? 'Auto-creates Meet link' : 'No auto Meet link'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Requires Google Calendar integration. A Meet link is generated when a booking is made.
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Phase 3: Payment Collection */}
              <div className="border-t border-neutral-200 pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Payment Collection</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="requirePayment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Require Payment</FormLabel>
                        <div className="flex items-center gap-2 pt-1">
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm text-muted-foreground">
                            {field.value ? 'Payment required' : 'Free booking'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Collect payment via Stripe before confirming the booking
                        </p>
                      </FormItem>
                    )}
                  />
                  {form.watch('requirePayment') && (
                    <>
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (in cents)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="50"
                                placeholder="e.g. 5000 for $50.00"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Amount in cents (e.g. 5000 = $50.00)
                            </p>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={field.value || 'usd'}
                                onChange={field.onChange}
                              >
                                <option value="usd">USD</option>
                                <option value="eur">EUR</option>
                                <option value="gbp">GBP</option>
                                <option value="cad">CAD</option>
                                <option value="aud">AUD</option>
                              </select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Phase 4: Booking Caps */}
              <div className="border-t border-neutral-200 pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Booking Limits</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="maxBookingsPerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Per Day</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0 = unlimited"
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxBookingsPerWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Per Week</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0 = unlimited"
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxBookingsPerMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Per Month</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0 = unlimited"
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">0 = unlimited</p>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Phase 4: Team Assignment & Collective */}
              <div className="border-t border-neutral-200 pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Team Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assignmentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignment Method</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={field.value || 'round-robin'}
                            onChange={field.onChange}
                          >
                            <option value="round-robin">Round Robin (weighted)</option>
                            <option value="equal-distribution">Equal Distribution</option>
                            <option value="pooled">Pooled (first available)</option>
                            <option value="specific">Specific (first member)</option>
                          </select>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          How bookings are assigned to team members
                        </p>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isCollective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collective Event</FormLabel>
                        <div className="flex items-center gap-2 pt-1">
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm text-muted-foreground">
                            {field.value ? 'All team members must attend' : 'Single assignee'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          When enabled, all selected team members must be available and will attend
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Phase 2: Embed Code - only for existing booking links */}
              {selectedLink && (
                <div className="border-t border-neutral-200 pt-4 mt-4">
                  <EmbedCodeSection bookingLinkId={selectedLink.id} />
                </div>
              )}

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