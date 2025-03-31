import { useState, useEffect } from 'react';
import { useWeeklyEvents, getEventColor } from '@/hooks/useEvents';
import { formatTime, SHORT_DAYS, HOURS_IN_DAY } from '@/lib/calendar-utils';
import { Event } from '@shared/schema';
import { useTimeZones } from '@/hooks/useTimeZone';
import { format, addDays, startOfWeek } from 'date-fns';

interface CalendarProps {
  currentDate: Date;
  timeZone: string;
  onEventClick: (event: Event) => void;
}

export default function Calendar({ currentDate, timeZone, onEventClick }: CalendarProps) {
  const { data: events = [], isLoading } = useWeeklyEvents(currentDate);
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
  const positionEvent = (event: Event) => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    
    // Calculate day index (0-6)
    const dayIndex = startTime.getDay();
    
    // Calculate top position (hours * 60 + minutes)
    const top = startTime.getHours() * 60 + startTime.getMinutes();
    
    // Calculate height (duration in minutes)
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (60 * 1000);
    
    // Get the color based on calendar type
    const colorClass = getEventColor(event.calendarType || 'default');
    
    return {
      top: top + 'px',
      left: `calc(${(dayIndex + 1) * 12.5}% + 5px)`,
      width: 'calc(12.5% - 10px)',
      height: durationMinutes + 'px',
      ...colorClass
    };
  };

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
        {!isLoading && events.map((event) => {
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
}
