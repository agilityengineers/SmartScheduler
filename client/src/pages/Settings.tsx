import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Footer from '@/components/layout/Footer';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import ReminderSettings from '@/components/settings/ReminderSettings';
import PrivacySettings from '@/components/settings/PrivacySettings';
import EmailTester from '@/components/settings/EmailTester';
import { EmailTemplates } from '@/components/settings/EmailTemplates';
import { WebhookIntegrations } from '@/components/settings/WebhookIntegrations';
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
          <div className="border-b border-neutral-300 dark:border-slate-700 p-4 md:p-6 bg-white dark:bg-slate-800">
            <h1 className="text-lg md:text-xl font-semibold text-neutral-700 dark:text-slate-200">Settings</h1>
            <p className="text-xs md:text-sm text-neutral-500 dark:text-slate-400 mt-1">
              Configure your account preferences and settings.
            </p>
          </div>

          <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
            <Tabs defaultValue="reminders" className="space-y-6">
              <TabsList className="mb-6 w-full sm:w-auto overflow-x-auto flex-nowrap justify-start">
                <TabsTrigger value="reminders" className="whitespace-nowrap">Reminders</TabsTrigger>
                <TabsTrigger value="privacy" className="whitespace-nowrap">Privacy</TabsTrigger>
                <TabsTrigger value="integrations" className="whitespace-nowrap">Webhooks</TabsTrigger>
                {isAdmin && (
                  <>
                    <TabsTrigger value="notifications" className="whitespace-nowrap">Notifications</TabsTrigger>
                    <TabsTrigger value="email-templates" className="whitespace-nowrap">Templates</TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="reminders">
                <ReminderSettings />
              </TabsContent>
              
              <TabsContent value="privacy">
                <PrivacySettings />
              </TabsContent>
              
              <TabsContent value="integrations">
                <WebhookIntegrations />
              </TabsContent>
              
              {isAdmin && (
                <>
                  <TabsContent value="notifications">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <EmailTester />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="email-templates">
                    <EmailTemplates />
                  </TabsContent>
                </>
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
