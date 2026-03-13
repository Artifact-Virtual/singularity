import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

interface CampaignBody {
  name: string;
  type: string;
  status?: string;
  budget?: number;
  spent?: number;
  startDate?: string;
  endDate?: string;
  leads?: number;
  conversions?: number;
  revenue?: number;
  description?: string;
}

export async function campaignRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { status?: string; type?: string; page?: string; limit?: string } }>(
    '/campaigns',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { status, type, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (status) where.status = status;
        if (type) where.type = type;

        const [campaigns, total] = await Promise.all([
          prisma.campaign.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
          prisma.campaign.count({ where }),
        ]);

        return reply.send({ campaigns, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>('/campaigns/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const campaign = await prisma.campaign.findUnique({ where: { id: request.params.id } });
      if (!campaign) return reply.status(404).send({ error: 'Campaign not found' });
      return reply.send({ campaign });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post<{ Body: CampaignBody }>('/campaigns', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { startDate, endDate, ...data } = request.body;
      const campaign = await prisma.campaign.create({
        data: {
          ...data,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      });
      return reply.status(201).send({ campaign });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.put<{ Params: { id: string }; Body: Partial<CampaignBody> }>('/campaigns/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { startDate, endDate, ...data } = request.body;
      const campaign = await prisma.campaign.update({
        where: { id: request.params.id },
        data: {
          ...data,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      });
      return reply.send({ campaign });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/campaigns/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.campaign.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Campaign deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
