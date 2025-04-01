import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [location, setLocation] = useLocation();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('Verifying your email...');
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (!token) {
          setVerifying(false);
          setSuccess(false);
          setMessage('No verification token found. Please check your email link.');
          return;
        }
        
        // Call the API to verify the email
        const response = await fetch(`/api/verify-email?token=${token}`);
        
        if (response.redirected) {
          // If the server redirected, follow the redirect
          window.location.href = response.url;
          return;
        }
        
        // Handle JSON response
        const result = await response.json();
        
        setVerifying(false);
        
        if (response.ok) {
          setSuccess(true);
          setMessage('Your email has been successfully verified. You can now log in.');
        } else {
          setSuccess(false);
          setMessage(result.message || 'Verification failed. Please try again or request a new verification email.');
        }
      } catch (error) {
        setVerifying(false);
        setSuccess(false);
        setMessage('An error occurred during verification. Please try again later.');
        console.error('Verification error:', error);
      }
    };
    
    verifyEmail();
  }, []);
  
  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Email Verification</CardTitle>
          <CardDescription className="text-center">
            {verifying ? 'Verifying your email address...' : success ? 'Verification successful!' : 'Verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verifying ? (
            <div className="flex flex-col items-center justify-center p-6">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-center text-muted-foreground">Please wait while we verify your email address...</p>
            </div>
          ) : success ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-700">{message}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {!verifying && (
            <Button
              onClick={() => setLocation('/login')}
              className="w-full"
            >
              Go to Login
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}