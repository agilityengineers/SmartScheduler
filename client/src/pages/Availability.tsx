import React from 'react';
import { Helmet } from 'react-helmet';
import AvailabilitySettings from '../components/settings/AvailabilitySettings';
import { AppLayout } from '../components/layout/AppLayout';

export default function AvailabilityPage() {
  return (
    <AppLayout>
      <Helmet>
        <title>Manage Availability | SmartScheduler</title>
      </Helmet>

      <div className="container max-w-4xl py-8 mx-auto">
        <h1 className="text-3xl font-bold mb-6">Manage Availability</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Set up unavailable time blocks to prevent bookings during time off, vacations, and other busy periods.
        </p>
        
        <AvailabilitySettings />
      </div>
    </AppLayout>
  );
}