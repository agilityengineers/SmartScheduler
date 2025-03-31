import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';

interface Team {
  id: number;
  name: string;
  description: string | null;
  organizationId: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  role: string;
}

const assignmentMethodOptions = [
  { value: 'round-robin', label: 'Round Robin (distribute evenly)' },
  { value: 'pooled', label: 'Pooled (first available team member)' },
  { value: 'specific', label: 'Specific (assign to booking link owner)' },
];

// Define the form schema
const bookingFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  duration: z.coerce.number().min(5, 'Duration must be at least 5 minutes'),
  isActive: z.boolean().default(true),
  teamId: z.coerce.number().optional(),
  teamMemberIds: z.array(z.coerce.number()).optional(),
  assignmentMethod: z.string().default('round-robin'),
  isTeamBooking: z.boolean().default(true),
  notifyOnBooking: z.boolean().default(true),
  availabilityWindow: z.coerce.number().min(1, 'Availability window must be at least 1 day').default(30),
  bufferBefore: z.coerce.number().min(0, 'Buffer before must be at least 0 minutes').default(0),
  bufferAfter: z.coerce.number().min(0, 'Buffer after must be at least 0 minutes').default(0),
  maxBookingsPerDay: z.coerce.number().min(0, 'Max bookings per day must be at least 0').default(0),
  leadTime: z.coerce.number().min(0, 'Lead time must be at least 0 minutes').default(60),
  availableDays: z.array(z.string()).default(['1', '2', '3', '4', '5']),
  availableHours: z.object({
    start: z.string(),
    end: z.string(),
  }).default({ start: '09:00', end: '17:00' }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export function TeamBookingForm() {
  const { toast } = useToast();
  const { user } = useUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      duration: 30,
      isActive: true,
      isTeamBooking: true,
      teamId: user?.teamId || undefined,
      assignmentMethod: 'round-robin',
      notifyOnBooking: true,
      availabilityWindow: 30,
      bufferBefore: 0,
      bufferAfter: 0,
      maxBookingsPerDay: 0,
      leadTime: 60,
      availableDays: ['1', '2', '3', '4', '5'],
      availableHours: { start: '09:00', end: '17:00' },
    },
  });
  
  // Load teams based on user role
  useEffect(() => {
    const loadTeams = async () => {
      try {
        let teamsData: Team[] = [];
        
        if (user?.role === 'admin') {
          const response = await fetch('/api/teams');
          teamsData = await response.json();
        } else if (user?.role === 'company_admin' && user?.organizationId) {
          const response = await fetch(`/api/organizations/${user.organizationId}/teams`);
          teamsData = await response.json();
        } else if (user?.teamId) {
          const response = await fetch(`/api/teams/${user.teamId}`);
          const teamData = await response.json();
          teamsData = [teamData];
        }
        
        setTeams(teamsData);
        
        // Set default team
        if (teamsData.length > 0 && !form.getValues('teamId')) {
          form.setValue('teamId', teamsData[0].id);
          loadTeamUsers(teamsData[0].id);
        } else if (form.getValues('teamId')) {
          loadTeamUsers(form.getValues('teamId') as number);
        }
      } catch (error) {
        console.error('Error loading teams:', error);
        toast({
          title: 'Error loading teams',
          description: 'Failed to load team data. Please try again.',
          variant: 'destructive',
        });
      }
    };
    
    if (user) {
      loadTeams();
    }
  }, [user, form, toast]);
  
  // Load team users when team changes
  const loadTeamUsers = async (teamId: number) => {
    if (!teamId) return;
    
    try {
      const response = await fetch(`/api/teams/${teamId}/users`);
      const usersData = await response.json();
      setTeamUsers(usersData);
    } catch (error) {
      console.error('Error loading team users:', error);
      toast({
        title: 'Error loading team members',
        description: 'Failed to load team member data. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle team change
  const handleTeamChange = (teamId: string) => {
    form.setValue('teamId', parseInt(teamId));
    loadTeamUsers(parseInt(teamId));
  };
  
  // Handle form submission
  const onSubmit = async (values: BookingFormValues) => {
    setLoading(true);
    
    try {
      // Format data for API
      const formData = {
        ...values,
        isTeamBooking: true,
      };
      
      // Make API request
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking link');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Team booking link created',
        description: 'Your team booking link has been created successfully.',
      });
      
      // Reset form
      form.reset();
      
      // Redirect or update UI as needed
      window.location.href = '/booking';
    } catch (error) {
      console.error('Error creating team booking link:', error);
      toast({
        title: 'Error creating team booking link',
        description: (error as Error).message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Days of the week for selection
  const daysOfWeek = [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
  ];
  
  // Generate time options in 30-minute increments
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const hourString = hour.toString().padStart(2, '0');
        const minuteString = minute.toString().padStart(2, '0');
        const time = `${hourString}:${minuteString}`;
        options.push({ value: time, label: time });
      }
    }
    return options;
  };
  
  const timeOptions = generateTimeOptions();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Team Booking Link</CardTitle>
        <CardDescription>
          Create a booking link that automatically assigns meetings to team members.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Team Meeting" {...field} />
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
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="team-meeting" {...field} />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Book a meeting with our team" {...field} />
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
                    <FormControl>
                      <Input type="number" min={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        This booking link will be available for public bookings.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            {/* Team Configuration */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Team Configuration</h3>
              
              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select 
                      onValueChange={handleTeamChange} 
                      defaultValue={field.value?.toString() || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assignmentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Method</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || 'round-robin'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="How to assign team members" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignmentMethodOptions.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="teamMemberIds"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Team Members</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Select which team members can be assigned to this booking link.
                        If none are selected, all team members will be included.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {teamUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={field.value?.includes(user.id)}
                            onCheckedChange={(checked) => {
                              const currentValues = field.value || [];
                              if (checked) {
                                field.onChange([...currentValues, user.id]);
                              } else {
                                field.onChange(
                                  currentValues.filter((val) => val !== user.id)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`user-${user.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {user.displayName || user.username} ({user.email})
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notifyOnBooking"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Notify on booking</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Send email notifications when bookings are made.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            {/* Scheduling Rules */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Scheduling Rules</h3>
              
              <FormField
                control={form.control}
                name="availabilityWindow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability Window (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bufferBefore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buffer Before (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bufferAfter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buffer After (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="maxBookingsPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Bookings Per Day (0 = unlimited)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="leadTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Time (minutes)</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Minimum notice required before a booking can be made.
                    </p>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="availableDays"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Available Days</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Select which days of the week are available for booking.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {daysOfWeek.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={field.value?.includes(day.value)}
                            onCheckedChange={(checked) => {
                              const currentValues = field.value || [];
                              if (checked) {
                                field.onChange([...currentValues, day.value]);
                              } else {
                                field.onChange(
                                  currentValues.filter((val) => val !== day.value)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`day-${day.value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {day.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="availableHours.start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available From</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Start time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="availableHours.end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available To</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="End time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Team Booking Link'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}