import { useState, useEffect } from 'react';
import { format, isSameDay, startOfDay, endOfDay, addDays, isAfter, isBefore, parseISO } from 'date-fns';
import { Event } from '@shared/schema';
import { useEvents, getEventColor } from '@/hooks/useEvents';
import { formatTime } from '@/lib/calendar-utils';
import { Calendar, Clock, MapPin, Video, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileAgendaViewProps {
  currentDate: Date;
  timeZone: string;
  onEventClick: (event: Event) => void;
  organizationId?: number | null;
  teamId?: number | null;
}

export default function MobileAgendaView({
  currentDate,
  timeZone,
  onEventClick,
  organizationId,
  teamId
}: MobileAgendaViewProps) {
  // Fetch events for the next 30 days
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(addDays(new Date(), 30)));

  const { data: events = [], isLoading } = useEvents(
    startDate,
    endDate,
    undefined,
    undefined,
    organizationId || undefined,
    teamId || undefined
  );

  // Group events by date
  const groupEventsByDate = (eventList: Event[]) => {
    const grouped: Record<string, Event[]> = {};

    eventList.forEach(event => {
      const eventDate = new Date(event.startTime);
      const dateKey = format(eventDate, 'yyyy-MM-dd');

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    // Sort events within each day by start time
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    });

    return grouped;
  };

  const eventsByDate = groupEventsByDate(events);
  const sortedDates = Object.keys(eventsByDate).sort();

  // Filter to show only upcoming events (today and future)
  const today = startOfDay(new Date());
  const upcomingDates = sortedDates.filter(dateStr => {
    const date = parseISO(dateStr);
    return !isBefore(date, today);
  });

  const renderEventCard = (event: Event) => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    const colorClass = getEventColor(event.calendarType || 'default');
    const isToday = isSameDay(startTime, new Date());

    return (
      <div
        key={event.id}
        onClick={() => onEventClick(event)}
        className={`${colorClass.bg} ${colorClass.border} border-l-4 rounded-lg p-4 mb-3 cursor-pointer transition-all active:scale-98 shadow-sm`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-base mb-1 ${colorClass.text}`}>
              {event.title}
            </h3>

            <div className="space-y-1.5">
              {/* Time */}
              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-slate-400">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>
                  {formatTime(startTime.getHours(), startTime.getMinutes())} -{' '}
                  {formatTime(endTime.getHours(), endTime.getMinutes())}
                </span>
                {isToday && (
                  <span className="ml-auto px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                    Today
                  </span>
                )}
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-slate-400">
                  {event.videoMeetingUrl ? (
                    <Video className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{event.location}</span>
                </div>
              )}

              {/* Description preview */}
              {event.description && (
                <div className="text-sm text-neutral-500 dark:text-slate-500 line-clamp-2 mt-2">
                  {event.description}
                </div>
              )}

              {/* Attendees count */}
              {event.attendees && event.attendees.length > 0 && (
                <div className="text-xs text-neutral-500 dark:text-slate-500 mt-2">
                  {event.attendees.length} {event.attendees.length === 1 ? 'attendee' : 'attendees'}
                </div>
              )}
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-neutral-400 flex-shrink-0 mt-1" />
        </div>
      </div>
    );
  };

  const renderDateSection = (dateStr: string) => {
    const date = parseISO(dateStr);
    const dayEvents = eventsByDate[dateStr];
    const isToday = isSameDay(date, new Date());
    const isTomorrow = isSameDay(date, addDays(new Date(), 1));

    let dateLabel = format(date, 'EEEE, MMMM d');
    if (isToday) {
      dateLabel = `Today, ${format(date, 'MMMM d')}`;
    } else if (isTomorrow) {
      dateLabel = `Tomorrow, ${format(date, 'MMMM d')}`;
    }

    return (
      <div key={dateStr} className="mb-6">
        {/* Date header */}
        <div className="sticky top-0 z-10 bg-neutral-50 dark:bg-slate-800 py-2 mb-3">
          <div className="flex items-center gap-2">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              isToday
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700'
            }`}>
              <span className="text-lg font-semibold">
                {format(date, 'd')}
              </span>
            </div>
            <div>
              <div className={`font-semibold ${isToday ? 'text-primary' : 'text-neutral-900 dark:text-slate-100'}`}>
                {dateLabel}
              </div>
              <div className="text-xs text-neutral-500 dark:text-slate-400">
                {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
              </div>
            </div>
          </div>
        </div>

        {/* Events for this date */}
        {dayEvents.map(event => renderEventCard(event))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-slate-800">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              Upcoming Events
            </h2>
            <p className="text-sm text-neutral-500 dark:text-slate-400">
              Next 30 days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-600 dark:text-slate-400">
              {events.length}
            </span>
          </div>
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <div className="text-sm text-neutral-600 dark:text-slate-400">
                Loading events...
              </div>
            </div>
          </div>
        )}

        {!isLoading && upcomingDates.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-xs">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
                No upcoming events
              </h3>
              <p className="text-sm text-neutral-500 dark:text-slate-400">
                Your calendar is clear for the next 30 days
              </p>
            </div>
          </div>
        )}

        {!isLoading && upcomingDates.length > 0 && (
          <div className="space-y-1">
            {upcomingDates.map(dateStr => renderDateSection(dateStr))}
          </div>
        )}

        {/* Show past events section (optional) */}
        {!isLoading && events.length > upcomingDates.reduce((sum, dateStr) =>
          sum + eventsByDate[dateStr].length, 0
        ) && (
          <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-slate-700">
            <div className="text-sm font-medium text-neutral-500 dark:text-slate-400 mb-3">
              Earlier
            </div>
            {sortedDates
              .filter(dateStr => isBefore(parseISO(dateStr), today))
              .reverse()
              .slice(0, 5) // Show last 5 days of past events
              .map(dateStr => renderDateSection(dateStr))}
          </div>
        )}

        {/* Bottom padding for mobile nav */}
        <div className="h-4" />
      </div>
    </div>
  );
}
