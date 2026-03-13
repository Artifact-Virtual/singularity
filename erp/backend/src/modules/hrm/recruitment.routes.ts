import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

export async function recruitmentRoutes(fastify: FastifyInstance) {
  // === Job Postings ===
  fastify.get<{ Querystring: { status?: string; department?: string; page?: string; limit?: string } }>(
    '/jobs',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { status, department, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (status) where.status = status;
        if (department) where.department = department;

        const [jobs, total] = await Promise.all([
          prisma.jobPosting.findMany({ where, skip, take: parseInt(limit), include: { _count: { select: { applicants: true } } }, orderBy: { createdAt: 'desc' } }),
          prisma.jobPosting.count({ where }),
        ]);
        return reply.send({ jobs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>('/jobs/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const job = await prisma.jobPosting.findUnique({ where: { id: request.params.id }, include: { applicants: true } });
      if (!job) return reply.status(404).send({ error: 'Job posting not found' });
      return reply.send({ job });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post<{ Body: { title: string; department: string; location?: string; type?: string; status?: string; description?: string; requirements?: string; salaryMin?: number; salaryMax?: number } }>(
    '/jobs',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const job = await prisma.jobPosting.create({ data: request.body });
        return reply.status(201).send({ job });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, any> }>('/jobs/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const job = await prisma.jobPosting.update({ where: { id: request.params.id }, data: request.body });
      return reply.send({ job });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/jobs/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.jobPosting.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Job posting deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // === Applicants ===
  fastify.get<{ Querystring: { jobId?: string; status?: string; page?: string; limit?: string } }>(
    '/applicants',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { jobId, status, page = '1', limit = '50' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where: any = {};
        if (jobId) where.jobId = jobId;
        if (status) where.status = status;

        const [applicants, total] = await Promise.all([
          prisma.applicant.findMany({ where, skip, take: parseInt(limit), include: { job: { select: { id: true, title: true, department: true } } }, orderBy: { createdAt: 'desc' } }),
          prisma.applicant.count({ where }),
        ]);
        return reply.send({ applicants, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post<{ Body: { firstName: string; lastName: string; email: string; phone?: string; resume?: string; status?: string; rating?: number; notes?: string; jobId: string } }>(
    '/applicants',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const applicant = await prisma.applicant.create({ data: request.body, include: { job: true } });
        return reply.status(201).send({ applicant });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, any> }>('/applicants/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const applicant = await prisma.applicant.update({ where: { id: request.params.id }, data: request.body, include: { job: true } });
      return reply.send({ applicant });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/applicants/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      await prisma.applicant.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'Applicant deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
