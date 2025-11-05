import { useState } from 'react';
import { BookingLink } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, MoreVertical, Edit, Trash2, ExternalLink, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BookingLinkCardProps {
  link: BookingLink;
  onEdit?: (link: BookingLink) => void;
  onDelete?: (linkId: number) => void;
  onCopyLink?: (slug: string) => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  colorIndex?: number;
}

// Color palette for left border (Calendly-style)
const borderColors = [
  'border-l-blue-500',
  'border-l-purple-500',
  'border-l-green-500',
  'border-l-yellow-500',
  'border-l-red-500',
  'border-l-pink-500',
  'border-l-indigo-500',
  'border-l-teal-500',
];

export default function BookingLinkCard({
  link,
  onEdit,
  onDelete,
  onCopyLink,
  selected = false,
  onSelect,
  colorIndex = 0,
}: BookingLinkCardProps) {
  const { toast } = useToast();
  const borderColor = borderColors[colorIndex % borderColors.length];

  // Format availability days
  const formatDays = () => {
    if (!link.availability || typeof link.availability !== 'object') return 'Weekdays';

    const availability = link.availability as { days?: string[] };
    if (!availability.days || !Array.isArray(availability.days)) return 'Weekdays';

    const dayMap: { [key: string]: string } = {
      '0': 'Sun',
      '1': 'Mon',
      '2': 'Tue',
      '3': 'Wed',
      '4': 'Thu',
      '5': 'Fri',
      '6': 'Sat',
    };

    return availability.days.map(day => dayMap[day] || day).join(', ');
  };

  // Format availability hours
  const formatHours = () => {
    if (!link.availability || typeof link.availability !== 'object') return '9 am - 6 pm';

    const availability = link.availability as { hours?: { start: string; end: string } };
    if (!availability.hours) return '9 am - 6 pm';

    return `${availability.hours.start} - ${availability.hours.end}`;
  };

  // Get meeting type display
  const getMeetingTypeDisplay = () => {
    if (link.meetingType === 'zoom') return 'Zoom';
    if (link.meetingType === 'custom') return 'Custom Meeting URL';
    if (link.location) return link.location;
    return 'In-person meeting';
  };

  // Get meeting format (One-on-One, Group, etc.)
  const getMeetingFormat = () => {
    // You can extend this based on your schema
    return 'One-on-One';
  };

  const handleCopyLink = async () => {
    if (onCopyLink) {
      onCopyLink(link.slug);
    } else {
      // Fallback: copy link directly
      try {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const url = `${protocol}//${hostname}${port}/booking/${link.slug}`;

        await navigator.clipboard.writeText(url);
        toast({
          title: 'Link Copied',
          description: 'Booking link copied to clipboard',
        });
      } catch (error) {
        console.error('Error copying link:', error);
        toast({
          title: 'Error',
          description: 'Could not copy booking link',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div
      className={`group relative flex items-center bg-white border border-neutral-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-shadow ${borderColor} border-l-4`}
    >
      {/* Checkbox */}
      <div className="pl-4 pr-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect?.(checked as boolean)}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 py-4 pr-4">
        {/* Title Row */}
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-slate-100">
            {link.title}
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 mr-1"></span>
            Active
          </span>
        </div>

        {/* Info Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-slate-400">
          <span>
            {link.duration >= 60
              ? `${Math.floor(link.duration / 60)} hr${link.duration >= 120 ? 's' : ''}${link.duration % 60 ? ` ${link.duration % 60} min` : ''}`
              : `${link.duration} min`
            }
          </span>
          <span>•</span>
          <span>{getMeetingTypeDisplay()}</span>
          <span>•</span>
          <span>{getMeetingFormat()}</span>
        </div>

        {/* Availability */}
        <div className="mt-2 text-sm text-neutral-600 dark:text-slate-400">
          {formatDays()}, {formatHours()}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pr-4">
        {/* Copy Link Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          <span>Copy link</span>
        </Button>

        {/* More Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(link)} className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
              <Share2 className="mr-2 h-4 w-4" />
              <span>Share</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  const protocol = window.location.protocol;
                  const hostname = window.location.hostname;
                  const port = window.location.port ? `:${window.location.port}` : '';

                  // Get current user to build the custom path
                  const response = await fetch('/api/users/current');
                  if (response.ok) {
                    const currentUser = await response.json();
                    let userPath = '';

                    if (currentUser.firstName && currentUser.lastName) {
                      userPath = `${currentUser.firstName.toLowerCase()}.${currentUser.lastName.toLowerCase()}`;
                    } else if (currentUser.displayName && currentUser.displayName.includes(' ')) {
                      const nameParts = currentUser.displayName.split(' ');
                      if (nameParts.length >= 2) {
                        userPath = `${nameParts[0].toLowerCase()}.${nameParts[nameParts.length - 1].toLowerCase()}`;
                      }
                    }

                    if (!userPath) {
                      userPath = currentUser.username.toLowerCase();
                    }

                    const url = `${protocol}//${hostname}${port}/${userPath}/booking/${link.slug}`;
                    window.open(url, '_blank');
                  } else {
                    // Fallback to legacy URL
                    const url = `${protocol}//${hostname}${port}/booking/${link.slug}`;
                    window.open(url, '_blank');
                  }
                } catch (error) {
                  console.error('Error opening booking page:', error);
                  // Fallback to legacy URL
                  const protocol = window.location.protocol;
                  const hostname = window.location.hostname;
                  const port = window.location.port ? `:${window.location.port}` : '';
                  const url = `${protocol}//${hostname}${port}/booking/${link.slug}`;
                  window.open(url, '_blank');
                }
              }}
              className="cursor-pointer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              <span>View booking page</span>
            </DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuItem
                  onClick={() => onDelete(link.id)}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
