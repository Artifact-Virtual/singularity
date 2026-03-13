import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

export async function performanceRoutes(fastify: FastifyInstance) {
  // === Reviews ===
  fastify.get<{ Querystring: { employeeId?: string; status?: string; page?: string; limit?: string } }>(
    '/reviews',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { employeeId, status, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;

        const [reviews, total] = await Promise.all([
          prisma.performanceReview.findMany({ where, skip, take: parseInt(limit), include: { employee: { select: { id: true, firstName: true, lastName: true, department: true, position: true } } }, orderBy: { createdAt: 'desc' } }),
          prisma.performanceReview.count({ where }),
        ]);
        return reply.send({ reviews, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post<{ Body: { employeeId: string; reviewerId?: string; period: string; rating: number; strengths?: string; improvements?: string; goals?: string; status?: string } }>(
    '/reviews',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const review = await prisma.performanceReview.create({ data: request.body, include: { employee: true } });
        return reply.status(201).send({ review });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, any> }>('/reviews/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const review = await prisma.performanceReview.update({ where: { id: request.params.id }, data: request.body, include: { employee: true } });
      return reply.send({ review });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/reviews/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.performanceReview.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Review deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // === Goals ===
  fastify.get<{ Querystring: { employeeId?: string; status?: string; page?: string; limit?: string } }>(
    '/goals',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { employeeId, status, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;

        const [goals, total] = await Promise.all([
          prisma.goal.findMany({ where, skip, take: parseInt(limit), include: { employee: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } }),
          prisma.goal.count({ where }),
        ]);
        return reply.send({ goals, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post<{ Body: { employeeId: string; title: string; description?: string; status?: string; priority?: string; dueDate?: string; progress?: number } }>(
    '/goals',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { dueDate, ...data } = request.body;
        const goal = await prisma.goal.create({ data: { ...data, dueDate: dueDate ? new Date(dueDate) : undefined }, include: { employee: true } });
        return reply.status(201).send({ goal });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, any> }>('/goals/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { dueDate, ...data } = request.body;
      const goal = await prisma.goal.update({ where: { id: request.params.id }, data: { ...data, ...(dueDate ? { dueDate: new Date(dueDate) } : {}) }, include: { employee: true } });
      return reply.send({ goal });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/goals/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.goal.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Goal deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
