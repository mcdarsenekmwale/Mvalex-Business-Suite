# Mvalex Business Suite - API Documentation

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://api.mvalex.com/api`

## Authentication

All API endpoints (except auth routes) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Or via session cookie (when using NextAuth.js).

## Response Format

### Success Response
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

### Error Response
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

## Auth Endpoints

### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "cl...",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

### POST /api/auth/[...nextauth]
NextAuth.js endpoints for:
- OAuth login (Google, GitHub)
- Credentials login
- Session management
- Token refresh

**Request (Credentials):**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

## Business Cards

### GET /api/business-cards
Get all business cards for the authenticated user.

**Query Parameters:**
- `id` (optional): Get specific card by ID

**Response:**
```json
[
  {
    "id": "cl...",
    "name": "McDarsene M Mwale",
    "title": "Managing Director",
    "email": "mcdarsenek@outlook.com",
    "phone": "+86 138 0000 0000",
    "companyName": "Shanghai Mvalex Technology Co., Ltd",
    "companyNameCn": "上海姆瓦莱息技术有限公司",
    "templateId": "modern",
    "colorPrimary": "#2563eb",
    "colorSecondary": "#1e40af",
    "fontFamily": "inter",
    "qrCodeType": "vcard",
    "qrCodeUrl": "data:image/png;base64,...",
    "status": "PUBLISHED",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

### POST /api/business-cards
Create a new business card.

**Request Body:**
```json
{
  "templateId": "modern",
  "name": "McDarsene M Mwale",
  "title": "Managing Director",
  "email": "mcdarsenek@outlook.com",
  "phone": "+86 138 0000 0000",
  "address": "Shanghai, China",
  "website": "www.mvalex.com",
  "companyName": "Shanghai Mvalex Technology Co., Ltd",
  "companyNameCn": "上海姆瓦莱息技术有限公司",
  "colorPrimary": "#2563eb",
  "colorSecondary": "#1e40af",
  "fontFamily": "inter",
  "qrCodeType": "vcard",
  "qrCodeData": "BEGIN:VCARD\nVERSION:3.0\nFN:McDarsene M Mwale\nEMAIL:mcdarsenek@outlook.com\nEND:VCARD"
}
```

### PUT /api/business-cards
Update an existing business card.

**Request Body:**
```json
{
  "id": "cl...",
  "name": "Updated Name",
  "title": "Updated Title",
  ...
}
```

### DELETE /api/business-cards?id={id}
Delete a business card.

## Invoices

### GET /api/invoices
Get all invoices for the authenticated user.

**Query Parameters:**
- `id` (optional): Get specific invoice by ID

**Response:**
```json
[
  {
    "id": "cl...",
    "invoiceNumber": "INV-20240115-0001",
    "clientName": "ABC Corporation",
    "clientEmail": "billing@abccorp.com",
    "currency": "USD",
    "subtotal": 3000.00,
    "taxRate": 13.00,
    "taxAmount": 390.00,
    "discountAmount": 0.00,
    "grandTotal": 3390.00,
    "status": "SENT",
    "items": [
      {
        "id": "cl...",
        "description": "Consulting Services",
        "quantity": 10,
        "unitPrice": 200.00,
        "amount": 2000.00
      }
    ],
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

### POST /api/invoices
Create a new invoice.

**Request Body:**
```json
{
  "templateId": "simple",
  "companyId": "default-company",
  "clientName": "ABC Corporation",
  "clientEmail": "billing@abccorp.com",
  "clientAddress": "456 Commerce Street, Beijing, China",
  "currency": "USD",
  "taxRate": 13,
  "discountType": "percentage",
  "discountValue": 0,
  "paymentTerms": "Net 30",
  "notes": "Thank you for your business!",
  "items": [
    {
      "description": "Consulting Services",
      "quantity": 10,
      "unitPrice": 200
    }
  ]
}
```

### PUT /api/invoices
Update an existing invoice.

**Request Body:**
```json
{
  "id": "cl...",
  "status": "PAID",
  "amountPaid": 3390,
  "items": [...]
}
```

### DELETE /api/invoices?id={id}
Delete an invoice.

## Logos (AI-Powered)

### GET /api/logos
Get all AI-generated logos for the authenticated user.

**Response:**
```json
[
  {
    "id": "cl...",
    "businessName": "Shanghai Mvalex Technology",
    "slogan": "Innovation Beyond Boundaries",
    "industry": "Technology",
    "style": "MODERN",
    "colorPalette": ["#2563eb", "#1e40af"],
    "status": "COMPLETED",
    "variations": [
      {
        "id": "cl...",
        "type": "FULL_COLOR",
        "imageUrl": "https://...",
        "hasPng": true,
        "hasSvg": false,
        "hasPdf": false
      }
    ],
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

### POST /api/logos
Generate a new AI-powered logo.

**Request Body:**
```json
{
  "businessName": "Shanghai Mvalex Technology",
  "slogan": "Innovation Beyond Boundaries",
  "industry": "Technology",
  "style": "MODERN",
  "colorPalette": ["#2563eb", "#1e40af"],
  "additionalInfo": "We want a modern, tech-inspired logo"
}
```

**Response:**
```json
{
  "id": "cl...",
  "businessName": "Shanghai Mvalex Technology",
  "status": "GENERATING",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### DELETE /api/logos?id={id}
Delete a logo generation request.

## Credits

### GET /api/credits
Get user's credit balance and transaction history.

**Response:**
```json
{
  "balance": 50,
  "transactions": [
    {
      "id": "cl...",
      "amount": 20,
      "type": "CREDIT_DEDUCT",
      "action": "GENERATE_LOGO",
      "description": "AI Logo Generation",
      "balanceAfter": 50,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pricing": [
    {
      "action": "GENERATE_LOGO",
      "cost": 20,
      "description": "AI Logo Generation"
    }
  ]
}
```

### POST /api/credits
Deduct or add credits.

**Request Body:**
```json
{
  "action": "GENERATE_LOGO",
  "amount": 20,
  "description": "Logo generation for client",
  "entityType": "logo",
  "entityId": "cl..."
}
```

**Response:**
```json
{
  "success": true,
  "previousBalance": 70,
  "newBalance": 50,
  "cost": 20
}
```

## AI Assistant

### GET /api/ai-assistant
Get all conversations or a specific conversation.

**Query Parameters:**
- `id` (optional): Get specific conversation by ID

### POST /api/ai-assistant
Send a message to the AI assistant.

**Request Body:**
```json
{
  "message": "What makes a good business card design?",
  "conversationId": "cl..." // Optional, for continuing a conversation
}
```

**Response:**
```json
{
  "message": {
    "id": "cl...",
    "role": "assistant",
    "content": "A good business card design should be...",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "conversationId": "cl..."
}
```

## Support Tickets

### GET /api/support
Get all support tickets for the authenticated user.

**Query Parameters:**
- `status` (optional): Filter by status

### POST /api/support
Create a new support ticket.

**Request Body:**
```json
{
  "subject": "How to export as PDF?",
  "description": "I need help exporting my business card as PDF...",
  "category": "technical",
  "priority": "MEDIUM"
}
```

## Notifications

### GET /api/notifications
Get all notifications for the authenticated user.

**Response:**
```json
{
  "notifications": [
    {
      "id": "cl...",
      "type": "EXPORT_COMPLETE",
      "title": "Export Ready",
      "message": "Your business card export is ready for download",
      "isRead": false,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "unreadCount": 3
}
```

### PATCH /api/notifications
Mark notifications as read.

**Request Body:**
```json
{
  "id": "cl...", // Mark specific notification as read
  "markAll": true // Or mark all as read
}
```

## Dashboard

### GET /api/dashboard
Get dashboard data for the authenticated user (and admin stats if applicable).

**Response (User):**
```json
{
  "stats": {
    "businessCards": 5,
    "invoices": 3,
    "logos": 2,
    "exports": 10,
    "credits": 50
  },
  "recentAssets": [...],
  "creditTransactions": [...],
  "monthlyActivity": [...]
}
```

**Response (Admin includes):**
```json
{
  ...userData,
  "admin": {
    "totalUsers": 150,
    "activeUsers": 120,
    "totalBusinessCards": 500,
    "totalInvoices": 300,
    "totalLogos": 100,
    "openTickets": 5
  }
}
```

## Admin

### GET /api/admin
Admin-only endpoints for platform management.

**Query Parameters:**
- `resource`: `users`, `tickets`, `stats`, `templates`, `pricing`

### POST /api/admin
Perform admin actions.

**Request Body:**
```json
{
  "action": "updateUser",
  "userId": "cl...",
  "status": "ACTIVE",
  "role": "ADMIN",
  "credits": 100
}
```

**Actions:**
- `updateUser`: Update user status, role, and credits
- `respondToTicket`: Respond to a support ticket
- `updatePricing`: Update pricing rules
- `createTemplate`: Create new template

## Company Profiles

### GET /api/company
Get all company profiles for the authenticated user.

### POST /api/company
Create a new company profile.

### PUT /api/company
Update a company profile.

## Templates

### GET /api/templates?type={type}
Get available templates.

**Query Parameters:**
- `type`: `businessCard` or `invoice`

## Export

### POST /api/export
Export an asset in various formats.

**Request Body:**
```json
{
  "type": "businessCard", // or "invoice", "logo"
  "id": "cl...",
  "format": "pdf", // "pdf", "png", "jpg", "xlsx", "docx"
  "html": "<html>...</html>" // For PDF generation from HTML
}
```

**Response:**
```json
{
  "asset": { ... },
  "buffer": "base64-encoded-file-data",
  "fileName": "business-card-mcdarsene-mwale.pdf",
  "mimeType": "application/pdf"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid input data |
| `INSUFFICIENT_CREDITS` | Not enough credits for operation |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

## HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 402 | Payment Required (Insufficient Credits) |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
