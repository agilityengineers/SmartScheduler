import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Footer from '@/components/layout/Footer';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import IntegrationSettings from '@/components/settings/IntegrationSettings';
import ReminderSettings from '@/components/settings/ReminderSettings';
import PrivacySettings from '@/components/settings/PrivacySettings';
import AvailabilitySettings from '@/components/settings/AvailabilitySettings';
import EmailTester from '@/components/settings/EmailTester';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/UserContext';

export default function Settings() {
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const { isAdmin } = useUser();
  
  const handleCreateEvent = () => {
    setIsCreateEventModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />
        
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-800">
          <div className="border-b border-neutral-300 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
            <h1 className="text-xl font-semibold text-neutral-700 dark:text-slate-200">Settings</h1>
            <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
              Configure your account preferences and settings.
            </p>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <Tabs defaultValue="integrations" className="space-y-6">
              <TabsList className="mb-6">
                <TabsTrigger value="integrations">Calendar Integrations</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
                <TabsTrigger value="reminders">Reminders</TabsTrigger>
                <TabsTrigger value="privacy">Privacy & Display</TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="integrations">
                <IntegrationSettings />
              </TabsContent>
              
              <TabsContent value="availability">
                <AvailabilitySettings />
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
      <Footer />
    </div>
  );
}
