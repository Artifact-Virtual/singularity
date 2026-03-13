import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

interface DealBody {
  title: string;
  description?: string;
  value: number;
  currency?: string;
  stage: string;
  probability?: number;
  expectedCloseDate?: string;
  contactId: string;
}

interface DealQuery {
  stage?: string;
  contactId?: string;
  page?: string;
  limit?: string;
}

const dealPipeline = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'closed-won',
  'closed-lost',
];

export async function dealRoutes(fastify: FastifyInstance) {
  // Get all deals with filters
  fastify.get<{ Querystring: DealQuery }>(
    '/deals',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { stage, contactId, page = '1', limit = '10' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where: any = {};

        if (stage) {
          where.stage = stage;
        }

        if (contactId) {
          where.contactId = contactId;
        }

        const [deals, total] = await Promise.all([
          prisma.deal.findMany({
            where,
            skip,
            take: parseInt(limit),
            include: {
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  company: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.deal.count({ where }),
        ]);

        return reply.send({
          deals,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Get deal pipeline stats
  fastify.get('/deals/pipeline', { preHandler: authenticate }, async (request, reply) => {
    try {
      const stats = await Promise.all(
        dealPipeline.map(async (stage) => {
          const result = await prisma.deal.aggregate({
            where: { stage },
            _count: true,
            _sum: { value: true },
          });

          return {
            stage,
            count: result._count,
            totalValue: result._sum.value || 0,
          };
        })
      );

      return reply.send({ pipeline: stats });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get deal by ID
  fastify.get<{ Params: { id: string } }>(
    '/deals/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const deal = await prisma.deal.findUnique({
          where: { id },
          include: {
            contact: true,
            activities: true,
          },
        });

        if (!deal) {
          return reply.status(404).send({ error: 'Deal not found' });
        }

        return reply.send({ deal });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Create deal
  fastify.post<{ Body: DealBody }>(
    '/deals',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { expectedCloseDate, ...data } = request.body;

        const deal = await prisma.deal.create({
          data: {
            ...data,
            expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
          },
          include: {
            contact: true,
          },
        });

        return reply.status(201).send({ deal });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Update deal
  fastify.put<{ Params: { id: string }; Body: Partial<DealBody> }>(
    '/deals/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { expectedCloseDate, ...data } = request.body;

        // If stage is being updated to closed-won or closed-lost, set actualCloseDate
        let actualCloseDate;
        if (data.stage === 'closed-won' || data.stage === 'closed-lost') {
          actualCloseDate = new Date();
        }

        const deal = await prisma.deal.update({
          where: { id },
          data: {
            ...data,
            expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
            actualCloseDate,
          },
          include: {
            contact: true,
          },
        });

        return reply.send({ deal });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Delete deal
  fastify.delete<{ Params: { id: string } }>(
    '/deals/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        await prisma.deal.delete({
          where: { id },
        });

        return reply.send({ message: 'Deal deleted successfully' });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
