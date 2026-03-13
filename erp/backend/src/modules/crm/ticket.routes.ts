import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

interface TicketBody {
  subject: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  contactId?: string;
  assignee?: string;
  resolution?: string;
}

export async function ticketRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { status?: string; priority?: string; page?: string; limit?: string } }>(
    '/tickets',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { status, priority, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (status) where.status = status;
        if (priority) where.priority = priority;

        const [tickets, total] = await Promise.all([
          prisma.ticket.findMany({ where, skip, take: parseInt(limit), include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
          prisma.ticket.count({ where }),
        ]);

        return reply.send({ tickets, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>('/tickets/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const ticket = await prisma.ticket.findUnique({ where: { id: request.params.id }, include: { contact: true } });
      if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });
      return reply.send({ ticket });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post<{ Body: TicketBody }>('/tickets', { preHandler: authenticate }, async (request, reply) => {
    try {
      const ticket = await prisma.ticket.create({ data: request.body, include: { contact: true } });
      return reply.status(201).send({ ticket });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.put<{ Params: { id: string }; Body: Partial<TicketBody> }>('/tickets/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const ticket = await prisma.ticket.update({ where: { id: request.params.id }, data: request.body, include: { contact: true } });
      return reply.send({ ticket });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/tickets/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.ticket.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Ticket deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
