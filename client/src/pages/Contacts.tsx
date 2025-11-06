import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Footer from '@/components/layout/Footer';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { ContactsList } from '@/components/contacts/ContactsList';
import { useContacts, useContactStats } from '@/hooks/useContacts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CalendarCheck, TrendingUp, Loader2 } from 'lucide-react';

export default function Contacts() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: contacts, isLoading: isLoadingContacts } = useContacts();
  const { data: stats, isLoading: isLoadingStats } = useContactStats();

  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-slate-900">
      <AppHeader onCreateEvent={handleCreateEvent} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />

        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100">
                Contacts
              </h1>
              <p className="text-neutral-600 dark:text-slate-400 mt-1">
                Manage your contacts and view booking history
              </p>
            </div>

            {/* Statistics Cards */}
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : stats ? (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalContacts}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unique people who booked with you
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalBookings}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      All-time appointments
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Bookings</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.recentBookings}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last 30 days
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {/* Contacts List */}
            {isLoadingContacts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : contacts ? (
              <ContactsList contacts={contacts} />
            ) : null}
          </div>
        </main>
      </div>

      <MobileNavigation onCreateEventClick={handleCreateEvent} />
      <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <Footer />
    </div>
  );
}
