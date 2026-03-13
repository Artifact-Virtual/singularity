import { FastifyInstance } from 'fastify';
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../../config/env";

const REFRESH_SIGN_OPTS: SignOptions = { expiresIn: config.jwt.refreshExpiresIn as any };
import prisma from '../../config/database';
import { hashPassword, verifyPassword } from '../../utils/password';
import { generateResetToken, getResetTokenExpiry } from '../../utils/token';
import { authenticate } from '../../middleware/auth';

interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  token: string;
  newPassword: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
    const { email, password, firstName, lastName, roleId } = request.body;

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      // Get or create default role
      let userRoleId = roleId;
      if (!userRoleId) {
        let defaultRole = await prisma.role.findUnique({ where: { name: 'user' } });
        if (!defaultRole) {
          defaultRole = await prisma.role.create({
            data: {
              name: 'user',
              description: 'Default user role',
              permissions: ['read:own'],
            },
          });
        }
        userRoleId = defaultRole.id;
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          roleId: userRoleId,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          roleId: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Generate JWT
      const token = fastify.jwt.sign({ id: user.id, email: user.email });
      const refreshToken = jwt.sign({ id: user.id }, config.jwt.refreshSecret!, REFRESH_SIGN_OPTS);

      return reply.status(201).send({
        user,
        token,
        refreshToken,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Login
  fastify.post<{ Body: LoginBody }>(
    '/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      try {
        // Find user
        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: true },
        });

        if (!user) {
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        if (!user.isActive) {
          return reply.status(403).send({ error: 'Account is inactive' });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = fastify.jwt.sign({ id: user.id, email: user.email });
        const refreshToken = jwt.sign({ id: user.id }, config.jwt.refreshSecret!, REFRESH_SIGN_OPTS);

        const { password: _, ...userWithoutPassword } = user;

        return reply.send({
          user: userWithoutPassword,
          token,
          refreshToken,
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Refresh Token
  fastify.post<{ Body: { refreshToken: string } }>(
    '/refresh',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      try {
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret!) as { id: string };

        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
        });

        if (!user || !user.isActive) {
          return reply.status(401).send({ error: 'Invalid token' });
        }

        const newToken = fastify.jwt.sign({ id: user.id, email: user.email });
        const newRefreshToken = jwt.sign({ id: user.id }, config.jwt.refreshSecret!, REFRESH_SIGN_OPTS);

        return reply.send({
          token: newToken,
          refreshToken: newRefreshToken,
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(401).send({ error: 'Invalid token' });
      }
    }
  );

  // Me (Get current user)
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.user as { id: string };

      const user = await prisma.user.findUnique({
        where: { id },
        include: { role: true },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const { password: _, ...userWithoutPassword } = user;

      return reply.send({ user: userWithoutPassword });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Forgot Password
  fastify.post<{ Body: ForgotPasswordBody }>('/forgot-password', async (request, reply) => {
    const { email } = request.body;

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Don't reveal if user exists or not
        return reply.send({ message: 'If the email exists, a reset link has been sent' });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const resetTokenExp = getResetTokenExpiry();

      // Save token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExp,
        },
      });

      // TODO: Send email with reset link
      // For now, just log it (in production, use email service)
      request.log.info(`Password reset token for ${email}: ${resetToken}`);

      return reply.send({ message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Reset Password
  fastify.post<{ Body: ResetPasswordBody }>('/reset-password', async (request, reply) => {
    const { token, newPassword } = request.body;

    try {
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExp: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        return reply.status(400).send({ error: 'Invalid or expired reset token' });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExp: null,
        },
      });

      return reply.send({ message: 'Password reset successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
