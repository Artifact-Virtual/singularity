import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

export async function pipelineRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { status?: string; page?: string; limit?: string } }>(
    '/pipelines',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { status, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (status) where.status = status;

        const [pipelines, total] = await Promise.all([
          prisma.pipeline.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
          prisma.pipeline.count({ where }),
        ]);
        return reply.send({ pipelines, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post<{ Body: { name: string; repository?: string; branch?: string; status?: string; trigger?: string; stages?: any } }>(
    '/pipelines',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const pipeline = await prisma.pipeline.create({ data: request.body });
        return reply.status(201).send({ pipeline });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, any> }>('/pipelines/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { lastRunAt, ...data } = request.body;
      const pipeline = await prisma.pipeline.update({
        where: { id: request.params.id },
        data: { ...data, ...(lastRunAt ? { lastRunAt: new Date(lastRunAt) } : {}) },
      });
      return reply.send({ pipeline });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/pipelines/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.pipeline.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Pipeline deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
