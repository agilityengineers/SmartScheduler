import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { popularTimeZones } from '@/lib/timeZoneUtils';
import { formatWeekRange, getCurrentWeekRange } from '@/lib/calendar-utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange: (view: 'day' | 'week' | 'month') => void;
  onTimeZoneChange: (timeZoneId: string) => void;
  currentView: 'day' | 'week' | 'month';
  currentTimeZone: string;
}

export default function CalendarHeader({
  currentDate,
  onDateChange,
  onViewChange,
  onTimeZoneChange,
  currentView = 'week',
  currentTimeZone = 'UTC',
}: CalendarHeaderProps) {
  const { start: weekStart, end: weekEnd } = getCurrentWeekRange(currentDate);
  const formattedDateRange = formatWeekRange(weekStart, weekEnd);

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="border-b border-neutral-300 p-4 flex items-center justify-between bg-white">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleNext}>
          <ChevronRight className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-neutral-700 ml-2">
          {formattedDateRange}
        </h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-4 px-3 py-1 text-sm text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100"
          onClick={handleToday}
        >
          Today
        </Button>
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="relative hidden md:block">
          <Select
            value={currentView}
            onValueChange={onViewChange}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="relative hidden md:block">
          <Select
            value={currentTimeZone}
            onValueChange={onTimeZoneChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Zone" />
            </SelectTrigger>
            <SelectContent>
              {popularTimeZones.map((tz) => (
                <SelectItem key={tz.id} value={tz.id}>
                  {tz.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
