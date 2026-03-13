import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth';

/**
 * AI Chat Routes — Proxies to Singularity HTTP API
 * 
 * POST /api/ai/chat — Send a message to Singularity, get response
 * GET  /api/ai/health — Check Singularity API health
 */

const SINGULARITY_URL = process.env.SINGULARITY_API_URL || 'http://localhost:8450';
const SINGULARITY_KEY = process.env.SINGULARITY_API_KEY || '';

interface ChatBody {
  message: string;
  sessionId?: string;
}

export async function aiRoutes(fastify: FastifyInstance) {
  // Chat endpoint — requires auth
  fastify.post<{ Body: ChatBody }>(
    '/chat',
    { preHandler: authenticate },
    async (request, reply) => {
      const { message, sessionId } = request.body;
      const user = request.user as { id: string; email: string };

      if (!message || typeof message !== 'string' || !message.trim()) {
        return reply.status(400).send({ error: 'message field is required' });
      }

      if (!SINGULARITY_KEY) {
        return reply.status(503).send({ error: 'Singularity API not configured' });
      }

      const effectiveSessionId = sessionId || `erp-${user.id}`;

      try {
        const startMs = Date.now();

        const response = await fetch(`${SINGULARITY_URL}/api/v1/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SINGULARITY_KEY}`,
          },
          body: JSON.stringify({
            message: message.trim(),
            sessionId: effectiveSessionId,
            senderId: user.id,
            senderName: user.email,
          }),
          signal: AbortSignal.timeout(300_000), // 5 min timeout
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
          request.log.error({ status: response.status, err }, 'Singularity API error');
          return reply.status(response.status).send({
            error: err.error || `Singularity returned ${response.status}`,
          });
        }

        const data = await response.json() as {
          response: string;
          sessionId: string;
          durationMs: number;
        };

        const totalMs = Date.now() - startMs;

        return reply.send({
          response: data.response,
          sessionId: data.sessionId,
          durationMs: data.durationMs || totalMs,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
          return reply.status(504).send({ error: 'Singularity request timed out' });
        }
        request.log.error(error, 'AI chat proxy error');
        return reply.status(502).send({
          error: error instanceof Error ? error.message : 'Failed to reach Singularity',
        });
      }
    }
  );

  // Health check — no auth required
  fastify.get('/health', async (_request, reply) => {
    if (!SINGULARITY_KEY) {
      return reply.send({
        status: 'unconfigured',
        message: 'SINGULARITY_API_KEY not set',
      });
    }

    try {
      const response = await fetch(`${SINGULARITY_URL}/api/v1/health`, {
        signal: AbortSignal.timeout(5_000),
      });

      if (response.ok) {
        const data = await response.json();
        return reply.send({ status: 'connected', singularity: data });
      } else {
        return reply.send({ status: 'error', httpStatus: response.status });
      }
    } catch {
      return reply.send({ status: 'unreachable' });
    }
  });
}
