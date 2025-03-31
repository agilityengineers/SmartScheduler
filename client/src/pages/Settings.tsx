import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import IntegrationSettings from '@/components/settings/IntegrationSettings';
import ReminderSettings from '@/components/settings/ReminderSettings';
import PrivacySettings from '@/components/settings/PrivacySettings';
import EmailTester from '@/components/settings/EmailTester';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/UserContext';

export default function Settings() {
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const { isAdmin } = useUser();
  
  const handleCreateEvent = () => {
    setIsCreateEventModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />
        
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="border-b border-neutral-300 p-4 bg-white">
            <h1 className="text-xl font-semibold text-neutral-700">Settings</h1>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="mb-6">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="integrations">Calendar Integrations</TabsTrigger>
                <TabsTrigger value="reminders">Reminders</TabsTrigger>
                <TabsTrigger value="privacy">Privacy & Display</TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="profile">
                <div className="grid md:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Picture</CardTitle>
                      <CardDescription>
                        Upload your profile picture or create an avatar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ProfileEditor />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="integrations">
                <IntegrationSettings />
              </TabsContent>
              
              <TabsContent value="reminders">
                <ReminderSettings />
              </TabsContent>
              
              <TabsContent value="privacy">
                <PrivacySettings />
              </TabsContent>
              
              {isAdmin && (
                <TabsContent value="notifications">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <EmailTester />
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>
      
      <MobileNavigation onCreateEventClick={handleCreateEvent} />
      
      <CreateEventModal 
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
      />
    </div>
  );
}
