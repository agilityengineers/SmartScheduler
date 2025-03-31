import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CalendarIntegration } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useCalendarIntegrations() {
  return useQuery({
    queryKey: ['/api/integrations'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useGoogleCalendarAuth() {
  return useQuery({
    queryKey: ['/api/integrations/google/auth'],
    enabled: false, // Only run when explicitly requested
  });
}

export function useOutlookCalendarAuth() {
  return useQuery({
    queryKey: ['/api/integrations/outlook/auth'],
    enabled: false, // Only run when explicitly requested
  });
}

export function useConnectiCalCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (calendarUrl: string) => {
      const res = await apiRequest('POST', '/api/integrations/ical/connect', { calendarUrl });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Successfully connected to iCalendar",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    },
    onError: (error) => {
      toast({
        title: "Error connecting to iCalendar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDisconnectCalendar(calendarType: 'google' | 'outlook' | 'ical') {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/integrations/${calendarType}/disconnect`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `Successfully disconnected from ${calendarType} calendar`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    },
    onError: (error) => {
      toast({
        title: `Error disconnecting from ${calendarType} calendar`,
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSyncCalendar(calendarType: 'google' | 'outlook' | 'ical') {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/sync', { calendarType });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `Successfully synced ${calendarType} calendar`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
    onError: (error) => {
      toast({
        title: `Error syncing ${calendarType} calendar`,
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
