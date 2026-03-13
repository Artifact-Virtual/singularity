import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

export async function billRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { status?: string; category?: string; page?: string; limit?: string } }>(
    '/bills',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { status, category, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (status) where.status = status;
        if (category) where.category = category;

        const [bills, total] = await Promise.all([
          prisma.bill.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
          prisma.bill.count({ where }),
        ]);
        return reply.send({ bills, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post<{ Body: { billNumber: string; vendorName: string; vendorEmail?: string; description?: string; amount: number; currency?: string; status?: string; dueDate: string; category?: string; notes?: string } }>(
    '/bills',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { dueDate, ...data } = request.body;
        const bill = await prisma.bill.create({ data: { ...data, dueDate: new Date(dueDate) } });
        return reply.status(201).send({ bill });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, any> }>('/bills/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { dueDate, paidDate, ...data } = request.body;
      const bill = await prisma.bill.update({
        where: { id: request.params.id },
        data: { ...data, ...(dueDate ? { dueDate: new Date(dueDate) } : {}), ...(paidDate ? { paidDate: new Date(paidDate) } : {}) },
      });
      return reply.send({ bill });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/bills/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.bill.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Bill deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
