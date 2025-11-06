import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { Contact } from "@/hooks/useContacts";

interface ContactCardProps {
  contact: Contact;
  onClick: () => void;
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  // Get initials for avatar
  const initials = contact.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg truncate">{contact.name}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
              </div>

              <Badge variant="secondary" className="flex-shrink-0">
                <Users className="h-3 w-3 mr-1" />
                {contact.totalBookings} {contact.totalBookings === 1 ? 'booking' : 'bookings'}
              </Badge>
            </div>

            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Last booked: {format(contact.lastBookingDate, 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
