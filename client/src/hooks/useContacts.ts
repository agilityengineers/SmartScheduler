import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface Contact {
  email: string;
  name: string;
  totalBookings: number;
  lastBookingDate: Date;
  firstBookingDate: Date;
}

export interface ContactStats {
  totalContacts: number;
  totalBookings: number;
  recentBookings: number;
}

export function useContacts() {
  return useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const response = await apiRequest<Contact[]>('/api/contacts');
      // Convert date strings to Date objects
      return response.map(contact => ({
        ...contact,
        lastBookingDate: new Date(contact.lastBookingDate),
        firstBookingDate: new Date(contact.firstBookingDate)
      }));
    }
  });
}

export function useContactStats() {
  return useQuery<ContactStats>({
    queryKey: ['/api/contacts/stats'],
    queryFn: async () => {
      return apiRequest<ContactStats>('/api/contacts/stats');
    }
  });
}
