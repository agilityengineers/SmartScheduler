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
  
  // Extract token from URL
  const params = new URLSearchParams(location.split('?')[1]);
  const token = params.get('token');
  
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false);
        setLoading(false);
        return;
      }
      
      try {
        console.log('Validating token...');
        const response = await apiRequest('GET', `/api/reset-password/validate?token=${token}`);
        const data = await response.json();
        
        console.log('Token validation response:', data);
        
        setTokenValid(data.valid);
        
        // If token is invalid, store the specific error message
        if (!data.valid && data.message) {
          setError(data.message);
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
    if (!token) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/reset-password/reset', {
        token,
        password: data.password,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
      } else {
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