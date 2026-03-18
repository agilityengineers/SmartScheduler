import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, Plus, Globe, CheckCircle, Clock, AlertCircle, Copy } from 'lucide-react';

interface CustomDomain {
  id: number;
  domain: string;
  isVerified: boolean;
  verificationMethod: string;
  verificationToken: string | null;
  sslStatus: string;
  isActive: boolean;
  dnsInstructions?: {
    type: string;
    name: string;
    value: string;
    note: string;
  };
}

export default function CustomBookingDomains() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [domain, setDomain] = useState('');

  const { data: domains = [], isLoading } = useQuery<CustomDomain[]>({
    queryKey: ['/api/custom-booking-domains'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { domain: string }) => {
      const res = await apiRequest('POST', '/api/custom-booking-domains', data);
      return res.json();
    },
    onSuccess: (data: CustomDomain) => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-booking-domains'] });
      setShowForm(false);
      setDomain('');
      toast({
        title: 'Domain added',
        description: `Configure your DNS to verify ${data.domain}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/custom-booking-domains/${id}/verify`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-booking-domains'] });
      toast({ title: 'Domain verified and activated!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/custom-booking-domains/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-booking-domains'] });
      toast({ title: 'Domain removed' });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Custom Booking Domains
        </CardTitle>
        <CardDescription>
          Use your own domain (e.g., book.yourcompany.com) for booking pages instead of the default SmartScheduler URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : domains.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">No custom booking domains configured.</p>
        ) : null}

        {domains.map((d) => (
          <div key={d.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{d.domain}</span>
                {d.isActive ? (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3" /> Active
                  </span>
                ) : d.isVerified ? (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    <Clock className="h-3 w-3" /> SSL Pending
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    <AlertCircle className="h-3 w-3" /> Unverified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!d.isVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => verifyMutation.mutate(d.id)}
                    disabled={verifyMutation.isPending}
                  >
                    Verify
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(d.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>

            {!d.isVerified && d.verificationToken && (
              <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                <p className="font-medium text-gray-700">DNS Setup Required:</p>
                <p className="text-gray-600">
                  Add a <code className="bg-gray-200 px-1 rounded">CNAME</code> record:
                </p>
                <div className="flex items-center gap-2 bg-white border rounded p-2 font-mono text-xs">
                  <span className="flex-1">{d.domain} → booking.smartscheduler.app</span>
                  <button
                    onClick={() => copyToClipboard('booking.smartscheduler.app')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  After adding the DNS record, click "Verify" to activate your custom domain.
                </p>
              </div>
            )}
          </div>
        ))}

        {showForm && (
          <div className="border rounded-lg p-4 space-y-3 bg-white">
            <div>
              <Label>Custom Domain</Label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="book.yourcompany.com"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the subdomain you want to use for booking pages
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate({ domain })}
                disabled={createMutation.isPending || !domain}
              >
                {createMutation.isPending ? 'Adding...' : 'Add Domain'}
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
            Add Custom Domain
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
