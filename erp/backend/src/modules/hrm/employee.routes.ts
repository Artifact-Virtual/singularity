import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

interface EmployeeBody {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  salary?: number;
  hireDate: string;
  status?: string;
  address?: string;
  emergencyContact?: string;
}

interface EmployeeQuery {
  department?: string;
  status?: string;
  page?: string;
  limit?: string;
}

export async function employeeRoutes(fastify: FastifyInstance) {
  // Get all employees with filters
  fastify.get<{ Querystring: EmployeeQuery }>(
    '/employees',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { department, status, page = '1', limit = '10' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where: any = {};

        if (department) {
          where.department = department;
        }

        if (status) {
          where.status = status;
        }

        const [employees, total] = await Promise.all([
          prisma.employee.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' },
          }),
          prisma.employee.count({ where }),
        ]);

        return reply.send({
          employees,
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

  // Get employees by department
  fastify.get('/employees/by-department', { preHandler: authenticate }, async (request, reply) => {
    try {
      const employees = await prisma.employee.groupBy({
        by: ['department'],
        _count: true,
      });

      return reply.send({ departments: employees });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get employee by ID
  fastify.get<{ Params: { id: string } }>(
    '/employees/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const employee = await prisma.employee.findUnique({
          where: { id },
          include: {
            projects: true,
          },
        });

        if (!employee) {
          return reply.status(404).send({ error: 'Employee not found' });
        }

        return reply.send({ employee });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Create employee
  fastify.post<{ Body: EmployeeBody }>(
    '/employees',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { hireDate, ...data } = request.body;

        const employee = await prisma.employee.create({
          data: {
            ...data,
            hireDate: new Date(hireDate),
          },
        });

        return reply.status(201).send({ employee });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Update employee
  fastify.put<{ Params: { id: string }; Body: Partial<EmployeeBody> }>(
    '/employees/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { hireDate, ...data } = request.body;

        const employee = await prisma.employee.update({
          where: { id },
          data: {
            ...data,
            hireDate: hireDate ? new Date(hireDate) : undefined,
          },
        });

        return reply.send({ employee });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Update employee status
  fastify.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/employees/:id/status',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { status } = request.body;

        const employee = await prisma.employee.update({
          where: { id },
          data: { status },
        });

        return reply.send({ employee });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Delete employee
  fastify.delete<{ Params: { id: string } }>(
    '/employees/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        await prisma.employee.delete({
          where: { id },
        });

        return reply.send({ message: 'Employee deleted successfully' });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
