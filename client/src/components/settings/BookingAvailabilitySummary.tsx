import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  
  // Get all booking links to analyze availability
  const { data: bookingLinks, isLoading } = useQuery<BookingLink[]>({
    queryKey: ['/api/booking-links'],
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
  
  // Display available and unavailable days in a user-friendly format
  const renderDayAvailability = () => {
    const availableDays = consolidatedAvailability.filter(day => day.isAvailable);
    const unavailableDays = consolidatedAvailability.filter(day => !day.isAvailable);
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Available Days:</h3>
          <div className="flex flex-wrap gap-2">
            {availableDays.length > 0 ? (
              availableDays.map(day => (
                <Badge key={day.day} variant="outline" className="bg-green-50 text-green-800 border-green-200">
                  {day.dayName}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-gray-500">No available days set</span>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-2">Unavailable Days:</h3>
          <div className="flex flex-wrap gap-2">
            {unavailableDays.length > 0 ? (
              unavailableDays.map(day => (
                <Badge key={day.day} variant="outline" className="bg-red-50 text-red-800 border-red-200">
                  {day.dayName}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-gray-500">All days are available</span>
            )}
          </div>
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
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-full" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Booking Availability Summary</CardTitle>
        </div>
        <CardDescription>
          A summary of your availability for bookings based on your active booking links
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!bookingLinks || bookingLinks.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium">No booking links found</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              Create booking links to define your availability for meetings. Once created, your availability summary will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {renderDayAvailability()}
            {renderDailySchedule()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}