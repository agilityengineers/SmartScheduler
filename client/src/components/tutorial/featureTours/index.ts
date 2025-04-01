import dashboardTour from './dashboardTour';
import calendarTour from './calendarTour';
import profileTour from './profileTour';
import teamTour from './teamTour';
import bookingTour from './bookingTour';
import settingsTour from './settingsTour';

// Bundle all feature tours for easy access
const featureTours = {
  dashboard: dashboardTour,
  calendar: calendarTour,
  profile: profileTour,
  team: teamTour,
  booking: bookingTour,
  settings: settingsTour,
};

export default featureTours;