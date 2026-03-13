# AV-ERP Backend - Quick Start Guide

Welcome to the Artifact Virtual ERP backend! This guide will get you up and running in minutes.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ (or use Docker)
- Git

### Option 1: Local Development with Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Artifact-Virtual/av-erp.git
cd av-erp/backend

# 2. Install dependencies
npm install

# 3. Start PostgreSQL and Redis with Docker
docker-compose up -d

# 4. Set up environment variables
cp .env.example .env
# Edit .env if needed (default values work for Docker setup)

# 5. Generate Prisma client
npm run prisma:generate

# 6. Run database migrations
npm run prisma:migrate

# 7. Start the development server
npm run dev
```

The API will be available at:
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health

### Option 2: Without Docker

```bash
# 1. Install PostgreSQL locally
# (macOS): brew install postgresql
# (Ubuntu): sudo apt-get install postgresql

# 2. Create database
createdb av_erp

# 3. Follow steps 1, 2, 4-7 from Option 1
# Make sure DATABASE_URL in .env points to your local PostgreSQL
```

## 📚 Documentation

- **[API.md](./API.md)** - Complete API endpoint documentation
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guides for Railway, Render, Heroku
- **[SECURITY.md](./SECURITY.md)** - Security measures and best practices
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Comprehensive project overview
- **[README.md](./README.md)** - Detailed project information

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run dev:test
```

## 🔑 First Steps

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@artifactvirtual.com",
    "password": "SecurePass123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@artifactvirtual.com",
    "password": "SecurePass123!"
  }'
```

Save the `token` from the response.

### 3. Create a Contact

```bash
curl -X POST http://localhost:3000/api/crm/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "status": "active"
  }'
```

## 📊 Available Modules

### Authentication (`/api/auth`)
- User registration & login
- JWT token management
- Password reset
- Role management

### CRM (`/api/crm`)
- Contact management
- Deal pipeline tracking
- Search & filtering

### Development (`/api/development`)
- Project management
- Status & progress tracking

### Finance (`/api/finance`)
- Invoice management
- Payment tracking
- PDF generation (coming soon)

### HRM (`/api/hrm`)
- Employee management
- Department organization

### Activities (`/api/activities`)
- Universal activity tracking
- Cross-module linking

## 🛠️ Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm start                # Start production server

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio (DB GUI)
npm run prisma:push      # Push schema changes (dev only)

# Testing
npm test                 # Run tests
npm run test:coverage    # Test with coverage

# Docker
docker-compose up -d     # Start services
docker-compose down      # Stop services
docker-compose logs      # View logs
```

## 🐛 Troubleshooting

### Database Connection Error
```
Error: Can't reach database server
```
**Solution**: Make sure PostgreSQL is running and DATABASE_URL is correct.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: Change PORT in .env or stop the process using port 3000.

### Prisma Client Not Generated
```
Error: @prisma/client did not initialize yet
```
**Solution**: Run `npm run prisma:generate`

### JWT Token Invalid
```
Error: Unauthorized
```
**Solution**: Make sure you're using a valid token and it hasn't expired.

## 🌐 Deployment

### Quick Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add postgresql

# Deploy
railway up

# Run migrations
railway run npm run prisma:migrate
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 📖 API Examples

### Using Swagger UI
Visit http://localhost:3000/docs for an interactive API explorer where you can:
- View all endpoints
- Test API calls
- See request/response schemas
- Authenticate and try protected endpoints

### Using Postman
Import the OpenAPI spec from http://localhost:3000/docs/json for use with Postman.

## 🔒 Security

- JWT authentication required for all protected endpoints
- Rate limiting: 100 req/min globally, 5 req/min for login
- Password hashing with bcrypt
- SQL injection prevention via Prisma ORM
- CORS configured
- Environment variables for secrets

See [SECURITY.md](./SECURITY.md) for complete security documentation.

## 📈 What's Next?

### Immediate Next Steps
1. Create your first user account
2. Explore the Swagger documentation
3. Test the API endpoints
4. Review the database models in Prisma Studio

### Future Enhancements
- S3 file storage integration
- Email notifications
- Background job processing with BullMQ
- PDF invoice generation
- Advanced reporting
- WebSocket support for real-time updates

## 💡 Tips

- Use Prisma Studio (`npm run prisma:studio`) to view and edit database data
- Check the Swagger docs (`/docs`) for detailed API information
- Run tests before making changes to ensure nothing breaks
- Use Docker for a consistent development environment
- Keep your dependencies updated with `npm audit`

## 🤝 Support

- **Documentation**: Check the docs in this directory
- **Issues**: Open an issue on GitHub
- **Email**: support@artifactvirtual.com

## 📄 License

ISC - See LICENSE file for details

---

**Happy Coding! 🚀**

For more information, see the full documentation in this directory.
