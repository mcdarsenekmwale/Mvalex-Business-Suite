# Mvalex Business Suite - Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)
- AWS Account (for S3 storage)
- OpenAI API Key (for AI features)

## Local Development Setup

### 1. Clone and Install

```bash
cd mvalex-business-suite
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mvalex?schema=public"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
OPENAI_API_KEY="sk-..."
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
S3_BUCKET_NAME="mvalex-assets"
SENDGRID_API_KEY=""
FROM_EMAIL="noreply@mvalex.com"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed demo data
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Docker Deployment

### 1. Build and Start All Services

```bash
docker-compose up -d
```

This starts:
- Next.js app (port 3000)
- PostgreSQL (port 5432)
- Redis (port 6379)
- MinIO S3-compatible storage (port 9000)

### 2. Run Migrations

```bash
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

### 3. Access the Application

- Web App: http://localhost:3000
- Database: localhost:5432
- Redis: localhost:6379
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

## Production Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Required environment variables in Vercel:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your production URL)
- `DATABASE_URL`
- `REDIS_URL`
- `OPENAI_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_ENDPOINT` (if using MinIO)
- `S3_FORCE_PATH_STYLE` (true for MinIO)

### Backend API (Railway/Render/AWS)

The Next.js application serves both frontend and API routes. No separate backend deployment needed.

### Database (AWS RDS / Railway / Supabase)

Use managed PostgreSQL service:
- AWS RDS
- Railway
- Supabase
- Neon

### Redis (Upstash / Railway)

Use managed Redis service:
- Upstash (serverless Redis)
- Railway
- AWS ElastiCache

### File Storage (AWS S3 / Cloudflare R2)

Configure S3 bucket with:
- Private access
- CORS policy for your domain
- Lifecycle rules for archival

## CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run lint
      - run: npx prisma generate

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run build
      - name: Deploy to Vercel
        uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret |
| `NEXTAUTH_URL` | Yes | Application URL |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth secret |
| `OPENAI_API_KEY` | Yes* | OpenAI API key (*required for AI features) |
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key |
| `AWS_REGION` | Yes | AWS region |
| `S3_BUCKET_NAME` | Yes | S3 bucket name |
| `S3_ENDPOINT` | No | Custom S3 endpoint (for MinIO) |
| `S3_FORCE_PATH_STYLE` | No | Use path-style URLs |
| `SENDGRID_API_KEY` | No | SendGrid API key |
| `FROM_EMAIL` | No | Sender email address |

## Monitoring & Logging

### Health Check Endpoint

```bash
curl http://localhost:3000/api/health
```

### Detailed Health Check Endpoint

```bash
curl http://localhost:3000/api/health/detailed
```

### Logs

```bash
# Docker logs
docker-compose logs -f app

# Vercel logs
vercel logs
```

## Logs

```bash
# Docker logs
docker-compose logs -f app

# Vercel logs
vercel logs
```

## Backup & Recovery

### Database Backup

```bash
# Using pg_dump
docker-compose exec postgres pg_dump -U postgres mvalex > backup.sql

# Restore
psql -U postgres mvalex < backup.sql
```

### S3 Backup

Enable S3 versioning and cross-region replication in AWS Console.

## Scaling Considerations

1. **Database**: Use read replicas for analytics queries
2. **Caching**: Implement Redis caching for templates and user sessions
3. **File Storage**: Use CloudFront CDN for generated assets
4. **API**: Enable Vercel Edge Functions for global distribution
5. **Queue**: Implement BullMQ with Redis for background jobs

## Troubleshooting

### Common Issues

1. **Database connection errors**: Verify DATABASE_URL and network connectivity
2. **OAuth login failures**: Check callback URLs in provider settings
3. **AI generation fails**: Verify OPENAI_API_KEY and credit balance
4. **File uploads fail**: Check S3 bucket permissions and CORS settings

### Support

For issues and questions:
- Submit a support ticket in the app
- Contact: support@mvalex.com
