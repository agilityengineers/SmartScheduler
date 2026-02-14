import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { format } from 'date-fns';
import {
  CalendarCheck, Clock, User, AlertTriangle, MailCheck, XCircle, CheckCircle, RefreshCcw
} from 'lucide-react';

interface Booking {
  id: number;
  bookingLinkId: number;
  name: string;
  email: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  status: string;
  noShowMarkedAt: string | null;
  reconfirmationSentAt: string | null;
  reconfirmationStatus: string | null;
  createdAt: string;
}

interface BookingLink {
  id: number;
  title: string;
  slug: string;
}

export default function BookingsManagement() {
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [selectedBookingLink, setSelectedBookingLink] = useState<string>('all');
  const [showConfirmDialog, setShowConfirmDialog] = useState<{ type: 'no-show' | 'reconfirm'; booking: Booking } | null>(null);
  const { toast } = useToast();

  const { data: bookingLinks = [] } = useQuery<BookingLink[]>({
    queryKey: ['/api/booking'],
  });

  // We need to fetch bookings for each booking link
  const { data: allBookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['/api/user-bookings'],
    queryFn: async () => {
      const res = await fetch('/api/user-bookings', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const markNoShow = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest('POST', `/api/bookings/${bookingId}/no-show`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Marked as No-Show', description: 'Booking has been marked as no-show.' });
      queryClient.invalidateQueries({ queryKey: ['/api/user-bookings'] });
      setShowConfirmDialog(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const sendReconfirmation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest('POST', `/api/bookings/${bookingId}/reconfirm`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Reconfirmation Sent',
        description: 'A reconfirmation request has been generated. Share the link with the invitee.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-bookings'] });
      setShowConfirmDialog(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const filteredBookings = selectedBookingLink === 'all'
    ? allBookings
    : allBookings.filter(b => b.bookingLinkId === parseInt(selectedBookingLink));

  const statusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Confirmed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      case 'no_show': return <Badge variant="destructive" className="bg-orange-100 text-orange-700 hover:bg-orange-100">No Show</Badge>;
      case 'rescheduled': return <Badge variant="secondary">Rescheduled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const reconfirmBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Reconfirmed</Badge>;
      case 'declined': return <Badge variant="destructive">Declined</Badge>;
      case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending</Badge>;
      default: return null;
    }
  };

  const isPast = (dateStr: string) => new Date(dateStr) < new Date();

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={() => setIsCreateEventModalOpen(true)} />
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="border-b border-neutral-300 p-4 flex items-center justify-between bg-white">
            <h1 className="text-xl font-semibold text-neutral-700 flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Bookings
            </h1>
            <div className="flex items-center gap-3">
              <Select value={selectedBookingLink} onValueChange={setSelectedBookingLink}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All booking links" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All booking links</SelectItem>
                  {bookingLinks.map(link => (
                    <SelectItem key={link.id} value={link.id.toString()}>{link.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-neutral-500">Loading bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <CalendarCheck className="h-16 w-16 text-neutral-400 mb-2" />
                <h2 className="text-lg font-medium text-neutral-600 mb-1">No bookings yet</h2>
                <p className="text-neutral-500">Bookings will appear here when people schedule through your links.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings
                  .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                  .map((booking) => {
                    const past = isPast(booking.endTime);
                    const bookingLinkTitle = bookingLinks.find(l => l.id === booking.bookingLinkId)?.title || 'Unknown';

                    return (
                      <Card key={booking.id} className={past && booking.status === 'confirmed' ? 'border-l-4 border-l-orange-300' : ''}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-neutral-500" />
                                  <span className="font-medium">{booking.name}</span>
                                </div>
                                {statusBadge(booking.status)}
                                {reconfirmBadge(booking.reconfirmationStatus)}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-neutral-600">
                                <span>{booking.email}</span>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(booking.startTime), 'MMM d, yyyy h:mm a')}
                                </div>
                                <span className="text-neutral-400">{bookingLinkTitle}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* No-Show button - only for past confirmed bookings */}
                              {past && booking.status === 'confirmed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  onClick={() => setShowConfirmDialog({ type: 'no-show', booking })}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-1" />
                                  No-Show
                                </Button>
                              )}

                              {/* Reconfirmation button - for upcoming confirmed bookings */}
                              {!past && booking.status === 'confirmed' && !booking.reconfirmationStatus && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowConfirmDialog({ type: 'reconfirm', booking })}
                                >
                                  <MailCheck className="h-4 w-4 mr-1" />
                                  Reconfirm
                                </Button>
                              )}

                              {booking.reconfirmationStatus === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-yellow-600"
                                  onClick={() => setShowConfirmDialog({ type: 'reconfirm', booking })}
                                >
                                  <RefreshCcw className="h-4 w-4 mr-1" />
                                  Resend
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNavigation onCreateEventClick={() => setIsCreateEventModalOpen(true)} />

      {/* Confirm Dialog */}
      <Dialog open={!!showConfirmDialog} onOpenChange={() => setShowConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showConfirmDialog?.type === 'no-show' ? 'Mark as No-Show' : 'Send Reconfirmation'}
            </DialogTitle>
            <DialogDescription>
              {showConfirmDialog?.type === 'no-show'
                ? `Mark ${showConfirmDialog?.booking.name}'s booking as a no-show? This will update the booking status.`
                : `Send a reconfirmation request to ${showConfirmDialog?.booking.name} (${showConfirmDialog?.booking.email})? They'll receive a link to confirm or decline.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(null)}>Cancel</Button>
            <Button
              variant={showConfirmDialog?.type === 'no-show' ? 'destructive' : 'default'}
              onClick={() => {
                if (!showConfirmDialog) return;
                if (showConfirmDialog.type === 'no-show') {
                  markNoShow.mutate(showConfirmDialog.booking.id);
                } else {
                  sendReconfirmation.mutate(showConfirmDialog.booking.id);
                }
              }}
              disabled={markNoShow.isPending || sendReconfirmation.isPending}
            >
              {showConfirmDialog?.type === 'no-show' ? 'Mark No-Show' : 'Send Reconfirmation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
      />
    </div>
  );
}
