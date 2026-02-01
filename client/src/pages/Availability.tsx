import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import AvailabilitySettings from '@/components/settings/AvailabilitySettings';
import CreateEventModal from '@/components/calendar/CreateEventModal';

export default function AvailabilityPage() {
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  
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
            <h1 className="text-xl font-semibold text-neutral-700 dark:text-slate-200">Availability</h1>
            <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
              Manage your schedule and block time when you're unavailable.
            </p>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <AvailabilitySettings />
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