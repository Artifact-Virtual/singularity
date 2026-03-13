import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

interface RoleBody {
  name: string;
  description?: string;
  permissions: string[];
}

export async function roleRoutes(fastify: FastifyInstance) {
  // Get all roles
  fastify.get('/roles', { preHandler: authenticate }, async (request, reply) => {
    try {
      const roles = await prisma.role.findMany({
        include: {
          _count: {
            select: { users: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ roles });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get role by ID
  fastify.get<{ Params: { id: string } }>(
    '/roles/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const role = await prisma.role.findUnique({
          where: { id },
          include: {
            users: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (!role) {
          return reply.status(404).send({ error: 'Role not found' });
        }

        return reply.send({ role });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Create role
  fastify.post<{ Body: RoleBody }>(
    '/roles',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const data = request.body;

        const role = await prisma.role.create({
          data,
        });

        return reply.status(201).send({ role });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Update role
  fastify.put<{ Params: { id: string }; Body: Partial<RoleBody> }>(
    '/roles/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const data = request.body;

        const role = await prisma.role.update({
          where: { id },
          data,
        });

        return reply.send({ role });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Delete role
  fastify.delete<{ Params: { id: string } }>(
    '/roles/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Check if any users have this role
        const usersWithRole = await prisma.user.count({
          where: { roleId: id },
        });

        if (usersWithRole > 0) {
          return reply.status(400).send({
            error: 'Cannot delete role with assigned users',
            usersCount: usersWithRole,
          });
        }

        await prisma.role.delete({
          where: { id },
        });

        return reply.send({ message: 'Role deleted successfully' });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
