import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, ArrowRight, ExternalLink, MessageSquare, Calendar } from 'lucide-react';

interface Question {
  id: number;
  label: string;
  type: string;
  options: string[];
  isRequired: boolean;
  orderIndex: number;
}

interface FormData {
  id: number;
  title: string;
  description: string | null;
  questions: Question[];
  ownerName: string;
}

interface RoutingResult {
  action: string;
  bookingLinkId?: number;
  bookingLinkSlug?: string;
  bookingLinkTitle?: string;
  ownerName?: string;
  url?: string;
  message?: string;
}

export function PublicRoutingForm({ slug }: { slug: string }) {
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RoutingResult | null>(null);

  useEffect(() => {
    fetch(`/api/public/routing/form/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Form not found');
        return res.json();
      })
      .then(data => {
        setForm(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  const handleSubmit = async () => {
    if (!form) return;

    // Validate required fields
    for (const q of form.questions) {
      if (q.isRequired && !answers[String(q.id)]) {
        setError(`Please answer: "${q.label}"`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/routing/form/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, email, name }),
      });

      if (!res.ok) throw new Error('Submission failed');
      const data = await res.json();
      setResult(data);

      // Auto-redirect for URL actions
      if (data.action === 'route_to_url' && data.url) {
        setTimeout(() => {
          window.location.href = data.url;
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateAnswer = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [String(questionId)]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-500">Loading form...</p>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <GitBranch className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-neutral-600">Form Not Found</h2>
            <p className="text-neutral-500 mt-2">This routing form doesn't exist or has been deactivated.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            {result.action === 'route_to_booking' && (
              <>
                <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-lg font-semibold">Schedule Your Meeting</h2>
                <p className="text-neutral-500 mt-2 mb-4">
                  Based on your answers, we've matched you with: <strong>{result.bookingLinkTitle}</strong>
                  {result.ownerName && ` with ${result.ownerName}`}
                </p>
                <Button asChild>
                  <a href={`/booking/${result.bookingLinkSlug}`}>
                    <ArrowRight className="h-4 w-4 mr-2" /> Book Now
                  </a>
                </Button>
              </>
            )}
            {result.action === 'route_to_url' && (
              <>
                <ExternalLink className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-lg font-semibold">Redirecting...</h2>
                <p className="text-neutral-500 mt-2 mb-4">
                  You'll be redirected shortly. If not, click below.
                </p>
                <Button asChild>
                  <a href={result.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Go Now
                  </a>
                </Button>
              </>
            )}
            {result.action === 'show_message' && (
              <>
                <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-lg font-semibold">Thank You</h2>
                <p className="text-neutral-600 mt-2">{result.message}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{form.title}</CardTitle>
            {form.description && <CardDescription>{form.description}</CardDescription>}
            <p className="text-xs text-neutral-400 mt-1">by {form.ownerName}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {form.questions
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((q) => (
                  <div key={q.id}>
                    <Label className="text-sm font-medium">
                      {q.label}
                      {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {q.type === 'text' && (
                      <Input
                        className="mt-1"
                        placeholder="Type your answer..."
                        value={answers[String(q.id)] || ''}
                        onChange={(e) => updateAnswer(q.id, e.target.value)}
                      />
                    )}
                    {q.type === 'select' && (
                      <Select
                        value={answers[String(q.id)] || ''}
                        onValueChange={(val) => updateAnswer(q.id, val)}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select an option" /></SelectTrigger>
                        <SelectContent>
                          {(q.options || []).map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {q.type === 'radio' && (
                      <div className="mt-2 space-y-2">
                        {(q.options || []).map((opt) => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={opt}
                              checked={answers[String(q.id)] === opt}
                              onChange={() => updateAnswer(q.id, opt)}
                              className="accent-primary"
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.type === 'checkbox' && (
                      <div className="mt-2 space-y-2">
                        {(q.options || []).map((opt) => {
                          const current = answers[String(q.id)] || '';
                          const selected = current.split(',').filter(Boolean);
                          const isChecked = selected.includes(opt);
                          return (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const newSelected = isChecked
                                    ? selected.filter(s => s !== opt)
                                    : [...selected, opt];
                                  updateAnswer(q.id, newSelected.join(','));
                                }}
                                className="accent-primary"
                              />
                              <span className="text-sm">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

              <div className="border-t pt-4 space-y-3">
                <div>
                  <Label className="text-sm">Your Name (optional)</Label>
                  <Input
                    className="mt-1"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">Your Email (optional)</Label>
                  <Input
                    className="mt-1"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
