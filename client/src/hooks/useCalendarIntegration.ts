import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CalendarIntegration } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useCalendarIntegrations() {
  return useQuery({
    queryKey: ['/api/integrations'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCalendarIntegrationsByType(type: 'google' | 'outlook' | 'ical') {
  const result = useQuery({
    queryKey: ['/api/integrations'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const { data } = result;
  
  // Filter by type if we have data
  const filteredData = data ? 
    (data as CalendarIntegration[]).filter(integration => integration.type === type) : 
    [];
  
  return {
    ...result,
    data: filteredData
  };
}

// Hook to get a specific calendar integration by ID
export function useCalendarIntegration(id: number) {
  const result = useQuery({
    queryKey: ['/api/integrations'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const { data } = result;
  
  // Find the specific integration if we have data
  const integration = data ? 
    (data as CalendarIntegration[]).find(integration => integration.id === id) : 
    undefined;
  
  return {
    ...result,
    data: integration
  };
}

export function useGoogleCalendarAuth(name?: string) {
  return useQuery({
    queryKey: ['/api/integrations/google/auth', name],
    queryFn: async ({ queryKey }) => {
      const [_, calendarName] = queryKey;
      const url = calendarName 
        ? `/api/integrations/google/auth?name=${encodeURIComponent(calendarName as string)}`
        : '/api/integrations/google/auth';
      
      const response = await fetch(url);
      return response.json();
    },
    enabled: false, // Only run when explicitly requested
  });
}

export function useOutlookCalendarAuth(name?: string) {
  return useQuery({
    queryKey: ['/api/integrations/outlook/auth', name],
    queryFn: async ({ queryKey }) => {
      const [_, calendarName] = queryKey;
      const url = calendarName 
        ? `/api/integrations/outlook/auth?name=${encodeURIComponent(calendarName as string)}`
        : '/api/integrations/outlook/auth';
      
      const response = await fetch(url);
      return response.json();
    },
    enabled: false, // Only run when explicitly requested
  });
}

export function useConnectiCalCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ calendarUrl, name }: { calendarUrl: string, name?: string }) => {
      const res = await apiRequest('POST', '/api/integrations/ical/connect', { 
        calendarUrl,
        name: name || 'iCalendar'
      });
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

// Updated to support disconnecting a specific calendar integration
export function useDisconnectCalendar(calendarType: 'google' | 'outlook' | 'ical', integrationId?: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id?: number) => {
      // If an ID is passed to the mutation function, use it; otherwise use the integrationId from the hook params
      const calendarId = id || integrationId;
      
      let url = `/api/integrations/${calendarType}/disconnect`;
      if (calendarId) {
        url = `/api/integrations/${calendarType}/disconnect/${calendarId}`;
      }
      
      const res = await apiRequest('POST', url, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `Successfully disconnected from ${calendarType} calendar`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      // Also invalidate events as they might be filtered by calendar
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
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

// Updated to support syncing a specific calendar integration
export function useSyncCalendar(calendarType: 'google' | 'outlook' | 'ical', integrationId?: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id?: number) => {
      // If an ID is passed to the mutation function, use it; otherwise use the integrationId from the hook params
      const calendarId = id || integrationId;
      
      let url = '/api/sync';
      const body = { calendarType };
      
      if (calendarId) {
        url = `/api/sync/${calendarId}`;
      }
      
      const res = await apiRequest('POST', url, body);
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

// New hook to set a calendar as primary
export function useSetPrimaryCalendar(calendarType: 'google' | 'outlook' | 'ical') {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId: number) => {
      const res = await apiRequest('POST', `/api/integrations/${calendarType}/${integrationId}/primary`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `Successfully set calendar as primary`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error setting primary calendar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
