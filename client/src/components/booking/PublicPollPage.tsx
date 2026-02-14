import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { Check, Clock, MapPin, User, Vote, Users } from 'lucide-react';

interface PollOptionVote {
  id: number;
  startTime: string;
  endTime: string;
  yesCount: number;
  noCount: number;
  ifNeededCount: number;
  voters: { name: string; email: string; vote: string }[];
}

interface PollData {
  id: number;
  title: string;
  description: string | null;
  duration: number;
  location: string | null;
  status: string;
  deadline: string | null;
  timezone: string;
  selectedOptionId: number | null;
  ownerName: string;
  options: PollOptionVote[];
  uniqueVoters: number;
}

export function PublicPollPage({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voterName, setVoterName] = useState('');
  const [voterEmail, setVoterEmail] = useState('');
  const [votes, setVotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchPoll() {
      try {
        const res = await fetch(`/api/public/poll/${slug}`);
        if (!res.ok) throw new Error('Poll not found');
        const data = await res.json();
        setPoll(data);
        // Initialize votes with 'no' for all options
        const initialVotes: Record<number, string> = {};
        data.options.forEach((opt: PollOptionVote) => { initialVotes[opt.id] = 'no'; });
        setVotes(initialVotes);
      } catch {
        setError('This poll could not be found.');
      } finally {
        setLoading(false);
      }
    }
    fetchPoll();
  }, [slug]);

  const toggleVote = (optionId: number) => {
    setVotes(prev => {
      const current = prev[optionId];
      const next = current === 'yes' ? 'if_needed' : current === 'if_needed' ? 'no' : 'yes';
      return { ...prev, [optionId]: next };
    });
  };

  const handleSubmit = async () => {
    if (!voterName.trim() || !voterEmail.trim()) {
      toast({ title: 'Required', description: 'Please enter your name and email.', variant: 'destructive' });
      return;
    }

    const voteEntries = Object.entries(votes)
      .filter(([_, vote]) => vote !== 'no')
      .map(([optionId, vote]) => ({ optionId: parseInt(optionId), vote }));

    if (voteEntries.length === 0) {
      toast({ title: 'No votes', description: 'Please select at least one time option.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/poll/${slug}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterName, voterEmail, votes: voteEntries }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit votes');
      }

      setSubmitted(true);
      toast({ title: 'Votes Submitted', description: 'Your availability has been recorded.' });

      // Refresh poll data
      const refreshRes = await fetch(`/api/public/poll/${slug}`);
      if (refreshRes.ok) setPoll(await refreshRes.json());
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const voteButtonStyle = (vote: string) => {
    switch (vote) {
      case 'yes': return 'bg-green-500 text-white border-green-500';
      case 'if_needed': return 'bg-yellow-400 text-white border-yellow-400';
      default: return 'bg-white text-gray-600 border-gray-200 hover:border-gray-400';
    }
  };

  const voteLabel = (vote: string) => {
    switch (vote) {
      case 'yes': return 'Yes';
      case 'if_needed': return 'If needed';
      default: return 'No';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Vote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Poll Not Found</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isClosed = poll.status !== 'open';
  const isDeadlinePassed = poll.deadline ? new Date(poll.deadline) < new Date() : false;
  const canVote = !isClosed && !isDeadlinePassed;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Poll Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Vote className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">{poll.title}</h1>
                <p className="text-sm text-gray-500">by {poll.ownerName}</p>
              </div>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
              }`}>
                {poll.status}
              </span>
            </div>

            {poll.description && <p className="text-gray-600 mb-3">{poll.description}</p>}

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {poll.duration} min
              </div>
              {poll.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {poll.location}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {poll.uniqueVoters} voter{poll.uniqueVoters !== 1 ? 's' : ''}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Options */}
        <div className="space-y-3 mb-6">
          {poll.options.map((opt) => {
            const startDate = parseISO(opt.startTime);
            const isSelected = poll.selectedOptionId === opt.id;
            return (
              <Card key={opt.id} className={isSelected ? 'ring-2 ring-primary' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">
                        {format(startDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(startDate, 'h:mm a')} - {format(parseISO(opt.endTime), 'h:mm a')}
                      </p>
                      {isSelected && (
                        <span className="text-xs text-primary font-medium flex items-center gap-1 mt-1">
                          <Check className="w-3 h-3" /> Selected time
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Vote counts */}
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                          <span className="text-sm font-medium">{opt.yesCount}</span>
                        </div>
                      </div>
                      {opt.ifNeededCount > 0 && (
                        <div className="text-center">
                          <div className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded-full bg-yellow-400"></span>
                            <span className="text-sm font-medium">{opt.ifNeededCount}</span>
                          </div>
                        </div>
                      )}

                      {/* Vote button */}
                      {canVote && !submitted && (
                        <button
                          onClick={() => toggleVote(opt.id)}
                          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${voteButtonStyle(votes[opt.id] || 'no')}`}
                        >
                          {voteLabel(votes[opt.id] || 'no')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Voter names */}
                  {opt.voters.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {opt.voters.map((v, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            v.vote === 'yes' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {v.name}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Vote Form */}
        {canVote && !submitted && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold">Your Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={voterEmail}
                    onChange={(e) => setVoterEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span> Yes
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-yellow-400"></span> If needed
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-gray-200"></span> No
                </div>
                <span className="text-gray-400">Click time options to cycle through votes</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Votes'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {submitted && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">Votes Submitted!</h3>
              <p className="text-gray-600">Thank you for voting. The organizer will select the best time.</p>
              <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); }}>
                Update My Votes
              </Button>
            </CardContent>
          </Card>
        )}

        {isClosed && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600">This poll is closed and no longer accepting votes.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
