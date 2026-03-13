import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { hashPassword } from '../../utils/password';
import { authenticate } from '../../middleware/auth';

interface UpdateUserBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  roleId?: string;
  isActive?: boolean;
}

interface CreateUserBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId?: string;
}

export async function userRoutes(fastify: FastifyInstance) {
  // List all users (admin only)
  fastify.get('/users', { preHandler: authenticate }, async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        include: { role: true },
        orderBy: { createdAt: 'desc' },
      });

      const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);
      return reply.send({ data: usersWithoutPasswords, total: usersWithoutPasswords.length });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get single user
  fastify.get<{ Params: { id: string } }>('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.params.id },
        include: { role: true },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const { password: _, ...userWithoutPassword } = user;
      return reply.send(userWithoutPassword);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create user (admin only)
  fastify.post<{ Body: CreateUserBody }>('/users', { preHandler: authenticate }, async (request, reply) => {
    const { email, password, firstName, lastName, roleId } = request.body;

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(400).send({ error: 'User with this email already exists' });
      }

      let userRoleId = roleId;
      if (!userRoleId) {
        let defaultRole = await prisma.role.findUnique({ where: { name: 'user' } });
        if (!defaultRole) {
          defaultRole = await prisma.role.create({
            data: { name: 'user', description: 'Default user role', permissions: ['read:own'] },
          });
        }
        userRoleId = defaultRole.id;
      }

      const hashedPassword = await hashPassword(password);

      const user = await prisma.user.create({
        data: { email, password: hashedPassword, firstName, lastName, roleId: userRoleId },
        include: { role: true },
      });

      const { password: _, ...userWithoutPassword } = user;
      return reply.status(201).send(userWithoutPassword);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update user
  fastify.put<{ Params: { id: string }; Body: UpdateUserBody }>('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: request.body,
        include: { role: true },
      });

      const { password: _, ...userWithoutPassword } = user;
      return reply.send(userWithoutPassword);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete user
  fastify.delete<{ Params: { id: string } }>('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      // Prevent self-deletion
      const { id: currentUserId } = request.user as { id: string };
      if (request.params.id === currentUserId) {
        return reply.status(400).send({ error: 'Cannot delete your own account' });
      }

      await prisma.user.delete({ where: { id: request.params.id } });
      return reply.send({ message: 'User deleted' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // List all roles
  fastify.get('/roles', { preHandler: authenticate }, async (request, reply) => {
    try {
      const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
      return reply.send({ data: roles, total: roles.length });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
