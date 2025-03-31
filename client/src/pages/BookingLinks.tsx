import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BookingLink, insertBookingLinkSchema } from '@shared/schema';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import CreateEventModal from '@/components/calendar/CreateEventModal';
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

// Extend booking link schema with frontend validation
const createBookingLinkSchema = insertBookingLinkSchema
  .omit({ userId: true })
  .extend({
    slug: z.string()
      .min(3, { message: 'Slug must be at least 3 characters' })
      .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' }),
  });

type CreateBookingLinkFormValues = z.infer<typeof createBookingLinkSchema>;

export default function BookingLinks() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<BookingLink | null>(null);
  const { toast } = useToast();
  
  // Fetch booking links
  const { data: bookingLinks = [], isLoading } = useQuery<BookingLink[]>({
    queryKey: ['/api/booking'],
  });
  
  // Create booking link mutation
  const createBookingLink = useMutation({
    mutationFn: async (data: CreateBookingLinkFormValues) => {
      const res = await apiRequest('POST', '/api/booking', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Booking link created successfully',
      });
      setShowCreateModal(false);
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
  
  // Toggle booking link active state
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const res = await apiRequest('PUT', `/api/booking/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
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
  
  // Form setup
  const form = useForm<CreateBookingLinkFormValues>({
    resolver: zodResolver(createBookingLinkSchema),
    defaultValues: {
      slug: '',
      title: '',
      description: '',
      duration: 30,
      availabilityWindow: 30,
      isActive: true,
      notifyOnBooking: true,
      availableDays: ["1", "2", "3", "4", "5"],
      availableHours: { start: "09:00", end: "17:00" },
      bufferBefore: 0,
      bufferAfter: 0,
      maxBookingsPerDay: 0,
      leadTime: 60,
    }
  });
  
  const onSubmit = (values: CreateBookingLinkFormValues) => {
    createBookingLink.mutate(values);
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
                        <div className="flex items-center space-x-1">
                          <Switch 
                            checked={link.isActive}
                            onCheckedChange={(checked) => 
                              toggleActive.mutate({ id: link.id, isActive: checked })
                            }
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                      <div className="flex items-center text-sm text-neutral-600">
                        <span className="material-icons text-sm mr-2">schedule</span>
                        <span>{link.duration} minutes</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center text-sm text-neutral-600">
                        <span className="material-icons text-sm mr-2">today</span>
                        <span>
                          {link.availableDays && Array.isArray(link.availableDays) && link.availableDays.length > 0 ? 
                            link.availableDays.map(day => {
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
                          {link.availableHours && typeof link.availableHours === 'object' ? 
                            `${link.availableHours.start} - ${link.availableHours.end}`
                            : 'No available hours'
                          }
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-primary break-all">
                        <span className="material-icons text-sm mr-2">link</span>
                        <span className="truncate">{getBookingUrl(link.slug)}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between">
                      <Button variant="outline" size="sm" onClick={() => copyBookingLink(link.slug)}>
                        <span className="material-icons text-sm mr-1">content_copy</span>
                        Copy Link
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Booking Link</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the purpose of this meeting"
                        className="resize-none"
                        {...field} 
                      />
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
                    <FormLabel>Duration (minutes)</FormLabel>
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
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="availableDays"
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
                              checked={field.value?.includes(day.value)}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValue, day.value]);
                                } else {
                                  field.onChange(currentValue.filter(val => val !== day.value));
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
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="availableHours.start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="availableHours.end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notifyOnBooking"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Notify me when someone books
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBookingLink.isPending}>
                  {createBookingLink.isPending ? 'Creating...' : 'Create Booking Link'}
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
