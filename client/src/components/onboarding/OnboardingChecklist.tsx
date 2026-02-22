import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Check, Calendar, Link as LinkIcon, Clock, User } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useUser } from '@/context/UserContext';

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface OnboardingChecklistProps {
  onDismiss?: () => void;
}

export default function OnboardingChecklist({ onDismiss }: OnboardingChecklistProps) {
  const { user } = useUser();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if onboarding is completed or dismissed
  const { data: onboardingStatus } = useQuery({
    queryKey: ['/api/user/onboarding-progress'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/user/onboarding-progress');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch data to determine task completion
  const { data: bookingLinks = [] } = useQuery({
    queryKey: ['/api/booking'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/booking');
      return response.json();
    },
    enabled: !!user,
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ['/api/integrations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/integrations');
      return response.json();
    },
    enabled: !!user,
  });

  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings');
      return response.json();
    },
    enabled: !!user,
  });

  // Update onboarding progress
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { dismissed?: boolean; completed?: boolean }) => {
      await apiRequest('PATCH', '/api/user/onboarding-progress', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/onboarding-progress'] });
    },
  });

  // Check if integrations are connected
  const hasConnectedCalendar = Array.isArray(integrations) && integrations.some(
    (integration: any) => integration.isConnected
  );

  // Check if booking links exist
  const hasBookingLink = Array.isArray(bookingLinks) && bookingLinks.length > 0;

  // Check if availability is set (workingHours is a JSONB object with keys 0-6 for days)
  const hasSetAvailability = settings && settings.workingHours && Object.keys(settings.workingHours).length > 0;

  // Check if profile is customized
  const hasCustomizedProfile = user && (user.profilePicture || user.bio);

  // Define tasks
  const tasks: OnboardingTask[] = [
    {
      id: 'connect-calendar',
      title: 'Connect your first calendar',
      description: 'Sync your Google, Outlook, or iCal calendar',
      link: '/integrations',
      icon: <Calendar className="h-5 w-5" />,
      completed: hasConnectedCalendar,
    },
    {
      id: 'create-booking-link',
      title: 'Create your first booking link',
      description: 'Set up a scheduling link for others to book time',
      link: '/booking',
      icon: <LinkIcon className="h-5 w-5" />,
      completed: hasBookingLink,
    },
    {
      id: 'set-availability',
      title: 'Set your availability',
      description: 'Configure your working hours and preferences',
      link: '/availability',
      icon: <Clock className="h-5 w-5" />,
      completed: hasSetAvailability,
    },
    {
      id: 'customize-profile',
      title: 'Customize your profile',
      description: 'Add a photo and bio to personalize your page',
      link: '/profile',
      icon: <User className="h-5 w-5" />,
      completed: hasCustomizedProfile,
    },
  ];

  const completedTasks = tasks.filter((task) => task.completed).length;
  const totalTasks = tasks.length;
  const progress = (completedTasks / totalTasks) * 100;
  const allCompleted = completedTasks === totalTasks;

  // Auto-dismiss when all tasks completed
  useEffect(() => {
    if (allCompleted && !onboardingStatus?.completed) {
      updateProgressMutation.mutate({ completed: true });
    }
  }, [allCompleted]);

  // Handle manual dismiss
  const handleDismiss = () => {
    setIsDismissed(true);
    updateProgressMutation.mutate({ dismissed: true });
    if (onDismiss) {
      onDismiss();
    }
  };

  // Don't show if dismissed or all completed
  if (isDismissed || onboardingStatus?.dismissed || allCompleted) {
    return null;
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 shadow-2xl z-50 border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Getting Started</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-slate-400 mb-2">
            <span>
              {completedTasks} of {totalTasks} completed
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <Link key={task.id} href={task.link}>
            <div
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                task.completed
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-750'
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  task.completed
                    ? 'bg-green-500 text-white'
                    : 'bg-neutral-200 dark:bg-slate-700 text-neutral-600 dark:text-slate-400'
                }`}
              >
                {task.completed ? <Check className="h-5 w-5" /> : task.icon}
              </div>

              <div className="flex-1 min-w-0">
                <h4
                  className={`font-medium text-sm ${
                    task.completed
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-neutral-900 dark:text-slate-100'
                  }`}
                >
                  {task.title}
                </h4>
                <p
                  className={`text-xs mt-0.5 ${
                    task.completed
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-neutral-500 dark:text-slate-400'
                  }`}
                >
                  {task.description}
                </p>
              </div>
            </div>
          </Link>
        ))}

        {completedTasks > 0 && completedTasks < totalTasks && (
          <Button
            variant="link"
            onClick={handleDismiss}
            className="w-full text-sm text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            Remind me later
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
