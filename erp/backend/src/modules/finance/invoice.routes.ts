import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

interface InvoiceBody {
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  status?: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  items?: any;
  notes?: string;
}

interface InvoiceQuery {
  status?: string;
  clientEmail?: string;
  page?: string;
  limit?: string;
}

export async function invoiceRoutes(fastify: FastifyInstance) {
  // Get all invoices with filters
  fastify.get<{ Querystring: InvoiceQuery }>(
    '/invoices',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { status, clientEmail, page = '1', limit = '10' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where: any = {};

        if (status) {
          where.status = status;
        }

        if (clientEmail) {
          where.clientEmail = clientEmail;
        }

        const [invoices, total] = await Promise.all([
          prisma.invoice.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' },
          }),
          prisma.invoice.count({ where }),
        ]);

        return reply.send({
          invoices,
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

  // Get invoice by ID
  fastify.get<{ Params: { id: string } }>(
    '/invoices/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const invoice = await prisma.invoice.findUnique({
          where: { id },
        });

        if (!invoice) {
          return reply.status(404).send({ error: 'Invoice not found' });
        }

        return reply.send({ invoice });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Create invoice
  fastify.post<{ Body: InvoiceBody }>(
    '/invoices',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { dueDate, ...data } = request.body;

        // Generate invoice number
        const count = await prisma.invoice.count();
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

        const invoice = await prisma.invoice.create({
          data: {
            ...data,
            invoiceNumber,
            dueDate: new Date(dueDate),
          },
        });

        return reply.status(201).send({ invoice });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Update invoice
  fastify.put<{ Params: { id: string }; Body: Partial<InvoiceBody> }>(
    '/invoices/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { dueDate, ...data } = request.body;

        const invoice = await prisma.invoice.update({
          where: { id },
          data: {
            ...data,
            dueDate: dueDate ? new Date(dueDate) : undefined,
          },
        });

        return reply.send({ invoice });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Update invoice status
  fastify.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/invoices/:id/status',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { status } = request.body;

        const invoice = await prisma.invoice.update({
          where: { id },
          data: { status },
        });

        return reply.send({ invoice });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Record payment
  fastify.post<{
    Params: { id: string };
    Body: { paidAmount: number; paymentMethod: string };
  }>('/invoices/:id/payment', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { paidAmount, paymentMethod } = request.body;

      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          paidAmount,
          paymentMethod,
          paidDate: new Date(),
          status: 'paid',
        },
      });

      return reply.send({ invoice });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Generate PDF (placeholder - will implement with pdfkit or puppeteer)
  fastify.get<{ Params: { id: string } }>(
    '/invoices/:id/pdf',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const invoice = await prisma.invoice.findUnique({
          where: { id },
        });

        if (!invoice) {
          return reply.status(404).send({ error: 'Invoice not found' });
        }

        // TODO: Generate PDF with pdfkit or puppeteer
        // For now, return a placeholder
        return reply.send({
          message: 'PDF generation endpoint',
          invoice,
          note: 'PDF generation will be implemented in Week 5-6',
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Delete invoice
  fastify.delete<{ Params: { id: string } }>(
    '/invoices/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params;

        await prisma.invoice.delete({
          where: { id },
        });

        return reply.send({ message: 'Invoice deleted successfully' });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
