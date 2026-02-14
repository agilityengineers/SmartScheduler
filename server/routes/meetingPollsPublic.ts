import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// GET poll by slug (public - for voting page)
router.get('/poll/:slug', async (req: Request, res: Response) => {
  try {
    const poll = await storage.getMeetingPollBySlug(req.params.slug);
    if (!poll) {
      return res.status(404).json({ message: 'Meeting poll not found' });
    }

    const owner = await storage.getUser(poll.userId);
    const options = await storage.getMeetingPollOptions(poll.id);
    const votes = await storage.getMeetingPollVotes(poll.id);

    // Group votes by option
    const voteSummary = options.map(opt => {
      const optionVotes = votes.filter(v => v.optionId === opt.id);
      return {
        ...opt,
        yesCount: optionVotes.filter(v => v.vote === 'yes').length,
        noCount: optionVotes.filter(v => v.vote === 'no').length,
        ifNeededCount: optionVotes.filter(v => v.vote === 'if_needed').length,
        voters: optionVotes.map(v => ({
          name: v.voterName,
          email: v.voterEmail,
          vote: v.vote,
        })),
      };
    });

    res.json({
      id: poll.id,
      title: poll.title,
      description: poll.description,
      duration: poll.duration,
      location: poll.location,
      meetingUrl: poll.meetingUrl,
      status: poll.status,
      deadline: poll.deadline,
      timezone: poll.timezone,
      selectedOptionId: poll.selectedOptionId,
      ownerName: owner ? (owner.displayName || owner.username) : 'Unknown',
      options: voteSummary,
      uniqueVoters: Array.from(new Set(votes.map(v => v.voterEmail))).length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching meeting poll' });
  }
});

// POST vote on a poll (public)
router.post('/poll/:slug/vote', async (req: Request, res: Response) => {
  try {
    const poll = await storage.getMeetingPollBySlug(req.params.slug);
    if (!poll) {
      return res.status(404).json({ message: 'Meeting poll not found' });
    }

    if (poll.status !== 'open') {
      return res.status(400).json({ message: 'This poll is no longer accepting votes' });
    }

    if (poll.deadline && new Date(poll.deadline) < new Date()) {
      return res.status(400).json({ message: 'Voting deadline has passed' });
    }

    const { voterName, voterEmail, votes } = req.body;

    if (!voterName || !voterEmail || !votes || !Array.isArray(votes)) {
      return res.status(400).json({ message: 'voterName, voterEmail, and votes array are required' });
    }

    // Delete existing votes from this voter (allow re-voting)
    await storage.deleteMeetingPollVotesByVoter(poll.id, voterEmail);

    // Create new votes
    const createdVotes = await Promise.all(
      votes.map((v: { optionId: number; vote: string }) =>
        storage.createMeetingPollVote({
          pollId: poll.id,
          optionId: v.optionId,
          voterName,
          voterEmail,
          vote: v.vote || 'yes',
        })
      )
    );

    res.status(201).json({ votes: createdVotes });
  } catch (error) {
    console.error('[MEETING_POLLS_PUBLIC] Error voting:', error);
    res.status(500).json({ message: 'Error submitting votes' });
  }
});

// POST reconfirmation response (public - for reconfirmation links)
router.post('/reconfirm/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { response } = req.body; // 'confirmed' or 'declined'

    if (!response || !['confirmed', 'declined'].includes(response)) {
      return res.status(400).json({ message: 'Response must be "confirmed" or "declined"' });
    }

    // Find booking by reconfirmation token - search through all user bookings
    // This is a public endpoint so we need to search by token
    const allUsers = await storage.getAllUsers();
    let targetBooking = null;

    for (const user of allUsers) {
      const userBookings = await storage.getUserBookings(user.id);
      const found = userBookings.find(b => b.reconfirmationToken === token);
      if (found) {
        targetBooking = found;
        break;
      }
    }

    if (!targetBooking) {
      return res.status(404).json({ message: 'Invalid reconfirmation token' });
    }

    const updated = await storage.updateBooking(targetBooking.id, {
      reconfirmationStatus: response,
      ...(response === 'declined' && { status: 'cancelled' }),
    });

    res.json({ message: `Booking ${response} successfully`, booking: updated });
  } catch (error) {
    console.error('[RECONFIRM] Error:', error);
    res.status(500).json({ message: 'Error processing reconfirmation' });
  }
});

export default router;
