// prisma/seed-rbac.ts
import  {PrismaClient}  from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Define all permissions with names 
const PERMISSIONS = [
  { name: "USERS_VIEW", resource: "users", action: "read", description: "View users" },
  { name: "USERS_CREATE", resource: "users", action: "create", description: "Create users" },
  { name: "USERS_EDIT", resource: "users", action: "update", description: "Edit users" },
  { name: "USERS_DELETE", resource: "users", action: "delete", description: "Delete users" },
  { name: "USERS_SUSPEND", resource: "users", action: "suspend", description: "Suspend users" },
  { name: "ROLES_VIEW", resource: "roles", action: "read", description: "View roles" },
  { name: "ROLES_CREATE", resource: "roles", action: "create", description: "Create roles" },
  { name: "ROLES_EDIT", resource: "roles", action: "update", description: "Edit roles" },
  { name: "ROLES_DELETE", resource: "roles", action: "delete", description: "Delete roles" },
  { name: "ROLES_ASSIGN", resource: "roles", action: "assign", description: "Assign roles to users" },
  { name: "PERMISSIONS_VIEW", resource: "permissions", action: "read", description: "View permissions" },
  { name: "PERMISSIONS_GRANT", resource: "permissions", action: "grant", description: "Grant permissions" },
  { name: "PERMISSIONS_REVOKE", resource: "permissions", action: "revoke", description: "Revoke permissions" },
  { name: "TICKETS_VIEW", resource: "tickets", action: "read", description: "View tickets" },
  { name: "TICKETS_RESPOND", resource: "tickets", action: "respond", description: "Respond to tickets" },
  { name: "TICKETS_RESOLVE", resource: "tickets", action: "resolve", description: "Resolve tickets" },
  { name: "TICKETS_ASSIGN", resource: "tickets", action: "assign", description: "Assign tickets" },
  { name: "TEMPLATES_VIEW", resource: "templates", action: "read", description: "View templates" },
  { name: "TEMPLATES_CREATE", resource: "templates", action: "create", description: "Create templates" },
  { name: "TEMPLATES_EDIT", resource: "templates", action: "update", description: "Edit templates" },
  { name: "TEMPLATES_DELETE", resource: "templates", action: "delete", description: "Delete templates" },
  { name: "PRICING_VIEW", resource: "pricing", action: "read", description: "View pricing" },
  { name: "PRICING_EDIT", resource: "pricing", action: "update", description: "Edit pricing" },
  { name: "SYSTEM_VIEW", resource: "system", action: "read", description: "View system settings" },
  { name: "SYSTEM_EDIT", resource: "system", action: "update", description: "Edit system settings" },
  { name: "SYSTEM_BACKUP", resource: "system", action: "backup", description: "Perform backups" },
  { name: "SYSTEM_RESTORE", resource: "system", action: "restore", description: "Restore from backup" },
  { name: "AUDIT_VIEW", resource: "audit", action: "read", description: "View audit logs" },
  { name: "MONITORING_VIEW", resource: "monitoring", action: "read", description: "View monitoring data" },
  { name: "SECURITY_VIEW", resource: "security", action: "read", description: "View security events" },
];

// Define roles with permissions
const ROLES = [
  {
    name: "SUPER_ADMIN",
    type: "SUPER_ADMIN",
    description: "Full system access with all permissions",
    permissionNames: PERMISSIONS.map((p) => p.name),
  },
  {
    name: "ADMIN",
    type: "ADMIN",
    description: "Administrative access without system-level permissions",
    permissionNames: [
      "USERS_VIEW", "USERS_CREATE", "USERS_EDIT", "USERS_SUSPEND",
      "ROLES_VIEW", "ROLES_ASSIGN",
      "TICKETS_VIEW", "TICKETS_RESPOND", "TICKETS_RESOLVE", "TICKETS_ASSIGN",
      "TEMPLATES_VIEW", "TEMPLATES_CREATE", "TEMPLATES_EDIT",
      "PRICING_VIEW", "PRICING_EDIT",
      "AUDIT_VIEW",
    ],
  },
  {
    name: "SUPPORT_AGENT",
    type: "ADMIN",
    description: "Support ticket management only",
    permissionNames: [
      "USERS_VIEW",
      "TICKETS_VIEW", "TICKETS_RESPOND", "TICKETS_RESOLVE", "TICKETS_ASSIGN",
    ],
  },
  {
    name: "VIEWER",
    type: "USER",
    description: "Read-only access",
    permissionNames: [
      "USERS_VIEW",
      "TICKETS_VIEW",
      "TEMPLATES_VIEW",
      "PRICING_VIEW",
    ],
  },
];

async function testConnection() {
  try {
    console.log("📡 Testing database connection...");
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

async function main() {
  console.log("🌱 Starting RBAC seeding...");
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    throw new Error("Cannot proceed with seeding - database connection failed");
  }

  // Check if permissions table exists
  try {
    await prisma.permission.count();
  } catch (error) {
    console.error("❌ Permissions table doesn't exist. Run migrations first: npx prisma migrate dev");
    throw error;
  }

  console.log("\n📝 Creating/updating permissions...");
  
  // Create permissions - using try-catch for each
  const permissionMap = new Map<string, { id: string; name: string }>();
  for (const perm of PERMISSIONS) {
    try {
      // Check if permission exists by resource+action combination
      const existing = await prisma.permission.findFirst({
        where: {
          resource: perm.resource,
          action: perm.action,
        },
      });

      if (existing) {
        // Update with name if missing
        const updated = await prisma.permission.update({
          where: { id: existing.id },
          data: { 
            name: perm.name,
            description: perm.description,
          },
        });
        permissionMap.set(perm.name, { id: updated.id, name: updated.name || perm.name });
        console.log(`  ✓ Updated permission: ${perm.name}`);
      } else {
        const created = await prisma.permission.create({
          data: {
            name: perm.name,
            resource: perm.resource,
            action: perm.action,
            description: perm.description,
          },
        });
        permissionMap.set(perm.name, { id: created.id, name: created.name || perm.name });
        console.log(`  ✓ Created permission: ${perm.name}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to process permission ${perm.name}:`, error);
      throw error;
    }
  }

  console.log(`\n✅ Processed ${permissionMap.size} permissions\n`);

  // Create/update roles and assign permissions
  console.log("👥 Creating/updating roles...");
  for (const roleDef of ROLES) {
    try {
      const existingRole = await prisma.role.findUnique({
        where: { name: roleDef.name },
      });

      let role;
      if (existingRole) {
        role = await prisma.role.update({
          where: { id: existingRole.id },
          data: {
            description: roleDef.description,
            isSystem: true,
          },
        });
        console.log(`  ✓ Updated role: ${roleDef.name}`);
      } else {
        role = await prisma.role.create({
          data: {
            name: roleDef.name,
            type: roleDef.type as any,
            description: roleDef.description,
            isSystem: true,
          },
        });
        console.log(`  ✓ Created role: ${roleDef.name}`);
      }

      // Assign permissions
      let assignedCount = 0;
      for (const permName of roleDef.permissionNames) {
        const perm = permissionMap.get(permName);
        if (!perm) {
          console.warn(`    ⚠ Permission not found: ${permName}`);
          continue;
        }

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
        assignedCount++;
      }
      console.log(`    ✓ Assigned ${assignedCount} permissions to ${roleDef.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to process role ${roleDef.name}:`, error);
      throw error;
    }
  }

  // Ensure default admin user exists with SUPER_ADMIN role
  console.log("\n👤 Setting up default admin user...");
  const adminEmail = "admin@mvalex.com";
  
  try {
    let adminUser = await prisma.user.findUnique({ 
      where: { email: adminEmail } 
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("Admin123!", 10);
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: hashedPassword,
          name: "System Administrator",
          status: "ACTIVE",
          creditsBalance: 10000,
        },
      });
      console.log(`  ✓ Created default admin user: ${adminEmail}`);
    } else {
      console.log(`  ✓ Admin user already exists: ${adminEmail}`);
    }

    const superAdminRole = await prisma.role.findUnique({ 
      where: { name: "SUPER_ADMIN" } 
    });
    
    if (superAdminRole && adminUser) {
      const existingAssignment = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: adminUser.id,
            roleId: superAdminRole.id,
          },
        },
      });
      
      if (!existingAssignment) {
        await prisma.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: superAdminRole.id,
            assignedBy: "system",
          },
        });
        console.log(`  ✓ Assigned SUPER_ADMIN role to ${adminEmail}`);
      } else {
        console.log(`  ✓ SUPER_ADMIN role already assigned to ${adminEmail}`);
      }
    }
  } catch (error) {
    console.error("  ✗ Failed to setup admin user:", error);
    throw error;
  }

  console.log("\n✅ RBAC seeding completed successfully!");

    // Create business card templates
  const cardTemplates = [
    {
      name: "Modern Blue",
      category: "MODERN",
      description: "Clean modern design with blue accents",
      frontConfig: { style: "modern", layout: "standard" },
      backConfig: { style: "minimal" },
      isDefault: true,
      sortOrder: 1,
    },
    {
      name: "Minimal Black",
      category: "MINIMAL",
      description: "Minimalist black and white design",
      frontConfig: { style: "minimal", layout: "centered" },
      backConfig: { style: "minimal" },
      sortOrder: 2,
    },
    {
      name: "Corporate Professional",
      category: "CORPORATE",
      description: "Professional corporate style",
      frontConfig: { style: "corporate", layout: "standard" },
      backConfig: { style: "corporate" },
      sortOrder: 3,
    },
    {
      name: "Tech Startup",
      category: "TECH",
      description: "Modern tech-inspired design",
      frontConfig: { style: "tech", layout: "modern" },
      backConfig: { style: "tech" },
      sortOrder: 4,
    },
    {
      name: "Creative Design",
      category: "CREATIVE",
      description: "Unique and creative design",
      frontConfig: { style: "creative", layout: "modern" },
      backConfig: { style: "creative" },
      sortOrder: 5,
    },
    {
      name: "Luxury Style",
      category: "LUXURY",
      description: "Elegant and sophisticated design",
      frontConfig: { style: "luxury", layout: "modern" },
      backConfig: { style: "luxury" },
      sortOrder: 6,
    },
  ];

  for (const template of cardTemplates) {
    await prisma.businessCardTemplate.upsert({
      where: { id: template.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        ...template,
        category: template.category as any,
      },
    });
  }

  console.log("✅ Business card templates created");

  // Create invoice templates
  const invoiceTemplates = [
    {
      name: "Simple Invoice",
      type: "SIMPLE",
      description: "Clean and simple invoice layout",
      config: { layout: "simple", colors: ["#2563eb"] },
      isDefault: true,
    },
    {
      name: "Corporate Invoice",
      type: "CORPORATE",
      description: "Professional corporate invoice",
      config: { layout: "corporate", colors: ["#0f172a"] },
    },
    {
      name: "Service Invoice",
      type: "SERVICE",
      description: "Optimized for service businesses",
      config: { layout: "service", colors: ["#0891b2"] },
    },
    {
      name: "Detailed Invoice",
      type: "DETAILED",
      description: "Comprehensive detailed layout",
      config: { layout: "detailed", colors: ["#7c3aed"] },
    },
  ];

  for (const template of invoiceTemplates) {
    await prisma.invoiceTemplate.upsert({
      where: { id: template.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        ...template,
        type: template.type as any,
      },
    });
  }

  console.log("✅ Invoice templates created");

    // Create system settings
  const systemSettings = [
    { key: "registration_enabled", value: true, description: "Allow new user registrations" },
    { key: "logo_generation_enabled", value: true, description: "Enable AI logo generation" },
    { key: "max_exports_per_day", value: 50, description: "Maximum exports per user per day" },
    { key: "default_credits", value: 50, description: "Default credits for new users" },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log("✅ System settings created");
}


async function seedUserData(userId: string) {
  try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new Error("User not found");
      }
       // Create demo business card
      await prisma.businessCard.create({
        data: {
          userId: userId,
          templateId: (await prisma.businessCardTemplate.findFirst({ where: { name: "Modern Blue" } }))?.id,
          name: user.name || "",
          title: "Managing Director",
          email: user.email || "",
          phone: "+86 138 0000 0001",
          address: "Beijing, China",
          website: "www.company.com",
          companyName: "Company Co., Ltd",
          companyNameCn: "公司有限公司",
          qrCodeType: "vcard",
          qrCodeData: `BEGIN:VCARD\nVERSION:3.0\nFN:${user.name || ""}\nEMAIL:${user.email || ""}\nTEL:+86 138 0000 0001\nEND:VCARD`,
          colorPrimary: "#0f172a",
          colorSecondary: "#2563eb",
          fontFamily: "Noto Sans SC",
          status: "PUBLISHED",
        },
      });

      console.log("✅ Demo business card created");

      // Create demo invoice
      const demoInvoice = await prisma.invoice.create({
        data: {
          userId: userId,
          templateId: (await prisma.invoiceTemplate.findFirst({ where: { name: "Simple Invoice" } }))?.id,
          companyId: "default-company",
          invoiceNumber: `INV-2024-${Date.now()}`,
          clientName: "ABC Corporation",
          clientEmail: "billing@abccorp.com",
          clientAddress: "456 Commerce Street, Beijing, China",
          currency: "USD",
          taxRate: 13,
          discountType: "percentage",
          discountValue: 0,
          subtotal: 3000,
          taxAmount: 390,
          discountAmount: 0,
          grandTotal: 3390,
          amountPaid: 0,
          balanceDue: 3390,
          status: "SENT",
          paymentTerms: "Net 30",
          notes: "Thank you for your business!",
        },
      });

      // Add invoice items
      const invoiceItems = [
        { invoiceId: demoInvoice.id, description: "Consulting Services", quantity: 10, unitPrice: 200, amount: 2000, sortOrder: 0 },
        { invoiceId: demoInvoice.id, description: "Design Services", quantity: 5, unitPrice: 200, amount: 1000, sortOrder: 1 },
        { invoiceId: demoInvoice.id, description: "Marketing Services", quantity: 3, unitPrice: 200, amount: 600, sortOrder: 2 },
        { invoiceId: demoInvoice.id, description: "Sales Services", quantity: 2, unitPrice: 200, amount: 400, sortOrder: 3 },
        { invoiceId: demoInvoice.id, description: "Support Services", quantity: 1, unitPrice: 200, amount: 200, sortOrder: 4 },
        { invoiceId: demoInvoice.id, description: "Total", quantity: 1, unitPrice: 3390, amount: 3390, sortOrder: 5 },
      ];

      for (const item of invoiceItems) {
        await prisma.invoiceItem.create({
          data: { ...item },
        });
      }

      console.log("✅ Demo invoice created");

      // Create demo support ticket
      await prisma.supportTicket.create({
        data: {
          userId: userId,
          subject: "How to export business card as PDF?",
          description: "I created a business card and want to export it as PDF for printing. What's the best way to do this?",
          category: "technical",
          priority: "MEDIUM",
          status: "OPEN",
        },
      });

      console.log("✅ Demo support ticket created");

  } catch (error) {
    console.error(`❌ Failed to seed user data for ${userId}:`, error);
    throw error;
  }
}

if (false) 
  main()
    .catch((e) => {
      console.error("\n❌ RBAC seeding failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

const userIds = ["cmopnumg4001o1l2tkb0z818t", "cmopnvqw500261l2trr9pysg1", 'cmopnx611002w1l2t7aajh2a7', 'cmopnwiez002i1l2tnkaakhox'];

for (const userId of userIds) {
  seedUserData(userId).then(() => {
    console.log(`✅ Demo user data seeded for user ID ${userId}`);
  }).finally(() => {
    prisma.$disconnect();
  });
}