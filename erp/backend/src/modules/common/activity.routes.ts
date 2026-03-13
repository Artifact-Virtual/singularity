import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

interface ActivityBody {
  type: string; // call, email, meeting, note, task
  subject: string;
  description?: string;
  status?: string;
  dueDate?: string;
  contactId?: string;
  dealId?: string;
  projectId?: string;
}

interface ActivityQuery {
  type?: string;
  status?: string;
  userId?: string;
  contactId?: string;
  dealId?: string;
  projectId?: string;
  page?: string;
  limit?: string;
}

export async function activityRoutes(fastify: FastifyInstance) {
  // Get all activities with filters
  fastify.get<{ Querystring: ActivityQuery }>(
    '/activities',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { type, status, userId, contactId, dealId, projectId, page = '1', limit = '10' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where: any = {};

        if (type) where.type = type;
        if (status) where.status = status;
        if (userId) where.userId = userId;
        if (contactId) where.contactId = contactId;
        if (dealId) where.dealId = dealId;
        if (projectId) where.projectId = projectId;

        const [activities, total] = await Promise.all([
          prisma.activity.findMany({
            where,
            skip,
            take: parseInt(limit),
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  company: true,
                },
              },
              deal: {
                select: {
                  id: true,
                  title: true,
                  value: true,
                  stage: true,
                },
              },
              project: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.activity.count({ where }),
        ]);

        return reply.send({
          activities,
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

  // Get activity by ID
  fastify.get<{ Params: { id: string } }>(
    '/activities/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const activity = await prisma.activity.findUnique({
          where: { id },
          include: {
            user: true,
            contact: true,
            deal: true,
            project: true,
          },
        });

        if (!activity) {
          return reply.status(404).send({ error: 'Activity not found' });
        }

        return reply.send({ activity });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Create activity
  fastify.post<{ Body: ActivityBody }>(
    '/activities',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { dueDate, ...data } = request.body;
        const userId = (request.user as { id: string }).id;

        const activity = await prisma.activity.create({
          data: {
            ...data,
            userId,
            dueDate: dueDate ? new Date(dueDate) : undefined,
          },
          include: {
            user: true,
            contact: true,
            deal: true,
            project: true,
          },
        });

        return reply.status(201).send({ activity });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Update activity
  fastify.put<{ Params: { id: string }; Body: Partial<ActivityBody> }>(
    '/activities/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { dueDate, ...data } = request.body;

        const activity = await prisma.activity.update({
          where: { id },
          data: {
            ...data,
            dueDate: dueDate ? new Date(dueDate) : undefined,
          },
          include: {
            user: true,
            contact: true,
            deal: true,
            project: true,
          },
        });

        return reply.send({ activity });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Mark activity as completed
  fastify.patch<{ Params: { id: string } }>(
    '/activities/:id/complete',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const activity = await prisma.activity.update({
          where: { id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
          include: {
            user: true,
            contact: true,
            deal: true,
            project: true,
          },
        });

        return reply.send({ activity });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Delete activity
  fastify.delete<{ Params: { id: string } }>(
    '/activities/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        await prisma.activity.delete({
          where: { id },
        });

        return reply.send({ message: 'Activity deleted successfully' });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
