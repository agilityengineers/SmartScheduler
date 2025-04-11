import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Form schema for setting new password
const setNewPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetNewPasswordFormValues = z.infer<typeof setNewPasswordSchema>;

export default function SetNewPassword() {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  
  // Extract token from URL with comprehensive error handling
  useEffect(() => {
    let extractedToken = '';
    
    try {
      console.log('Current URL path:', location);
      console.log('Full URL:', window.location.href);
      
      // Method 1: Standard URLSearchParams from current location
      if (location.includes('?')) {
        console.log('Extracting token using URLSearchParams from location');
        const queryString = location.split('?')[1];
        if (queryString) {
          const params = new URLSearchParams(queryString);
          const urlToken = params.get('token');
          
          if (urlToken) {
            console.log(`Token found via URLSearchParams (Method 1): ${urlToken.substring(0, 10)}...`);
            extractedToken = urlToken;
          }
        }
      }
      
      // Method 2: Use window.location directly (browser API)
      if (!extractedToken && window.location.search) {
        console.log('Method 1 failed. Trying window.location.search');
        const searchParams = new URLSearchParams(window.location.search);
        const searchToken = searchParams.get('token');
        
        if (searchToken) {
          console.log(`Token found via window.location.search (Method 2): ${searchToken.substring(0, 10)}...`);
          extractedToken = searchToken;
        }
      }
      
      // Method 3: Manual extraction using regex as last resort
      if (!extractedToken) {
        console.log('Methods 1-2 failed. Trying regex extraction as last resort');
        const fullUrl = window.location.href;
        const tokenMatch = fullUrl.match(/[?&]token=([^&#]+)/);
        
        if (tokenMatch && tokenMatch[1]) {
          // Handle URL encoding if present
          let regexToken = tokenMatch[1];
          
          // Decode if needed
          try {
            if (regexToken.includes('%')) {
              const decodedToken = decodeURIComponent(regexToken);
              console.log('Decoded URL-encoded token');
              regexToken = decodedToken;
            }
          } catch (decodeErr) {
            console.error('Error decoding token:', decodeErr);
          }
          
          console.log(`Token found via regex (Method 3): ${regexToken.substring(0, 10)}...`);
          extractedToken = regexToken;
        }
      }
      
      // Clean and store the token
      if (extractedToken) {
        // Clean the token by removing any leading/trailing whitespace
        const cleanToken = extractedToken.trim();
        console.log(`Final cleaned token: ${cleanToken.substring(0, 10)}...`);
        console.log(`Token length: ${cleanToken.length}`);
        
        setToken(cleanToken);
      } else {
        console.log('Failed to extract token from URL');
        setToken('');
        setTokenValid(false);
        setLoading(false);
        setError('No reset token found in URL. Please request a new password reset link.');
      }
    } catch (err) {
      console.error('Critical error parsing token from URL:', err);
      setToken('');
      setTokenValid(false);
      setLoading(false);
      setError('Error processing password reset link. Please request a new one.');
    }
  }, [location]);
  
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false);
        setLoading(false);
        setError('No token provided in URL. Please request a new password reset link.');
        return;
      }
      
      try {
        // Add debug logging to trace what's happening
        console.log('Validating token...', token.substring(0, 10) + '...');
        
        // First try with URLSearchParams approach
        const validateUrl = `/api/reset-password/validate?token=${encodeURIComponent(token.trim())}`;
        console.log('Validation URL:', validateUrl);
        
        const response = await apiRequest('GET', validateUrl);
        const data = await response.json();
        
        console.log('Token validation response:', data);
        
        if (data.valid === true) {
          console.log('Token is valid! User can reset password');
          setTokenValid(true);
        } else {
          console.log('Token validation failed with status:', data.status);
          setTokenValid(false);
          
          // If token is invalid, store the specific error message
          if (data.message) {
            setError(data.message);
          } else {
            setError('The password reset link is invalid or has expired. Please request a new one.');
          }
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setTokenValid(false);
        
        if (err instanceof Error) {
          if (err.message.includes('Failed to fetch')) {
            setError('Unable to connect to the server. Please check your internet connection and try again.');
          } else {
            setError(err.message || 'Invalid or expired token');
          }
        } else {
          setError('Invalid or expired token');
        }
        
        // Add additional error details for debugging
        console.error('Error details:', JSON.stringify(err));
      } finally {
        setLoading(false);
      }
    };
    
    validateToken();
  }, [token]);
  
  const { register, handleSubmit, formState: { errors } } = useForm<SetNewPasswordFormValues>({
    resolver: zodResolver(setNewPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    }
  });
  
  const onSubmit = async (data: SetNewPasswordFormValues) => {
    if (!token) {
      setError('No token provided. Please request a new password reset link.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log('Submitting password reset with token:', token.substring(0, 10) + '...');
      
      // Make sure we're using the trimmed token value
      const trimmedToken = token.trim();
      
      const response = await apiRequest('POST', '/api/reset-password/reset', {
        token: trimmedToken,
        password: data.password,
      });
      
      console.log('Password reset response status:', response.status);
      const result = await response.json();
      console.log('Password reset response:', result);
      
      if (result.success) {
        console.log('Password reset successful!');
        setSuccess(true);
      } else {
        console.log('Password reset failed with status:', result.status);
        
        // Handle specific error types from the enhanced API
        if (result.status === 'expired') {
          setError(`Your password reset link has expired. Please request a new one.`);
        } else if (result.status === 'consumed') {
          setError(`This password reset link has already been used. Please request a new one if needed.`);
        } else if (result.status === 'not_found') {
          setError(`Invalid password reset link. Please request a new one.`);
        } else {
          // Use the server's detailed error message if available
          setError(result.message || 'Failed to reset password. Please try again.');
        }
      }
    } catch (err) {
      console.error('Password reset error:', err);
      
      // Attempt to extract more detailed error information
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          setError('Unable to connect to the server. Please check your internet connection and try again.');
        } else {
          setError(err.message || 'Failed to reset password');
        }
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
      
      // Log additional error details for debugging
      console.error('Error details:', JSON.stringify(err));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-8">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <div className="text-center">
              <p>Validating your reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (tokenValid === false) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'The password reset link is invalid or has expired. Please request a new one.'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => navigate('/reset-password')} 
              className="w-full"
            >
              Request New Reset Link
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
          <CardDescription className="text-center">
            Please enter your new password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Your password has been successfully reset. You can now log in with your new password.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your new password" 
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="Confirm your new password" 
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}