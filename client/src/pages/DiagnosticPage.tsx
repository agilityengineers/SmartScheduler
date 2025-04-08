import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DiagnosticPage() {
  const { toast } = useToast();
  const [slug, setSlug] = useState('virtual-coffee');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testBookingApi = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/public/booking/${slug}`);
      const data = await res.json();
      setResponse(data);
      
      console.log('API Response:', data);
      toast({
        title: 'Success',
        description: 'API returned data successfully',
      });
    } catch (err) {
      console.error('Error testing API:', err);
      setError((err as Error).message);
      toast({
        title: 'Error',
        description: 'Failed to test API',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Booking API Diagnostic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={slug} 
                onChange={(e) => setSlug(e.target.value)} 
                placeholder="booking-slug"
                className="max-w-sm"
              />
              <Button onClick={testBookingApi} disabled={loading}>
                {loading ? 'Testing...' : 'Test API'}
              </Button>
            </div>
            
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-md">
                {error}
              </div>
            )}
            
            {response && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">API Response:</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}