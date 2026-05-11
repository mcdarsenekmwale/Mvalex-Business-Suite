# Database Migrations for Credit System

This project uses Prisma for schema migrations. After pulling the latest schema changes (which add credit, coupon, reward, and audit models), run the following locally to generate and apply migrations:

```bash
# Install dependencies
npm install

# Generate the client
npm run db:generate

# Create and apply a migration (development)
npx prisma migrate dev --name add-credit-coupon-reward-models

# Or to prepare for production deploy use
npm run db:deploy
```

If you need a SQL dump for a production migration, run:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma > migrations/add_credit_models.sql
```

Notes:
- Ensure `DATABASE_URL` env var points to your development database.
- Review generated SQL before applying to production.
- If you prefer a manual migration, generate the SQL and run with your DBA tools.
