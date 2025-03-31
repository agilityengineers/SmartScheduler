import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import IntegrationSettings from '@/components/settings/IntegrationSettings';
import ReminderSettings from '@/components/settings/ReminderSettings';
import PrivacySettings from '@/components/settings/PrivacySettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Settings() {
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  
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
            <Tabs defaultValue="integrations" className="space-y-6">
              <TabsList className="mb-6">
                <TabsTrigger value="integrations">Calendar Integrations</TabsTrigger>
                <TabsTrigger value="reminders">Reminders</TabsTrigger>
                <TabsTrigger value="privacy">Privacy & Display</TabsTrigger>
              </TabsList>
              
              <TabsContent value="integrations">
                <IntegrationSettings />
              </TabsContent>
              
              <TabsContent value="reminders">
                <ReminderSettings />
              </TabsContent>
              
              <TabsContent value="privacy">
                <PrivacySettings />
              </TabsContent>
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
