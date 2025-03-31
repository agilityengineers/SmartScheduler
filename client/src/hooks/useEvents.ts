import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Event, InsertEvent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { addDays, startOfDay, endOfDay, format } from "date-fns";

export function useEvents(startDate?: Date, endDate?: Date) {
  let queryString = '';
  
  if (startDate) {
    queryString += `start=${startDate.toISOString()}`;
  }
  
  if (endDate) {
    queryString += `${queryString ? '&' : ''}end=${endDate.toISOString()}`;
  }
  
  const url = `/api/events${queryString ? `?${queryString}` : ''}`;
  
  return useQuery<Event[]>({
    queryKey: ['/api/events', startDate?.toISOString(), endDate?.toISOString()],
  });
}

export function useWeeklyEvents(date: Date = new Date()) {
  // Get the start of the current week (Sunday)
  const currentDay = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const startDate = startOfDay(addDays(date, -currentDay));
  const endDate = endOfDay(addDays(startDate, 6));
  
  return useEvents(startDate, endDate);
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
    onSuccess: () => {
      toast({
        title: "Event created",
        description: "Your event has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
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
    onSuccess: () => {
      toast({
        title: "Event updated",
        description: "Your event has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
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

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/events/${id}`, null);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Event deleted",
        description: "Your event has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
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
