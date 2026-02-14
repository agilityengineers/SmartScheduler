import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// GET /api/booking/:bookingLinkId/questions - List custom questions for a booking link
router.get('/:bookingLinkId/questions', async (req: Request, res: Response) => {
  try {
    const bookingLinkId = parseInt(req.params.bookingLinkId);
    const bookingLink = await storage.getBookingLink(bookingLinkId);
    if (!bookingLink) {
      return res.status(404).json({ message: 'Booking link not found' });
    }
    if (bookingLink.userId !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const questions = await storage.getCustomQuestions(bookingLinkId);
    res.json(questions);
  } catch (error) {
    console.error('[CustomQuestions] Error fetching questions:', error);
    res.status(500).json({ message: 'Error fetching custom questions' });
  }
});

// POST /api/booking/:bookingLinkId/questions - Create a custom question
router.post('/:bookingLinkId/questions', async (req: Request, res: Response) => {
  try {
    const bookingLinkId = parseInt(req.params.bookingLinkId);
    const bookingLink = await storage.getBookingLink(bookingLinkId);
    if (!bookingLink) {
      return res.status(404).json({ message: 'Booking link not found' });
    }
    if (bookingLink.userId !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const question = await storage.createCustomQuestion({
      ...req.body,
      bookingLinkId,
    });
    res.status(201).json(question);
  } catch (error) {
    console.error('[CustomQuestions] Error creating question:', error);
    res.status(500).json({ message: 'Error creating custom question' });
  }
});

// PUT /api/booking/:bookingLinkId/questions/:questionId - Update a custom question
router.put('/:bookingLinkId/questions/:questionId', async (req: Request, res: Response) => {
  try {
    const bookingLinkId = parseInt(req.params.bookingLinkId);
    const questionId = parseInt(req.params.questionId);

    const bookingLink = await storage.getBookingLink(bookingLinkId);
    if (!bookingLink) {
      return res.status(404).json({ message: 'Booking link not found' });
    }
    if (bookingLink.userId !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const question = await storage.getCustomQuestion(questionId);
    if (!question || question.bookingLinkId !== bookingLinkId) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const updated = await storage.updateCustomQuestion(questionId, req.body);
    res.json(updated);
  } catch (error) {
    console.error('[CustomQuestions] Error updating question:', error);
    res.status(500).json({ message: 'Error updating custom question' });
  }
});

// DELETE /api/booking/:bookingLinkId/questions/:questionId - Delete a custom question
router.delete('/:bookingLinkId/questions/:questionId', async (req: Request, res: Response) => {
  try {
    const bookingLinkId = parseInt(req.params.bookingLinkId);
    const questionId = parseInt(req.params.questionId);

    const bookingLink = await storage.getBookingLink(bookingLinkId);
    if (!bookingLink) {
      return res.status(404).json({ message: 'Booking link not found' });
    }
    if (bookingLink.userId !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const question = await storage.getCustomQuestion(questionId);
    if (!question || question.bookingLinkId !== bookingLinkId) {
      return res.status(404).json({ message: 'Question not found' });
    }

    await storage.deleteCustomQuestion(questionId);
    res.json({ success: true });
  } catch (error) {
    console.error('[CustomQuestions] Error deleting question:', error);
    res.status(500).json({ message: 'Error deleting custom question' });
  }
});

// PUT /api/booking/:bookingLinkId/questions - Bulk update/replace all questions
router.put('/:bookingLinkId/questions-bulk', async (req: Request, res: Response) => {
  try {
    const bookingLinkId = parseInt(req.params.bookingLinkId);
    const bookingLink = await storage.getBookingLink(bookingLinkId);
    if (!bookingLink) {
      return res.status(404).json({ message: 'Booking link not found' });
    }
    if (bookingLink.userId !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { questions } = req.body;
    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: 'questions must be an array' });
    }

    // Delete existing questions and recreate
    await storage.deleteCustomQuestionsByBookingLink(bookingLinkId);

    const created = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const question = await storage.createCustomQuestion({
        bookingLinkId,
        label: q.label,
        type: q.type,
        required: q.required ?? false,
        options: q.options ?? [],
        orderIndex: i,
        enabled: q.enabled ?? true,
      });
      created.push(question);
    }

    res.json(created);
  } catch (error) {
    console.error('[CustomQuestions] Error bulk updating questions:', error);
    res.status(500).json({ message: 'Error updating custom questions' });
  }
});

export default router;
