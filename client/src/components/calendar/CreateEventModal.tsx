import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTimeZones, useCurrentTimeZone, TimeZone } from '@/hooks/useTimeZone';
import { useCreateEvent } from '@/hooks/useEvents';
import { useReminderOptions } from '@/hooks/useReminders';
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
import { insertEventSchema } from '@shared/schema';
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

  const handleSubmit = (values: CreateEventFormValues) => {
    // Process attendee emails
    let attendees: string[] = [];
    if (values.attendeeEmails) {
      attendees = values.attendeeEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);
    }

    // Create the event
    createEvent({
      ...values,
      attendees,
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
      <DialogContent className="sm:max-w-[800px]">
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
            
            {/* Location section - horizontal layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Add location" value={field.value || ''} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="meetingUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Add meeting link" value={field.value || ''} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
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
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
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
