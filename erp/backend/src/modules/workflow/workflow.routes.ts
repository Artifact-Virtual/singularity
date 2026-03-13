import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

export async function workflowRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { status?: string; page?: string; limit?: string } }>(
    '/workflows',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { status, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (status) where.status = status;

        const [workflows, total] = await Promise.all([
          prisma.workflow.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
          prisma.workflow.count({ where }),
        ]);
        return reply.send({ workflows, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>('/workflows/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const workflow = await prisma.workflow.findUnique({ where: { id: request.params.id } });
      if (!workflow) return reply.status(404).send({ error: 'Workflow not found' });
      return reply.send({ workflow });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post<{ Body: { name: string; description?: string; status?: string; trigger?: string; steps?: any } }>(
    '/workflows',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const workflow = await prisma.workflow.create({ data: request.body });
        return reply.status(201).send({ workflow });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, any> }>('/workflows/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const workflow = await prisma.workflow.update({ where: { id: request.params.id }, data: request.body });
      return reply.send({ workflow });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/workflows/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.workflow.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Workflow deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
