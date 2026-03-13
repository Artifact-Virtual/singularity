import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

export async function stakeholderRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { type?: string; status?: string; page?: string; limit?: string } }>(
    '/stakeholders',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { type, status, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (type) where.type = type;
        if (status) where.status = status;

        const [stakeholders, total] = await Promise.all([
          prisma.stakeholder.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
          prisma.stakeholder.count({ where }),
        ]);
        return reply.send({ stakeholders, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>('/stakeholders/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const stakeholder = await prisma.stakeholder.findUnique({ where: { id: request.params.id } });
      if (!stakeholder) return reply.status(404).send({ error: 'Stakeholder not found' });
      return reply.send({ stakeholder });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post<{ Body: { name: string; type: string; email?: string; phone?: string; company?: string; title?: string; investment?: number; equity?: number; status?: string; notes?: string; joinDate?: string } }>(
    '/stakeholders',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { joinDate, ...data } = request.body;
        const stakeholder = await prisma.stakeholder.create({
          data: { ...data, joinDate: joinDate ? new Date(joinDate) : undefined },
        });
        return reply.status(201).send({ stakeholder });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, any> }>('/stakeholders/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { joinDate, ...data } = request.body;
      const stakeholder = await prisma.stakeholder.update({
        where: { id: request.params.id },
        data: { ...data, ...(joinDate ? { joinDate: new Date(joinDate) } : {}) },
      });
      return reply.send({ stakeholder });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/stakeholders/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.stakeholder.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Stakeholder deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
