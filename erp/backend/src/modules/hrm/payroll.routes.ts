import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

export async function payrollRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { employeeId?: string; status?: string; period?: string; page?: string; limit?: string } }>(
    '/payroll',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { employeeId, status, period, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;
        if (period) where.period = period;

        const [runs, total] = await Promise.all([
          prisma.payrollRun.findMany({ where, skip, take: parseInt(limit), include: { employee: { select: { id: true, firstName: true, lastName: true, department: true, position: true, salary: true } } }, orderBy: { createdAt: 'desc' } }),
          prisma.payrollRun.count({ where }),
        ]);
        return reply.send({ payrollRuns: runs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post<{ Body: { employeeId: string; period: string; baseSalary: number; deductions?: number; bonuses?: number; netPay: number; status?: string; paidDate?: string; notes?: string } }>(
    '/payroll',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { paidDate, ...data } = request.body;
        const run = await prisma.payrollRun.create({ data: { ...data, paidDate: paidDate ? new Date(paidDate) : undefined }, include: { employee: true } });
        return reply.status(201).send({ payrollRun: run });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, any> }>('/payroll/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { paidDate, ...data } = request.body;
      const run = await prisma.payrollRun.update({ where: { id: request.params.id }, data: { ...data, ...(paidDate ? { paidDate: new Date(paidDate) } : {}) }, include: { employee: true } });
      return reply.send({ payrollRun: run });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/payroll/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.payrollRun.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Payroll run deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
