import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Footer from '@/components/layout/Footer';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-slate-900">
      <AppHeader onCreateEvent={handleCreateEvent} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />

        <main className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-800 p-8">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100 mb-3">
              Analytics
            </h1>
            <p className="text-neutral-600 dark:text-slate-400 mb-6">
              Track your scheduling metrics and insights. This feature is coming soon!
            </p>
            <p className="text-sm text-neutral-500 dark:text-slate-500">
              View booking trends, popular time slots, conversion rates, and more to optimize your availability.
            </p>
          </div>
        </main>
      </div>

      <MobileNavigation onCreateEventClick={handleCreateEvent} />
      <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <Footer />
    </div>
  );
}
