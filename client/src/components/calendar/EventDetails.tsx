import { useState } from 'react';
import { useUpdateEvent, useDeleteEvent } from '@/hooks/useEvents';
import { Event } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatDateTimeRange } from '@/hooks/useTimeZone';
import { formatReminderTimes } from '@/hooks/useReminders';
import { 
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';

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
      onClose(); // Close the details panel after initiating edit
    }
  };

  return (
    <aside className={`w-80 border-l border-neutral-300 bg-white overflow-y-auto md:block flex-shrink-0 z-10 ${!isOpen ? 'hidden' : ''}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-700">Event Details</h3>
          <button className="text-neutral-500 hover:text-neutral-700" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div>
          <div className="rounded-lg bg-primary bg-opacity-10 p-4 mb-4">
            <h4 className="font-semibold text-primary mb-1">{event.title}</h4>
            <div className="text-sm text-neutral-700 mb-3">{event.description}</div>
            
            <div className="flex items-center text-sm text-neutral-600 mb-2">
              <span className="material-icons text-sm mr-2">schedule</span>
              <span>{formatDateTime(event.startTime, event.timezone, { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
            
            <div className="flex items-center text-sm text-neutral-600 mb-2">
              <span className="material-icons text-sm mr-2">access_time</span>
              <span>
                {formatDateTime(event.startTime, event.timezone, { 
                  hour: 'numeric',
                  minute: '2-digit'
                })} - {formatDateTime(event.endTime, event.timezone, { 
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            </div>
            
            <div className="flex items-center text-sm text-neutral-600">
              <span className="material-icons text-sm mr-2">public</span>
              <span>{event.timezone || 'UTC'}</span>
            </div>
          </div>
          
          {event.attendees && Array.isArray(event.attendees) && event.attendees.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-neutral-700 mb-2">Attendees</h4>
              <div className="flex flex-wrap gap-2">
                {/* Map through attendees */}
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
          
          {event.location && (
            <div className="mb-4">
              <h4 className="font-medium text-neutral-700 mb-2">Location</h4>
              <div className="flex items-center text-sm text-neutral-600">
                <span className="material-icons text-sm mr-2">
                  {event.meetingUrl ? 'videocam' : 'location_on'}
                </span>
                {event.meetingUrl ? (
                  <a href={event.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {event.location}
                  </a>
                ) : (
                  <span>{event.location}</span>
                )}
              </div>
            </div>
          )}
          
          {event.description && (
            <div className="mb-4">
              <h4 className="font-medium text-neutral-700 mb-2">Description</h4>
              <p className="text-sm text-neutral-600">{event.description}</p>
            </div>
          )}
          
          {event.reminders && Array.isArray(event.reminders) && event.reminders.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-neutral-700 mb-2">Reminders</h4>
              <div className="flex items-center text-sm text-neutral-600 mb-2">
                <span className="material-icons text-sm mr-2">notifications</span>
                <span>{formatReminderTimes(event.reminders as number[])}</span>
              </div>
            </div>
          )}
          
          <div className="flex space-x-2 pt-4 border-t border-neutral-200">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleEdit}
            >
              Reschedule
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDelete}
              disabled={isDeleting}
              className={`${showDeleteConfirm ? 'bg-red-100 text-red-700 border-red-200' : ''} transition-colors`}
            >
              {showDeleteConfirm ? 'Confirm' : (
                <span className="material-icons text-sm">delete</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
