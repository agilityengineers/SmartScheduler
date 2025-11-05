import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { BookingLink } from '@shared/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Video, ExternalLink, Calendar } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface PublicUserLandingProps {
  userPath: string;
}

interface UserProfile {
  id: number;
  username: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profilePicture: string | null;
  avatarColor: string | null;
}

export default function PublicUserLanding({ userPath }: PublicUserLandingProps) {
  const [user, setUser] = useState<UserProfile | null>(null);

  // Fetch user profile and booking links
  const { data: bookingLinks = [], isLoading, error } = useQuery<BookingLink[]>({
    queryKey: [`/api/public/${userPath}/booking-links`],
    queryFn: async () => {
      const response = await fetch(`/api/public/${userPath}/booking-links`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking links');
      }
      const data = await response.json();

      // Set user info from the response
      if (data.user) {
        setUser(data.user);
      }

      return data.bookingLinks || [];
    },
  });

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
    }
    return `${minutes} min`;
  };

  const formatAvailability = (link: BookingLink) => {
    if (!link.availability || typeof link.availability !== 'object') {
      return 'Weekdays, 9:00 AM - 5:00 PM';
    }

    const availability = link.availability as {
      days?: string[];
      hours?: { start: string; end: string };
    };

    const dayMap: { [key: string]: string } = {
      '0': 'Sun',
      '1': 'Mon',
      '2': 'Tue',
      '3': 'Wed',
      '4': 'Thu',
      '5': 'Fri',
      '6': 'Sat',
    };

    const days = availability.days?.map((d) => dayMap[d] || d).join(', ') || 'Weekdays';
    const hours = availability.hours
      ? `${availability.hours.start} - ${availability.hours.end}`
      : '9:00 AM - 5:00 PM';

    return `${days}, ${hours}`;
  };

  const getMeetingTypeIcon = (link: BookingLink) => {
    if (link.meetingType === 'zoom') return <Video className="h-4 w-4" />;
    if (link.meetingType === 'custom') return <ExternalLink className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };

  const getMeetingTypeText = (link: BookingLink) => {
    if (link.meetingType === 'zoom') return 'Zoom Meeting';
    if (link.meetingType === 'custom') return 'Custom Meeting URL';
    if (link.location) return link.location;
    return 'In-person meeting';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-2">
            User Not Found
          </h1>
          <p className="text-neutral-600 dark:text-slate-400 mb-6">
            We couldn't find a user with the path "{userPath}". Please check the URL and try again.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  if (bookingLinks.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-16">
          {/* User Header */}
          <div className="text-center mb-12">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              {user.profilePicture ? (
                <AvatarImage src={user.profilePicture} alt={user.displayName || user.username} />
              ) : (
                <AvatarFallback
                  style={{ backgroundColor: user.avatarColor || '#3f51b5' }}
                  className="text-white text-2xl"
                >
                  {getInitials(user.displayName || user.username)}
                </AvatarFallback>
              )}
            </Avatar>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100 mb-2">
              {user.displayName || user.username}
            </h1>
            {user.bio && (
              <p className="text-neutral-600 dark:text-slate-400 max-w-2xl mx-auto">
                {user.bio}
              </p>
            )}
          </div>

          {/* No booking links message */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-neutral-400 dark:text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              No Available Event Types
            </h2>
            <p className="text-neutral-600 dark:text-slate-400">
              This user hasn't set up any booking links yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* User Header */}
        <div className="text-center mb-12">
          <Avatar className="h-24 w-24 mx-auto mb-4">
            {user.profilePicture ? (
              <AvatarImage src={user.profilePicture} alt={user.displayName || user.username} />
            ) : (
              <AvatarFallback
                style={{ backgroundColor: user.avatarColor || '#3f51b5' }}
                className="text-white text-2xl"
              >
                {getInitials(user.displayName || user.username)}
              </AvatarFallback>
            )}
          </Avatar>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100 mb-2">
            {user.displayName || user.username}
          </h1>
          {user.bio && (
            <p className="text-neutral-600 dark:text-slate-400 max-w-2xl mx-auto">
              {user.bio}
            </p>
          )}
        </div>

        {/* Booking Links Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100 mb-6">
            Select a meeting type
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookingLinks.map((link) => (
              <Card
                key={link.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => {
                  window.location.href = `/${userPath}/booking/${link.slug}`;
                }}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span>{link.title}</span>
                    <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardTitle>
                  {link.description && (
                    <CardDescription className="line-clamp-2">
                      {link.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center text-sm text-neutral-600 dark:text-slate-400">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{formatDuration(link.duration)}</span>
                  </div>

                  <div className="flex items-center text-sm text-neutral-600 dark:text-slate-400">
                    {getMeetingTypeIcon(link)}
                    <span className="ml-2">{getMeetingTypeText(link)}</span>
                  </div>

                  <div className="flex items-center text-sm text-neutral-600 dark:text-slate-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-xs">{formatAvailability(link)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-neutral-500 dark:text-slate-500 pt-8 border-t border-neutral-200 dark:border-slate-700">
          <p>
            Powered by{' '}
            <a
              href="/"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              SmartScheduler
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
