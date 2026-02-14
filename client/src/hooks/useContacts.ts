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
      const response = await apiRequest('GET', '/api/contacts');
      const data: Contact[] = await response.json();
      // Convert date strings to Date objects
      return data.map((contact: Contact) => ({
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
      const res = await apiRequest('GET', '/api/contacts/stats');
      return res.json() as Promise<ContactStats>;
    }
  });
}
