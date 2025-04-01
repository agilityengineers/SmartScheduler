import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Event, InsertEvent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { addDays, startOfDay, endOfDay, format } from "date-fns";

export function useEvents(
  startDate?: Date, 
  endDate?: Date, 
  calendarIntegrationId?: number,
  calendarType?: 'google' | 'outlook' | 'ical',
  organizationId?: number,
  teamId?: number
) {
  let queryString = '';
  
  if (startDate) {
    queryString += `start=${startDate.toISOString()}`;
  }
  
  if (endDate) {
    queryString += `${queryString ? '&' : ''}end=${endDate.toISOString()}`;
  }
  
  if (calendarIntegrationId) {
    queryString += `${queryString ? '&' : ''}calendarIntegrationId=${calendarIntegrationId}`;
  }
  
  if (calendarType) {
    queryString += `${queryString ? '&' : ''}calendarType=${calendarType}`;
  }
  
  if (organizationId) {
    queryString += `${queryString ? '&' : ''}organizationId=${organizationId}`;
  }
  
  if (teamId) {
    queryString += `${queryString ? '&' : ''}teamId=${teamId}`;
  }
  
  const url = `/api/events${queryString ? `?${queryString}` : ''}`;
  
  return useQuery<Event[]>({
    queryKey: [
      '/api/events', 
      startDate?.toISOString(), 
      endDate?.toISOString(), 
      calendarIntegrationId,
      calendarType,
      organizationId,
      teamId
    ],
  });
}

export function useWeeklyEvents(
  date: Date = new Date(),
  calendarIntegrationId?: number,
  calendarType?: 'google' | 'outlook' | 'ical',
  organizationId?: number,
  teamId?: number
) {
  // Get the start of the current week (Sunday)
  const currentDay = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const startDate = startOfDay(addDays(date, -currentDay));
  const endDate = endOfDay(addDays(startDate, 6));
  
  return useEvents(startDate, endDate, calendarIntegrationId, calendarType, organizationId, teamId);
}

export function useEvent(id: number | null) {
  return useQuery<Event>({
    queryKey: ['/api/events', id],
    enabled: id !== null,
  });
}

export function useCreateEvent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<InsertEvent, 'userId'>) => {
      const res = await apiRequest('POST', '/api/events', event);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Event created",
        description: "Your event has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      // Also invalidate queries that might be filtered by the calendar type or integration
      if (data && data.calendarType) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/events', undefined, undefined, undefined, data.calendarType] 
        });
      }
      if (data && data.calendarIntegrationId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/events', undefined, undefined, data.calendarIntegrationId] 
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error creating event",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateEvent(id: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Partial<Event>) => {
      const res = await apiRequest('PUT', `/api/events/${id}`, event);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Event updated",
        description: "Your event has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
      
      // Also invalidate queries that might be filtered by the calendar type or integration
      if (data && data.calendarType) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/events', undefined, undefined, undefined, data.calendarType] 
        });
      }
      if (data && data.calendarIntegrationId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/events', undefined, undefined, data.calendarIntegrationId] 
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error updating event",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteEvent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // To store event details before deletion for invalidating queries
  let eventDetails: Event | null = null;

  return useMutation({
    mutationFn: async (eventToDelete: number | Event) => {
      const id = typeof eventToDelete === 'number' ? eventToDelete : eventToDelete.id;
      
      // If we have the full event object, store it for invalidation
      if (typeof eventToDelete !== 'number') {
        eventDetails = eventToDelete;
      }
      
      const res = await apiRequest('DELETE', `/api/events/${id}`, null);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Event deleted",
        description: "Your event has been successfully deleted",
      });
      
      // Invalidate all event queries
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      // If we have the event details, also invalidate specific queries
      if (eventDetails) {
        if (eventDetails.calendarType) {
          queryClient.invalidateQueries({ 
            queryKey: ['/api/events', undefined, undefined, undefined, eventDetails.calendarType] 
          });
        }
        if (eventDetails.calendarIntegrationId) {
          queryClient.invalidateQueries({ 
            queryKey: ['/api/events', undefined, undefined, eventDetails.calendarIntegrationId] 
          });
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Error deleting event",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Helper functions to work with events
export function getEventDuration(event: Event): number {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60); // Duration in minutes
}

export function getEventColor(calendarType: string): { bg: string, border: string, text: string } {
  switch (calendarType) {
    case 'google':
      return { 
        bg: 'bg-blue-100', 
        border: 'border-l-4 border-primary', 
        text: 'text-primary' 
      };
    case 'outlook':
      return { 
        bg: 'bg-purple-100', 
        border: 'border-l-4 border-purple-700', 
        text: 'text-purple-700' 
      };
    case 'ical':
      return { 
        bg: 'bg-amber-100', 
        border: 'border-l-4 border-amber-700', 
        text: 'text-amber-700' 
      };
    default:
      return { 
        bg: 'bg-green-100', 
        border: 'border-l-4 border-secondary', 
        text: 'text-secondary' 
      };
  }
}

// Helper function to get the info/icon for a calendar service type
export function getCalendarTypeInfo(calendarType: string): { 
  name: string, 
  icon: string, 
  color: string 
} {
  switch (calendarType) {
    case 'google':
      return { 
        name: 'Google Calendar', 
        icon: 'calendar_month', 
        color: 'text-primary' 
      };
    case 'outlook':
      return { 
        name: 'Outlook Calendar', 
        icon: 'event_note', 
        color: 'text-purple-700' 
      };
    case 'ical':
      return { 
        name: 'iCalendar', 
        icon: 'event_available', 
        color: 'text-amber-700' 
      };
    default:
      return { 
        name: 'Calendar', 
        icon: 'calendar_today', 
        color: 'text-secondary' 
      };
  }
}
