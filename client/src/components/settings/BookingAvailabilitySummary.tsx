import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";

// Define BookingLink interface locally since we can't directly import from shared/schema
interface BookingLink {
  id: number;
  userId: number;
  slug: string;
  title: string;
  description?: string;
  duration: number;
  availability?: {
    days: string[];
    hours?: { start: string; end: string };
    window?: number;
  };
  meetingType?: string;
  location?: string;
  meetingUrl?: string;
}

// Day of week mapping
const dayNames = {
  '0': 'Sunday',
  '1': 'Monday',
  '2': 'Tuesday',
  '3': 'Wednesday',
  '4': 'Thursday',
  '5': 'Friday',
  '6': 'Saturday'
};

interface AvailabilityTimeRange {
  start: string;
  end: string;
}

interface DayAvailability {
  day: string;
  dayName: string;
  isAvailable: boolean;
  timeRanges: AvailabilityTimeRange[];
}

export default function BookingAvailabilitySummary() {
  const [consolidatedAvailability, setConsolidatedAvailability] = useState<DayAvailability[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  // Get all booking links to analyze availability
  const { data: bookingLinks, isLoading } = useQuery<BookingLink[]>({
    queryKey: ['/api/booking'],
  });
  
  // Process booking links to extract and consolidate availability
  useEffect(() => {
    if (!bookingLinks || bookingLinks.length === 0) return;
    
    // Initialize day availability for all 7 days of the week
    const initialDayAvailability: DayAvailability[] = Array.from({ length: 7 }, (_, i) => ({
      day: i.toString(),
      dayName: dayNames[i.toString() as keyof typeof dayNames],
      isAvailable: false,
      timeRanges: []
    }));
    
    // Process each booking link's availability settings
    bookingLinks.forEach(link => {
      if (!link.availability || !link.availability.days) return;
      
      // Get available days from this booking link
      link.availability.days.forEach((day: string) => {
        const dayIndex = parseInt(day);
        const dayAvailability = initialDayAvailability[dayIndex];
        
        // Mark day as available
        dayAvailability.isAvailable = true;
        
        // Add time range if it doesn't already exist
        if (link.availability?.hours) {
          const { start, end } = link.availability.hours;
          
          // Check if this time range already exists
          const timeRangeExists = dayAvailability.timeRanges.some(
            range => range.start === start && range.end === end
          );
          
          if (!timeRangeExists) {
            dayAvailability.timeRanges.push({
              start,
              end
            });
          }
        }
      });
    });
    
    // Sort time ranges for better display
    initialDayAvailability.forEach(day => {
      day.timeRanges.sort((a, b) => {
        if (a.start < b.start) return -1;
        if (a.start > b.start) return 1;
        return 0;
      });
    });
    
    setConsolidatedAvailability(initialDayAvailability);
  }, [bookingLinks]);
  
  // Format time in 12-hour format
  const formatTime = (time: string): string => {
    try {
      const [hour, minute] = time.split(':').map(Number);
      const period = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minute.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      return time;
    }
  };
  
  // Get summary text for compact view
  const getAvailabilitySummary = () => {
    const availableDays = consolidatedAvailability.filter(day => day.isAvailable);
    if (availableDays.length === 0) return "No availability set";
    if (availableDays.length === 7) return "Available every day";
    if (availableDays.length === 5 && 
        !consolidatedAvailability[0].isAvailable && 
        !consolidatedAvailability[6].isAvailable) {
      return "Available Mon-Fri";
    }
    return `Available ${availableDays.length} days/week`;
  };

  // Display available and unavailable days in a user-friendly format
  const renderDayAvailability = () => {
    const availableDays = consolidatedAvailability.filter(day => day.isAvailable);
    const unavailableDays = consolidatedAvailability.filter(day => !day.isAvailable);
    
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {consolidatedAvailability.map(day => (
            <Badge 
              key={day.day} 
              variant="outline" 
              className={day.isAvailable 
                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" 
                : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
              }
            >
              {day.dayName.slice(0, 3)}
            </Badge>
          ))}
        </div>
      </div>
    );
  };
  
  // Render daily schedule showing available time slots for each day
  const renderDailySchedule = () => {
    return (
      <div className="space-y-4 mt-4">
        <h3 className="text-sm font-medium">Daily Schedule:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {consolidatedAvailability.map(day => (
            <div 
              key={day.day} 
              className={`p-3 border rounded-md ${day.isAvailable ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{day.dayName}</span>
                {day.isAvailable ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Available
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                    Unavailable
                  </Badge>
                )}
              </div>
              
              {day.isAvailable ? (
                day.timeRanges.length > 0 ? (
                  <div className="space-y-1 mt-2">
                    {day.timeRanges.map((range, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <Clock className="h-3 w-3 mr-1 text-green-600" />
                        <span>
                          {formatTime(range.start)} - {formatTime(range.end)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mt-2">
                    No specific hours set
                  </div>
                )
              ) : (
                <div className="text-sm text-gray-500 mt-2">Not available for bookings</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Empty state - more compact
  if (!bookingLinks || bookingLinks.length === 0) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Booking Hours</p>
                <p className="text-xs text-muted-foreground">No booking links configured yet</p>
              </div>
            </div>
            <Link href="/booking">
              <Button variant="outline" size="sm">
                Create Booking Link
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Booking Hours</p>
                <p className="text-xs text-muted-foreground">{getAvailabilitySummary()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/booking">
                <Button variant="ghost" size="sm" className="text-xs">
                  Edit
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          <CollapsibleContent className="pt-4">
            <div className="space-y-4 border-t pt-4">
              {renderDayAvailability()}
              {renderDailySchedule()}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}