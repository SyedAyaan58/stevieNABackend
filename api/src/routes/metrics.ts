import { Router, Request, Response } from 'express';
import { register } from '../utils/metrics';
import { internalAuth } from '../middleware/internalAuth';

const router = Router();

/**
 * GET /metrics
 *
 * Prometheus metrics endpoint (requires internal API key)
 * Returns metrics in Prometheus text format
 */
router.get('/', internalAuth, async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end('Error collecting metrics');
  }
});

export default router;
