import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

interface ContactBody {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  address?: string;
  status?: string;
  source?: string;
  tags?: string[];
  notes?: string;
}

interface ContactQuery {
  search?: string;
  status?: string;
  page?: string;
  limit?: string;
}

export async function contactRoutes(fastify: FastifyInstance) {
  // Get all contacts with search/filter
  fastify.get<{ Querystring: ContactQuery }>(
    '/contacts',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { search, status, page = '1', limit = '10' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where: any = {};

        if (search) {
          where.OR = [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (status) {
          where.status = status;
        }

        const [contacts, total] = await Promise.all([
          prisma.contact.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' },
          }),
          prisma.contact.count({ where }),
        ]);

        return reply.send({
          contacts,
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

  // Get contact by ID
  fastify.get<{ Params: { id: string } }>(
    '/contacts/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const contact = await prisma.contact.findUnique({
          where: { id },
          include: {
            deals: true,
            activities: true,
          },
        });

        if (!contact) {
          return reply.status(404).send({ error: 'Contact not found' });
        }

        return reply.send({ contact });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Create contact
  fastify.post<{ Body: ContactBody }>(
    '/contacts',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const data = request.body;

        const contact = await prisma.contact.create({
          data,
        });

        return reply.status(201).send({ contact });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Update contact
  fastify.put<{ Params: { id: string }; Body: Partial<ContactBody> }>(
    '/contacts/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const data = request.body;

        const contact = await prisma.contact.update({
          where: { id },
          data,
        });

        return reply.send({ contact });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Delete contact
  fastify.delete<{ Params: { id: string } }>(
    '/contacts/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        await prisma.contact.delete({
          where: { id },
        });

        return reply.send({ message: 'Contact deleted successfully' });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
