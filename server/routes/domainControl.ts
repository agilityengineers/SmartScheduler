import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import crypto from 'crypto';
import { logAuditEvent } from './auditLog';

const router = Router();

/**
 * GET / - Get domain controls for the user's organization
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);
    if (!user?.organizationId) return res.status(400).json({ message: 'No organization' });

    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const domains = await storage.getDomainControls(user.organizationId);
    res.json(domains);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching domain controls' });
  }
});

/**
 * POST / - Add a domain control
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);
    if (!user?.organizationId) return res.status(400).json({ message: 'No organization' });

    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { domain, autoJoin } = req.body;
    if (!domain) return res.status(400).json({ message: 'Domain is required' });

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim();

    // Check if domain already exists for this org
    const existing = await storage.getDomainControlByDomain(normalizedDomain);
    if (existing) return res.status(409).json({ message: 'Domain already registered' });

    // Generate verification token (for DNS TXT record verification)
    const verificationToken = `smartscheduler-verify-${crypto.randomBytes(16).toString('hex')}`;

    const control = await storage.createDomainControl({
      organizationId: user.organizationId,
      domain: normalizedDomain,
      verificationToken,
      autoJoin: autoJoin || false,
    });

    await logAuditEvent(req, 'domain_add', 'domain_control', control.id, { domain: normalizedDomain });

    res.status(201).json(control);
  } catch (error) {
    res.status(500).json({ message: 'Error adding domain' });
  }
});

/**
 * POST /:id/verify - Verify domain ownership (placeholder - checks DNS TXT record)
 */
router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const controlId = parseInt(req.params.id);
    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);

    if (user?.role !== 'admin' && user?.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // In production, this would do a DNS TXT lookup
    // For now, auto-verify for development
    const control = await storage.updateDomainControl(controlId, { isVerified: true });
    if (!control) return res.status(404).json({ message: 'Domain control not found' });

    await logAuditEvent(req, 'domain_verify', 'domain_control', controlId, { domain: control.domain });

    res.json(control);
  } catch (error) {
    res.status(500).json({ message: 'Error verifying domain' });
  }
});

/**
 * PUT /:id - Update domain control settings
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const controlId = parseInt(req.params.id);
    const { autoJoin } = req.body;

    const control = await storage.updateDomainControl(controlId, { autoJoin });
    if (!control) return res.status(404).json({ message: 'Domain control not found' });

    res.json(control);
  } catch (error) {
    res.status(500).json({ message: 'Error updating domain control' });
  }
});

/**
 * DELETE /:id - Remove a domain control
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const controlId = parseInt(req.params.id);
    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);

    if (user?.role !== 'admin' && user?.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await storage.deleteDomainControl(controlId);
    await logAuditEvent(req, 'domain_remove', 'domain_control', controlId);

    res.json({ message: 'Domain control removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing domain control' });
  }
});

/**
 * GET /check/:email - Check if an email domain is controlled (public endpoint)
 */
router.get('/check/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return res.status(400).json({ message: 'Invalid email' });

    const control = await storage.getDomainControlByDomain(domain);
    if (control && control.isVerified) {
      const org = await storage.getOrganization(control.organizationId);
      res.json({
        controlled: true,
        organizationName: org?.name,
        autoJoin: control.autoJoin,
      });
    } else {
      res.json({ controlled: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error checking domain' });
  }
});

export default router;
