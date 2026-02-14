import { Step } from 'react-joyride';
import React from 'react';

const profileTour: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-bold mb-2">Your Profile</h2>
        <p>
          Your profile contains your personal information and preferences.
          Let's explore how you can customize your experience.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="profile-section"]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Profile Overview</h3>
        <p>
          This is your profile page where you can view and update your personal information.
          Keeping your profile up-to-date helps team members recognize you.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-profile-tabs]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Profile Sections</h3>
        <p>
          Use these tabs to navigate between different profile sections,
          including your photo, personal information, and account settings.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-profile-photo]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Profile Picture</h3>
        <p>
          Upload or change your profile picture here. Having a recognizable photo
          makes it easier for team members to identify you in meetings.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-profile-form]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Personal Information</h3>
        <p>
          Update your name, email, and bio in this section. This information will be
          visible to other users when they view your profile or booking links.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-profile-save]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Save Changes</h3>
        <p>
          After making any changes to your profile, don't forget to save them
          by clicking this button. Your updates will be applied immediately.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-bold mb-2">Profile Tour Complete!</h2>
        <p>
          Great! You now know how to customize your profile settings.
          A complete profile enhances your experience and team collaboration.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  }
];

export default profileTour;