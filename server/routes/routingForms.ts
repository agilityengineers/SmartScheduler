import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// ---- Authenticated CRUD for form owner ----

/**
 * GET / - List routing forms for the current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const forms = await storage.getRoutingForms(userId);
    res.json(forms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching routing forms' });
  }
});

/**
 * GET /:id - Get routing form with questions and rules
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const form = await storage.getRoutingForm(parseInt(req.params.id));
    if (!form) return res.status(404).json({ message: 'Routing form not found' });

    const [questions, rules] = await Promise.all([
      storage.getRoutingFormQuestions(form.id),
      storage.getRoutingFormRules(form.id),
    ]);

    res.json({ ...form, questions, rules });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching routing form' });
  }
});

/**
 * POST / - Create a new routing form
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { title, slug, description } = req.body;
    if (!title || !slug) return res.status(400).json({ message: 'Title and slug are required' });

    // Check slug uniqueness
    const existing = await storage.getRoutingFormBySlug(slug);
    if (existing) return res.status(409).json({ message: 'Slug already in use' });

    const form = await storage.createRoutingForm({
      userId,
      title,
      slug,
      description: description || null,
    });

    res.status(201).json(form);
  } catch (error) {
    res.status(500).json({ message: 'Error creating routing form' });
  }
});

/**
 * PUT /:id - Update routing form
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const formId = parseInt(req.params.id);
    const { title, description, isActive } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const form = await storage.updateRoutingForm(formId, updateData);
    if (!form) return res.status(404).json({ message: 'Form not found' });

    res.json(form);
  } catch (error) {
    res.status(500).json({ message: 'Error updating routing form' });
  }
});

/**
 * DELETE /:id - Delete routing form (cascades questions, rules, submissions)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await storage.deleteRoutingForm(parseInt(req.params.id));
    res.json({ message: 'Routing form deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting routing form' });
  }
});

// ---- Question CRUD ----

/**
 * POST /:formId/questions - Add a question
 */
router.post('/:formId/questions', async (req: Request, res: Response) => {
  try {
    const routingFormId = parseInt(req.params.formId);
    const { label, type, options, isRequired, orderIndex } = req.body;

    if (!label || !type) return res.status(400).json({ message: 'Label and type required' });

    const question = await storage.createRoutingFormQuestion({
      routingFormId,
      label,
      type,
      options: options || [],
      isRequired: isRequired ?? true,
      orderIndex: orderIndex ?? 0,
    });

    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: 'Error creating question' });
  }
});

/**
 * PUT /questions/:id - Update a question
 */
router.put('/questions/:id', async (req: Request, res: Response) => {
  try {
    const question = await storage.updateRoutingFormQuestion(parseInt(req.params.id), req.body);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Error updating question' });
  }
});

/**
 * DELETE /questions/:id - Delete a question
 */
router.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    await storage.deleteRoutingFormQuestion(parseInt(req.params.id));
    res.json({ message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting question' });
  }
});

// ---- Rule CRUD ----

/**
 * POST /:formId/rules - Add a routing rule
 */
router.post('/:formId/rules', async (req: Request, res: Response) => {
  try {
    const routingFormId = parseInt(req.params.formId);
    const { questionId, operator, value, action, targetBookingLinkId, targetUrl, targetMessage, priority } = req.body;

    if (!questionId || !operator || !value || !action) {
      return res.status(400).json({ message: 'questionId, operator, value, and action are required' });
    }

    const rule = await storage.createRoutingFormRule({
      routingFormId,
      questionId,
      operator,
      value,
      action,
      targetBookingLinkId: targetBookingLinkId || null,
      targetUrl: targetUrl || null,
      targetMessage: targetMessage || null,
      priority: priority || 0,
    });

    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: 'Error creating rule' });
  }
});

/**
 * PUT /rules/:id - Update a routing rule
 */
router.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const rule = await storage.updateRoutingFormRule(parseInt(req.params.id), req.body);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: 'Error updating rule' });
  }
});

/**
 * DELETE /rules/:id - Delete a routing rule
 */
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    await storage.deleteRoutingFormRule(parseInt(req.params.id));
    res.json({ message: 'Rule deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting rule' });
  }
});

// ---- Submissions ----

/**
 * GET /:formId/submissions - Get form submissions
 */
router.get('/:formId/submissions', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const submissions = await storage.getRoutingFormSubmissions(parseInt(req.params.formId), limit);
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submissions' });
  }
});

export default router;
