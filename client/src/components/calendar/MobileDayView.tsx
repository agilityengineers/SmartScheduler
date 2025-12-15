import { useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { Event } from '@shared/schema';
import { useWeeklyEvents, getEventColor } from '@/hooks/useEvents';
import { formatTime, HOURS_IN_DAY } from '@/lib/calendar-utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileDayViewProps {
  currentDate: Date;
  timeZone: string;
  onEventClick: (event: Event) => void;
  onDateChange: (date: Date) => void;
  organizationId?: number | null;
  teamId?: number | null;
}

export default function MobileDayView({
  currentDate,
  timeZone,
  onEventClick,
  onDateChange,
  organizationId,
  teamId
}: MobileDayViewProps) {
  const { data: weeklyEvents = [], isLoading } = useWeeklyEvents(
    currentDate,
    undefined,
    undefined,
    organizationId || undefined,
    teamId || undefined
  );

  // Filter events for the current day
  const dayEvents = weeklyEvents.filter(event => {
    const eventDate = new Date(event.startTime);
    return isSameDay(eventDate, currentDate);
  });

  const [isPullToRefresh, setIsPullToRefresh] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe handlers for day navigation
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      // Next day
      const nextDay = addDays(currentDate, 1);
      onDateChange(nextDay);
    },
    onSwipedRight: () => {
      // Previous day
      const prevDay = subDays(currentDate, 1);
      onDateChange(prevDay);
    },
    trackMouse: false,
    preventScrollOnSwipe: false,
  });

  // Navigate to previous day
  const handlePrevDay = () => {
    const prevDay = subDays(currentDate, 1);
    onDateChange(prevDay);
  };

  // Navigate to next day
  const handleNextDay = () => {
    const nextDay = addDays(currentDate, 1);
    onDateChange(nextDay);
  };

  // Navigate to today
  const handleToday = () => {
    onDateChange(new Date());
  };

  // Position events in the day view
  const positionEvent = (event: Event) => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    const colorClass = getEventColor(event.calendarType || 'default');

    const top = startTime.getHours() * 60 + startTime.getMinutes();
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (60 * 1000);

    return {
      top: top + 'px',
      height: Math.max(durationMinutes, 30) + 'px', // Minimum 30px for touch target
      ...colorClass
    };
  };

  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="flex flex-col h-full">
      {/* Header with date and navigation */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevDay}
            className="px-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 text-center">
            <div className="text-xs text-neutral-600 dark:text-slate-400 uppercase tracking-wide">
              {format(currentDate, 'EEEE')}
            </div>
            <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              {format(currentDate, 'MMMM d, yyyy')}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextDay}
            className="px-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant={isToday ? 'default' : 'outline'}
            size="sm"
            onClick={handleToday}
            className="flex-1"
          >
            Today
          </Button>
          <div className="text-xs text-neutral-500 dark:text-slate-400">
            {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
          </div>
        </div>

        {/* Swipe hint */}
        <div className="mt-2 text-center text-xs text-neutral-400 dark:text-slate-500">
          ← Swipe to change days →
        </div>
      </div>

      {/* Day view calendar */}
      <div
        {...handlers}
        ref={containerRef}
        className="flex-1 overflow-y-auto relative bg-neutral-50 dark:bg-slate-800"
      >
        <div className="min-h-full relative">
          {/* Time slots */}
          <div className="relative">
            {HOURS_IN_DAY.map((hour) => (
              <div
                key={hour}
                className="flex border-b border-neutral-200 dark:border-slate-700"
                style={{ height: '60px' }}
              >
                {/* Time label */}
                <div className="w-16 flex-shrink-0 pr-2 pt-1 text-right">
                  <span className="text-xs text-neutral-500 dark:text-slate-400 font-medium">
                    {hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}
                    {hour >= 12 ? 'PM' : 'AM'}
                  </span>
                </div>

                {/* Time slot */}
                <div className="flex-1 relative bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-700">
                  {/* Half-hour line */}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-neutral-100 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>

          {/* Events overlay */}
          <div className="absolute top-0 left-16 right-0 bottom-0 pointer-events-none">
            {!isLoading && dayEvents.map((event) => {
              const style = positionEvent(event);
              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`absolute left-2 right-2 ${style.bg} ${style.text} ${style.border} rounded-lg shadow-sm pointer-events-auto cursor-pointer transition-transform active:scale-98`}
                  style={{
                    top: style.top,
                    height: style.height,
                    minHeight: '44px', // Minimum touch target
                  }}
                >
                  <div className="p-2 h-full overflow-hidden flex flex-col">
                    <div className="font-medium text-sm line-clamp-2">{event.title}</div>
                    <div className="text-xs mt-1 opacity-90">
                      {formatTime(
                        new Date(event.startTime).getHours(),
                        new Date(event.startTime).getMinutes()
                      )}{' '}
                      -{' '}
                      {formatTime(
                        new Date(event.endTime).getHours(),
                        new Date(event.endTime).getMinutes()
                      )}
                    </div>
                    {event.location && (
                      <div className="text-xs mt-1 opacity-75 truncate">
                        📍 {event.location}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
              <div className="text-sm text-neutral-600 dark:text-slate-400">Loading events...</div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && dayEvents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-6">
                <div className="text-4xl mb-2">📅</div>
                <div className="text-sm text-neutral-600 dark:text-slate-400">
                  No events scheduled
                </div>
                <div className="text-xs text-neutral-500 dark:text-slate-500 mt-1">
                  {isToday ? 'for today' : `for ${format(currentDate, 'MMM d')}`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
