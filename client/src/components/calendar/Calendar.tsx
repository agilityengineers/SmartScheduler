import { useState, useEffect } from 'react';
import { useWeeklyEvents, useEvents, getEventColor } from '@/hooks/useEvents';
import { formatTime, SHORT_DAYS, HOURS_IN_DAY, formatDate } from '@/lib/calendar-utils';
import { Event } from '@shared/schema';
import { useTimeZones } from '@/hooks/useTimeZone';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getDate, getMonth, getYear, isSameDay, isSameMonth } from 'date-fns';
import { Calendar as DatePickerCalendar } from '@/components/ui/calendar';

interface CalendarProps {
  currentDate: Date;
  timeZone: string;
  onEventClick: (event: Event) => void;
  currentView?: 'day' | 'week' | 'month';
  organizationId?: number | null;
  teamId?: number | null;
}

export default function Calendar({ currentDate, timeZone, onEventClick, currentView = 'week', organizationId, teamId }: CalendarProps) {
  // We'll use different data fetching strategies based on the view
  const { data: weeklyEvents = [], isLoading: isWeeklyLoading } = useWeeklyEvents(
    currentDate, 
    undefined, 
    undefined, 
    organizationId || undefined, 
    teamId || undefined
  );
  
  // For month view, we need to fetch a larger date range
  const startOfMonthDate = startOfMonth(currentDate);
  const endOfMonthDate = endOfMonth(currentDate);
  const { data: monthlyEvents = [], isLoading: isMonthlyLoading } = useEvents(
    startOfMonthDate, 
    endOfMonthDate, 
    undefined, 
    undefined, 
    organizationId || undefined, 
    teamId || undefined
  );
  
  // For day view, we'll filter from weekly data for the specific day
  const dayEvents = weeklyEvents.filter(event => {
    const eventDate = new Date(event.startTime);
    return isSameDay(eventDate, currentDate);
  });
  
  const [weekStart, setWeekStart] = useState(startOfWeek(currentDate));

  useEffect(() => {
    setWeekStart(startOfWeek(currentDate));
  }, [currentDate]);

  // Generate days of the week based on the current date
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return {
      name: SHORT_DAYS[day.getDay()],
      date: day.getDate(),
      fullDate: day,
      isToday: format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    };
  });

  // Position events in the calendar
  const positionEvent = (event: Event, view = 'week') => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    
    // Get the color based on calendar type
    const colorClass = getEventColor(event.calendarType || 'default');
    
    if (view === 'day') {
      // Single day view - events span the full width
      const top = startTime.getHours() * 60 + startTime.getMinutes();
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (60 * 1000);
      
      return {
        top: top + 'px',
        left: 'calc(12.5% + 5px)',
        width: 'calc(87.5% - 10px)',
        height: durationMinutes + 'px',
        ...colorClass
      };
    } else {
      // Week view - events are positioned by day
      const dayIndex = startTime.getDay();
      const top = startTime.getHours() * 60 + startTime.getMinutes();
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (60 * 1000);
      
      return {
        top: top + 'px',
        left: `calc(${(dayIndex + 1) * 12.5}% + 5px)`,
        width: 'calc(12.5% - 10px)',
        height: durationMinutes + 'px',
        ...colorClass
      };
    }
  };

  // Month view helper - group events by date
  const eventsByDate = monthlyEvents.reduce<Record<string, Event[]>>((acc, event) => {
    const dateStr = format(new Date(event.startTime), 'yyyy-MM-dd');
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(event);
    return acc;
  }, {});

  // Day view - shows events for the selected day
  const renderDayView = () => {
    return (
      <div className="flex-1 overflow-auto">
        <div className="calendar-grid min-w-full relative" style={{ 
          display: 'grid',
          gridTemplateColumns: '80px 1fr',
          gridTemplateRows: '60px repeat(24, 60px)'
        }}>
          {/* Time Labels */}
          <div className="sticky left-0 z-10 bg-white border-r border-neutral-300">
            <div className="h-[60px]"></div>
            {HOURS_IN_DAY.map((hour) => (
              <div 
                key={hour} 
                className="h-[60px] pr-2 text-right text-sm text-neutral-500 relative"
              >
                <span className="absolute right-2 -top-2">
                  {hour === 0 ? '12' : (hour > 12 ? hour - 12 : hour)} {hour >= 12 ? 'PM' : 'AM'}
                </span>
              </div>
            ))}
          </div>
          
          {/* Day Header */}
          <div 
            className="h-[60px] border-b border-neutral-300 flex flex-col justify-center items-center text-sm font-medium"
          >
            <div className="text-neutral-600">{format(currentDate, 'EEEE')}</div>
            <div 
              className="text-xl font-semibold text-primary bg-blue-50 w-8 h-8 rounded-full flex items-center justify-center"
            >
              {format(currentDate, 'd')}
            </div>
          </div>
          
          {/* Calendar Cells */}
          {HOURS_IN_DAY.map((hour) => (
            <div 
              key={`${hour}`} 
              className="time-slot relative border-t border-neutral-300 p-[8px]"
              style={{ gridRow: hour + 2, gridColumn: 2 }}
            />
          ))}
          
          {/* Events */}
          {!isWeeklyLoading && dayEvents.map((event) => {
            const style = positionEvent(event, 'day');
            return (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className={`calendar-event ${style.bg} ${style.text} ${style.border} cursor-pointer`}
                style={{
                  position: 'absolute',
                  top: style.top,
                  left: style.left,
                  width: style.width,
                  height: style.height,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  overflow: 'hidden',
                  zIndex: 10
                }}
              >
                <div className="font-medium">{event.title}</div>
                <div className="text-xs">
                  {formatTime(new Date(event.startTime).getHours(), new Date(event.startTime).getMinutes())} - 
                  {formatTime(new Date(event.endTime).getHours(), new Date(event.endTime).getMinutes())}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Week view - shows events for the entire week
  const renderWeekView = () => {
    return (
      <div className="flex-1 overflow-auto">
        <div className="calendar-grid min-w-full relative" style={{ 
          display: 'grid',
          gridTemplateColumns: '80px repeat(7, 1fr)',
          gridTemplateRows: '60px repeat(24, 60px)'
        }}>
          {/* Time Labels */}
          <div className="sticky left-0 z-10 bg-white border-r border-neutral-300">
            <div className="h-[60px]"></div>
            {HOURS_IN_DAY.map((hour) => (
              <div 
                key={hour} 
                className="h-[60px] pr-2 text-right text-sm text-neutral-500 relative"
              >
                <span className="absolute right-2 -top-2">
                  {hour === 0 ? '12' : (hour > 12 ? hour - 12 : hour)} {hour >= 12 ? 'PM' : 'AM'}
                </span>
              </div>
            ))}
          </div>
          
          {/* Days Header */}
          {weekDays.map((day, index) => (
            <div 
              key={index} 
              className="h-[60px] border-b border-neutral-300 flex flex-col justify-center items-center text-sm font-medium"
            >
              <div className="text-neutral-600">{day.name}</div>
              <div 
                className={`text-xl font-semibold ${
                  day.isToday 
                    ? 'text-primary bg-blue-50 w-8 h-8 rounded-full flex items-center justify-center' 
                    : 'text-neutral-700'
                }`}
              >
                {day.date}
              </div>
            </div>
          ))}
          
          {/* Calendar Cells */}
          {HOURS_IN_DAY.map((hour) => (
            Array.from({ length: 7 }, (_, day) => (
              <div 
                key={`${hour}-${day}`} 
                className="time-slot relative border-t border-neutral-300 p-[8px]"
                style={{ gridRow: hour + 2, gridColumn: day + 2 }}
              />
            ))
          ))}
          
          {/* Events */}
          {!isWeeklyLoading && weeklyEvents.map((event) => {
            const style = positionEvent(event);
            return (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className={`calendar-event ${style.bg} ${style.text} ${style.border} cursor-pointer`}
                style={{
                  position: 'absolute',
                  top: style.top,
                  left: style.left,
                  width: style.width,
                  height: style.height,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  overflow: 'hidden',
                  zIndex: 10
                }}
              >
                <div className="font-medium">{event.title}</div>
                <div className="text-xs">
                  {formatTime(new Date(event.startTime).getHours(), new Date(event.startTime).getMinutes())} - 
                  {formatTime(new Date(event.endTime).getHours(), new Date(event.endTime).getMinutes())}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Month view - shows a calendar with events
  const renderMonthView = () => {
    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm">
          <DatePickerCalendar
            mode="single"
            selected={currentDate}
            month={currentDate}
            showOutsideDays={true}
            classNames={{
              day: "h-14 w-full p-0 font-normal aria-selected:opacity-100 rounded-none relative"
            }}
            components={{
              Day: (props: any) => {
                const date = props.date;
                const dateStr = format(date, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[dateStr] || [];
                const isActive = props.selected || isSameDay(date, currentDate);
                const isCurrentMonth = isSameMonth(date, currentDate);
                
                return (
                  <div 
                    className={`h-full w-full border border-neutral-200 hover:bg-neutral-50 transition-colors
                      ${isActive ? 'bg-blue-50' : ''} 
                      ${!isCurrentMonth ? 'opacity-40' : ''}`}
                    onClick={() => props.onClick && props.onClick(date)}
                  >
                    <div className="p-1">
                      <div className={`text-right mb-1 ${isActive ? 'font-bold' : ''}`}>
                        {getDate(date)}
                      </div>
                      <div className="space-y-1 max-h-[70px] overflow-hidden">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div 
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                            className={`text-xs truncate rounded px-1 py-0.5 ${getEventColor(event.calendarType || 'default').bg} ${getEventColor(event.calendarType || 'default').text}`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-neutral-600 pl-1">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            }}
          />
        </div>
      </div>
    );
  };

  // Render the appropriate view based on currentView prop
  switch (currentView) {
    case 'day':
      return renderDayView();
    case 'month':
      return renderMonthView();
    case 'week':
    default:
      return renderWeekView();
  }
}
