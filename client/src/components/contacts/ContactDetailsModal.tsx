import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Calendar, Clock, MapPin, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Contact } from "@/hooks/useContacts";
import { useContactBookings } from "@/hooks/useContactBookings";

interface ContactDetailsModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailsModal({ contact, open, onOpenChange }: ContactDetailsModalProps) {
  const { data: bookings, isLoading } = useContactBookings(contact?.email || null);

  if (!contact) return null;

  // Get initials for avatar
  const initials = contact.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div>
              <DialogTitle className="text-2xl">{contact.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-1 mt-1">
                <Mail className="h-4 w-4" />
                {contact.email}
              </DialogDescription>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{contact.totalBookings}</div>
              <div className="text-sm text-muted-foreground">Total Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">{format(contact.firstBookingDate, 'MMM d, yyyy')}</div>
              <div className="text-sm text-muted-foreground">First Booking</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">{format(contact.lastBookingDate, 'MMM d, yyyy')}</div>
              <div className="text-sm text-muted-foreground">Last Booking</div>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">Booking History</h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : bookings && bookings.length > 0 ? (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(booking.startTime, 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(booking.startTime, 'h:mm a')} - {format(booking.endTime, 'h:mm a')}
                          </span>
                        </div>

                        {booking.notes && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                            <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{booking.notes}</span>
                          </div>
                        )}
                      </div>

                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No bookings found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
