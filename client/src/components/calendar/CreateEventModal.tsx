import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTimeZones, useCurrentTimeZone, TimeZone } from '@/hooks/useTimeZone';
import { useCreateEvent } from '@/hooks/useEvents';
import { useReminderOptions } from '@/hooks/useReminders';
import { useQuery } from '@tanstack/react-query';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { insertEventSchema, CalendarIntegration } from '@shared/schema';
import { addMinutes, format, parse } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { MouseEvent, KeyboardEvent } from 'react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Extend the event schema with validation
const createEventSchema = insertEventSchema
  .omit({ userId: true })
  .extend({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    attendees: z.array(z.string().email()).optional(),
    reminders: z.array(z.number()).default([15]),
    attendeeEmails: z.string().optional(),
  });

type CreateEventFormValues = z.infer<typeof createEventSchema>;

export default function CreateEventModal({ isOpen, onClose }: CreateEventModalProps) {
  const { data: timeZones = [] } = useTimeZones();
  const { timeZone: currentTimeZone } = useCurrentTimeZone();
  const { mutate: createEvent, isPending } = useCreateEvent();
  const reminderOptions = useReminderOptions();

  // Fetch Zoom integrations
  const { data: calendarIntegrations = [] } = useQuery<CalendarIntegration[]>({
    queryKey: ['/api/integrations'],
  });

  // Check if user has Zoom integration set up
  const hasZoomIntegration = calendarIntegrations.some(
    integration => integration.type === 'zoom' && integration.isConnected
  );

  // Default to 30 min meeting starting now
  const now = new Date();
  const thirtyMinsLater = addMinutes(now, 30);

  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: '',
      description: '',
      startTime: now,
      endTime: thirtyMinsLater,
      location: '',
      meetingUrl: '',
      isAllDay: false,
      attendeeEmails: '',
      timezone: currentTimeZone || 'UTC',
      reminders: [15],
    }
  });

  // Function to handle meeting type selection
  const [meetingType, setMeetingType] = useState<string>('in-person');

  // Function to create a Zoom meeting
  const createZoomMeeting = async (event: CreateEventFormValues): Promise<string> => {
    try {
      const response = await fetch('/api/integrations/zoom/create-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: event.title,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          description: event.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Zoom meeting');
      }

      const data = await response.json();
      return data.meetingUrl;
    } catch (error) {
      console.error('Error creating Zoom meeting:', error);
      return '';
    }
  };

  const handleSubmit = async (values: CreateEventFormValues) => {
    // Process attendee emails
    let attendees: string[] = [];
    if (values.attendeeEmails) {
      attendees = values.attendeeEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);
    }

    let meetingUrl = values.meetingUrl;

    // If Zoom is selected as meeting type, create a Zoom meeting
    if (meetingType === 'zoom' && hasZoomIntegration) {
      const zoomUrl = await createZoomMeeting(values);
      if (zoomUrl) {
        meetingUrl = zoomUrl;
      }
    }

    // Create the event
    // Note: We don't modify the values.startTime and values.endTime directly as they are Date objects
    // and the API expects Date objects. The serialization to ISO strings happens automatically
    // during the JSON.stringify process in the fetch call.
    createEvent({
      ...values,
      attendees,
      meetingUrl,
    }, {
      onSuccess: () => {
        onClose();
        form.reset();
      }
    });
  };

  // Handle duration changes
  const handleDurationChange = (durationMinutes: number) => {
    const startTime = form.getValues('startTime');
    if (startTime) {
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);
      form.setValue('endTime', endTime);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Add title" value={field.value || ''} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and time section - horizontal layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date & Time</FormLabel>
                    <FormControl>
                      <DatePicker
                        selected={field.value}
                        onChange={(date: Date | null) => date && field.onChange(date)}
                        showTimeSelect
                        dateFormat="MMMM d, yyyy h:mm aa"
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
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date & Time</FormLabel>
                    <FormControl>
                      <DatePicker
                        selected={field.value}
                        onChange={(date: Date | null) => date && field.onChange(date)}
                        showTimeSelect
                        dateFormat="MMMM d, yyyy h:mm aa"
                        wrapperClassName="w-full"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col">
                <FormLabel>Duration</FormLabel>
                <Select onValueChange={(value) => handleDurationChange(parseInt(value))}>
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
              </div>
            </div>

            {/* Meeting Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Meeting Type</FormLabel>
                  <Select 
                    value={meetingType} 
                    onValueChange={setMeetingType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select meeting type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-person">In-Person</SelectItem>
                      <SelectItem value="manual">Custom URL (Manual)</SelectItem>
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
                            placeholder="Add location" 
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
            </div>

            {/* Conditionally show meeting URL field only for manual URL option */}
            {meetingType === 'manual' && (
              <div className="grid grid-cols-1">
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
              </div>
            )}

            {/* If Zoom is selected, display info message */}
            {meetingType === 'zoom' && hasZoomIntegration && (
              <div className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-md border border-neutral-200">
                <p>A Zoom meeting will be automatically created when you save this event.</p>
              </div>
            )}

            {/* Guests and Timezone - horizontal layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="attendeeEmails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guests</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Add guests (comma-separated email addresses)" 
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

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Zone</FormLabel>
                    <Select value={field.value || 'UTC'} onValueChange={field.onChange}>
                      <SelectTrigger>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description and Reminders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add description or agenda (optional)"
                        rows={3}
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

              <FormField
                control={form.control}
                name="reminders"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="reminders" 
                        checked={field.value.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([15]);
                          } else {
                            field.onChange([]);
                          }
                        }}
                      />
                      <FormLabel htmlFor="reminders">Add reminders</FormLabel>
                    </div>

                    {field.value.length > 0 && (
                      <Select 
                        value={field.value[0].toString()} 
                        onValueChange={(value) => field.onChange([parseInt(value)])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {reminderOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}