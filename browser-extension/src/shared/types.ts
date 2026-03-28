// Shared types for the SmartScheduler browser extension
// These mirror the server-side schema types needed by the extension

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profilePicture: string | null;
  avatarColor: string | null;
  timezone: string;
  role: string;
  organizationId: number | null;
  teamId: number | null;
}

export interface BookingLink {
  id: number;
  userId: number;
  teamId: number | null;
  isTeamBooking: boolean;
  slug: string;
  title: string;
  description: string | null;
  duration: number; // minutes
  availability: {
    window: number;
    days: string[];
    hours: { start: string; end: string };
  };
  meetingType: string;
  location: string | null;
  meetingUrl: string | null;
  bufferBefore: number;
  bufferAfter: number;
  maxBookingsPerDay: number;
  isHidden: boolean;
  brandColor: string | null;
  isOneOff: boolean;
  isExpired: boolean;
  requirePayment: boolean;
  price: number | null;
  currency: string;
}

export interface AvailabilitySlot {
  start: string; // ISO date string
  end: string;   // ISO date string
}

export interface BookingRequest {
  name: string;
  email: string;
  notes?: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  timezone: string;
  customAnswers?: Array<{ questionId: string; value: string }>;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  baseUrl: string;
}

// Messages between popup, background, and content scripts
export type ExtensionMessage =
  | { type: 'GET_AUTH_STATE' }
  | { type: 'AUTH_STATE'; payload: AuthState }
  | { type: 'LOGIN'; payload: { username: string; password: string } }
  | { type: 'LOGIN_RESULT'; payload: { success: boolean; error?: string; user?: User } }
  | { type: 'LOGOUT' }
  | { type: 'LOGOUT_RESULT'; payload: { success: boolean } }
  | { type: 'GET_BOOKING_LINKS' }
  | { type: 'BOOKING_LINKS_RESULT'; payload: { links: BookingLink[]; error?: string } }
  | { type: 'OPEN_BOOKING_MODAL'; payload: { slug: string; userPath?: string } }
  | { type: 'INSERT_BOOKING_LINK'; payload: { url: string; title: string } }
  | { type: 'COPY_LINK'; payload: { url: string } };
