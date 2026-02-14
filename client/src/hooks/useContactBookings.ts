import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Booking } from "@shared/schema";

export function useContactBookings(email: string | null) {
  return useQuery<Booking[]>({
    queryKey: ['/api/contacts', email, 'bookings'],
    queryFn: async () => {
      if (!email) return [];

      const response = await apiRequest('GET', `/api/contacts/${encodeURIComponent(email)}/bookings`);
      const data: Booking[] = await response.json();
      // Convert date strings to Date objects
      return data.map((booking) => ({
        ...booking,
        startTime: new Date(booking.startTime),
        endTime: new Date(booking.endTime),
        createdAt: booking.createdAt ? new Date(booking.createdAt) : new Date()
      }));
    },
    enabled: !!email
  });
}
