import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "@shared/schema";

export function useUserSettings() {
  return useQuery<Settings>({
    queryKey: ['/api/settings'],
  });
}

export function useUpdateSettings() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<Settings>) => {
      const res = await apiRequest('PUT', '/api/settings', settings);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your settings have been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useReminderOptions() {
  // List of common reminder options in minutes
  const reminderOptions = [
    { value: 0, label: "At time of event" },
    { value: 5, label: "5 minutes before" },
    { value: 10, label: "10 minutes before" },
    { value: 15, label: "15 minutes before" },
    { value: 30, label: "30 minutes before" },
    { value: 60, label: "1 hour before" },
    { value: 120, label: "2 hours before" },
    { value: 24 * 60, label: "1 day before" },
    { value: 2 * 24 * 60, label: "2 days before" },
    { value: 7 * 24 * 60, label: "1 week before" },
  ];

  return reminderOptions;
}

// Convert reminder time in minutes to a human-readable format
export function formatReminderTime(minutes: number): string {
  if (minutes === 0) {
    return "At time of event";
  } else if (minutes < 60) {
    return `${minutes} minutes before`;
  } else if (minutes === 60) {
    return "1 hour before";
  } else if (minutes < 24 * 60) {
    return `${Math.floor(minutes / 60)} hours before`;
  } else if (minutes === 24 * 60) {
    return "1 day before";
  } else {
    return `${Math.floor(minutes / (24 * 60))} days before`;
  }
}

// Convert an array of reminder times to a comma-separated string
export function formatReminderTimes(reminderTimes: number[]): string {
  if (!reminderTimes || reminderTimes.length === 0) {
    return "No reminders";
  }

  return reminderTimes
    .sort((a, b) => a - b)
    .map(formatReminderTime)
    .join(", ");
}
