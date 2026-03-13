import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

export async function deploymentRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { environment?: string; status?: string; page?: string; limit?: string } }>(
    '/deployments',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { environment, status, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (environment) where.environment = environment;
        if (status) where.status = status;

        const [deployments, total] = await Promise.all([
          prisma.deployment.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
          prisma.deployment.count({ where }),
        ]);
        return reply.send({ deployments, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post<{ Body: { environment: string; version: string; status?: string; deployedBy?: string; changelog?: string; rollbackOf?: string } }>(
    '/deployments',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const deployment = await prisma.deployment.create({
          data: { ...request.body, deployedAt: new Date() },
        });
        return reply.status(201).send({ deployment });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, any> }>('/deployments/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { deployedAt, completedAt, ...data } = request.body;
      const deployment = await prisma.deployment.update({
        where: { id: request.params.id },
        data: {
          ...data,
          ...(deployedAt ? { deployedAt: new Date(deployedAt) } : {}),
          ...(completedAt ? { completedAt: new Date(completedAt) } : {}),
        },
      });
      return reply.send({ deployment });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/deployments/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.deployment.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Deployment deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
