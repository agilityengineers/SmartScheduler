import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings } from "../../../shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

/**
 * Hook to get user settings
 * @returns {UseQueryResult<Settings>} Query result with user settings data
 */
export const useUserSettings = () => {
  return useQuery<Settings>({
    queryKey: ['/api/settings'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to update user settings
 * @returns {UseMutationResult} Mutation result for updating settings
 */
export const useUpdateSettings = () => {
  return useMutation({
    mutationFn: (updatedSettings: Partial<Settings>) => {
      return apiRequest('PATCH', '/api/settings', updatedSettings);
    },
    onSuccess: () => {
      // Invalidate settings cache
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
  });
};