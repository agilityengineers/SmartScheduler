import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Booking } from "@shared/schema";

export function useContactBookings(email: string | null) {
  return useQuery<Booking[]>({
    queryKey: ['/api/contacts', email, 'bookings'],
    queryFn: async () => {
      if (!email) return [];

      const response = await apiRequest<Booking[]>(`/api/contacts/${encodeURIComponent(email)}/bookings`);
      // Convert date strings to Date objects
      return response.map(booking => ({
        ...booking,
        startTime: new Date(booking.startTime),
        endTime: new Date(booking.endTime),
        createdAt: new Date(booking.createdAt)
      }));
    },
    enabled: !!email
  });
}
