# Backend Deployment Guide

## Prerequisites

- Docker and Docker Compose (for local development)
- Node.js 18+ and npm (for direct deployment)
- PostgreSQL 14+ (production database)
- Redis 7+ (for background jobs)

## Local Development with Docker

1. Start PostgreSQL and Redis:
```bash
docker-compose up -d
```

2. Run database migrations:
```bash
npm run prisma:migrate
```

3. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Production Deployment

### Option 1: Docker Deployment

1. Build the Docker image:
```bash
docker build -t av-erp-backend:latest .
```

2. Run the container:
```bash
docker run -d \
  --name av-erp-backend \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret-key" \
  -e JWT_REFRESH_SECRET="your-refresh-secret" \
  av-erp-backend:latest
```

### Option 2: Railway Deployment

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Create a new project:
```bash
railway init
```

4. Add PostgreSQL:
```bash
railway add postgresql
```

5. Deploy:
```bash
railway up
```

6. Run migrations:
```bash
railway run npm run prisma:migrate
```

### Option 3: Render Deployment

1. Create a new Web Service on Render.com
2. Connect your GitHub repository
3. Set build command: `npm install && npm run build && npx prisma generate`
4. Set start command: `npm start`
5. Add PostgreSQL database from Render
6. Configure environment variables:
   - `DATABASE_URL` (from Render PostgreSQL)
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `NODE_ENV=production`

### Option 4: Heroku Deployment

1. Install Heroku CLI and login:
```bash
heroku login
```

2. Create a new app:
```bash
heroku create av-erp-backend
```

3. Add PostgreSQL:
```bash
heroku addons:create heroku-postgresql:mini
```

4. Set environment variables:
```bash
heroku config:set JWT_SECRET="your-secret-key"
heroku config:set JWT_REFRESH_SECRET="your-refresh-secret"
heroku config:set NODE_ENV=production
```

5. Deploy:
```bash
git push heroku main
```

6. Run migrations:
```bash
heroku run npm run prisma:migrate
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens

### Optional
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `JWT_EXPIRES_IN` - Token expiration (default: 15m)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (default: 7d)
- `SMTP_HOST` - Email server host
- `SMTP_PORT` - Email server port
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password
- `FROM_EMAIL` - From email address
- `S3_BUCKET` - S3 bucket name
- `S3_REGION` - S3 region
- `S3_ACCESS_KEY` - S3 access key
- `S3_SECRET_KEY` - S3 secret key
- `REDIS_URL` - Redis connection URL

## Database Migrations

Run migrations in production:
```bash
npm run prisma:migrate
```

Or use Prisma push for prototyping (not recommended for production):
```bash
npm run prisma:push
```

## Monitoring

The application includes a health check endpoint at `/health`:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-02T14:00:00.000Z"
}
```

## API Documentation

Swagger/OpenAPI documentation is available at `/docs` when the server is running.

## Security Checklist

- [ ] Change default JWT secrets
- [ ] Enable HTTPS/TLS in production
- [ ] Configure CORS properly for your domain
- [ ] Set up rate limiting
- [ ] Enable database connection pooling
- [ ] Configure proper logging
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Enable database backups
- [ ] Rotate secrets regularly
- [ ] Use environment-specific configurations

## Scaling

For horizontal scaling:
1. Use a load balancer (e.g., Nginx, AWS ALB)
2. Run multiple instances of the application
3. Use Redis for session management
4. Enable database connection pooling
5. Use a CDN for static assets

## Troubleshooting

### Database connection issues
- Verify DATABASE_URL is correct
- Check network connectivity
- Ensure PostgreSQL is running
- Check firewall rules

### Authentication issues
- Verify JWT secrets are set
- Check token expiration settings
- Ensure user exists and is active

### Build issues
- Clear node_modules and reinstall
- Run `npx prisma generate` manually
- Check TypeScript version compatibility
