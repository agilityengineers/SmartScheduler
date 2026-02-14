import { Step } from 'react-joyride';
import React from 'react';

const bookingTour: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-bold mb-2">Booking Links</h2>
        <p>
          Booking links allow others to schedule time with you based on your availability.
          Let's learn how to create and manage your booking links.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-booking-links]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Your Booking Links</h3>
        <p>
          This is where you can see all your active booking links. Each link represents
          a different type of meeting or availability schedule.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-create-booking]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Create Booking Link</h3>
        <p>
          Click this button to create a new booking link. You can set up different types
          of meetings with custom durations and availability windows.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-booking-form]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Booking Configuration</h3>
        <p>
          Configure your booking link details here, including the title, description,
          duration, and buffer time between meetings.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-availability]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Set Your Availability</h3>
        <p>
          Define when you're available for bookings by selecting days and time slots.
          This ensures people can only book times that work for you.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-booking-preview]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Booking Page Preview</h3>
        <p>
          This is what others will see when they access your booking link. You can
          customize the appearance and information shown here.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-share-booking]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Share Your Link</h3>
        <p>
          Once your booking link is ready, share it with others using this button.
          You can copy the link or send it directly via email.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-upcoming-bookings]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Upcoming Bookings</h3>
        <p>
          Track all meetings scheduled through your booking links here. You can
          reschedule or cancel bookings if needed.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-bold mb-2">Booking Tour Complete!</h2>
        <p>
          Fantastic! You now know how to create and manage booking links.
          This will help you streamline your meeting scheduling process.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  }
];

export default bookingTour;