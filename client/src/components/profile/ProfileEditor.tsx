import { useState, useRef, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getInitials } from '@/lib/utils';

// Array of preset avatar colors
const AVATAR_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', 
  '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
  '#009688', '#4caf50', '#8bc34a', '#cddc39',
  '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
];

// Array of AI-generated avatar styles
const AVATAR_STYLES = [
  { id: 'abstract', name: 'Abstract', description: 'Colorful abstract designs' },
  { id: 'pixel', name: 'Pixel Art', description: '8-bit style pixel art' },
  { id: 'minimal', name: 'Minimalist', description: 'Clean, simple designs' },
  { id: 'geometric', name: 'Geometric', description: 'Patterns of shapes and colors' },
  { id: 'anime', name: 'Anime', description: 'Anime-inspired character' },
  { id: 'robot', name: 'Robot', description: 'Futuristic robot designs' },
  { id: 'galaxy', name: 'Galaxy', description: 'Space-themed cosmic patterns' },
  { id: 'watercolor', name: 'Watercolor', description: 'Artistic watercolor effect' }
];

export function ProfileEditor() {
  const { user, setUser } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);

  // Initialize with user's avatar color or random color
  const [selectedColor, setSelectedColor] = useState<string>(
    user?.avatarColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  );

  useEffect(() => {
    // Set preview if user has a profile picture
    if (user?.profilePicture) {
      setPreview(user.profilePicture);
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { profilePicture?: string | null; avatarColor?: string | null }) => {
      return apiRequest('PATCH', `/api/users/${user?.id}`, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      if (setUser && user) {
        setUser({
          ...user,
          profilePicture: data.profilePicture || user.profilePicture,
          avatarColor: data.avatarColor || user.avatarColor
        });
      }
      toast({
        title: "Profile updated",
        description: "Your profile picture has been updated successfully.",
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (preview) {
      updateProfileMutation.mutate({ profilePicture: preview });
    }
  };

  const handleAvatarColorSelect = (color: string) => {
    setSelectedColor(color);
    // If using a color-based avatar, clear the profile picture
    updateProfileMutation.mutate({ 
      avatarColor: color,
      profilePicture: null 
    });
    setPreview(null);
  };

  const handleGenerateAvatar = async (style: string) => {
    if (!user) return;
    
    setGeneratingAvatar(true);
    setSelectedStyle(style);
    
    try {
      // Simulate AI generation with a timeout (in a real app, this would call an AI generation API)
      // For now, we'll just set a placeholder image based on the style
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demonstration, generate a unique URL-based avatar using the style and user info
      // In a real app, this would be replaced with a call to an AI avatar generation API
      const seed = `${user.username}-${style}-${Date.now()}`;
      const generatedAvatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
      
      setPreview(generatedAvatarUrl);
      updateProfileMutation.mutate({ 
        profilePicture: generatedAvatarUrl,
        avatarColor: null 
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingAvatar(false);
      setShowAvatarDialog(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const avatarOptions = () => (
    <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
      <DialogTrigger asChild>
        <Button variant="outline">AI Avatar</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Generate AI Avatar</DialogTitle>
          <DialogDescription>
            Choose a style for your AI-generated avatar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {AVATAR_STYLES.map((style) => (
            <Card 
              key={style.id} 
              className={`cursor-pointer hover:border-primary transition-colors ${selectedStyle === style.id ? 'border-primary bg-primary/10' : ''}`}
              onClick={() => setSelectedStyle(style.id)}
            >
              <CardHeader className="p-3">
                <CardTitle className="text-sm">{style.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <CardDescription className="text-xs">{style.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAvatarDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => selectedStyle && handleGenerateAvatar(selectedStyle)}
            disabled={!selectedStyle || generatingAvatar}
          >
            {generatingAvatar ? 'Generating...' : 'Generate Avatar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
      />
      
      <div className="flex justify-center">
        <Avatar className="w-32 h-32 border-2 border-primary">
          {preview ? (
            <AvatarImage src={preview} alt="Profile" />
          ) : (
            <AvatarFallback 
              style={{ backgroundColor: selectedColor }}
              className="text-3xl font-medium text-white"
            >
              {user ? getInitials(user.displayName || user.username) : '?'}
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Photo</TabsTrigger>
          <TabsTrigger value="avatar">Choose Avatar</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="space-y-4 pt-4">
          <div className="flex space-x-2">
            <Button onClick={triggerFileInput} variant="outline" className="flex-1">
              {preview ? 'Change Photo' : 'Select Photo'}
            </Button>
            {avatarOptions()}
          </div>
          
          {preview && (
            <Button 
              onClick={handleUpload}
              disabled={updateProfileMutation.isPending}
              className="w-full"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Photo'}
            </Button>
          )}
        </TabsContent>
        <TabsContent value="avatar" className="space-y-4 pt-4">
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_COLORS.map((color) => (
              <div 
                key={color}
                className={`w-12 h-12 rounded-full cursor-pointer border-2 ${selectedColor === color ? 'border-primary' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
                onClick={() => handleAvatarColorSelect(color)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}