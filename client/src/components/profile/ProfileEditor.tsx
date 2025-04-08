import { useState, useRef, useEffect } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
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

// Array of AI-generated avatar styles that match DiceBear's available styles
// Source: https://www.dicebear.com/styles
const AVATAR_STYLES = [
  { id: 'avataaars', name: 'Cartoon', description: 'Playful cartoonish avatar' },
  { id: 'bottts', name: 'Robot', description: 'Unique robot characters' },
  { id: 'initials', name: 'Initials', description: 'Text-based avatar with initials' },
  { id: 'identicon', name: 'Identicon', description: 'Geometric pattern identicons' },
  { id: 'micah', name: 'Abstract', description: 'Colorful abstract designs' },
  { id: 'personas', name: 'Personas', description: 'Friendly character avatars' },
  { id: 'adventurer', name: 'Adventurer', description: 'Pixel art adventurer characters' },
  { id: 'lorelei', name: 'Lorelei', description: 'Simple yet stylish avatars' }
];

export function ProfileEditor() {
  const { user, setUser } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);

  // Initialize with user's avatar color or random color
  const [selectedColor, setSelectedColor] = useState<string>(
    user?.avatarColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  );

  const saveProfilePicture = async (imageUrl: string) => {
    try {
      await apiRequest('PATCH', `/api/users/${user?.id}`, {
        profilePicture: imageUrl
      });
      if (setUser && user) {
        setUser({
          ...user,
          profilePicture: imageUrl
        });
      }
    } catch (error) {
      console.error('Failed to save profile picture:', error);
      toast({
        title: "Failed to save",
        description: "Could not save profile picture. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Set preview if user has a profile picture
    if (user?.profilePicture) {
      setPreview(user.profilePicture);
    }
  }, [user]);

  useEffect(() => {
    // Save profile picture when preview changes
    if (preview && preview !== user?.profilePicture) {
      saveProfilePicture(preview);
    }
  }, [preview]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { profilePicture?: string | null; avatarColor?: string | null }) => {
      if (!user?.id) {
        throw new Error('User ID not found');
      }
      const response = await apiRequest('PATCH', `/api/users/${user.id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      return response.json();
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
    try {
      const file = e.target.files?.[0];
      if (!file) {
        toast({
          title: "No file selected",
          description: "Please select an image file to upload.",
          variant: "destructive",
        });
        return;
      }

      // Basic validation
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error handling file change:", error);
      toast({
        title: "Error uploading file",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      })
    }
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
    if (!user) {
      console.error("No user found when generating avatar");
      return;
    }

    console.log("Starting avatar generation for style:", style);
    setGeneratingAvatar(true);
    setSelectedStyle(style);

    try {
      // Simulate AI generation with a timeout (in a real app, this would call an AI generation API)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate a unique seed for consistent but unique avatars per user
      const seed = encodeURIComponent(`${user.username}-${style}`);
      console.log("Generated seed:", seed);
      
      // Create a direct image URL instead of SVG for better compatibility
      // DiceBear also supports PNG format
      let generatedAvatarUrl = `https://api.dicebear.com/7.x/${style}/png?seed=${seed}`;
      
      // Add style-specific options for better avatars
      if (style === 'avataaars') {
        // Add options for the cartoon avatar style
        generatedAvatarUrl += '&backgroundColor=b6e3f4,c0aede,d1d4f9';
      } else if (style === 'bottts') {
        // Add options for the robot style
        generatedAvatarUrl += '&colors=amber,blue,blueGrey,brown';
      } else if (style === 'micah') {
        // Add options for the abstract style
        generatedAvatarUrl += '&backgroundColor=0a5b83,1c799f,69d2e7';
      }

      console.log("Generated avatar URL:", generatedAvatarUrl);
      
      // Test if the URL is valid by preloading the image
      console.log("Preloading image to verify URL...");
      const img = new Image();
      
      // Create a promise that resolves when the image loads or rejects on error
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log("Avatar image loaded successfully!");
          resolve(true);
        };
        img.onerror = (err) => {
          console.error("Failed to load avatar image:", err);
          reject(new Error("Failed to load avatar image"));
        };
        img.src = generatedAvatarUrl;
      });

      // If image loads successfully, set it as profile picture
      console.log("Setting preview and updating profile with avatar URL");
      setPreview(generatedAvatarUrl);
      
      // Update the user profile with the new avatar URL
      updateProfileMutation.mutate({ 
        profilePicture: generatedAvatarUrl,
        avatarColor: null 
      });
      
      toast({
        title: "Avatar generated",
        description: "Your new avatar has been created successfully!",
      });
    } catch (error) {
      console.error("Avatar generation error:", error);
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