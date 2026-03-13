import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

interface ProjectBody {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  progress?: number;
  employeeId: string;
}

interface ProjectQuery {
  status?: string;
  priority?: string;
  employeeId?: string;
  page?: string;
  limit?: string;
}

export async function projectRoutes(fastify: FastifyInstance) {
  // Get all projects with filters
  fastify.get<{ Querystring: ProjectQuery }>(
    '/projects',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { status, priority, employeeId, page = '1', limit = '10' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where: any = {};

        if (status) {
          where.status = status;
        }

        if (priority) {
          where.priority = priority;
        }

        if (employeeId) {
          where.employeeId = employeeId;
        }

        const [projects, total] = await Promise.all([
          prisma.project.findMany({
            where,
            skip,
            take: parseInt(limit),
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  department: true,
                  position: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.project.count({ where }),
        ]);

        return reply.send({
          projects,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Get project by ID
  fastify.get<{ Params: { id: string } }>(
    '/projects/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const project = await prisma.project.findUnique({
          where: { id },
          include: {
            employee: true,
            activities: true,
          },
        });

        if (!project) {
          return reply.status(404).send({ error: 'Project not found' });
        }

        return reply.send({ project });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Create project
  fastify.post<{ Body: ProjectBody }>(
    '/projects',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { startDate, endDate, ...data } = request.body;

        const project = await prisma.project.create({
          data: {
            ...data,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
          },
          include: {
            employee: true,
          },
        });

        return reply.status(201).send({ project });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Update project
  fastify.put<{ Params: { id: string }; Body: Partial<ProjectBody> }>(
    '/projects/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { startDate, endDate, ...data } = request.body;

        const project = await prisma.project.update({
          where: { id },
          data: {
            ...data,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
          },
          include: {
            employee: true,
          },
        });

        return reply.send({ project });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Update project status
  fastify.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/projects/:id/status',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { status } = request.body;

        const project = await prisma.project.update({
          where: { id },
          data: { status },
          include: {
            employee: true,
          },
        });

        return reply.send({ project });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Update project progress
  fastify.patch<{ Params: { id: string }; Body: { progress: number } }>(
    '/projects/:id/progress',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { progress } = request.body;

        if (progress < 0 || progress > 100) {
          return reply.status(400).send({ error: 'Progress must be between 0 and 100' });
        }

        const project = await prisma.project.update({
          where: { id },
          data: { progress },
          include: {
            employee: true,
          },
        });

        return reply.send({ project });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Delete project
  fastify.delete<{ Params: { id: string } }>(
    '/projects/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        await prisma.project.delete({
          where: { id },
        });

        return reply.send({ message: 'Project deleted successfully' });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
