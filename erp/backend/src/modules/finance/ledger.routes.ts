import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

export async function ledgerRoutes(fastify: FastifyInstance) {
  // === Accounts ===
  fastify.get<{ Querystring: { type?: string; page?: string; limit?: string } }>(
    '/accounts',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { type, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (type) where.type = type;

        const [accounts, total] = await Promise.all([
          prisma.ledgerAccount.findMany({ where, skip, take: parseInt(limit), orderBy: { code: 'asc' } }),
          prisma.ledgerAccount.count({ where }),
        ]);
        return reply.send({ accounts, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post<{ Body: { code: string; name: string; type: string; balance?: number; description?: string } }>(
    '/accounts',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const account = await prisma.ledgerAccount.create({ data: request.body });
        return reply.status(201).send({ account });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, any> }>('/accounts/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const account = await prisma.ledgerAccount.update({ where: { id: request.params.id }, data: request.body });
      return reply.send({ account });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/accounts/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.ledgerAccount.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Account deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // === Journal Entries ===
  fastify.get<{ Querystring: { accountId?: string; page?: string; limit?: string } }>(
    '/journal',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { accountId, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (accountId) where.accountId = accountId;

        const [entries, total] = await Promise.all([
          prisma.journalEntry.findMany({ where, skip, take: parseInt(limit), include: { account: { select: { id: true, code: true, name: true, type: true } } }, orderBy: { date: 'desc' } }),
          prisma.journalEntry.count({ where }),
        ]);
        return reply.send({ entries, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post<{ Body: { accountId: string; date?: string; description: string; debit?: number; credit?: number; reference?: string } }>(
    '/journal',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { date, ...data } = request.body;
        const entry = await prisma.journalEntry.create({
          data: { ...data, date: date ? new Date(date) : new Date() },
          include: { account: true },
        });
        // Update account balance
        const balanceChange = (data.debit || 0) - (data.credit || 0);
        await prisma.ledgerAccount.update({
          where: { id: data.accountId },
          data: { balance: { increment: balanceChange } },
        });
        return reply.status(201).send({ entry });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>('/journal/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const entry = await prisma.journalEntry.findUnique({ where: { id: request.params.id } });
      if (!entry) return reply.status(404).send({ error: 'Entry not found' });
      // Reverse balance change
      const balanceChange = (entry.debit || 0) - (entry.credit || 0);
      await prisma.ledgerAccount.update({
        where: { id: entry.accountId },
        data: { balance: { decrement: balanceChange } },
      });
      await prisma.journalEntry.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Journal entry deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
