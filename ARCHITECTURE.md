This file contains the production-ready system architecture for the Mvalex Business Suite.

# MVALEX BUSINESS SUITE - SYSTEM ARCHITECTURE

## 1. OVERVIEW

Mvalex Business Suite is a comprehensive SaaS platform providing business identity tools including business card generation, invoice creation, AI-powered logo design, and asset management. Built with a modern, scalable architecture using a monorepo structure.

## 2. TECH STACK

### Frontend
- Next.js 15 (App Router)
- React 19 + TypeScript
- TailwindCSS v4
- shadcn/ui component system
- Framer Motion (animations)
- TanStack Query (data fetching)
- Zustand (state management)
- Recharts (analytics charts)
- html2canvas (client-side previews)
- jspdf (client-side PDF generation)

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL 15
- Redis (caching + BullMQ queues)
- AWS S3 (file storage)
- OpenAI API (AI logo + assistant)
- Puppeteer (server-side PDF/screenshot)
- exceljs (Excel export)
- docx (Word export)
- qrcode (QR code generation)

### Infrastructure
- Docker + Docker Compose
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)
- Vercel (frontend deployment)
- AWS/Railway (backend deployment)

## 3. SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Web App    │  │   Mobile     │  │   Admin Panel    │   │
│  │  (Next.js)   │  │  (Responsive)│  │  (Next.js)       │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                       │
│                     (Nginx / Vercel Edge)                    │
│         Rate Limiting │ SSL Termination │ Load Balancing    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
│                  (Node.js + Express API)                     │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Auth Service │ │ User Service │ │ Company Service      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ BusinessCard │ │   Invoice    │ │     Logo Service     │ │
│  │   Service    │ │   Service    │ │   (AI-Powered)       │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Export Serv. │ │ Credit Serv. │ │ Notification Service │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │  AI Assist.  │ │  Support     │ │   Analytics Service  │ │
│  │   Service    │ │   Service    │ │                      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │  Template    │ │   File       │ │   Admin              │ │
│  │   Service    │ │   Service    │ │   Service            │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   DATA LAYER    │ │   QUEUE LAYER   │ │   FILE STORAGE  │
│  (PostgreSQL)   │ │    (Redis)      │ │    (AWS S3)     │
│                 │ │                 │ │                 │
│  Users          │ │  BullMQ         │ │  Generated      │
│  BusinessCards  │ │  Job Queue      │ │  Assets         │
│  Invoices       │ │                 │ │  Logos          │
│  Logos          │ │  Background     │ │  Documents      │
│  Templates      │ │  Processing     │ │  User Uploads   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES LAYER                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │   OpenAI     │ │   SendGrid   │ │       AWS S3         │ │
│  │  (DALL-E 3)  │ │   (Email)    │ │   (File Storage)     │ │
│  │  (GPT-4)     │ │              │ │                      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 4. SERVICE DESCRIPTIONS

### Auth Service
- Email/password authentication with bcrypt
- OAuth 2.0 integration (Google, GitHub, Apple)
- JWT token management (access + refresh tokens)
- Role-based access control (RBAC)
- Session management
- Password reset flow

### User Service
- Profile management
- Preferences (language, theme, notifications)
- Avatar upload
- Account deletion (GDPR compliance)
- Activity logging

### Company Service
- Company profile management
- Multiple company support per user
- Default company settings
- Address, contact info, logo management

### BusinessCard Service
- Template-based card generation
- Front/back side configuration
- QR code generation (vCard, website, custom)
- Live preview generation
- Export coordination

### Invoice Service
- Invoice creation and editing
- Line item management
- Automatic calculations (subtotal, tax, discount, total)
- Invoice numbering (auto-generated)
- Payment status tracking
- Multi-currency support

### Logo Service
- AI-powered logo generation via DALL-E 3
- Style selection (modern, tech, luxury, minimal)
- Color palette configuration
- Multiple variation generation (full color, monochrome, icon-only)
- Background removal option

### Export Service
- PDF generation (Puppeteer + html2canvas)
- Word document generation (docx library)
- Excel spreadsheet generation (exceljs)
- PNG/JPG image export
- Batch export support

### Credit Service
- Credit balance management
- Transaction logging
- Usage tracking per feature
- Admin credit allocation
- Pricing rule configuration

### Notification Service
- In-app notification system
- Email notification dispatch
- Push notification support
- Notification preferences
- Read/unread tracking

### AI Assistant Service
- Chat-based interface
- Context-aware responses using GPT-4
- User data integration
- Design suggestions
- Help documentation access

### Support Service
- Ticket creation and management
- Message threading
- Status tracking (open, in-progress, resolved, closed)
- Priority levels
- Admin response interface

### Analytics Service
- Usage metrics collection
- Dashboard data aggregation
- Export statistics
- Credit consumption tracking
- User activity analysis

### Template Service
- Business card template management
- Invoice template management
- Template versioning
- Default template configuration
- Template categories

### File Service
- File upload handling
- S3 integration
- CDN URL generation
- File type validation
- Virus scanning (ClamAV)

### Admin Service
- User management (view, suspend, delete)
- Role and permission management
- System configuration
- Template moderation
- Pricing management
- System health monitoring

## 5. SECURITY ARCHITECTURE

### Authentication
- JWT with RS256 signing (asymmetric keys)
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry, stored in httpOnly cookie
- Token rotation on refresh

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- API route guards
- Middleware chain: auth -> role -> permission

### Data Protection
- AES-256 encryption for sensitive data
- Database connection pooling with SSL
- API rate limiting (100 req/min for users, 1000 req/min for admins)
- Input validation with Zod schemas
- SQL injection prevention (Prisma ORM)
- XSS protection (Content Security Policy)
- CSRF protection for state-changing operations

### File Security
- File type validation (whitelist)
- File size limits (10MB max)
- S3 bucket policies (private by default)
- Signed URL generation for downloads
- Virus scanning on upload

## 6. SCALABILITY DESIGN

### Horizontal Scaling
- Stateless API servers (horizontal pod scaling)
- Redis session sharing
- Database read replicas
- CDN for static assets

### Caching Strategy
- Redis for session storage (TTL: 7 days)
- Redis for rate limiting (sliding window)
- Redis for template caching (TTL: 1 hour)
- S3 + CloudFront for generated assets

### Database Optimization
- Connection pooling (PgBouncer)
- Indexed foreign keys
- Partitioned analytics tables
- Read replicas for dashboard queries

### Background Processing
- BullMQ for async job processing
- Separate worker processes
- Job retry with exponential backoff
- Dead letter queue for failed jobs

## 7. DEPLOYMENT ARCHITECTURE

### Development
```
Developer Machine
├── Docker Compose
│   ├── PostgreSQL (port 5432)
│   ├── Redis (port 6379)
│   ├── MinIO (S3 compatible, port 9000)
│   └── App (Next.js + API)
```

### Staging/Production
```
Production Environment
├── Vercel (Frontend)
│   └── Next.js App
├── AWS/Railway (Backend)
│   ├── API Servers (auto-scaling)
│   ├── Worker Processes
│   └── Nginx Load Balancer
├── AWS Services
│   ├── RDS PostgreSQL
│   ├── ElastiCache Redis
│   └── S3 Buckets
└── Monitoring
    ├── CloudWatch / Datadog
    └── Sentry (error tracking)
```

## 8. API DESIGN PRINCIPLES

### RESTful API
- Resource-based URLs: /api/v1/users, /api/v1/business-cards
- HTTP methods: GET, POST, PUT, DELETE, PATCH
- Status codes: 200, 201, 400, 401, 403, 404, 429, 500
- Pagination: cursor-based for large datasets
- Filtering, sorting, searching via query parameters

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

## 9. ENVIRONMENT CONFIGURATION

### Required Environment Variables
```
# Database
DATABASE_URL=postgresql://user:pass@host:5432/mvalex

# Redis
REDIS_URL=redis://host:6379

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=mvalex-assets

# OpenAI
OPENAI_API_KEY=...

# Email
SENDGRID_API_KEY=...
FROM_EMAIL=noreply@mvalex.com

# Application
NODE_ENV=production
API_URL=https://api.mvalex.com
FRONTEND_URL=https://mvalex.com
```

## 10. MONITORING & LOGGING

### Application Monitoring
- Request/response logging
- Performance metrics (response time, throughput)
- Error tracking with Sentry
- Health check endpoints

### Business Monitoring
- User registration rate
- Asset generation volume
- Credit consumption patterns
- Export format popularity
- Feature usage analytics

### Infrastructure Monitoring
- Server CPU/memory usage
- Database connection pool
- Redis memory usage
- S3 storage utilization
- Queue depth and processing time

## 11. BACKUP & DISASTER RECOVERY

### Database
- Automated daily backups (RDS)
- Point-in-time recovery (7 days)
- Cross-region backup replication
- Annual disaster recovery drills

### File Storage
- S3 versioning enabled
- Cross-region replication
- Lifecycle policies (archive after 90 days)

### Recovery Objectives
- RPO (Recovery Point Objective): 1 hour
- RTO (Recovery Time Objective): 4 hours
