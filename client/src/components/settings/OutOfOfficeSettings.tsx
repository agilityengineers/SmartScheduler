import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Calendar, ArrowRight } from 'lucide-react';

interface OutOfOfficeEntry {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  redirectToUserId: number | null;
  redirectToBookingLinkSlug: string | null;
  message: string | null;
  isActive: boolean;
}

export default function OutOfOfficeSettings() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [redirectSlug, setRedirectSlug] = useState('');

  const { data: entries = [], isLoading } = useQuery<OutOfOfficeEntry[]>({
    queryKey: ['/api/out-of-office'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/out-of-office', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/out-of-office'] });
      setShowForm(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      setMessage('');
      setRedirectSlug('');
      toast({ title: 'Out-of-office created', description: 'Your availability has been updated.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/out-of-office/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/out-of-office'] });
      toast({ title: 'Entry removed' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest('PUT', `/api/out-of-office/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/out-of-office'] });
    },
  });

  const handleCreate = () => {
    if (!startDate || !endDate) {
      toast({ title: 'Error', description: 'Start and end dates are required', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      startDate,
      endDate,
      reason: reason || null,
      message: message || null,
      redirectToBookingLinkSlug: redirectSlug || null,
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Out of Office
        </CardTitle>
        <CardDescription>
          Set dates when you're unavailable. Optionally redirect bookers to a teammate's booking link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : entries.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">No out-of-office entries configured.</p>
        ) : null}

        {entries.map((entry) => {
          const isCurrentlyOOO = entry.isActive && entry.startDate <= today && entry.endDate >= today;
          return (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                isCurrentlyOOO ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {entry.startDate} <ArrowRight className="inline h-3 w-3" /> {entry.endDate}
                  </span>
                  {isCurrentlyOOO && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      Currently active
                    </span>
                  )}
                </div>
                {entry.reason && (
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.reason}</p>
                )}
                {entry.message && (
                  <p className="text-xs text-gray-500 mt-0.5 italic">"{entry.message}"</p>
                )}
                {entry.redirectToBookingLinkSlug && (
                  <p className="text-xs text-blue-600 mt-0.5">
                    Redirecting to: {entry.redirectToBookingLinkSlug}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={entry.isActive}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: entry.id, isActive: checked })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(entry.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          );
        })}

        {showForm && (
          <div className="border rounded-lg p-4 space-y-3 bg-white">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={today}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || today}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Vacation, Conference"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Message to bookers (optional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g., I'm on vacation until March 25. Please book with my colleague instead."
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Redirect to booking link slug (optional)</Label>
              <Input
                value={redirectSlug}
                onChange={(e) => setRedirectSlug(e.target.value)}
                placeholder="e.g., colleague-30min"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a teammate's booking link slug to redirect bookers there while you're away
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showForm && (
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Out-of-Office Period
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
