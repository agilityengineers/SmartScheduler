import { storage } from '../storage';
import { format } from 'date-fns';

interface SlackNotificationData {
  bookingName?: string;
  bookingEmail?: string;
  bookingTitle?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  meetingUrl?: string | null;
  reason?: string;
}

type NotificationType = 'booking_created' | 'booking_cancelled' | 'booking_rescheduled' | 'no_show';

function formatTime(time: Date | string): string {
  const date = typeof time === 'string' ? new Date(time) : time;
  return format(date, 'EEEE, MMMM d, yyyy h:mm a');
}

function buildSlackMessage(type: NotificationType, data: SlackNotificationData): object {
  const blocks: object[] = [];

  switch (type) {
    case 'booking_created':
      blocks.push(
        {
          type: 'header',
          text: { type: 'plain_text', text: 'New Booking Created', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Event:*\n${data.bookingTitle || 'Meeting'}` },
            { type: 'mrkdwn', text: `*Guest:*\n${data.bookingName} (${data.bookingEmail})` },
            { type: 'mrkdwn', text: `*When:*\n${data.startTime ? formatTime(data.startTime) : 'N/A'}` },
            ...(data.meetingUrl ? [{ type: 'mrkdwn', text: `*Meeting Link:*\n<${data.meetingUrl}|Join Meeting>` }] : []),
          ],
        }
      );
      break;

    case 'booking_cancelled':
      blocks.push(
        {
          type: 'header',
          text: { type: 'plain_text', text: 'Booking Cancelled', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Event:*\n${data.bookingTitle || 'Meeting'}` },
            { type: 'mrkdwn', text: `*Guest:*\n${data.bookingName} (${data.bookingEmail})` },
            { type: 'mrkdwn', text: `*Was scheduled for:*\n${data.startTime ? formatTime(data.startTime) : 'N/A'}` },
            ...(data.reason ? [{ type: 'mrkdwn', text: `*Reason:*\n${data.reason}` }] : []),
          ],
        }
      );
      break;

    case 'booking_rescheduled':
      blocks.push(
        {
          type: 'header',
          text: { type: 'plain_text', text: 'Booking Rescheduled', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Event:*\n${data.bookingTitle || 'Meeting'}` },
            { type: 'mrkdwn', text: `*Guest:*\n${data.bookingName} (${data.bookingEmail})` },
            { type: 'mrkdwn', text: `*New time:*\n${data.startTime ? formatTime(data.startTime) : 'N/A'}` },
          ],
        }
      );
      break;

    case 'no_show':
      blocks.push(
        {
          type: 'header',
          text: { type: 'plain_text', text: 'No-Show Recorded', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Event:*\n${data.bookingTitle || 'Meeting'}` },
            { type: 'mrkdwn', text: `*Guest:*\n${data.bookingName} (${data.bookingEmail})` },
            { type: 'mrkdwn', text: `*Was scheduled for:*\n${data.startTime ? formatTime(data.startTime) : 'N/A'}` },
          ],
        }
      );
      break;
  }

  return { blocks };
}

export async function sendSlackNotification(
  userId: number,
  type: NotificationType,
  data: SlackNotificationData
): Promise<boolean> {
  try {
    const slackIntegration = await storage.getSlackIntegration(userId);
    if (!slackIntegration || !slackIntegration.isActive) {
      return false;
    }

    // Check notification preferences
    if (type === 'booking_created' && !slackIntegration.notifyOnBooking) return false;
    if (type === 'booking_cancelled' && !slackIntegration.notifyOnCancellation) return false;
    if (type === 'booking_rescheduled' && !slackIntegration.notifyOnReschedule) return false;
    if (type === 'no_show' && !slackIntegration.notifyOnNoShow) return false;

    const message = buildSlackMessage(type, data);

    const response = await fetch(slackIntegration.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(`[SLACK] Failed to send notification: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SLACK] Error sending notification:', error);
    return false;
  }
}
