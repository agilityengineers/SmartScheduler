import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import {
  Vote, Plus, Copy, Trash2, Users, Calendar, Clock, CheckCircle, XCircle, BarChart3
} from 'lucide-react';

interface PollOption {
  startTime: string;
  endTime: string;
}

interface MeetingPoll {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  duration: number;
  status: string;
  deadline: string | null;
  timezone: string;
  selectedOptionId: number | null;
  optionCount: number;
  voteCount: number;
  uniqueVoters: number;
  createdAt: string;
}

export default function MeetingPolls() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [options, setOptions] = useState<{ date: Date | null; time: Date | null }[]>([
    { date: null, time: null },
    { date: null, time: null },
  ]);

  const { data: polls = [], isLoading } = useQuery<MeetingPoll[]>({
    queryKey: ['/api/meeting-polls'],
  });

  const createPoll = useMutation({
    mutationFn: async () => {
      const pollOptions: PollOption[] = options
        .filter(o => o.date && o.time)
        .map(o => {
          const d = o.date!;
          const t = o.time!;
          const start = new Date(d);
          start.setHours(t.getHours(), t.getMinutes(), 0, 0);
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + duration);
          return {
            startTime: start.toISOString(),
            endTime: end.toISOString(),
          };
        });

      if (pollOptions.length < 2) {
        throw new Error('At least 2 time options are required');
      }

      const res = await apiRequest('POST', '/api/meeting-polls', {
        title,
        description: description || undefined,
        duration,
        location: location || undefined,
        deadline: deadline?.toISOString() || undefined,
        options: pollOptions,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Poll Created', description: 'Share the link to collect votes.' });
      setShowCreateModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-polls'] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deletePoll = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/meeting-polls/${id}`, null);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Meeting poll deleted.' });
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-polls'] });
    },
  });

  const closePoll = useMutation({
    mutationFn: async ({ id, selectedOptionId }: { id: number; selectedOptionId?: number }) => {
      const res = await apiRequest('PUT', `/api/meeting-polls/${id}`, {
        status: 'closed',
        ...(selectedOptionId && { selectedOptionId }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Poll Closed', description: 'The poll has been closed.' });
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-polls'] });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDuration(30);
    setLocation('');
    setDeadline(null);
    setOptions([{ date: null, time: null }, { date: null, time: null }]);
  };

  const addOption = () => {
    setOptions([...options, { date: null, time: null }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: 'date' | 'time', value: Date | null) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const copyPollLink = (slug: string) => {
    const url = `${window.location.origin}/poll/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied', description: 'Poll link copied to clipboard.' });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={() => setIsCreateEventModalOpen(true)} />
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="border-b border-neutral-300 p-4 flex items-center justify-between bg-white">
            <h1 className="text-xl font-semibold text-neutral-700 flex items-center gap-2">
              <Vote className="h-5 w-5" />
              Meeting Polls
            </h1>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Poll
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-neutral-500">Loading polls...</p>
              </div>
            ) : polls.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Vote className="h-16 w-16 text-neutral-400 mb-2" />
                <h2 className="text-lg font-medium text-neutral-600 mb-1">No meeting polls yet</h2>
                <p className="text-neutral-500 mb-4">
                  Create a poll to let participants vote on their preferred meeting times
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Poll
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {polls.map((poll) => (
                  <Card key={poll.id}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{poll.title}</CardTitle>
                          {poll.description && (
                            <CardDescription className="line-clamp-2 mt-1">
                              {poll.description}
                            </CardDescription>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(poll.status)}`}>
                          {poll.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2">
                      <div className="flex items-center text-sm text-neutral-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {poll.duration} minutes
                      </div>
                      <div className="flex items-center text-sm text-neutral-600">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        {poll.optionCount} options
                      </div>
                      <div className="flex items-center text-sm text-neutral-600">
                        <Users className="h-4 w-4 mr-2" />
                        {poll.uniqueVoters} voter{poll.uniqueVoters !== 1 ? 's' : ''} ({poll.voteCount} votes)
                      </div>
                      {poll.deadline && (
                        <div className="flex items-center text-sm text-neutral-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Deadline: {format(new Date(poll.deadline), 'MMM d, yyyy')}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyPollLink(poll.slug)}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Link
                      </Button>
                      <div className="flex gap-2">
                        {poll.status === 'open' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => closePoll.mutate({ id: poll.id })}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Close
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deletePoll.mutate(poll.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNavigation onCreateEventClick={() => setIsCreateEventModalOpen(true)} />

      {/* Create Poll Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Meeting Poll</DialogTitle>
            <DialogDescription>
              Propose time options and share the link so participants can vote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Poll Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Team standup reschedule"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this meeting about?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration</Label>
                <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Voting Deadline</Label>
                <DatePicker
                  selected={deadline}
                  onChange={(date) => setDeadline(date)}
                  dateFormat="MMM d, yyyy"
                  placeholderText="Optional"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  minDate={new Date()}
                />
              </div>
            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Zoom, office, etc."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Time Options (at least 2) *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                    <DatePicker
                      selected={opt.date}
                      onChange={(date) => updateOption(idx, 'date', date)}
                      dateFormat="MMM d, yyyy"
                      placeholderText="Date"
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      minDate={new Date()}
                    />
                    <DatePicker
                      selected={opt.time}
                      onChange={(date) => updateOption(idx, 'time', date)}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeFormat="h:mm aa"
                      dateFormat="h:mm aa"
                      placeholderText="Time"
                      className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(idx)}
                        className="text-red-500 hover:text-red-700 px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => createPoll.mutate()}
              disabled={createPoll.isPending || !title}
            >
              {createPoll.isPending ? 'Creating...' : 'Create Poll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
      />
    </div>
  );
}
