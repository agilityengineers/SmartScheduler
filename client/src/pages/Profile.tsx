import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { useUser } from '@/context/UserContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { user, setUser } = useUser();
  const { toast } = useToast();
  const [bio, setBio] = useState(user?.bio || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName?: string; email?: string; bio?: string }) => {
      const response = await apiRequest('PATCH', `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      if (setUser && user) {
        setUser({
          ...user,
          displayName: data.displayName || user.displayName,
          email: data.email || user.email,
          bio: data.bio || user.bio
        });
      }
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      displayName,
      email,
      bio
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal information and how it appears to others.
          </p>
        </div>

        <Tabs defaultValue="photo" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="photo">Profile Photo</TabsTrigger>
            <TabsTrigger value="info">Personal Info</TabsTrigger>
          </TabsList>
          
          <TabsContent value="photo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>
                  Choose how you appear to others. You can upload a photo, generate an AI avatar, or use a colored background with your initials.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileEditor />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details. This information will be used across the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input 
                        id="displayName" 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea 
                        id="bio" 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="A short bio about yourself"
                        rows={4}
                      />
                      <p className="text-sm text-muted-foreground">
                        This will be displayed on your profile page.
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="mt-4"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}