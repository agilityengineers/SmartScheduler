import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import * as crypto from 'crypto';

const router = Router();

// GET all polls for authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const polls = await storage.getMeetingPolls(req.userId);
    // Enrich with options and vote counts
    const enriched = await Promise.all(polls.map(async (poll) => {
      const options = await storage.getMeetingPollOptions(poll.id);
      const votes = await storage.getMeetingPollVotes(poll.id);
      return {
        ...poll,
        optionCount: options.length,
        voteCount: votes.length,
        uniqueVoters: Array.from(new Set(votes.map(v => v.voterEmail))).length,
      };
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching meeting polls' });
  }
});

// GET single poll by ID (authenticated)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const poll = await storage.getMeetingPoll(parseInt(req.params.id));
    if (!poll || poll.userId !== req.userId) {
      return res.status(404).json({ message: 'Meeting poll not found' });
    }
    const options = await storage.getMeetingPollOptions(poll.id);
    const votes = await storage.getMeetingPollVotes(poll.id);
    res.json({ ...poll, options, votes });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching meeting poll' });
  }
});

// POST create a new poll
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, duration, location, meetingUrl, deadline, timezone, options } = req.body;

    if (!title || !duration || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Title, duration, and at least 2 time options are required' });
    }

    // Generate unique slug
    const slug = `poll-${crypto.randomBytes(6).toString('hex')}`;

    const poll = await storage.createMeetingPoll({
      userId: req.userId,
      title,
      description: description || null,
      slug,
      duration,
      location: location || null,
      meetingUrl: meetingUrl || null,
      deadline: deadline ? new Date(deadline) : null,
      timezone: timezone || 'UTC',
    });

    // Create the time options
    const createdOptions = await Promise.all(
      options.map((opt: { startTime: string; endTime: string }) =>
        storage.createMeetingPollOption({
          pollId: poll.id,
          startTime: new Date(opt.startTime),
          endTime: new Date(opt.endTime),
        })
      )
    );

    res.status(201).json({ ...poll, options: createdOptions });
  } catch (error) {
    console.error('[MEETING_POLLS] Error creating poll:', error);
    res.status(500).json({ message: 'Error creating meeting poll' });
  }
});

// PUT update a poll
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const poll = await storage.getMeetingPoll(parseInt(req.params.id));
    if (!poll || poll.userId !== req.userId) {
      return res.status(404).json({ message: 'Meeting poll not found' });
    }

    const { title, description, deadline, status, selectedOptionId } = req.body;
    const updated = await storage.updateMeetingPoll(poll.id, {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      ...(status !== undefined && { status }),
      ...(selectedOptionId !== undefined && { selectedOptionId }),
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating meeting poll' });
  }
});

// DELETE a poll
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const poll = await storage.getMeetingPoll(parseInt(req.params.id));
    if (!poll || poll.userId !== req.userId) {
      return res.status(404).json({ message: 'Meeting poll not found' });
    }

    // Delete votes, options, then poll
    const votes = await storage.getMeetingPollVotes(poll.id);
    for (const vote of votes) {
      await storage.deleteMeetingPollVote(vote.id);
    }
    await storage.deleteMeetingPollOptions(poll.id);
    await storage.deleteMeetingPoll(poll.id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting meeting poll' });
  }
});

// POST close a poll and select an option
router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const poll = await storage.getMeetingPoll(parseInt(req.params.id));
    if (!poll || poll.userId !== req.userId) {
      return res.status(404).json({ message: 'Meeting poll not found' });
    }

    const { selectedOptionId } = req.body;
    if (!selectedOptionId) {
      return res.status(400).json({ message: 'selectedOptionId is required' });
    }

    const updated = await storage.updateMeetingPoll(poll.id, {
      status: 'scheduled',
      selectedOptionId,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error closing meeting poll' });
  }
});

export default router;
