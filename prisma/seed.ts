import  {PrismaClient}  from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });


// Real-world user data with diverse names and roles
const REAL_USERS = [
  { name: "Emma Thompson", email: "emma.thompson@example.com", role: "USER", credits: 150, status: "ACTIVE" },
  { name: "James Wilson", email: "james.wilson@example.com", role: "USER", credits: 75, status: "ACTIVE" },
  { name: "Sophia Chen", email: "sophia.chen@example.com", role: "USER", credits: 200, status: "ACTIVE" },
  { name: "Michael Rodriguez", email: "michael.rodriguez@example.com", role: "USER", credits: 50, status: "ACTIVE" },
  { name: "Olivia Parker", email: "olivia.parker@example.com", role: "USER", credits: 320, status: "ACTIVE" },
  { name: "William Zhang", email: "william.zhang@example.com", role: "USER", credits: 180, status: "ACTIVE" },
  { name: "Ava Martinez", email: "ava.martinez@example.com", role: "USER", credits: 95, status: "ACTIVE" },
  { name: "Lucas Brown", email: "lucas.brown@example.com", role: "USER", credits: 250, status: "ACTIVE" },
  { name: "Mia Davis", email: "mia.davis@example.com", role: "USER", credits: 60, status: "ACTIVE" },
  { name: "Ethan Garcia", email: "ethan.garcia@example.com", role: "USER", credits: 400, status: "ACTIVE" },
  { name: "Isabella Kim", email: "isabella.kim@example.com", role: "USER", credits: 120, status: "ACTIVE" },
  { name: "Alexander Lee", email: "alexander.lee@example.com", role: "USER", credits: 85, status: "ACTIVE" },
  { name: "Charlotte Wang", email: "charlotte.wang@example.com", role: "USER", credits: 300, status: "ACTIVE" },
  { name: "Daniel Smith", email: "daniel.smith@example.com", role: "USER", credits: 45, status: "ACTIVE" },
  { name: "Amelia Jones", email: "amelia.jones@example.com", role: "USER", credits: 175, status: "ACTIVE" },
  { name: "Matthew Taylor", email: "matthew.taylor@example.com", role: "USER", credits: 90, status: "ACTIVE" },
  { name: "Harper Williams", email: "harper.williams@example.com", role: "USER", credits: 220, status: "ACTIVE" },
  { name: "Benjamin Moore", email: "benjamin.moore@example.com", role: "USER", credits: 135, status: "ACTIVE" },
  { name: "Evelyn Anderson", email: "evelyn.anderson@example.com", role: "USER", credits: 280, status: "ACTIVE" },
  { name: "Jacob Thomas", email: "jacob.thomas@example.com", role: "USER", credits: 65, status: "ACTIVE" },
];

const SUPPORT_AGENTS = [
  { name: "Sarah Johnson", email: "sarah.johnson@mvalex.com", role: "SUPPORT_AGENT", credits: 5000, status: "ACTIVE" },
  { name: "David Chen", email: "david.chen@mvalex.com", role: "SUPPORT_AGENT", credits: 5000, status: "ACTIVE" },
];

async function main() {
  console.log("🌱 Starting database seed...");

  // Test connection
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }

  // Hash passwords
  const defaultPassword = "Password123!";
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);
  const adminPassword = "Admin@2024!";
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);
  const agentPassword = "Agent@2024!";
  const hashedAgentPassword = await bcrypt.hash(agentPassword, 12);

  // Create roles
  console.log("\n📝 Creating roles...");
  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: {
      name: "USER",
      type: "USER",
      description: "Standard user role with basic permissions",
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      type: "ADMIN",
      description: "Administrator role with elevated permissions",
      isSystem: true,
    },
  });

  const superAdminRole = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: {
      name: "SUPER_ADMIN",
      type: "SUPER_ADMIN",
      description: "Super administrator with full system access",
      isSystem: true,
    },
  });

  const supportAgentRole = await prisma.role.upsert({
    where: { name: "SUPPORT_AGENT" },
    update: {},
    create: {
      name: "SUPPORT_AGENT",
      type: "ADMIN",
      description: "Support agent for handling tickets",
      isSystem: true,
    },
  });

  console.log("✅ Roles created");

  // Create permissions
  console.log("\n📝 Creating permissions...");
  const permissions = [
    // User permissions
    { name: "USERS_VIEW", resource: "users", action: "read", description: "View users" },
    { name: "USERS_CREATE", resource: "users", action: "create", description: "Create users" },
    { name: "USERS_EDIT", resource: "users", action: "update", description: "Edit users" },
    { name: "USERS_DELETE", resource: "users", action: "delete", description: "Delete users" },
    { name: "USERS_SUSPEND", resource: "users", action: "suspend", description: "Suspend users" },
    
    // Business card permissions
    { name: "BUSINESS_CARDS_VIEW", resource: "businessCards", action: "read", description: "View business cards" },
    { name: "BUSINESS_CARDS_CREATE", resource: "businessCards", action: "create", description: "Create business cards" },
    { name: "BUSINESS_CARDS_EDIT", resource: "businessCards", action: "update", description: "Edit business cards" },
    { name: "BUSINESS_CARDS_DELETE", resource: "businessCards", action: "delete", description: "Delete business cards" },
    
    // Invoice permissions
    { name: "INVOICES_VIEW", resource: "invoices", action: "read", description: "View invoices" },
    { name: "INVOICES_CREATE", resource: "invoices", action: "create", description: "Create invoices" },
    { name: "INVOICES_EDIT", resource: "invoices", action: "update", description: "Edit invoices" },
    { name: "INVOICES_DELETE", resource: "invoices", action: "delete", description: "Delete invoices" },
    
    // Logo permissions
    { name: "LOGOS_VIEW", resource: "logos", action: "read", description: "View logos" },
    { name: "LOGOS_CREATE", resource: "logos", action: "create", description: "Create logos" },
    { name: "LOGOS_DELETE", resource: "logos", action: "delete", description: "Delete logos" },
    
    // Template permissions
    { name: "TEMPLATES_VIEW", resource: "templates", action: "read", description: "View templates" },
    { name: "TEMPLATES_CREATE", resource: "templates", action: "create", description: "Create templates" },
    { name: "TEMPLATES_EDIT", resource: "templates", action: "update", description: "Edit templates" },
    { name: "TEMPLATES_DELETE", resource: "templates", action: "delete", description: "Delete templates" },
    
    // Ticket permissions
    { name: "TICKETS_VIEW", resource: "tickets", action: "read", description: "View tickets" },
    { name: "TICKETS_CREATE", resource: "tickets", action: "create", description: "Create tickets" },
    { name: "TICKETS_RESPOND", resource: "tickets", action: "respond", description: "Respond to tickets" },
    { name: "TICKETS_RESOLVE", resource: "tickets", action: "resolve", description: "Resolve tickets" },
    { name: "TICKETS_ASSIGN", resource: "tickets", action: "assign", description: "Assign tickets" },
    
    // Admin permissions
    { name: "ADMIN_ACCESS", resource: "admin", action: "access", description: "Access admin panel" },
    { name: "SYSTEM_SETTINGS", resource: "system", action: "manage", description: "Manage system settings" },
    { name: "AUDIT_LOGS", resource: "audit", action: "view", description: "View audit logs" },
  ];

  const permissionMap = new Map();
  for (const perm of permissions) {
    const existing = await prisma.permission.findFirst({
      where: { resource: perm.resource, action: perm.action },
    });

    let permission;
    if (existing) {
      permission = await prisma.permission.update({
        where: { id: existing.id },
        data: { name: perm.name, description: perm.description },
      });
    } else {
      permission = await prisma.permission.create({
        data: perm,
      });
    }
    permissionMap.set(perm.name, permission);
    console.log(`  ✓ ${perm.name}`);
  }
  console.log(`✅ Created ${permissions.length} permissions`);

  // Assign all permissions to SUPER_ADMIN
  console.log("\n📝 Assigning permissions to SUPER_ADMIN...");
  for (const perm of permissionMap.values()) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: perm.id,
      },
    });
  }
  console.log(`✅ Assigned ${permissionMap.size} permissions to SUPER_ADMIN`);

  // Create 20 real users
  console.log("\n👥 Creating 20 real users...");
  const createdUsers = [];
  
  for (const userData of REAL_USERS) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        passwordHash: hashedPassword,
        name: userData.name,
        creditsBalance: userData.credits,
        status: userData.status as any,
        emailVerified: new Date(),
      },
    });
    
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: userRole.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: userRole.id,
      },
    });
    
    createdUsers.push(user);
    console.log(`  ✓ Created: ${userData.name} (${userData.email}) - ${userData.credits} credits`);
  }
  console.log(`✅ Created ${createdUsers.length} users`);

  // Create support agents
  console.log("\n👥 Creating support agents...");
  for (const agentData of SUPPORT_AGENTS) {
    const agent = await prisma.user.upsert({
      where: { email: agentData.email },
      update: {},
      create: {
        email: agentData.email,
        passwordHash: hashedAgentPassword,
        name: agentData.name,
        creditsBalance: agentData.credits,
        status: "ACTIVE" as any,
        emailVerified: new Date(),
      },
    });
    
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: agent.id,
          roleId: supportAgentRole.id,
        },
      },
      update: {},
      create: {
        userId: agent.id,
        roleId: supportAgentRole.id,
      },
    });
    
    console.log(`  ✓ Created support agent: ${agentData.name} (${agentData.email})`);
  }

  // Create demo user
  console.log("\n👤 Creating demo user...");
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@mvalex.com" },
    update: {},
    create: {
      email: "demo@mvalex.com",
      passwordHash: hashedPassword,
      name: "Demo User",
      creditsBalance: 500,
      status: "ACTIVE" as any,
      emailVerified: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: demoUser.id,
        roleId: userRole.id,
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      roleId: userRole.id,
    },
  });
  console.log("  ✓ Demo user created");

  // Create admin user
  console.log("\n👤 Creating admin user...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@mvalex.com" },
    update: {},
    create: {
      email: "admin@mvalex.com",
      passwordHash: hashedAdminPassword,
      name: "System Administrator",
      creditsBalance: 10000,
      status: "ACTIVE" as any,
      emailVerified: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
  console.log("  ✓ Admin user created");

  // Create super admin user
  console.log("\n👤 Creating super admin user...");
  const superAdminUser = await prisma.user.upsert({
    where: { email: "superadmin@mvalex.com" },
    update: {},
    create: {
      email: "superadmin@mvalex.com",
      passwordHash: hashedAdminPassword,
      name: "Super Administrator",
      creditsBalance: 50000,
      status: "ACTIVE" as any,
      emailVerified: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdminUser.id,
      roleId: superAdminRole.id,
    },
  });
  console.log("  ✓ Super admin user created");

  // Create default company profile
  console.log("\n🏢 Creating company profile...");
  await prisma.companyProfile.upsert({
    where: { id: "default-company" },
    update: {},
    create: {
      id: "default-company",
      userId: demoUser.id,
      name: "Shanghai Mvalex Technology Co., Ltd",
      nameCn: "上海姆瓦莱息技术有限公司",
      email: "info@mvalex.com",
      phone: "+86 21 8888 8888",
      address: "123 Business District, Pudong, Shanghai, China 200120",
      website: "https://www.mvalex.com",
      isDefault: true,
      logoUrl: "https://via.placeholder.com/150x60?text=Mvalex",
    },
  });
  console.log("  ✓ Company profile created");

  // Create pricing rules
  console.log("\n💰 Creating pricing rules...");
  const pricingRules = [
    { action: "CREATE_BUSINESS_CARD", cost: 5, description: "Create a new business card", isActive: true },
    { action: "EDIT_BUSINESS_CARD", cost: 2, description: "Edit existing business card", isActive: true },
    { action: "CREATE_INVOICE", cost: 5, description: "Generate a new invoice", isActive: true },
    { action: "EDIT_INVOICE", cost: 2, description: "Edit existing invoice", isActive: true },
    { action: "GENERATE_LOGO", cost: 20, description: "Generate AI-powered logo", isActive: true },
    { action: "GENERATE_LOGO_VARIATIONS", cost: 10, description: "Generate logo variations", isActive: true },
    { action: "EXPORT_BUSINESS_CARD_PNG", cost: 3, description: "Export business card as PNG", isActive: true },
    { action: "EXPORT_BUSINESS_CARD_PDF", cost: 5, description: "Export business card as PDF", isActive: true },
    { action: "EXPORT_INVOICE_PDF", cost: 3, description: "Export invoice as PDF", isActive: true },
    { action: "EXPORT_INVOICE_EXCEL", cost: 4, description: "Export invoice as Excel", isActive: true },
    { action: "EXPORT_LOGO_PNG", cost: 3, description: "Export logo as PNG", isActive: true },
    { action: "EXPORT_LOGO_SVG", cost: 5, description: "Export logo as SVG", isActive: true },
    { action: "AI_CHAT_MESSAGE", cost: 1, description: "Send message to AI assistant", isActive: true },
    { action: "AI_DESIGN_SUGGESTION", cost: 2, description: "Get AI design suggestions", isActive: true },

    { action: "GENERATE_BUSINESS_CARD", cost: 5, description: "Business Card Creation" },
    { action: "GENERATE_INVOICE", cost: 3, description: "Invoice Creation" },
    { action: "EXPORT_FILE", cost: 2, description: "File Export" },
    { action: "AI_ASSISTANT", cost: 1, description: "AI Assistant Message" },
  ];

  for (const rule of pricingRules) {
    await prisma.pricingRule.upsert({
      where: { action: rule.action as any },
      update: { cost: rule.cost, description: rule.description, isActive: rule.isActive },
      create: {
        action: rule.action as any,
        cost: rule.cost,
        description: rule.description,
        isActive: rule.isActive,
      },
    });
  }
  console.log(`✅ Created ${pricingRules.length} pricing rules`);

  // Create email templates
  console.log("\n📧 Creating email templates...");
  const emailTemplates = [
    {
      name: "welcome_email",
      subject: "Welcome to Mvalex Business Suite!",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome {{user_name}}!</h2>
        <p>Thank you for joining Mvalex Business Suite. Your account has been successfully created with {{credits_balance}} credits.</p>
        <p>Get started with:</p>
        <ul>
          <li>Creating your first business card</li>
          <li>Generating an AI-powered logo</li>
          <li>Sending professional invoices</li>
        </ul>
        <p>Best regards,<br>The Mvalex Team</p>
      </div>`,
      type: "welcome",
      category: "welcome",
      variables: ["user_name", "credits_balance"],
      isActive: true,
      isDefault: true,
    },
    {
      name: "low_credits",
      subject: "Low Credit Balance Alert",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Credit Balance Alert</h2>
        <p>Dear {{user_name}},</p>
        <p>Your credit balance is running low: <strong>{{credits_balance}} credits remaining</strong>.</p>
        <p>Purchase more credits to continue using our services without interruption.</p>
        <a href="{{purchase_link}}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none;">Purchase Credits</a>
        <p>Best regards,<br>The Mvalex Team</p>
      </div>`,
      type: "alert",
      category: "alert",
      variables: ["user_name", "credits_balance", "purchase_link"],
      isActive: true,
      isDefault: false,
    },
    {
      name: "welcome",
      subject: "Welcome to Mvalex Business Suite!",
      body: "Hi {{name}},\n\nWelcome to Mvalex Business Suite! You now have {{credits}} credits to start creating professional business assets.\n\nGet started by:\n1. Creating your business card\n2. Generating an invoice\n3. Designing your AI-powered logo\n\nBest regards,\nThe Mvalex Team",
      variables: ["name", "credits"], // Pass as array, not JSON.stringify()
      type: "welcome",
      category: "welcome",
    },
    {
      name: "export_complete",
      subject: "Your export is ready!",
      body: "Hi {{name}},\n\nYour {{assetType}} has been successfully exported and is ready for download.\n\nBest regards,\nThe Mvalex Team",
      variables: ["name", "assetType"], // Pass as array, not JSON.stringify()
      type: "notification",
      category: "notification",
    },
    {
      name: "credit_low",
      subject: "Low Credit Balance",
      body: "Hi {{name}},\n\nYour credit balance is running low ({{balance}} credits remaining). Purchase more credits to continue creating business assets.\n\nBest regards,\nThe Mvalex Team",
      variables: ["name", "balance"], // Pass as array, not JSON.stringify()
      type: "alert",
      category: "alert",
    },
  ];

  for (const template of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: template,
      create: template,
    });
  }
  console.log(`✅ Created ${emailTemplates.length} email templates`);

  // Create system settings
  console.log("\n⚙️ Creating system settings...");
  const systemSettings = [
    { key: "registration_enabled", value: true, description: "Allow new user registrations" },
    { key: "logo_generation_enabled", value: true, description: "Enable AI logo generation" },
    { key: "max_exports_per_day", value: 50, description: "Maximum exports per user per day" },
    { key: "default_credits", value: 50, description: "Default credits for new users" },
    { key: "maintenance_mode", value: false, description: "System maintenance mode" },
    { key: "support_email", value: "support@mvalex.com", description: "Support email address" },
    { key: "company_name", value: "Mvalex Business Suite", description: "Company display name" },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting,
    });
  }
  console.log(`✅ Created ${systemSettings.length} system settings`);

  // Create sample activities for users
  console.log("\n📊 Creating sample activities...");
  const actions = ["CREATE_BUSINESS_CARD", "CREATE_INVOICE", "GENERATE_LOGO", "EXPORT_FILE"];
  
  for (const user of createdUsers.slice(0, 10)) {
    for (let i = 0; i < 3; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const cost = action === "GENERATE_LOGO" ? 20 : action === "CREATE_INVOICE" ? 5 : action === "EXPORT_FILE" ? 3 : 5;
      
      await prisma.userActivity.create({
        data: {
          userId: user.id,
          action,
          actionType: "CREATE",
          entityType: action === "CREATE_BUSINESS_CARD" ? "BUSINESS_CARD" : action === "CREATE_INVOICE" ? "INVOICE" : "LOGO",
          creditsUsed: cost,
          description: `Sample ${action.toLowerCase().replace(/_/g, " ")} activity`,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log("✅ Created sample activities");

  console.log("\n" + "=".repeat(50));
  console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log("\n📋 ACCOUNT CREDENTIALS:");
  console.log("\n" + "=".repeat(40));
  console.log(`Demo User:     demo@mvalex.com / ${defaultPassword}`);
  console.log(`Admin:         admin@mvalex.com / ${adminPassword}`);
  console.log(`Super Admin:   superadmin@mvalex.com / ${adminPassword}`);
  console.log(`Support Agent: sarah.johnson@mvalex.com / ${agentPassword}`);
  console.log(`Support Agent: david.chen@mvalex.com / ${agentPassword}`);
  console.log("-" + "=".repeat(40));
  console.log(`\n📊 Created ${REAL_USERS.length + 5} total users (${REAL_USERS.length} real users + demo + admin + superadmin + 2 support agents)`);
  console.log(`💰 Created ${pricingRules.length} pricing rules`);
  console.log(`📧 Created ${emailTemplates.length} email templates`);
  console.log(`⚙️ Created ${systemSettings.length} system settings`);
  console.log(`🎨 Created ${permissions.length} permissions`);
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });