import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

export default function EmailTester() {
  const [emailType, setEmailType] = useState('default');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendTestEmail = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('/api/test/send-email', { 
        emailType,
        recipientEmail: recipientEmail.trim() || undefined
      });
      
      toast({
        title: 'Email sent successfully',
        description: 'Check your inbox for the test email',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Failed to send email',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notification Tester</CardTitle>
        <CardDescription>
          Test the email notification system by sending yourself a test email.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Type</label>
            <Select value={emailType} onValueChange={setEmailType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select email type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Simple Test Email</SelectItem>
                <SelectItem value="reminder">Event Reminder</SelectItem>
                <SelectItem value="booking">Booking Confirmation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Recipient Email (optional)</label>
            <Input
              type="email"
              placeholder="Enter email address to send to"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use your account email
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={sendTestEmail} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send Test Email'}
        </Button>
      </CardFooter>
    </Card>
  );
}