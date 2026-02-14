
import { useState } from 'react';
import { useUpdateEvent, useDeleteEvent } from '@/hooks/useEvents';
import { Event } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatDateTimeRange } from '@/hooks/useTimeZone';
import { formatReminderTimes } from '@/hooks/useReminders';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarIcon, Clock, Globe, Video, MapPin, Bell, Edit as EditIcon, Repeat, Check, Trash2, ExternalLink } from 'lucide-react';

interface EventDetailsProps {
  event: Event | null;
  onClose: () => void;
  onEdit?: (event: Event) => void;
  isOpen: boolean;
}

export default function EventDetails({
  event,
  onClose,
  onEdit,
  isOpen = false
}: EventDetailsProps) {
  const { mutate: updateEvent } = useUpdateEvent(event?.id || 0);
  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteEvent();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!event) return null;

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteEvent(event.id, {
        onSuccess: () => {
          setError(null);
          onClose();
          setShowDeleteConfirm(false);
        },
        onError: (err) => {
          setError('Failed to delete event. Please try again.');
          setShowDeleteConfirm(false);
        }
      });
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(event);
      onClose();
    }
  };

  // Determine if this is a Zoom meeting
  const isZoomMeeting = event.meetingUrl?.includes('zoom.us') ||
                        event.location?.toLowerCase().includes('zoom') ||
                        event.calendarType === 'zoom';

  const eventDescription = event.description as string | null;
  const hasLocation = !!(event.location || event.meetingUrl);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b pb-2">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold">{event.title}</DialogTitle>
            {event.calendarType && (
              <Badge variant="outline" className="ml-2">
                {event.calendarType.charAt(0).toUpperCase() + event.calendarType.slice(1)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Event Time Card */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <div className="bg-gradient-to-r from-primary/80 to-primary text-white p-4">
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                <CalendarIcon className="h-5 w-5" />
                <div className="font-medium">
                  {formatDateTime(event.startTime, event.timezone ?? undefined, 'PPPP')}
                </div>
                
                <Clock className="h-5 w-5" />
                <div>
                  {formatDateTimeRange(
                    event.startTime,
                    event.endTime,
                    event.timezone ?? undefined,
                    { sameDayTimeOnly: true, timeFormat: 'h:mm a' }
                  )}
                </div>
                
                <Globe className="h-5 w-5" />
                <div>{event.timezone || 'UTC'}</div>
              </div>
            </div>
          </Card>

          {/* Description Section */}
          {eventDescription ? (
            <div>
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Description
              </h3>
              <p className="text-neutral-700 text-sm">{eventDescription}</p>
            </div>
          ) : null}

          {/* Meeting Information Section - Enhanced for Zoom */}
          {hasLocation && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                {isZoomMeeting ? 'Zoom Meeting' : 'Location'}
              </h3>
              
              {isZoomMeeting ? (
                <Card className="border border-blue-100 bg-blue-50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Video className="h-5 w-5 text-blue-500" />
                      <div className="flex-1">
                        <p className="font-medium text-neutral-800">Zoom Meeting</p>
                        {event.location && event.location !== event.meetingUrl && (
                          <p className="text-sm text-neutral-600 mt-1">{event.location}</p>
                        )}
                        {event.meetingUrl && (
                          <div className="mt-2">
                            <a 
                              href={event.meetingUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md inline-flex items-center hover:bg-blue-700 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4 mr-1.5" />
                              Join Meeting
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center text-neutral-700">
                  {event.meetingUrl ? (
                    <Video className="h-5 w-5 text-neutral-500 mr-2" />
                  ) : (
                    <MapPin className="h-5 w-5 text-neutral-500 mr-2" />
                  )}
                  {event.meetingUrl ? (
                    <a href={event.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {event.location || event.meetingUrl}
                    </a>
                  ) : (
                    <span>{event.location}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attendees Section */}
          {Array.isArray(event.attendees) && event.attendees.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Attendees ({event.attendees.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.attendees.map((attendee, index) => (
                  <div key={index} className="flex items-center bg-neutral-100 rounded-full pl-1 pr-3 py-1">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium mr-1">
                      {typeof attendee === 'string'
                        ? attendee.charAt(0).toUpperCase()
                        : 'G'}
                    </div>
                    <span className="text-sm">{attendee}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reminders Section */}
          {Array.isArray(event.reminders) && event.reminders.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Reminders
              </h3>
              <div className="flex items-center text-neutral-700">
                <Bell className="h-5 w-5 text-neutral-500 mr-2" />
                <span>{formatReminderTimes(event.reminders)}</span>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-2" />

        {/* Event Actions */}
        <div className="flex space-x-2 py-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleEdit}
          >
            <EditIcon className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleEdit}
          >
            <Repeat className="h-4 w-4 mr-1.5" />
            Reschedule
          </Button>
          <Button
            variant={showDeleteConfirm ? "destructive" : "outline"}
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-10 p-0 flex items-center justify-center"
          >
            {showDeleteConfirm ? (
              <Check className="h-4 w-4 mr-1" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
